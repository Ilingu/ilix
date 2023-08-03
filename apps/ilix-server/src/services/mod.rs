pub mod events;
pub mod file;
pub mod file_transfer;
pub mod files;
pub mod pool;

use std::{fmt::Display, io::Read};

use actix_multipart::Multipart;
use actix_web::{
    body::BoxBody,
    http::{header::ContentType, StatusCode},
    web::Buf,
    HttpRequest, HttpResponse, HttpResponseBuilder, Responder, ResponseError,
};
use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;
use serde::Serialize;
use tokio_stream::StreamExt;
use uuid::Uuid;

static BAD_ARGS_RESP: Lazy<ResponsePayload> = Lazy::new(|| {
    ResponsePayload::new(
        false,
        &(),
        Some(StatusCode::BAD_REQUEST),
        Some("Bad Args".to_string()),
    )
});

#[derive(Serialize, Clone, Debug)]
pub struct ResponsePayload {
    success: bool,
    status_code: u16,

    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<String>,
}

impl ResponsePayload {
    pub fn new<T: ?Sized + Serialize>(
        mut success: bool,
        data: &T,
        mut error_status: Option<StatusCode>,
        mut error_reason: Option<String>,
    ) -> Self {
        let data = match success {
            true => match serde_json::to_string(data) {
                Ok(json_str) => Some(json_str),
                Err(err) => {
                    success = false;
                    error_status = Some(StatusCode::INTERNAL_SERVER_ERROR);
                    error_reason = Some(format!("serde: failed to stringify json response: {err}"));
                    None
                }
            },
            false => None,
        };

        Self {
            success,
            data,
            status_code: match success {
                true => StatusCode::OK.as_u16(),
                false => error_status
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
                    .as_u16(),
            },
            reason: match success {
                true => None,
                false => Some(error_reason.unwrap_or("No error message provided".to_string())),
            },
        }
    }
}

impl Responder for ResponsePayload {
    type Body = BoxBody;

    fn respond_to(self, _req: &HttpRequest) -> HttpResponse<Self::Body> {
        // Create response and set content type
        let statuc_code = StatusCode::from_u16(self.status_code).unwrap_or(if self.success {
            StatusCode::OK
        } else {
            StatusCode::INTERNAL_SERVER_ERROR
        });
        HttpResponseBuilder::new(statuc_code)
            .content_type(ContentType::json())
            .json(self)
    }
}

impl Display for ResponsePayload {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{self:?}")
    }
}

impl ResponseError for ResponsePayload {
    fn error_response(&self) -> HttpResponse<BoxBody> {
        let status_code = StatusCode::from_u16(self.status_code).unwrap_or(Self::status_code(self));
        HttpResponseBuilder::new(status_code)
            .content_type(ContentType::json())
            .json(self)
    }
}

pub async fn from_multipart(mut form: Multipart) -> Result<Vec<(String, Vec<u8>)>> {
    let mut files = vec![];
    // iterate over multipart stream
    while let Some(mut field) = form.try_next().await.map_err(|_| anyhow!(""))? {
        // A multipart/form-data stream has to contain `content_disposition`

        let mut file_buf = vec![];
        // Field in turn is stream of *Bytes* object
        while let Some(chunk) = field.try_next().await.map_err(|_| anyhow!(""))? {
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
    Ok(files)
}
