use std::str::FromStr;

use anyhow::Result;
use async_trait::async_trait;
use lazy_static::lazy_static;
use mongodb::{
    bson::{doc, oid::ObjectId},
    options::{GridFsBucketOptions, IndexOptions},
    Client, IndexModel,
};
use mongodb_gridfs::{options::GridFSBucketOptions, GridFSBucket};
use tokio_stream::StreamExt;

use crate::{
    app::ServerErrors,
    utils::{keyphrase::KeyPhrase, KEY_PHRASE_LEN},
};

use super::{
    models::{DevicesPool, FilePoolTransfer, FilePoolTransferExt},
    DB_NAME, DEVICES_POOL_COLL, FILE_TRANSFER_COLL, GRIDFS_BUCKET_NAME,
};

#[async_trait]
pub trait DevicePoolsCollection {
    async fn get_pool(&self, key_phrase: String) -> Result<DevicesPool, ServerErrors>;
    async fn join_pool(
        &self,
        key_phrase: String,
        device_id: String,
    ) -> Result<DevicesPool, ServerErrors>;
    async fn leave_pool(&self, key_phrase: String, device_id: String) -> Result<(), ServerErrors>;
    async fn new_pool(&self, name: String, root_device_id: String) -> Result<String, ServerErrors>;
    async fn create_pool_hashed_kp_index(&self) -> Result<()>;
}

lazy_static! {
    static ref KP_INDEX_MODEL: IndexModel = {
        let options = IndexOptions::builder().unique(true).build();
        IndexModel::builder()
            .keys(doc! { "hashed_key_phrase": 1 })
            .options(options)
            .build()
    };
}

#[async_trait]
impl DevicePoolsCollection for Client {
    async fn get_pool(&self, key_phrase: String) -> Result<DevicesPool, ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
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
        key_phrase: String,
        device_id: String,
    ) -> Result<DevicesPool, ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase.clone()).hash()?;
        let update_report = self
            .database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .update_one(
                doc! {"hashed_key_phrase": hashed_kp},
                doc! {"$addToSet" : {"devices_id": device_id}},
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

    async fn leave_pool(&self, key_phrase: String, device_id: String) -> Result<(), ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
        let update_report = self
            .database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .update_one(
                doc! {"hashed_key_phrase": hashed_kp},
                doc! {"$pull" : {"devices_id": device_id}},
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

    async fn new_pool(&self, name: String, root_device_id: String) -> Result<String, ServerErrors> {
        let kp = KeyPhrase::new(KEY_PHRASE_LEN)?;
        let hashed_kp = kp.hash()?;

        let devices_pool = DevicesPool {
            pool_name: name,
            devices_id: vec![root_device_id],
            hashed_key_phrase: hashed_kp,
        };

        self.database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .insert_one(devices_pool, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        Ok(kp.key_phrase)
    }

    /// Creates an index on the "hashed_key_phrase" field to force the values to be unique.
    async fn create_pool_hashed_kp_index(&self) -> Result<()> {
        self.database(DB_NAME)
            .collection::<DevicesPool>(DEVICES_POOL_COLL)
            .create_index(KP_INDEX_MODEL.to_owned(), None)
            .await?;
        Ok(())
    }
}

#[async_trait]
pub trait FilePoolTransferCollection {
    async fn find_transfers(
        &self,
        key_phrase: String,
        device_id: String,
    ) -> Result<Vec<FilePoolTransferExt>, ServerErrors>;
    async fn add_transfer(
        &self,
        key_phrase: String,
        from: String,
        to: String,
        files_id: Vec<String>,
    ) -> Result<(), ServerErrors>;
    async fn delete_transfer(
        &self,
        key_phrase: String,
        device_id: String,
        transfer_id: String,
    ) -> Result<Vec<String>, ServerErrors>;
    async fn create_transfer_hashed_kp_index(&self) -> Result<()>;
}

#[async_trait]
impl FilePoolTransferCollection for Client {
    async fn find_transfers(
        &self,
        key_phrase: String,
        device_id: String,
    ) -> Result<Vec<FilePoolTransferExt>, ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
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
            return Err(ServerErrors::NoDatas);
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

    async fn add_transfer(
        &self,
        key_phrase: String,
        from: String,
        to: String,
        files_id: Vec<String>,
    ) -> Result<(), ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
        let data_to_insert = FilePoolTransfer {
            _id: ObjectId::new(), // whatever, this won't get serialized
            pool_hashed_key_phrase: hashed_kp,
            to,
            from,
            files_id,
        };

        self.database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .insert_one(data_to_insert.clone(), None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        Ok(()) // the transfer id don't get transmitted to the user because it's not his anymore
    }

    async fn delete_transfer(
        &self,
        key_phrase: String,
        to_device_id: String,
        transfer_id: String,
    ) -> Result<Vec<String>, ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
        let find_report = self
            .database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .find_one_and_delete(
                doc! {"pool_hashed_key_phrase": hashed_kp, "to": to_device_id, "_id": transfer_id},
                None,
            )
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
    async fn get_file(&self, file_id: String) -> Result<(String, Vec<u8>), ServerErrors>;
    async fn add_file(&self, filename: &str, file_buffer: &[u8]) -> Result<String, ServerErrors>;
    async fn delete_file(&self, file_id: String) -> Result<(), ServerErrors>;
}

lazy_static! {
    static ref BUCKET_OPTIONS_OFFICIAL: GridFsBucketOptions = GridFsBucketOptions::builder()
        .bucket_name(Some(GRIDFS_BUCKET_NAME.to_string()))
        .build();
    static ref BUCKET_OPTIONS: GridFSBucketOptions = GridFSBucketOptions::builder()
        .bucket_name(GRIDFS_BUCKET_NAME.to_string())
        .build();
}

#[async_trait]
impl FileStorageGridFS for Client {
    async fn get_file(&self, file_id: String) -> Result<(String, Vec<u8>), ServerErrors> {
        let bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));

        let id = ObjectId::from_str(&file_id).map_err(|_| ServerErrors::InvalidObjectId)?;
        let (mut cursor, filename) = bucket
            .open_download_stream_with_filename(id)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        let buffer = cursor.next().await.ok_or(ServerErrors::FileError)?;

        Ok((filename, buffer))
    }
    async fn add_file(&self, filename: &str, file_buffer: &[u8]) -> Result<String, ServerErrors> {
        let mut bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));
        let id = bucket
            .upload_from_stream(filename, file_buffer, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        Ok(id.to_string())
    }
    async fn delete_file(&self, file_id: String) -> Result<(), ServerErrors> {
        let bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));
        let id = ObjectId::from_str(&file_id).map_err(|_| ServerErrors::InvalidObjectId)?;
        bucket
            .delete(id)
            .await
            .map_err(|_| ServerErrors::MongoError)
    }
}
