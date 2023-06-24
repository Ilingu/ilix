pub mod keyphrase;

use std::env;

pub fn is_prod() -> bool {
    env::var("APP_MODE")
        .unwrap_or_default()
        .parse()
        .unwrap_or(true)
}

pub const KEY_PHRASE_LEN: usize = 20;

pub fn is_str_empty(str: &str) -> bool {
    str.trim().is_empty()
}

pub fn is_key_phrase(str: &str) -> bool {
    str.split('-').count() != KEY_PHRASE_LEN
}
