use std::env;

use crate::utils::is_prod;

#[derive(Clone, Copy)]
pub struct AppState<'a> {
    pub is_prod: bool,
    pub version: &'a str,
}

impl Default for AppState<'_> {
    fn default() -> Self {
        Self {
            is_prod: is_prod(),
            version: "0.0.1-alpha",
        }
    }
}

impl AppState<'_> {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_server_addr(&self) -> Result<(&str, u16), ()> {
        let port = env::var("PORT")
            .map_err(|_| ())?
            .parse::<u16>()
            .map_err(|_| ())?;

        Ok(match self.is_prod {
            true => ("0.0.0.0", port),
            false => ("127.0.0.1", port),
        })
    }
}
