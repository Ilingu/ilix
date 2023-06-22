use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct DevicesPool {
    pub pool_name: String,
    pub devices_id: Vec<String>,
    pub hashed_key_phrase: String,
}
