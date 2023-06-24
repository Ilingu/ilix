use actix_web::{delete, get, http::StatusCode, post, web, Responder};

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
