use actix_web::{delete, get, http::StatusCode, post, web, Responder};
use serde::Deserialize;

use crate::{
    db::{collections::DevicePoolsCollection, IlixDB},
    utils::{is_key_phrase, is_str_empty},
};

use super::ResponsePayload;

#[get("/{pool_kp}")]
async fn get_pool(db: web::Data<IlixDB>, key_phrase: web::Path<String>) -> impl Responder {
    if is_str_empty(&key_phrase) || is_key_phrase(&key_phrase) {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let db_result = db.client.get_pool(key_phrase.to_owned()).await;
    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}

#[derive(Deserialize)]
struct UpdatePoolPayload {
    device_id: String,
}

#[post("/{pool_kp}/join")]
async fn join_pool(
    db: web::Data<IlixDB>,
    info: web::Json<UpdatePoolPayload>,
    key_phrase: web::Path<String>,
) -> impl Responder {
    if is_str_empty(&key_phrase) || is_str_empty(&info.device_id) || is_key_phrase(&key_phrase) {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let db_result = db
        .client
        .join_pool(key_phrase.to_owned(), info.device_id.to_owned())
        .await;

    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}

#[delete("/{pool_kp}/leave")]
async fn leave_pool(
    db: web::Data<IlixDB>,
    info: web::Json<UpdatePoolPayload>,
    key_phrase: web::Path<String>,
) -> impl Responder {
    if is_str_empty(&key_phrase) || is_str_empty(&info.device_id) || is_key_phrase(&key_phrase) {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let db_result = db
        .client
        .leave_pool(key_phrase.to_owned(), info.device_id.to_owned())
        .await;

    match db_result {
        Ok(_) => ResponsePayload::new(true, &(), None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}

#[derive(Deserialize)]
struct NewPoolPayload {
    name: String,
    device_id: String,
}

#[post("/new")]
async fn new_pool(db: web::Data<IlixDB>, info: web::Json<NewPoolPayload>) -> impl Responder {
    if is_str_empty(&info.name) || is_str_empty(&info.device_id) {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Empty Args".to_string()),
        );
    }

    let db_result = db
        .client
        .new_pool(info.name.to_owned(), info.device_id.to_owned())
        .await;

    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}
