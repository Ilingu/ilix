use actix_web::{get, post, web, Responder};

use crate::db::{collections::DeviceCollection, IlixDB};

#[post("/login")]
async fn login(db: web::Data<IlixDB>) -> impl Responder {
    db.client.log_device_in();
    format!("Hello!")
}

#[post("/sign-up")]
async fn sign_up(db: web::Data<IlixDB>) -> impl Responder {
    format!("Hello!")
}
