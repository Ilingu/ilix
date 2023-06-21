use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct Device {
    pub device_id: String,
    pub public_key: String,
    pub password: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct DevicesPool {
    pub devices_id: Vec<String>, // pointer to devices collection
}
