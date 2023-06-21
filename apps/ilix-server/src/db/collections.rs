use mongodb::Client;

pub trait DeviceCollection {
    fn log_device_in(&self);
    fn create_new_device(&self);
}

impl DeviceCollection for Client {
    fn log_device_in(&self) {}
    fn create_new_device(&self) {}
}
