use anyhow::{anyhow, Result};
use std::env;

use crate::utils::is_prod;

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum ServerErrors {
    MongoError,
    DictionnaryNotFound,
    InvalidObjectId,
    PoolNotFound,
    TransferNotFound,
    AlreadyInPool,
    NotInPool,
    NotInTransfer,
    EnvVarNotFound,
    ParseError,
    InvalidKeyPhrase,
    EncryptionError,
    DecryptionError,
    FileNotFound,
    HashError,
    SseFailedToSend,
}

impl ServerErrors {
    #[allow(dead_code)]
    pub fn parse(input: &str) -> Result<Self> {
        match input {
            "MongoError" => Ok(Self::MongoError),
            "DictionnaryNotFound" => Ok(Self::DictionnaryNotFound),
            "InvalidObjectId" => Ok(Self::InvalidObjectId),
            "PoolNotFound" => Ok(Self::PoolNotFound),
            "TransferNotFound" => Ok(Self::TransferNotFound),
            "AlreadyInPool" => Ok(Self::AlreadyInPool),
            "NotInPool" => Ok(Self::NotInPool),
            "NotInTransfer" => Ok(Self::NotInTransfer),
            "EnvVarNotFound" => Ok(Self::EnvVarNotFound),
            "ParseError" => Ok(Self::ParseError),
            "InvalidKeyPhrase" => Ok(Self::InvalidKeyPhrase),
            "EncryptionError" => Ok(Self::EncryptionError),
            "DecryptionError" => Ok(Self::DecryptionError),
            "FileNotFound" => Ok(Self::FileNotFound),
            _ => Err(anyhow!("")),
        }
    }
}

impl ToString for ServerErrors {
    fn to_string(&self) -> String {
        format!("{self:?}")
    }
}

#[derive(Clone, Copy)]
pub struct AppState<'a> {
    pub is_prod: bool,
    pub version: &'a str,
}

impl Default for AppState<'_> {
    fn default() -> Self {
        Self {
            is_prod: is_prod(),
            version: "0.0.1-alpha",
        }
    }
}

impl AppState<'_> {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_server_addr(&self) -> Result<(&str, u16)> {
        let port = env::var("PORT")?.parse::<u16>()?;
        Ok(match self.is_prod {
            true => ("0.0.0.0", port),
            false => ("127.0.0.1", port),
        })
    }
}
