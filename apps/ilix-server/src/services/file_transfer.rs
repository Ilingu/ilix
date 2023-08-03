use crate::db::collections::FileStorageGridFS;
use crate::services::{from_multipart, BAD_ARGS_RESP};
use crate::utils::errors::ServerErrors;
use crate::utils::keyphrase::KeyPhrase;
use crate::utils::sse::{Broadcaster, SSEData};
use crate::{
    db::{collections::FilePoolTransferCollection, IlixDB},
    utils::is_str_empty,
};

use actix_multipart::Multipart;
use actix_web::{delete, get, http::StatusCode, post, web, Responder};
use serde::Deserialize;

use super::ResponsePayload;

#[get("/{device_id}/all")]
async fn get_all_transfer(
    db: web::Data<IlixDB>,
    key_phrase: KeyPhrase,
    device_id: web::Path<String>,
) -> impl Responder {
    if is_str_empty(&device_id) {
        return BAD_ARGS_RESP.clone();
    }

    let db_result = db.client.find_transfers(&key_phrase, &device_id).await;
    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}

#[derive(Deserialize)]
struct AddTransferPayload {
    from: String,
    to: String,
}

#[post("")]
async fn create_transfer(
    db: web::Data<IlixDB>,
    sse: web::Data<Broadcaster>,
    key_phrase: KeyPhrase,
    query: web::Query<AddTransferPayload>,
    form: Multipart,
) -> impl Responder {
    if is_str_empty(&query.to) || is_str_empty(&query.from) {
        return BAD_ARGS_RESP.clone();
    }

    // parse request files
    let bad_file_resp = ResponsePayload::new(
        false,
        &(),
        Some(StatusCode::BAD_REQUEST),
        Some("Failed to parse file".to_string()),
    );

    let files = match from_multipart(form).await {
        Ok(files) => files,
        Err(_) => return bad_file_resp,
    };
    if files.is_empty() {
        return bad_file_resp;
    }

    // add files to db
    let files_id = match db.client.add_files(files, &key_phrase).await {
        Ok(files_ids) => files_ids,
        Err(err) => return ResponsePayload::new(false, &(), None, Some(err.to_string())),
    };

    // create transfer with files ids
    let db_result = db
        .client
        .create_transfer(&key_phrase, &query.from, &query.to, &files_id)
        .await;

    match db_result {
        Ok(transfer) => {
            let t_id = transfer._id.clone();
            tokio::spawn(async move {
                let _ = sse
                    .broadcast_to(
                        &[query.to.to_owned()],
                        &key_phrase,
                        SSEData::Transfer(transfer),
                    )
                    .await;
            });
            ResponsePayload::new(true, &t_id, None, None)
        }
        Err(err) => {
            let _ = db.client.delete_files(&files_id).await; // failed to create transfer, delete all added files
            let err_status_code = match err {
                ServerErrors::NotInPool => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}

/// attach files to a transfer
#[post("/{transfer_id}/add_files")]
async fn add_files_to_transfer(
    db: web::Data<IlixDB>,
    sse: web::Data<Broadcaster>,
    key_phrase: KeyPhrase,
    transfer_id: web::Path<String>,
    form: Multipart,
) -> impl Responder {
    if is_str_empty(&transfer_id) {
        return BAD_ARGS_RESP.clone();
    }

    let bad_file_resp = ResponsePayload::new(
        false,
        &(),
        Some(StatusCode::BAD_REQUEST),
        Some("Failed to parse file".to_string()),
    );

    // parse request files
    let files = match from_multipart(form).await {
        Ok(files) => files,
        Err(_) => return bad_file_resp,
    };
    if files.is_empty() {
        return bad_file_resp;
    }

    // add files to db
    let files_id = match db.client.add_files(files, &key_phrase).await {
        Ok(fids) => fids,
        Err(err) => return ResponsePayload::new(false, &(), None, Some(err.to_string())),
    };

    // add files to transfer
    let db_result = db
        .client
        .add_files_to_transfer(&files_id, &transfer_id, &key_phrase)
        .await;

    match db_result {
        Ok(transfer) => {
            tokio::spawn(async move {
                let _ = sse
                    .broadcast_to(
                        &[transfer.to.clone()],
                        &key_phrase,
                        SSEData::Transfer(transfer),
                    )
                    .await;
            });
            ResponsePayload::new(true, &files_id, None, None)
        }
        Err(err) => {
            let _ = db.client.delete_files(&files_id).await; // failed to add transfer, delete all added files
            let err_status_code = match err {
                ServerErrors::TransferNotFound => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}

#[delete("/{device_id}/{transfer_id}")]
async fn delete_transfer(
    db: web::Data<IlixDB>,
    key_phrase: KeyPhrase,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (device_id, transfer_id) = path.into_inner();

    if is_str_empty(&device_id) || is_str_empty(&transfer_id) {
        return BAD_ARGS_RESP.clone();
    }

    let db_result = db
        .client
        .delete_transfer(&key_phrase, &device_id, &transfer_id)
        .await;

    let files_id_to_delete = match db_result {
        Ok(fid) => fid,
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::TransferNotFound => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };

            return ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()));
        }
    };

    if let Err(err) = db.client.delete_files(&files_id_to_delete).await {
        let err_status_code = match err {
            ServerErrors::InvalidObjectId => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        };

        ResponsePayload::new(
            false,
            &(),
            Some(err_status_code),
            Some("Transfer was deleted but some files were not deleted".to_string()),
        )
    } else {
        ResponsePayload::new(true, &(), None, None)
    }
}
