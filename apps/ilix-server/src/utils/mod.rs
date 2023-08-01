pub mod encryption;
pub mod keyphrase;
pub mod sse;

use std::env;

use log::{debug, error, info, log_enabled, trace, warn, Level};

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
