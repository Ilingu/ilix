use actix_web::{delete, get, http::StatusCode, post, put, web, Responder};
use serde::Deserialize;

use crate::{
    app::ServerErrors,
    db::{collections::DevicePoolsCollection, IlixDB},
    services::BAD_ARGS_RESP,
    utils::{is_str_empty, keyphrase::KeyPhrase},
};

use super::ResponsePayload;

#[get("/{key_phrase}")]
async fn get_pool(db: web::Data<IlixDB>, key_phrase: web::Path<String>) -> impl Responder {
    let key_phrase = match KeyPhrase::try_from(key_phrase) {
        Ok(d) => d,
        Err(_) => return BAD_ARGS_RESP.clone(),
    };

    let db_result = db.client.get_pool(&key_phrase).await;
    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}

#[derive(Deserialize)]
struct JoinPoolPayload {
    device_id: String,
    device_name: String,
}

#[put("/{key_phrase}/join")]
async fn join_pool(
    db: web::Data<IlixDB>,
    info: web::Json<JoinPoolPayload>,
    key_phrase: web::Path<String>,
) -> impl Responder {
    let key_phrase = match KeyPhrase::try_from(key_phrase) {
        Ok(d) => d,
        Err(_) => return BAD_ARGS_RESP.clone(),
    };
    if is_str_empty(&info.device_id) {
        return BAD_ARGS_RESP.clone();
    }

    let info = info.0;
    let db_result = db
        .client
        .join_pool(&key_phrase, &info.device_id, &info.device_name)
        .await;

    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::AlreadyInPool => StatusCode::CONFLICT,
                ServerErrors::PoolNotFound => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };

            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}

#[derive(Deserialize)]
struct LeavePoolPayload {
    device_id: String,
}

#[delete("/{key_phrase}/leave")]
async fn leave_pool(
    db: web::Data<IlixDB>,
    info: web::Json<LeavePoolPayload>,
    key_phrase: web::Path<String>,
) -> impl Responder {
    let key_phrase = match KeyPhrase::try_from(key_phrase) {
        Ok(d) => d,
        Err(_) => return BAD_ARGS_RESP.clone(),
    };
    if is_str_empty(&info.device_id) {
        return BAD_ARGS_RESP.clone();
    }

    let db_result = db.client.leave_pool(&key_phrase, &info.device_id).await;
    match db_result {
        Ok(_) => ResponsePayload::new(true, &(), None, None),
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::NotInPool => StatusCode::CONFLICT,
                ServerErrors::PoolNotFound => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };

            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}

#[derive(Deserialize)]
pub struct NewPoolPayload {
    pub name: String,
    pub device_id: String,
    pub device_name: String,
}

#[post("/new")]
async fn new_pool(db: web::Data<IlixDB>, info: web::Json<NewPoolPayload>) -> impl Responder {
    if is_str_empty(&info.name)
        || is_str_empty(&info.device_id)
        || is_str_empty(&info.device_name)
        || info.name.len() > 50
        || info.device_name.len() > 50
    {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Empty Args".to_string()),
        );
    }

    let db_result = db.client.create_pool(info.0).await;
    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}

#[delete("/{key_phrase}")]
async fn delete_pool(db: web::Data<IlixDB>, key_phrase: web::Path<String>) -> impl Responder {
    let key_phrase = match KeyPhrase::try_from(key_phrase) {
        Ok(d) => d,
        Err(_) => return BAD_ARGS_RESP.clone(),
    };

    let db_result = db.client.delete_pool(&key_phrase).await;
    match db_result {
        Ok(_) => ResponsePayload::new(true, &(), None, None),
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::InvalidObjectId => StatusCode::BAD_REQUEST,
                ServerErrors::PoolNotFound | ServerErrors::TransferNotFound => {
                    StatusCode::NOT_FOUND
                }
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };

            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}
