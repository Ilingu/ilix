mod db;
mod extractors;
mod services;
mod utils;

use actix_web::{middleware::Logger, web, App, HttpServer};
use anyhow::Result;
use db::{
    collections::{DevicePoolsCollection, FilePoolTransferCollection},
    IlixDB,
};
use env_logger::Env;
use services::{
    events::event_stream,
    file::{delete_file, get_file},
    file_transfer::{add_files_to_transfer, create_transfer, delete_transfer, get_all_transfer},
    files::get_files_info,
    pool::{delete_pool, get_pool, join_pool, leave_pool, new_pool},
};
use std::env;
use std::sync::Arc;
use utils::{console_log, is_prod, sse::Broadcaster};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().expect("Couldn't load env variables");
    let srv_addr = get_server_addr().expect("Couldn't get server addr");

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

    // launch SSE module
    let see_broadcaster = Broadcaster::create();

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
            // app datas
            .app_data(web::Data::new(db.clone()))
            .app_data(web::Data::from(Arc::clone(&see_broadcaster)))
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
            .service(event_stream)
    })
    .bind(srv_addr)?
    .run()
    .await
}

pub fn get_server_addr() -> Result<(&'static str, u16)> {
    let port = env::var("PORT")?.parse::<u16>()?;
    Ok(match is_prod() {
        true => ("0.0.0.0", port),
        false => ("127.0.0.1", port),
    })
}
