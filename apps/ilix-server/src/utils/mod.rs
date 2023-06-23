pub mod keyphrase;

use std::env;

pub fn is_prod() -> bool {
    env::var("APP_MODE")
        .unwrap_or_default()
        .parse()
        .unwrap_or(true)
}

pub const DB_NAME: &str = "ilix";

pub fn is_str_empty(str: &str) -> bool {
    str.trim().is_empty()
}
