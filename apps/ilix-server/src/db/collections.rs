use std::{collections::HashMap, str::FromStr};

use anyhow::Result;
use async_trait::async_trait;
use mongodb::{
    bson::{doc, oid::ObjectId},
    options::IndexOptions,
    Client, IndexModel,
};
use mongodb_gridfs::{options::GridFSBucketOptions, GridFSBucket};
use once_cell::sync::Lazy;
use tokio_stream::StreamExt;

use crate::{
    app::ServerErrors,
    services::pool::NewPoolPayload,
    utils::{
        encryption::{decrypt_datas, encrypt_datas},
        keyphrase::{KeyPhrase, KEY_PHRASE_LEN},
    },
};

use super::{
    models::{DevicesPool, FilePoolTransfer, FilePoolTransferExt},
    DB_NAME, DEVICES_POOL_COLL, FILE_TRANSFER_COLL, GRIDFS_BUCKET_NAME,
};

#[async_trait]
pub trait DevicePoolsCollection {
    async fn get_pool(&self, key_phrase: &KeyPhrase) -> Result<DevicesPool, ServerErrors>;
    async fn create_pool(&self, args: NewPoolPayload) -> Result<String, ServerErrors>;
    async fn join_pool(
        &self,
        key_phrase: &KeyPhrase,
        device_id: &str,
        device_name: &str,
    ) -> Result<DevicesPool, ServerErrors>;
    async fn leave_pool(&self, key_phrase: &KeyPhrase, device_id: &str)
        -> Result<(), ServerErrors>;
    async fn delete_pool(&self, key_phrase: &KeyPhrase) -> Result<(), ServerErrors>;
    async fn create_pool_hashed_kp_index(&self) -> Result<()>;
}

static KP_INDEX_MODEL_UNIQUE: Lazy<IndexModel> = Lazy::new(|| {
    let options = IndexOptions::builder().unique(true).build();
    IndexModel::builder()
        .keys(doc! { "hashed_key_phrase": 1 })
        .options(options)
        .build()
});
static KP_INDEX_MODEL: Lazy<IndexModel> = Lazy::new(|| {
    let options = IndexOptions::builder().unique(false).build();
    IndexModel::builder()
        .keys(doc! { "hashed_key_phrase": 1 })
        .options(options)
        .build()
});

#[async_trait]
impl DevicePoolsCollection for Client {
    async fn get_pool(&self, key_phrase: &KeyPhrase) -> Result<DevicesPool, ServerErrors> {
        let hashed_kp = key_phrase.hash()?;
        let find_report = self
            .database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .find_one(doc! {"hashed_key_phrase": hashed_kp}, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;

        // Security to not expose hashed_key_phrase
        let mut device_pool = find_report.ok_or(ServerErrors::PoolNotFound)?;
        device_pool.hashed_key_phrase = String::new();
        Ok(device_pool)
    }

    async fn join_pool(
        &self,
        key_phrase: &KeyPhrase,
        device_id: &str,
        device_name: &str,
    ) -> Result<DevicesPool, ServerErrors> {
        let hashed_kp = key_phrase.hash()?;

        let obj_entry = format!("devices_id_to_name.{device_id}");
        let update_report = self
            .database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .update_one(
                doc! {"hashed_key_phrase": hashed_kp},
                doc! {"$addToSet" : {"devices_id": device_id}, "$set": {obj_entry: device_name}},
                None,
            )
            .await
            .map_err(|_| ServerErrors::MongoError)?;

        if update_report.matched_count == 0 {
            return Err(ServerErrors::PoolNotFound);
        }
        if update_report.modified_count == 0 {
            return Err(ServerErrors::AlreadyInPool);
        }
        Ok(self.get_pool(key_phrase).await?)
    }

    async fn leave_pool(
        &self,
        key_phrase: &KeyPhrase,
        device_id: &str,
    ) -> Result<(), ServerErrors> {
        let hashed_kp = key_phrase.hash()?;

        let obj_entry = format!("devices_id_to_name.{device_id}");
        let update_report = self
            .database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .update_one(
                doc! {"hashed_key_phrase": hashed_kp},
                doc! {"$pull": {"devices_id": device_id}, "$unset": { obj_entry: "" } },
                None,
            )
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        if update_report.matched_count == 0 {
            return Err(ServerErrors::PoolNotFound);
        }
        if update_report.modified_count == 0 {
            return Err(ServerErrors::NotInPool);
        }
        Ok(())
    }

    async fn create_pool(&self, args: NewPoolPayload) -> Result<String, ServerErrors> {
        let kp = KeyPhrase::new(KEY_PHRASE_LEN)?;
        let hashed_kp = kp.hash()?;

        let mut id_to_name = HashMap::new();
        id_to_name.insert(args.device_id.clone(), args.device_name);

        let devices_pool = DevicesPool {
            pool_name: args.name,
            devices_id: vec![args.device_id],
            devices_id_to_name: id_to_name,
            hashed_key_phrase: hashed_kp,
        };

        self.database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .insert_one(devices_pool, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        Ok(kp.0)
    }

    async fn delete_pool(&self, key_phrase: &KeyPhrase) -> Result<(), ServerErrors> {
        let pool = self.get_pool(key_phrase).await?;
        let hashed_kp = key_phrase.hash()?;

        let mut transfers_to_delete = vec![];
        for id in &pool.devices_id {
            let mut transfer = self.find_transfers(key_phrase, id).await?;
            transfers_to_delete.append(&mut transfer);
        }

        for FilePoolTransferExt {
            _id, to, files_id, ..
        } in transfers_to_delete
        {
            self.delete_transfer(key_phrase, &to, &_id).await?;
            for file_id in &files_id {
                self.delete_file(file_id).await?;
            }
        }

        let delete_report = self
            .database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .delete_one(doc! {"hashed_key_phrase": hashed_kp }, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        if delete_report.deleted_count == 0 {
            return Err(ServerErrors::PoolNotFound);
        }

        Ok(())
    }

    /// Creates an index on the "hashed_key_phrase" field to force the values to be unique.
    async fn create_pool_hashed_kp_index(&self) -> Result<()> {
        self.database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .create_index(KP_INDEX_MODEL_UNIQUE.to_owned(), None)
            .await?;
        Ok(())
    }
}

#[async_trait]
pub trait FilePoolTransferCollection {
    async fn find_transfers(
        &self,
        key_phrase: &KeyPhrase,
        device_id: &str,
    ) -> Result<Vec<FilePoolTransferExt>, ServerErrors>;
    async fn create_transfer(
        &self,
        key_phrase: &KeyPhrase,
        from: &str,
        to: &str,
    ) -> Result<String, ServerErrors>;
    async fn add_files_to_transfer(
        &self,
        files_id: &[String],
        transfer_id: &str,
        key_phrase: &KeyPhrase,
    ) -> Result<(), ServerErrors>;
    async fn remove_transfer_file(&self, file_id: &str) -> Result<(), ServerErrors>;
    async fn delete_transfer(
        &self,
        key_phrase: &KeyPhrase,
        device_id: &str,
        transfer_id: &str,
    ) -> Result<Vec<String>, ServerErrors>;
    async fn create_transfer_hashed_kp_index(&self) -> Result<()>;
}

#[async_trait]
impl FilePoolTransferCollection for Client {
    async fn find_transfers(
        &self,
        key_phrase: &KeyPhrase,
        device_id: &str,
    ) -> Result<Vec<FilePoolTransferExt>, ServerErrors> {
        let hashed_kp = key_phrase.hash()?;
        let filter = doc! {"pool_hashed_key_phrase": hashed_kp, "to": device_id};
        let mut cursor = self
            .database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .find(filter, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;

        let mut files_info = vec![];
        while let Some(file_info) = cursor.try_next().await.map_err(|err| {
            println!("{err:?}");
            ServerErrors::MongoError
        })? {
            files_info.push(file_info);
        }

        if files_info.is_empty() {
            return Ok(vec![]);
        }

        let files_info = files_info
            .into_iter()
            .map(|fi| FilePoolTransferExt {
                _id: fi._id.to_string(),
                pool_hashed_key_phrase: String::new(), // to prevent leaks
                to: fi.to,
                from: fi.from,
                files_id: fi.files_id,
            })
            .collect::<Vec<_>>();
        Ok(files_info)
    }

    async fn create_transfer(
        &self,
        key_phrase: &KeyPhrase,
        from: &str,
        to: &str,
    ) -> Result<String, ServerErrors> {
        let hashed_kp = key_phrase.hash()?;
        let data_to_insert = FilePoolTransfer {
            _id: ObjectId::new(), // whatever, this won't get serialized
            pool_hashed_key_phrase: hashed_kp,
            to: to.to_owned(),
            from: from.to_owned(),
            files_id: vec![],
        };

        let pool = self.get_pool(key_phrase).await?;
        if !pool.devices_id.contains(&from.to_string())
            || !pool.devices_id.contains(&to.to_string())
        {
            return Err(ServerErrors::NotInPool);
        }

        let set_report = self
            .database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .insert_one(data_to_insert.clone(), None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        Ok(set_report.inserted_id.to_string())
    }

    async fn add_files_to_transfer(
        &self,
        files_id: &[String],
        transfer_id: &str,
        key_phrase: &KeyPhrase,
    ) -> Result<(), ServerErrors> {
        let hashed_kp = key_phrase.hash()?;

        let update_report = self
            .database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .update_one(
                doc! {"transfer_id": transfer_id, "pool_hashed_key_phrase": hashed_kp},
                doc! {"$addToSet": {"files_id": {"$each": files_id }}},
                None,
            )
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        if update_report.matched_count == 0 {
            return Err(ServerErrors::TransferNotFound);
        }
        if update_report.modified_count == 0 {
            return Err(ServerErrors::MongoError);
        }

        Ok(())
    }

    async fn remove_transfer_file(&self, file_id: &str) -> Result<(), ServerErrors> {
        let update_report = self
            .database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .update_one(
                doc! {"files_id": file_id},
                doc! {"$pull" : {"files_id": file_id}},
                None,
            )
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        if update_report.matched_count == 0 {
            return Err(ServerErrors::TransferNotFound);
        }
        if update_report.modified_count == 0 {
            return Err(ServerErrors::NotInTransfer);
        }
        Ok(())
    }

    async fn delete_transfer(
        &self,
        key_phrase: &KeyPhrase,
        to_device_id: &str,
        transfer_id: &str,
    ) -> Result<Vec<String>, ServerErrors> {
        let hashed_kp = key_phrase.hash()?;
        let id = ObjectId::from_str(transfer_id).map_err(|_| ServerErrors::InvalidObjectId)?;
        let filter = doc! {"pool_hashed_key_phrase": hashed_kp, "to": to_device_id, "_id": id };
        let find_report = self
            .database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .find_one_and_delete(filter, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?
            .ok_or(ServerErrors::TransferNotFound)?;

        Ok(find_report.files_id)
    }

    /// Creates an index on the "hashed_key_phrase" field to force the values to be unique.
    async fn create_transfer_hashed_kp_index(&self) -> Result<()> {
        self.database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .create_index(KP_INDEX_MODEL.to_owned(), None)
            .await?;
        Ok(())
    }
}

#[async_trait]
pub trait FileStorageGridFS {
    async fn get_file(&self, file_id: &str) -> Result<(String, Vec<u8>), ServerErrors>;
    async fn get_and_decrypt_file(
        &self,
        file_id: &str,
        key_phrase: &KeyPhrase,
    ) -> Result<(String, Vec<u8>), ServerErrors>;
    async fn add_file(&self, filename: &str, file_buffer: &[u8]) -> Result<String, ServerErrors>;
    async fn encrypt_and_add_file(
        &self,
        filename: &str,
        file_buffer: &[u8],
        key_phrase: &KeyPhrase,
    ) -> Result<String, ServerErrors>;
    async fn delete_file(&self, file_id: &str) -> Result<(), ServerErrors>;
}

static BUCKET_OPTIONS: Lazy<GridFSBucketOptions> = Lazy::new(|| {
    GridFSBucketOptions::builder()
        .bucket_name(GRIDFS_BUCKET_NAME.to_string())
        .build()
});

#[async_trait]
impl FileStorageGridFS for Client {
    async fn get_file(&self, file_id: &str) -> Result<(String, Vec<u8>), ServerErrors> {
        let bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));

        let id = ObjectId::from_str(file_id).map_err(|_| ServerErrors::InvalidObjectId)?;
        let (mut cursor, filename) = bucket
            .open_download_stream_with_filename(id)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        let buffer = cursor.next().await.ok_or(ServerErrors::FileError)?;

        Ok((filename, buffer))
    }
    async fn get_and_decrypt_file(
        &self,
        file_id: &str,
        key_phrase: &KeyPhrase,
    ) -> Result<(String, Vec<u8>), ServerErrors> {
        let (filename, enc_datas) = self.get_file(file_id).await?;
        let decrypted_datas = decrypt_datas(&enc_datas, &key_phrase.0)?;
        Ok((filename, decrypted_datas))
    }

    async fn add_file(&self, filename: &str, file_buffer: &[u8]) -> Result<String, ServerErrors> {
        let mut bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));
        let id = bucket
            .upload_from_stream(filename, file_buffer, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        Ok(id.to_string())
    }
    async fn encrypt_and_add_file(
        &self,
        filename: &str,
        file_buffer: &[u8],
        key_phrase: &KeyPhrase,
    ) -> Result<String, ServerErrors> {
        let enc_file_buf = encrypt_datas(file_buffer, &key_phrase.0)?;
        self.add_file(filename, &enc_file_buf).await
    }

    async fn delete_file(&self, file_id: &str) -> Result<(), ServerErrors> {
        let bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));
        let id = ObjectId::from_str(file_id).map_err(|_| ServerErrors::InvalidObjectId)?;
        bucket
            .delete(id)
            .await
            .map_err(|_| ServerErrors::MongoError)
    }
}
