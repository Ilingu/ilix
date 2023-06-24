pub mod file_transfer;
pub mod files;
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
        let data = match success {
            true => match serde_json::to_string(&data) {
                Ok(json_str) => Some(json_str),
                Err(_) => {
                    success = false;
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
        HttpResponseBuilder::new(StatusCode::from_u16(self.status_code).unwrap())
            .content_type(ContentType::json())
            .json(self)
    }
}
