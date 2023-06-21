mod app;
mod db;
mod services;
mod utils;

use actix_web::{web, App, HttpServer};
use app::AppState;
use db::IlixDB;
use services::users::{login, sign_up};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();

    let app = AppState::new();
    let srv_addr = app.get_server_addr().expect("Couldn't get server addr");

    let db = IlixDB::connect().await.unwrap();

    HttpServer::new(move || {
        App::new()
            .service(web::scope("/users").service(login).service(sign_up))
            .app_data(web::Data::new(db.clone()))
            .app_data(web::Data::new(app))
    })
    .bind(srv_addr)?
    .run()
    .await
}
