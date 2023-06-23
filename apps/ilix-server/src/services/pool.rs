use actix_web::{delete, http::StatusCode, post, web, Responder};
use anyhow::anyhow;
use serde::Deserialize;

use crate::{
    db::{collections::DevicePoolsCollection, IlixDB},
    utils::is_str_empty,
};

use super::ResponsePayload;

#[derive(Deserialize)]
struct UpdatePoolPayload {
    key_phrase: String,
    device_id: String,
}

#[post("/join")]
async fn join_pool(db: web::Data<IlixDB>, info: web::Json<UpdatePoolPayload>) -> impl Responder {
    if is_str_empty(&info.key_phrase) || is_str_empty(&info.device_id) {
        return ResponsePayload::new::<Option<()>>(
            false,
            &None,
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let db_result = db
        .client
        .join_pool(info.key_phrase.to_owned(), info.device_id.to_owned())
        .await;

    let err_msg = db_result
        .as_ref()
        .err()
        .unwrap_or(&anyhow!("Error when joining pool"))
        .to_string();

    ResponsePayload::new(db_result.is_ok(), &db_result.ok(), None, Some(err_msg))
}

#[delete("/leave")]
async fn leave_pool(db: web::Data<IlixDB>, info: web::Json<UpdatePoolPayload>) -> impl Responder {
    if is_str_empty(&info.key_phrase) || is_str_empty(&info.device_id) {
        return ResponsePayload::new::<Option<()>>(
            false,
            &None,
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let db_result = db
        .client
        .leave_pool(info.key_phrase.to_owned(), info.device_id.to_owned())
        .await;

    let err_msg = db_result
        .as_ref()
        .err()
        .unwrap_or(&anyhow!("Error when joining pool"))
        .to_string();

    ResponsePayload::new(db_result.is_ok(), &db_result.ok(), None, Some(err_msg))
}

#[derive(Deserialize)]
struct NewPoolPayload {
    name: String,
    device_id: String,
}

#[post("/new")]
async fn new_pool(db: web::Data<IlixDB>, info: web::Json<NewPoolPayload>) -> impl Responder {
    if is_str_empty(&info.name) || is_str_empty(&info.device_id) {
        return ResponsePayload::new::<Option<()>>(
            false,
            &None,
            Some(StatusCode::BAD_REQUEST),
            Some("Empty Args".to_string()),
        );
    }

    let db_result = db
        .client
        .new_pool(info.name.to_owned(), info.device_id.to_owned())
        .await;

    ResponsePayload::new(
        db_result.is_ok(),
        &db_result.ok(),
        None,
        Some("Error when creating pool".to_string()),
    )
}
