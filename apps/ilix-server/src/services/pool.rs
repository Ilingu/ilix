use actix_web::{get, post, web, Responder};

use crate::db::{collections::DevicePoolsCollection, IlixDB};

#[post("/join")]
async fn join_pool(db: web::Data<IlixDB>) -> impl Responder {
    // db.client.join_pool();
    format!("Hello!")
}

#[post("/new")]
async fn new_pool(db: web::Data<IlixDB>) -> impl Responder {
    // db.client.new_pool("".to_string(), "".to_string());
    format!("Hello!")
}
