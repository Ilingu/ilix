pub mod encryption;
pub mod errors;
pub mod keyphrase;
pub mod sse;

use hex_string::HexString;
use log::{debug, error, info, log_enabled, trace, warn, Level};
use sha3::{Digest, Sha3_256};
use std::env;

/// return the 256 bytes **sha3 hash** of the `msg` param
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

/// helper function that return whether the string is empty (including if string is only composed of spaces) or not
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
    /// syntax sugar way of just extrating the "here" in `ObjectId("here")`
    fn trim_object_id(&self) -> Self;
}

impl TrimObjectId for String {
    fn trim_object_id(&self) -> Self {
        self.trim_start_matches("ObjectId(\"")
            .trim_end_matches("\")")
            .to_string()
    }
}

#[cfg(test)]
mod tests {
    use crate::utils::{hash, is_str_empty, TrimObjectId};

    #[test]
    fn hash_test() {
        assert_eq!(
            hash("sasaki and miyano"),
            "ebbdf07f1121359452ec4ee91ade8f68e7bd750b018f7efa723e08486b09577e"
        );

        let mut result = "sasaki and miyano".to_string();
        for _ in 0..10 {
            result = hash(result);
        }
        assert_eq!(
            result,
            "aad2003ae46a3fcb907568a8f05d1486df27c1f8b79c7b77f5a5355d7d2e0a57"
        )
    }

    #[test]
    fn is_str_empty_test() {
        assert!(is_str_empty(""));
        assert!(is_str_empty(" "));
        assert!(!is_str_empty("yo"));
    }

    #[test]
    fn trim_object_id_test() {
        let normal = String::from("value");
        assert_eq!(normal, normal.trim_object_id());

        let object_id = String::from("ObjectId(\"value\")");
        assert_ne!(object_id, object_id.trim_object_id());
        assert_eq!(normal, object_id.trim_object_id());
    }
}
