use actix_web::{get, post, web, Responder};

use crate::db::{collections::DevicePoolsCollection, IlixDB};

#[post("/login")]
async fn login(db: web::Data<IlixDB>) -> impl Responder {
    db.client.join_pool();
    format!("Hello!")
}

#[post("/sign-up")]
async fn sign_up(db: web::Data<IlixDB>) -> impl Responder {
    format!("Hello!")
}
