use actix_web::{get, http::StatusCode, web, Either};
use actix_web_lab::sse::ChannelStream;
use serde::Deserialize;

use crate::{
    db::{collections::DevicePoolsCollection, IlixDB},
    services::BAD_ARGS_RESP,
    utils::{errors::ServerErrors, keyphrase::KeyPhrase, sse::Broadcaster},
};

use super::ResponsePayload;

#[derive(Deserialize)]
struct EventPayload {
    key_phrase: String,
    device_id: String,
}

type RegisterResult = Either<ResponsePayload, actix_web_lab::sse::Sse<ChannelStream>>;
#[get("/events")]
async fn event_stream(
    db: web::Data<IlixDB>,
    sse: web::Data<Broadcaster>,
    query: web::Query<EventPayload>,
) -> RegisterResult {
    let key_phrase = match KeyPhrase::try_from(query.key_phrase.to_owned()) {
        Ok(d) => d,
        Err(_) => return Either::Left(BAD_ARGS_RESP.clone()),
    };

    if let Err(err) = db.client.get_pool(&key_phrase).await {
        let err_status_code = match err {
            ServerErrors::PoolNotFound => Some(StatusCode::NOT_FOUND),
            _ => None,
        };
        return Either::Left(ResponsePayload::new(
            false,
            &(),
            err_status_code,
            Some(err.to_string()),
        ));
    };

    match sse.new_client(&query.device_id, &key_phrase).await {
        Ok(channel) => Either::Right(channel),
        Err(err) => Either::Left(ResponsePayload::new(
            false,
            &(),
            None,
            Some(err.to_string()),
        )),
    }
}
