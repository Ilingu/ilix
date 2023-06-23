use anyhow::{anyhow, Result};
use async_trait::async_trait;
use mongodb::{bson::doc, options::IndexOptions, Client, IndexModel};

use crate::utils::{keyphrase::KeyPhrase, DB_NAME};

use super::models::DevicesPool;

#[async_trait]
pub trait DevicePoolsCollection {
    async fn join_pool(&self, key_phrase: String, device_id: String) -> Result<()>;
    async fn leave_pool(&self, key_phrase: String, device_id: String) -> Result<()>;
    async fn new_pool(&self, name: String, root_device_id: String) -> Result<String>;
    async fn create_hashed_kp_index(&self);
}

#[async_trait]
impl DevicePoolsCollection for Client {
    async fn join_pool(&self, key_phrase: String, device_id: String) -> Result<()> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
        let update_report = self
            .database(DB_NAME)
            .collection::<DevicesPool>("devices_pools")
            .update_one(
                doc! {"hashed_key_phrase": hashed_kp},
                doc! {"$addToSet" : {"devices_id": device_id}},
                None,
            )
            .await?;
        if update_report.matched_count == 0 {
            return Err(anyhow!("No pool was found matching the key_phrase"));
        }
        if update_report.modified_count == 0 {
            return Err(anyhow!("Device is already in the pool"));
        }
        Ok(())
    }

    async fn leave_pool(&self, key_phrase: String, device_id: String) -> Result<()> {
        let hashed_kp = KeyPhrase::from(key_phrase).hash()?;
        let update_report = self
            .database(DB_NAME)
            .collection::<DevicesPool>("devices_pools")
            .update_one(
                doc! {"hashed_key_phrase": hashed_kp},
                doc! {"$pull" : {"devices_id": device_id}},
                None,
            )
            .await?;
        if update_report.matched_count == 0 {
            return Err(anyhow!("No pool was found matching the key_phrase"));
        }
        if update_report.modified_count == 0 {
            return Err(anyhow!("Device wasn't in pool to begin with"));
        }
        Ok(())
    }

    async fn new_pool(&self, name: String, root_device_id: String) -> Result<String> {
        let kp = KeyPhrase::new(20);
        let hashed_kp = kp.hash()?;

        let devices_pool = DevicesPool {
            pool_name: name,
            devices_id: vec![root_device_id],
            hashed_key_phrase: hashed_kp,
        };

        self.database(DB_NAME)
            .collection::<DevicesPool>("devices_pools")
            .insert_one(devices_pool, None)
            .await?;
        Ok(kp.key_phrase)
    }

    /// Creates an index on the "hashed_key_phrase" field to force the values to be unique.
    async fn create_hashed_kp_index(&self) {
        let options = IndexOptions::builder().unique(true).build();
        let model = IndexModel::builder()
            .keys(doc! { "hashed_key_phrase": 1 })
            .options(options)
            .build();
        self.database(DB_NAME)
            .collection::<DevicesPool>("devices_pools")
            .create_index(model, None)
            .await
            .expect("creating an index should succeed");
    }
}
