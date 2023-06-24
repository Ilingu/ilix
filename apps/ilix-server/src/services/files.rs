use std::io::Write;

use actix_files::NamedFile;
use actix_web::{delete, get, http::StatusCode, web, Either, Responder, Result};

use crate::{
    app::ServerErrors,
    db::{
        collections::{FilePoolTransferCollection, FileStorageGridFS},
        IlixDB,
    },
    utils::is_str_empty,
};

use super::ResponsePayload;

// if client wants to get multiple files at once, it musts call async this endpoint and handle the Promises on their own
type GetFileResult = Either<ResponsePayload, Result<NamedFile>>;
#[get("/{file_id}")]
async fn get_file(db: web::Data<IlixDB>, file_id: web::Path<String>) -> GetFileResult {
    println!("here");
    if is_str_empty(&file_id) {
        return Either::Left(ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        ));
    }

    let db_result = db.client.get_file(file_id.to_owned()).await;
    match db_result {
        Ok((filename, filebuf)) => {
            let filepath = format!("./tmp/{filename}");
            if let Ok(Ok(mut f)) = web::block(|| std::fs::File::create(filepath)).await {
                if let Ok(Ok(_)) = web::block(move || f.write_all(&filebuf)).await {
                    if let Ok(file) = NamedFile::open_async(format!("./tmp/{filename}")).await {
                        return Either::Right(Ok(file));
                    }
                }
            }
        }
        Err(err) => {
            return Either::Left(ResponsePayload::new(
                false,
                &(),
                None,
                Some(err.to_string()),
            ))
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
        return ResponsePayload::new(
            false,
            &(),
            Some(StatusCode::BAD_REQUEST),
            Some("Bad Args".to_string()),
        );
    }

    let db_result = db.client.remove_transfer_file(file_id.to_owned()).await;
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

    let db_result = db.client.delete_file(file_id.to_owned()).await;
    match db_result {
        Ok(_) => ResponsePayload::new(true, &(), None, None),
        Err(err) => ResponsePayload::new(false, &(), None, Some(err.to_string())),
    }
}
