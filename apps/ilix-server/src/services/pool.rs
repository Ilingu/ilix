use actix_web::{delete, get, http::StatusCode, post, put, web, Responder};
use serde::Deserialize;

use crate::{
    db::{collections::DevicePoolsCollection, IlixDB},
    services::BAD_ARGS_RESP,
    utils::{
        errors::ServerErrors,
        is_str_empty,
        keyphrase::KeyPhrase,
        sse::{Broadcaster, SSEData},
    },
};

use super::ResponsePayload;

#[get("")]
async fn get_pool(db: web::Data<IlixDB>, key_phrase: KeyPhrase) -> impl Responder {
    let db_result = db.client.get_pool(&key_phrase).await;
    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::PoolNotFound => Some(StatusCode::NOT_FOUND),
                _ => None,
            };
            ResponsePayload::new(false, &(), err_status_code, Some(err.to_string()))
        }
    }
}

#[derive(Deserialize)]
struct JoinPoolPayload {
    device_id: String,
    device_name: String,
}

#[put("/join")]
async fn join_pool(
    db: web::Data<IlixDB>,
    sse: web::Data<Broadcaster>,
    info: web::Json<JoinPoolPayload>,
    key_phrase: KeyPhrase,
) -> impl Responder {
    if is_str_empty(&info.device_id) {
        return BAD_ARGS_RESP.clone();
    }

    let info = info.0;
    let db_result = db
        .client
        .join_pool(&key_phrase, &info.device_id, &info.device_name)
        .await;

    match db_result {
        Ok(datas) => {
            let sse_data = datas.clone();
            tokio::spawn(async move {
                let _ = sse
                    .broadcast_to(
                        &sse_data.devices_id.clone(),
                        &key_phrase,
                        SSEData::Pool(sse_data),
                    )
                    .await;
            });
            ResponsePayload::new(true, &datas, None, None)
        }
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

#[delete("/leave")]
async fn leave_pool(
    db: web::Data<IlixDB>,
    sse: web::Data<Broadcaster>,
    info: web::Json<LeavePoolPayload>,
    key_phrase: KeyPhrase,
) -> impl Responder {
    if is_str_empty(&info.device_id) {
        return BAD_ARGS_RESP.clone();
    }

    let db_result = db.client.leave_pool(&key_phrase, &info.device_id).await;
    match db_result {
        Ok(pool) => {
            tokio::spawn(async move {
                let _ = sse
                    .broadcast_to(&pool.devices_id.clone(), &key_phrase, SSEData::Pool(pool))
                    .await;
            });
            ResponsePayload::new(true, &(), None, None)
        }
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
async fn delete_pool(
    db: web::Data<IlixDB>,
    sse: web::Data<Broadcaster>,
    key_phrase: KeyPhrase,
) -> impl Responder {
    let db_result = db.client.delete_pool(&key_phrase).await;
    match db_result {
        Ok(pool) => {
            tokio::spawn(async move {
                let _ = sse
                    .broadcast_to(&pool.devices_id.clone(), &key_phrase, SSEData::Logout)
                    .await;
            });
            ResponsePayload::new(true, &(), None, None)
        }
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
