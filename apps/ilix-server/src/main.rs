mod app;
mod db;
mod services;
mod utils;

use actix_web::{web, App, HttpServer};
use app::AppState;
use db::{collections::DevicePoolsCollection, IlixDB};
use services::pool::{join_pool, leave_pool, new_pool};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    let app = AppState::new();
    let srv_addr = app.get_server_addr().expect("Couldn't get server addr");

    let db = IlixDB::connect().await.unwrap();
    db.client.create_hashed_kp_index().await;

    HttpServer::new(move || {
        App::new()
            .service(
                web::scope("/pool")
                    .service(new_pool)
                    .service(join_pool)
                    .service(leave_pool),
            )
            .app_data(web::Data::new(db.clone()))
            .app_data(web::Data::new(app))
    })
    .bind(srv_addr)?
    .run()
    .await
}
