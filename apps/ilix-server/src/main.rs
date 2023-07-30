mod app;
mod db;
mod services;
mod utils;

use actix_web::{middleware::Logger, web, App, HttpServer};
use app::AppState;
use db::{
    collections::{DevicePoolsCollection, FilePoolTransferCollection},
    IlixDB,
};
use env_logger::Env;
use services::{
    file::{delete_file, get_file},
    file_transfer::{add_files_to_transfer, create_transfer, delete_transfer, get_all_transfer},
    files::get_files_info,
    pool::{delete_pool, get_pool, join_pool, leave_pool, new_pool},
};
use utils::console_log;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().expect("Couldn't load env variables");
    let app = AppState::new();
    let srv_addr = app.get_server_addr().expect("Couldn't get server addr");

    // db connection
    let db = IlixDB::connect()
        .await
        .expect("Couldn't connect to mongodb database");

    // Index creation
    {
        db.client
            .create_pool_hashed_kp_index()
            .await
            .expect("creating an index should succeed");
        db.client
            .create_transfer_hashed_kp_index()
            .await
            .expect("creating an index should succeed");
    }

    // Launch web service
    env_logger::init_from_env(Env::default().default_filter_or("info"));
    console_log(
        &format!("Lauching web service on: {}:{} 🌐", srv_addr.0, srv_addr.1),
        log::Level::Info,
    );
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
                    .service(leave_pool)
                    .service(delete_pool),
            )
            .service(
                web::scope("/file-transfer")
                    .service(get_all_transfer)
                    .service(create_transfer)
                    .service(add_files_to_transfer)
                    .service(delete_transfer),
            )
            .service(web::scope("/file").service(get_file).service(delete_file))
            .service(web::scope("/files").service(get_files_info))
            .app_data(web::Data::new(db.clone()))
            .app_data(web::Data::new(app))
    })
    .bind(srv_addr)?
    .run()
    .await
}
