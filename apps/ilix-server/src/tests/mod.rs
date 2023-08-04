use mongodb::bson::{oid::ObjectId, DateTime};
use serde::Deserialize;
use std::collections::HashMap;

mod e2e;

#[derive(Deserialize)]
struct DevicesPool {
    pub pool_name: String,
    pub devices_id: Vec<String>,
    pub devices_id_to_name: HashMap<String, String>,
}

#[derive(Deserialize)]
struct FilePoolTransferExt {
    pub _id: String,
    pub to: String,            // device id
    pub from: String,          // device id
    pub files_id: Vec<String>, // _id pointer reference
}

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct FileInfo {
    pub _id: ObjectId,
    pub filename: String,
    pub chunkSize: usize,
    pub length: usize,
    pub md5: String,
    pub uploadDate: DateTime,
}