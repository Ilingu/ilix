use actix_web::{dev::Payload, http::StatusCode, FromRequest, HttpRequest};
use futures_util::future::{err, ok, Ready};

use crate::{services::ResponsePayload, utils::keyphrase::KeyPhrase};

impl FromRequest for KeyPhrase {
    type Error = ResponsePayload;
    type Future = Ready<Result<Self, Self::Error>>;

    #[inline]
    fn from_request(req: &HttpRequest, _: &mut Payload) -> Self::Future {
        let auth = match req.headers().get("Authorization") {
            Some(d) => d,
            None => {
                return err(ResponsePayload::new(
                    false,
                    &(),
                    Some(StatusCode::UNAUTHORIZED),
                    Some("missing 'Authorization' header".to_string()),
                ))
            }
        };
        let kp = match String::from_utf8(auth.as_bytes().to_vec()) {
            Ok(d) => d,
            Err(_) => {
                return err(ResponsePayload::new(
                    false,
                    &(),
                    Some(StatusCode::UNAUTHORIZED),
                    Some("invalid 'Authorization' header".to_string()),
                ))
            }
        };
        match KeyPhrase::try_from(kp) {
            Ok(key_phrase) => ok(key_phrase),
            Err(why) => err(ResponsePayload::new(
                false,
                &(),
                Some(StatusCode::UNAUTHORIZED),
                Some(why.to_string()),
            )),
        }
    }
}
