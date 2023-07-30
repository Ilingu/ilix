use std::collections::HashMap;

use mongodb::bson::{oid::ObjectId, DateTime};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct DevicesPool {
    pub pool_name: String,
    pub devices_id: Vec<String>,
    pub devices_id_to_name: HashMap<String, String>,
    pub hashed_key_phrase: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct FilePoolTransfer {
    #[serde(skip_serializing)]
    pub _id: ObjectId,
    pub pool_hashed_key_phrase: String, // pointer to DevicesPool kp index
    pub to: String,                     // device id
    pub from: String,                   // device id
    pub files_id: Vec<String>,          // _id pointer reference
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct FilePoolTransferExt {
    pub _id: String,
    pub pool_hashed_key_phrase: String, // pointer to DevicesPool kp index
    pub to: String,                     // device id
    pub from: String,                   // device id
    pub files_id: Vec<String>,          // _id pointer reference
}

#[allow(non_snake_case)]
#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct FileInfo {
    pub _id: ObjectId,
    pub filename: String,
    pub chunkSize: usize,
    pub length: usize,
    #[serde(skip_serializing)]
    pub md5: String,
    pub uploadDate: DateTime,
}
