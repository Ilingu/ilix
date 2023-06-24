mod app;
mod db;
mod services;
mod utils;

use actix_web::{middleware::Logger, web, App, HttpServer};
use app::AppState;
use db::{collections::DevicePoolsCollection, IlixDB};
use env_logger::Env;
use services::pool::{get_pool, join_pool, leave_pool, new_pool};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().expect("Couldn't load env variables");
    let app = AppState::new();
    let srv_addr = app.get_server_addr().expect("Couldn't get server addr");

    let db = IlixDB::connect()
        .await
        .expect("Couldn't connect to mongodb database");
    db.client
        .create_hashed_kp_index()
        .await
        .expect("creating an index should succeed");

    env_logger::init_from_env(Env::default().default_filter_or("info"));
    HttpServer::new(move || {
        App::new()
            // Req Logger
            .wrap(Logger::default())
            .wrap(Logger::new("%a %{User-Agent}i"))
            // services
            .service(
                web::scope("/pool")
                    .service(new_pool)
                    .service(get_pool)
                    .service(join_pool)
                    .service(leave_pool),
            )
            .service(web::scope("/file-transfer"))
            .app_data(web::Data::new(db.clone()))
            .app_data(web::Data::new(app))
    })
    .bind(srv_addr)?
    .run()
    .await
}
