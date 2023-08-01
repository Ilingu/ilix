use std::{collections::HashMap, str::FromStr};

use anyhow::Result;
use async_trait::async_trait;
use futures_util::future;
use mongodb::{
    bson::{doc, oid::ObjectId},
    options::{FindOneAndUpdateOptions, IndexOptions, ReturnDocument},
    Client, IndexModel,
};
use mongodb_gridfs::{options::GridFSBucketOptions, GridFSBucket};
use once_cell::sync::Lazy;
use tokio::task;
use tokio_stream::StreamExt;

use crate::{
    app::ServerErrors,
    services::pool::NewPoolPayload,
    utils::{
        encryption::{decrypt_datas, encrypt_datas},
        keyphrase::{KeyPhrase, KEY_PHRASE_LEN},
        TrimObjectId,
    },
};

use super::{
    models::{DevicesPool, FileInfo, FilePoolTransfer, FilePoolTransferExt},
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

        // delete all transfers/files left
        let transfers_left = self.find_transfers(key_phrase, device_id).await?;
        let tasks = transfers_left.into_iter().map(|transfer| {
            let (client, key_phrase) = (self.clone(), key_phrase.clone());
            task::spawn(async move {
                client
                    .delete_transfer(&key_phrase, &transfer.to, &transfer._id)
                    .await?;
                client.delete_files(&transfer.files_id).await?;
                Ok(())
            })
        });
        for res in future::join_all(tasks).await {
            res.map_err(|_| ServerErrors::MongoError)??;
        }

        // leave pool
        let obj_entry = format!("devices_id_to_name.{device_id}");
        let before_update_doc = self
            .database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .find_one_and_update(
                doc! {"hashed_key_phrase": hashed_kp},
                doc! {"$pull": {"devices_id": device_id}, "$unset": { obj_entry: "" } },
                FindOneAndUpdateOptions::builder()
                    .return_document(Some(ReturnDocument::Before))
                    .build(),
            )
            .await
            .map_err(|_| ServerErrors::MongoError)?
            .ok_or(ServerErrors::PoolNotFound)?;

        if !before_update_doc
            .devices_id
            .contains(&device_id.to_string())
            || !before_update_doc
                .devices_id_to_name
                .contains_key(&device_id.to_string())
        {
            return Err(ServerErrors::NotInPool);
        }

        // if before update, user count is equal to 1, after update the pool is empty, thus we delete it
        if before_update_doc.devices_id.len() == 1 {
            let _ = self.delete_pool(key_phrase).await;
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

        let tasks = pool.devices_id.into_iter().map(|id| {
            let (client, key_phrase) = (self.clone(), key_phrase.clone());
            task::spawn(async move { client.find_transfers(&key_phrase, &id).await })
        });

        let mut transfers_to_delete = vec![];
        for res in future::join_all(tasks).await {
            let mut transfers = res.map_err(|_| ServerErrors::MongoError)??;
            transfers_to_delete.append(&mut transfers);
        }

        let tasks = transfers_to_delete.into_iter().map(|transfer| {
            let (client, key_phrase) = (self.clone(), key_phrase.clone());
            task::spawn(async move {
                client
                    .delete_transfer(&key_phrase, &transfer.to, &transfer._id)
                    .await?;
                client.delete_files(&transfer.files_id).await?;
                Ok(())
            })
        });
        for res in future::join_all(tasks).await {
            res.map_err(|_| ServerErrors::MongoError)??
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
        while let Some(file_info) = cursor
            .try_next()
            .await
            .map_err(|_| ServerErrors::MongoError)?
        {
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
            _id: ObjectId::new(), // no matter, this won't get serialized
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
        Ok(set_report.inserted_id.to_string().trim_object_id())
    }

    async fn add_files_to_transfer(
        &self,
        files_id: &[String],
        transfer_id: &str,
        key_phrase: &KeyPhrase,
    ) -> Result<(), ServerErrors> {
        let hashed_kp = key_phrase.hash()?;

        let id = ObjectId::from_str(transfer_id).map_err(|_| ServerErrors::InvalidObjectId)?;
        let update_report = self
            .database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .update_one(
                doc! {"_id": id, "pool_hashed_key_phrase": hashed_kp},
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
    async fn get_files_info(&self, files_ids: &[String]) -> Result<Vec<FileInfo>, ServerErrors>;
    async fn get_file(
        &self,
        file_id: &str,
        key_phrase: &KeyPhrase,
    ) -> Result<(String, Vec<u8>), ServerErrors>;
    async fn add_files(
        &self,
        files_datas: Vec<(String, Vec<u8>)>,
        key_phrase: &KeyPhrase,
    ) -> Result<Vec<String>, ServerErrors>;
    async fn delete_files(&self, files_ids: &[String]) -> Result<(), ServerErrors>;
}

static BUCKET_OPTIONS: Lazy<GridFSBucketOptions> = Lazy::new(|| {
    GridFSBucketOptions::builder()
        .bucket_name(GRIDFS_BUCKET_NAME.to_string())
        .build()
});

#[async_trait]
impl FileStorageGridFS for Client {
    async fn get_files_info(&self, files_ids: &[String]) -> Result<Vec<FileInfo>, ServerErrors> {
        let tasks = files_ids.iter().cloned().map(|file_id| {
            let client = self.clone();
            task::spawn(async move {
                let id = ObjectId::from_str(&file_id).map_err(|_| ServerErrors::InvalidObjectId)?;
                client
                    .database(DB_NAME)
                    .collection::<FileInfo>("ilix_fs.files")
                    .find_one(doc! {"_id": id}, None)
                    .await
                    .map_err(|_| ServerErrors::MongoError)
            })
        });

        let mut files_info = vec![];
        for res in future::join_all(tasks).await {
            let file_info = res
                .map_err(|_| ServerErrors::MongoError)??
                .ok_or(ServerErrors::FileNotFound)?;
            files_info.push(file_info);
        }

        Ok(files_info)
    }

    async fn get_file(
        &self,
        file_id: &str,
        key_phrase: &KeyPhrase,
    ) -> Result<(String, Vec<u8>), ServerErrors> {
        let bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));

        let id = ObjectId::from_str(file_id).map_err(|_| ServerErrors::InvalidObjectId)?;
        let (cursor, filename) = bucket
            .open_download_stream_with_filename(id)
            .await
            .map_err(|_| ServerErrors::MongoError)?;

        let enc_file_buffer = cursor.collect::<Vec<_>>().await.concat();
        let decrypted_datas = decrypt_datas(&key_phrase.0, &enc_file_buffer)?;
        Ok((filename, decrypted_datas))
    }

    async fn add_files(
        &self,
        files_datas: Vec<(String, Vec<u8>)>,
        key_phrase: &KeyPhrase,
    ) -> Result<Vec<String>, ServerErrors> {
        // encrypt files
        let tasks = files_datas.into_iter().map(|(filename, file_buffer)| {
            let key_phrase: KeyPhrase = key_phrase.clone();
            task::spawn(async move {
                let enc_buf = encrypt_datas(&key_phrase.0, &file_buffer)?;
                Ok((filename, enc_buf))
            })
        });
        let mut enc_files = vec![];
        for res in future::join_all(tasks).await {
            let enc_file = res.map_err(|_| ServerErrors::MongoError)??;
            enc_files.push(enc_file);
        }

        // add files
        let bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));

        let tasks = enc_files.into_iter().map(|(filename, enc_buf)| {
            let mut bucket = bucket.clone();
            task::spawn(async move {
                bucket
                    .upload_from_stream(&filename, &enc_buf[..], None)
                    .await
                    .map_err(|_| ServerErrors::MongoError)
            })
        });

        let mut files_ids = vec![];
        for res in future::join_all(tasks).await {
            let id = res.map_err(|_| ServerErrors::MongoError)??;
            files_ids.push(id.to_string())
        }

        Ok(files_ids)
    }

    async fn delete_files(&self, files_ids: &[String]) -> Result<(), ServerErrors> {
        let bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));

        let tasks = files_ids.iter().cloned().map(|file_id| {
            let bucket = bucket.clone();
            task::spawn(async move {
                let id = ObjectId::from_str(&file_id).map_err(|_| ServerErrors::InvalidObjectId)?;
                bucket
                    .delete(id)
                    .await
                    .map_err(|_| ServerErrors::MongoError)
            })
        });

        for res in future::join_all(tasks).await {
            res.map_err(|_| ServerErrors::MongoError)??;
        }
        Ok(())
    }
}
