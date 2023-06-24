use actix_multipart::Multipart;
use actix_web::web::Buf;
use actix_web::{delete, get, http::StatusCode, post, web, Responder};
use serde::Deserialize;
use std::io::prelude::*;
use tokio_stream::StreamExt;
use uuid::Uuid;

use crate::db::collections::FileStorageGridFS;
use crate::{
    app::ServerErrors,
    db::{collections::FilePoolTransferCollection, IlixDB},
    utils::{is_key_phrase, is_str_empty},
};

use super::ResponsePayload;

#[get("/{pool_kp}/{device_id}/all")]
async fn get_all_transfer(
    db: web::Data<IlixDB>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (pool_kp, device_id) = path.into_inner();
    if is_str_empty(&pool_kp) || is_str_empty(&device_id) || is_key_phrase(&pool_kp) {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let db_result = db.client.find_transfers(pool_kp, device_id).await;
    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::NoDatas => StatusCode::NO_CONTENT,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}

#[derive(Deserialize)]
struct AddTransferPayload {
    from: String,
    to: String,
}

/// add_transfer both add the transfer object and the files attached to it
#[post("/{pool_kp}/add")]
async fn add_transfer(
    db: web::Data<IlixDB>,
    query: web::Query<AddTransferPayload>,
    key_phrase: web::Path<String>,
    mut form: Multipart,
) -> impl Responder {
    if is_str_empty(&key_phrase)
        || is_str_empty(&query.to)
        || is_str_empty(&query.from)
        || is_key_phrase(&key_phrase)
    {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let mut files = vec![];
    // iterate over multipart stream
    while let Ok(Some(mut field)) = form.try_next().await {
        // A multipart/form-data stream has to contain `content_disposition`

        let mut file_buf = vec![];
        // Field in turn is stream of *Bytes* object
        while let Ok(Some(chunk)) = field.try_next().await {
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
        match db.client.add_file(&filename, &file_buffer).await {
            Ok(file_id) => files_id.push(file_id),
            Err(err) => return ResponsePayload::new(false, &(), None, Some(err.to_string())),
        }
    }

    let db_result = db
        .client
        .add_transfer(
            key_phrase.to_owned(),
            query.from.to_owned(),
            query.to.to_owned(),
            files_id,
        )
        .await;

    match db_result {
        Ok(datas) => ResponsePayload::new(true, &datas, None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}

#[delete("/{pool_kp}/{device_id}/{transfer_id}")]
async fn delete_transfer(
    db: web::Data<IlixDB>,
    path: web::Path<(String, String, String)>,
) -> impl Responder {
    let (pool_kp, device_id, transfer_id) = path.into_inner();
    if is_str_empty(&pool_kp)
        || is_str_empty(&device_id)
        || is_str_empty(&transfer_id)
        || is_key_phrase(&pool_kp)
    {
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let db_result = db
        .client
        .delete_transfer(pool_kp, device_id, transfer_id)
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

    let mut is_err = false;
    for file_id in files_id_to_delete {
        is_err = db.client.delete_file(file_id).await.is_err(); // if there is an error, ignore it to keep the loop running and thus to delete others files
    }

    if is_err {
        ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::MULTI_STATUS),
            Some("Transfer was deleted but some files were not deleted".to_string()),
        )
    } else {
        ResponsePayload::new(true, &(), None, None)
    }
}
