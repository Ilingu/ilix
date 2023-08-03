pub mod encryption;
pub mod errors;
pub mod keyphrase;
pub mod sse;

use async_trait::async_trait;
use hex_string::HexString;
use log::{debug, error, info, log_enabled, trace, warn, Level};
use sha3::{Digest, Sha3_256};
use std::env;

pub fn hash<T: Into<String>>(msg: T) -> String {
    let mut hasher = Sha3_256::new();
    hasher.update(msg.into().as_bytes());
    let result_buf = hasher.finalize().to_vec();
    HexString::from_bytes(&result_buf).as_string()
}

pub fn is_prod() -> bool {
    env::var("APP_MODE")
        .unwrap_or_default()
        .parse()
        .unwrap_or(true)
}

pub fn is_str_empty(str: &str) -> bool {
    str.trim().is_empty()
}

pub fn console_log(msg: &str, lvl: Level) {
    if log_enabled!(lvl) {
        match lvl {
            Level::Error => error!("{msg}"),
            Level::Warn => warn!("{msg}"),
            Level::Info => info!("{msg}"),
            Level::Debug => debug!("{msg}"),
            Level::Trace => trace!("{msg}"),
        }
    }
}

pub trait TrimObjectId {
    fn trim_object_id(&self) -> Self;
}

impl TrimObjectId for String {
    fn trim_object_id(&self) -> Self {
        self.trim_start_matches("ObjectId(\"")
            .trim_end_matches("\")")
            .to_string()
    }
}

#[async_trait]
pub trait AsyncTryFrom<T>: Sized + Send {
    type Error;

    async fn async_tryfrom(value: T) -> Result<Self, Self::Error>;
}
