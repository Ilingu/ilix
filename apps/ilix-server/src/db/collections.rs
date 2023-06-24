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
    models::{DevicesPool, FilePoolTransfer},
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
    async fn create_hashed_kp_index(&self) -> Result<()>;
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
        find_report.ok_or(ServerErrors::Custom("Pool not found"))
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
            return Err(ServerErrors::Custom(
                "No pool was found matching the key_phrase",
            ));
        }
        if update_report.modified_count == 0 {
            return Err(ServerErrors::Custom("Device is already in the pool"));
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
            return Err(ServerErrors::Custom(
                "No pool was found matching the key_phrase",
            ));
        }
        if update_report.modified_count == 0 {
            return Err(ServerErrors::Custom("Device wasn't in pool to begin with"));
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
    async fn create_hashed_kp_index(&self) -> Result<()> {
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
    ) -> Result<Vec<FilePoolTransfer>, ServerErrors>;
    async fn add_transfer(
        &self,
        key_phrase: String,
        from: String,
        to: String,
        fild_id: String,
    ) -> Result<(), ServerErrors>;
    async fn delete_transfer(
        &self,
        key_phrase: String,
        device_id: String,
        file_id: String,
    ) -> Result<(), ServerErrors>;
}

#[async_trait]
impl FilePoolTransferCollection for Client {
    async fn find_transfers(
        &self,
        key_phrase: String,
        device_id: String,
    ) -> Result<Vec<FilePoolTransfer>, ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
        let mut find_report = self
            .database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .find(
                doc! {"pool_hashed_key_phrase": hashed_kp, "to": device_id},
                None,
            )
            .await
            .map_err(|_| ServerErrors::MongoError)?;

        let mut files_info = vec![];
        while let Some(Ok(file_info)) = find_report.next().await {
            files_info.push(file_info);
        }

        if files_info.is_empty() {
            return Err(ServerErrors::NoDatas);
        }
        Ok(files_info)
    }

    async fn add_transfer(
        &self,
        key_phrase: String,
        from: String,
        to: String,
        file_id: String,
    ) -> Result<(), ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;

        let data_to_insert = FilePoolTransfer {
            pool_hashed_key_phrase: hashed_kp,
            to,
            from,
            file_id,
        };
        self.database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .insert_one(data_to_insert, None)
            .await
            .map_err(|_| ServerErrors::MongoError)?;
        Ok(())
    }

    async fn delete_transfer(
        &self,
        key_phrase: String,
        device_id: String,
        file_id: String,
    ) -> Result<(), ServerErrors> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
        self.database(DB_NAME)
            .collection::<FilePoolTransfer>(FILE_TRANSFER_COLL)
            .find_one_and_delete(
                doc! {"pool_hashed_key_phrase": hashed_kp, "to": device_id, "file_id": file_id},
                None,
            )
            .await
            .map_err(|_| ServerErrors::MongoError)?
            .ok_or(ServerErrors::Custom(
                "Failed to find or delete the transfer",
            ))?;
        Ok(())
    }
}

#[async_trait]
pub trait FileStorageGridFS {
    async fn get_file(&self, file_id: String) -> Result<(String, Vec<u8>), ServerErrors>;
    async fn add_file(&self, filename: &str, file_buffer: &[u8]) -> Result<String, ServerErrors>;
    async fn remove_file(&self, file_id: String) -> Result<(), ServerErrors>;
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
        let buffer = cursor
            .next()
            .await
            .ok_or(ServerErrors::Custom("Failed to read file cursor"))?;

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
    async fn remove_file(&self, file_id: String) -> Result<(), ServerErrors> {
        let bucket = GridFSBucket::new(self.database(DB_NAME), Some(BUCKET_OPTIONS.to_owned()));
        let id = ObjectId::from_str(&file_id).map_err(|_| ServerErrors::InvalidObjectId)?;
        bucket
            .delete(id)
            .await
            .map_err(|_| ServerErrors::MongoError)
    }
}
