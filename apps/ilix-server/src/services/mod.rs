mod file_transfer;
pub mod pool;

use actix_web::{
    body::BoxBody,
    http::{header::ContentType, StatusCode},
    HttpRequest, HttpResponse, HttpResponseBuilder, Responder,
};
use serde::Serialize;

#[derive(Serialize)]
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
        error_status: Option<StatusCode>,
        error_reason: Option<String>,
    ) -> Self {
        let data = if success {
            match serde_json::to_string(&data) {
                Ok(jsonstr) => Some(jsonstr),
                Err(_) => {
                    success = false;
                    None
                }
            }
        } else {
            None
        };

        Self {
            success,
            status_code: if success {
                StatusCode::OK.as_u16()
            } else {
                error_status
                    .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
                    .as_u16()
            },
            reason: if success || error_reason.is_none() {
                None
            } else {
                #[allow(clippy::unnecessary_unwrap)]
                Some(error_reason.unwrap())
            },
            data,
        }
    }
}

impl Responder for ResponsePayload {
    type Body = BoxBody;

    fn respond_to(self, _req: &HttpRequest) -> HttpResponse<Self::Body> {
        // Create response and set content type
        HttpResponseBuilder::new(StatusCode::from_u16(self.status_code).unwrap())
            .content_type(ContentType::json())
            .json(self)
    }
}
