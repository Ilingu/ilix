use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct DevicesPool {
    pub pool_name: String,
    pub devices_id: Vec<String>,
    pub hashed_key_phrase: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct FilePoolTransfer {
    pub pool_hashed_key_phrase: String, // pointer to DevicesPool kp index
    pub to: String,                     // device id
    pub from: String,                   // device id
    pub file_id: String,                // _id pointer reference
}
