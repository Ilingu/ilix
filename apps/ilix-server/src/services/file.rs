use std::io::Write;

use actix_files::NamedFile;
use actix_web::{delete, get, http::StatusCode, web, Either, Responder, Result};
use uuid::Uuid;

use crate::{
    db::{
        collections::{FilePoolTransferCollection, FileStorageGridFS},
        IlixDB,
    },
    services::BAD_ARGS_RESP,
    utils::{errors::ServerErrors, is_str_empty, keyphrase::KeyPhrase},
};

use super::ResponsePayload;

// if client wants to get multiple files at once, it musts call async this endpoint and handle the Promises on their own
type GetFileResult = Either<ResponsePayload, Result<NamedFile>>;
#[get("/{file_id}")]
async fn get_file(
    db: web::Data<IlixDB>,
    file_id: web::Path<String>,
    key_phrase: KeyPhrase,
) -> GetFileResult {
    if is_str_empty(&file_id) {
        return Either::Left(BAD_ARGS_RESP.clone());
    }

    let db_result = db.client.get_file(&file_id, &key_phrase).await;
    match db_result {
        Ok((filename, filebuf)) => {
            let filepath = format!("./tmp/{}-{filename}", Uuid::new_v4());
            let filepath2 = filepath.clone();
            let filepath3 = filepath.clone();

            if let Ok(Ok(mut f)) = web::block(|| std::fs::File::create(filepath)).await {
                if let Ok(Ok(_)) = web::block(move || f.write_all(&filebuf)).await {
                    if let Ok(file) = NamedFile::open_async(filepath2).await {
                        scopeguard::defer! {
                            let _ = std::fs::remove_file(filepath3);
                        };

                        return Either::Right(Ok(file));
                    }
                }
            }
        }
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::InvalidObjectId => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };

            return Either::Left(ResponsePayload::new(
                false,
                &(),
                Some(err_status_code),
                Some(err.to_string()),
            ));
        }
    };

    Either::Left(ResponsePayload::new(
        false,
        &(),
        None,
        Some("Couldn't send file".to_string()),
    ))
}

#[delete("/{file_id}")]
async fn delete_file(db: web::Data<IlixDB>, file_id: web::Path<String>) -> impl Responder {
    if is_str_empty(&file_id) {
        return BAD_ARGS_RESP.clone();
    }

    let db_result = db.client.remove_transfer_file(&file_id).await;
    if let Err(err) = db_result {
        if err != ServerErrors::NotInTransfer && err != ServerErrors::TransferNotFound {
            return ResponsePayload::new(
                false,
                &(),
                Some(StatusCode::CONFLICT),
                Some(err.to_string()),
            );
        }
    }

    let db_result = db.client.delete_files(&[file_id.into_inner()]).await;
    match db_result {
        Ok(_) => ResponsePayload::new(true, &(), None, None),
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::InvalidObjectId => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}
