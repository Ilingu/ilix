use std::{fmt, str::FromStr};

use actix_web::{get, http::StatusCode, web, Responder};
use mongodb::bson::oid::ObjectId;
use serde::{de, Deserialize};

use crate::{
    app::ServerErrors,
    db::{collections::FileStorageGridFS, IlixDB},
    services::BAD_ARGS_RESP,
};

use super::ResponsePayload;

#[derive(Deserialize)]
struct GetFilesInfoPayload {
    #[serde(deserialize_with = "deserialize_stringified_files_ids_list")]
    files_ids: Vec<String>,
}
fn deserialize_stringified_files_ids_list<'de, D>(deserializer: D) -> Result<Vec<String>, D::Error>
where
    D: de::Deserializer<'de>,
{
    struct StringVecVisitor;

    impl<'de> de::Visitor<'de> for StringVecVisitor {
        type Value = Vec<String>;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            write!(formatter, "a string containing a list of files ids")
        }

        fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
        where
            E: de::Error,
        {
            let mut ids = vec![];
            for id in v.split(',') {
                ObjectId::from_str(id).map_err(|_| E::custom("Invalid ObjectID"))?;
                ids.push(id.to_string());
            }
            Ok(ids)
        }
    }

    deserializer.deserialize_any(StringVecVisitor)
}

#[get("/info")]
async fn get_files_info(
    db: web::Data<IlixDB>,
    query: web::Query<GetFilesInfoPayload>,
) -> impl Responder {
    if query.files_ids.is_empty() {
        return BAD_ARGS_RESP.clone();
    }

    let db_result = db.client.get_files_info(&query.files_ids).await;
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
