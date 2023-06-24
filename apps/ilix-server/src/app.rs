use anyhow::Result;
use std::env;

use crate::utils::is_prod;

#[derive(Debug)]
pub enum ServerErrors<'a> {
    NoDatas,
    MongoError,
    HashFailed,
    DictionnaryNotFound,
    InvalidObjectId,
    PoolNotFound,
    TransferNotFound,
    AlreadyInPool,
    NotInPool,
    FileError,
    EnvVarNotFound,
    ParseError,
    Custom(&'a str),
}

impl ToString for ServerErrors<'_> {
    fn to_string(&self) -> String {
        match self {
            ServerErrors::Custom(err) => err.to_string(),
            _ => format!("{self:?}"),
        }
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
