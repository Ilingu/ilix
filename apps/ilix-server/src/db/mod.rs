pub mod collections;
mod models;

use anyhow::Result;
use std::env;

use mongodb::{options::ClientOptions, Client};

#[derive(Debug)]
pub enum IlixDBErrors {
    UriNotFound,
    FailedToConnect,
    InvalidOption,
}

#[derive(Clone)]
pub struct IlixDB {
    pub client: Client,
}

impl IlixDB {
    pub async fn connect() -> Result<Self, IlixDBErrors> {
        let db_uri = env::var("MONGODB_URI").map_err(|_| IlixDBErrors::UriNotFound)?;

        let mut db_options = ClientOptions::parse(db_uri)
            .await
            .map_err(|_| IlixDBErrors::FailedToConnect)?;
        db_options.app_name = Some("ilix".to_string());
        db_options.default_database = Some("ilix".to_string());

        let db_client =
            Client::with_options(db_options).map_err(|_| IlixDBErrors::InvalidOption)?;

        Ok(Self { client: db_client })
    }
}
