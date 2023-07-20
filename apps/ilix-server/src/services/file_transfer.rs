use actix_multipart::Multipart;
use actix_web::web::Buf;
use actix_web::{delete, get, http::StatusCode, post, web, Responder};
use serde::Deserialize;
use std::io::prelude::*;
use tokio_stream::StreamExt;
use uuid::Uuid;

use crate::db::collections::FileStorageGridFS;
use crate::services::BAD_ARGS_RESP;
use crate::utils::keyphrase::KeyPhrase;
use crate::{
    app::ServerErrors,
    db::{collections::FilePoolTransferCollection, IlixDB},
    utils::is_str_empty,
};

use super::ResponsePayload;

#[get("/{key_phrase}/{device_id}/all")]
async fn get_all_transfer(
    db: web::Data<IlixDB>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (key_phrase, device_id) = path.into_inner();
    let key_phrase = match KeyPhrase::try_from(key_phrase) {
        Ok(d) => d,
        Err(_) => return BAD_ARGS_RESP.clone(),
    };
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

/// create_transfer only create an empty transfer object in db, client must call `add_files_to_transfer` afterhand to attach files to the transfer
#[post("/{key_phrase}/new")]
async fn create_transfer(
    db: web::Data<IlixDB>,
    query: web::Query<AddTransferPayload>,
    key_phrase: web::Path<String>,
) -> impl Responder {
    let key_phrase = match KeyPhrase::try_from(key_phrase) {
        Ok(d) => d,
        Err(_) => return BAD_ARGS_RESP.clone(),
    };
    if is_str_empty(&query.to) || is_str_empty(&query.from) {
        return BAD_ARGS_RESP.clone();
    }

    let db_result = db
        .client
        .create_transfer(&key_phrase, &query.from, &query.to)
        .await;

    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::NotInPool => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}

/// attach files to a transfer
#[post("/{key_phrase}/{transfer_id}/add_files")]
async fn add_files_to_transfer(
    db: web::Data<IlixDB>,
    path: web::Path<(String, String)>,
    mut form: Multipart,
) -> impl Responder {
    let (key_phrase, transfer_id) = path.into_inner();
    let key_phrase = match KeyPhrase::try_from(key_phrase) {
        Ok(d) => d,
        Err(_) => return BAD_ARGS_RESP.clone(),
    };

    if is_str_empty(&transfer_id) {
        return BAD_ARGS_RESP.clone();
    }

    let bad_file_resp = ResponsePayload::new(
        false,
        &(),
        Some(StatusCode::BAD_REQUEST),
        Some("Failed to parse file".to_string()),
    );

    let mut files = vec![];
    // iterate over multipart stream
    while let Some(mut field) = match form.try_next().await {
        Ok(data) => data,
        Err(_) => return bad_file_resp,
    } {
        // A multipart/form-data stream has to contain `content_disposition`

        let mut file_buf = vec![];
        // Field in turn is stream of *Bytes* object
        while let Some(chunk) = match field.try_next().await {
            Ok(data) => data,
            Err(_) => return bad_file_resp,
        } {
            let mut reader = chunk.reader();
            let _ = reader.read_to_end(&mut file_buf);
        }

        let filename = field
            .content_disposition()
            .get_filename()
            .unwrap_or(&Uuid::new_v4().to_string())
            .to_string();

        files.push((filename, file_buf));
    }

    if files.is_empty() {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Error when parsing files".to_string()),
        );
    }

    let mut files_id = vec![];
    for (filename, file_buffer) in files {
        match db
            .client
            .encrypt_and_add_file(&filename, &file_buffer, &key_phrase)
            .await
        {
            Ok(file_id) => files_id.push(file_id),
            Err(err) => return ResponsePayload::new(false, &(), None, Some(err.to_string())),
        }
    }

    let db_result = db
        .client
        .add_files_to_transfer(&files_id, &transfer_id, &key_phrase)
        .await;

    match db_result {
        Ok(_) => ResponsePayload::new(true, &files_id, None, None),
        Err(err) => {
            // failed to add transfer, delete all added files
            for file_id in files_id {
                let _ = db.client.delete_file(&file_id).await;
            }

            let err_status_code = match err {
                ServerErrors::TransferNotFound => StatusCode::NOT_FOUND,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}

#[delete("/{key_phrase}/{device_id}/{transfer_id}")]
async fn delete_transfer(
    db: web::Data<IlixDB>,
    path: web::Path<(String, String, String)>,
) -> impl Responder {
    let (key_phrase, device_id, transfer_id) = path.into_inner();
    let key_phrase = match KeyPhrase::try_from(key_phrase) {
        Ok(d) => d,
        Err(_) => return BAD_ARGS_RESP.clone(),
    };

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

    let mut err = None;
    for file_id in files_id_to_delete {
        err = db.client.delete_file(&file_id).await.err(); // if there is an error, ignore it to keep the loop running and thus to delete others files
    }

    if let Some(err) = err {
        let err_status_code = match err {
            ServerErrors::InvalidObjectId => StatusCode::BAD_REQUEST,
            _ => StatusCode::MULTI_STATUS,
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
