use actix_web::{get, http::StatusCode, web, Responder};
use serde::Deserialize;

use crate::{
    app::ServerErrors,
    db::{collections::FileStorageGridFS, IlixDB},
    services::BAD_ARGS_RESP,
};

use super::ResponsePayload;

#[derive(Deserialize)]
struct GetFilesInfoPayload {
    files_ids: Vec<String>,
}

#[get("/info")]
async fn get_files_info(
    db: web::Data<IlixDB>,
    info: web::Json<GetFilesInfoPayload>,
) -> impl Responder {
    if info.files_ids.is_empty() {
        return BAD_ARGS_RESP.clone();
    }

    let db_result = db.client.get_files_info(&info.files_ids).await;
    match db_result {
        Ok(files_info) => ResponsePayload::new(true, &files_info, None, None),
        Err(err) => {
            let err_status_code = match err {
                ServerErrors::InvalidObjectId => StatusCode::BAD_REQUEST,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            };
            ResponsePayload::new(false, &(), Some(err_status_code), Some(err.to_string()))
        }
    }
}
