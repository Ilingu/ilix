#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use crate::{
        db::{
            collections::{DevicePoolsCollection, FilePoolTransferCollection},
            IlixDB,
        },
        services::{
            events::event_stream,
            file::{delete_file, get_file},
            file_transfer::{
                add_files_to_transfer, create_transfer, delete_transfer, get_all_transfer,
            },
            files::get_files_info,
            pool::{delete_pool, get_pool, join_pool, leave_pool, new_pool},
        },
        tests::{DevicesPool, FileInfo, FilePoolTransferExt},
        utils::{
            keyphrase::{KeyPhrase, KEY_PHRASE_LEN},
            sse::Broadcaster,
        },
    };
    use actix_http::{
        header::{HeaderName, HeaderValue},
        Request,
    };
    use actix_web::{
        body::MessageBody,
        dev::{Service, ServiceResponse},
        test,
        web::{self},
        App,
    };
    use futures_util::future;
    use serde::{de, Deserialize};
    use serde_json::json;
    use tokio::join;

    use anyhow::{anyhow, Result};
    use async_trait::async_trait;
    use reqwest::Response;
    use xxhash_rust::xxh3::xxh3_64;

    #[async_trait]
    trait RespJson {
        async fn to_json<T: for<'a> de::Deserialize<'a>>(self) -> Result<T>;
    }

    #[async_trait]
    impl RespJson for Response {
        async fn to_json<T: for<'a> de::Deserialize<'a>>(self) -> Result<T> {
            let raw_body = self.text().await.map_err(|_| anyhow!("failed to read"))?;
            serde_json::from_str(&raw_body).map_err(|_| anyhow!("failed to parse"))
        }
    }

    #[derive(Deserialize)]
    struct ResponsePayload {
        success: bool,
        #[allow(dead_code)]
        status_code: u16,
        reason: Option<String>,
        data: Option<String>,
    }

    impl ResponsePayload {
        fn parse_data<T: for<'a> de::Deserialize<'a>>(&self) -> Result<T, ()> {
            serde_json::from_str::<T>(self.data.as_ref().ok_or(())?).map_err(|_| ())
        }
        fn is_ok(&self) -> bool {
            self.success && self.reason.is_none() && self.data.is_some()
        }
    }

    #[actix_web::test]
    async fn test_full_api() {
        {
            let res = reqwest::get("http://localhost:3000/ping")
                .await
                .expect("This server should be launched before tests");
            let fetch_res = res
                .text()
                .await
                .expect("This server should be launched before tests");
            assert_eq!(
                fetch_res, "pong",
                "This server should be launched before tests"
            );
        }

        dotenv::dotenv().expect("Couldn't load env variables");

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

        let app = test::init_service(
            App::new()
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
                .service(event_stream),
        )
        .await;

        // InvalidKeyPhrase tests
        {
            exec_get_pool(&app, "not valid kp", Some("InvalidKeyPhrase")).await;
            // behind evevy route the "InvalidKeyPhrase" error comes from the same extractor (the same code is executed) so if it work for one it'll work for all the other
        }

        // PoolNotFound tests
        {
            let fake_pool_kp = KeyPhrase::new(KEY_PHRASE_LEN).unwrap().0;
            exec_get_pool(&app, &fake_pool_kp, Some("PoolNotFound")).await;
            exec_join_pool(&app, &fake_pool_kp, "bliwox", Some("PoolNotFound")).await;
            exec_leave_pool(&app, &fake_pool_kp, "bliwox", Some("PoolNotFound")).await;
            exec_delete_pool(&app, &fake_pool_kp, Some("PoolNotFound")).await;
        }

        // TransferNotFound tests
        {
            let fake_pool_kp = KeyPhrase::new(KEY_PHRASE_LEN).unwrap().0;
            exec_delete_file(
                &app,
                &fake_pool_kp,
                "64ca5c14b2d5be5721421a84",
                Some("TransferNotFound"),
            )
            .await;
            exec_delete_transfer(
                &app,
                &fake_pool_kp,
                "64ca5c14b2d5be5721421a84",
                Some("TransferNotFound"),
            )
            .await;
        }

        // check that no transfer exists
        {
            let fake_pool_kp = KeyPhrase::new(KEY_PHRASE_LEN).unwrap().0;
            exec_get_all_transfer(&app, &fake_pool_kp, true).await;
        }

        // check that no file input is an error
        {
            exec_get_files_info(&app, &["64ca5c14b2d5be5721421a84".to_string()], true).await;

            let pool_kp = KeyPhrase::new(KEY_PHRASE_LEN).unwrap().0;
            exec_get_files(&app, &pool_kp, &[], true).await;
        }

        let pool_kp = exec_new_pool(&app).await; // new pool test, must create a pool for next tests

        // get pool test
        {
            let pool = exec_get_pool(&app, &pool_kp, None).await.unwrap();
            assert_eq!(pool.devices_id, vec!["ilingu"]);
            assert_eq!(pool.pool_name, "ilovecat");
        }

        // join
        {
            exec_join_pool(&app, &pool_kp, "bliwox", None).await; // join pool test
            exec_join_pool(&app, &pool_kp, "bliwox", Some("AlreadyInPool")).await;
            // AlreadyInPool pool test
        }

        // leave
        {
            exec_leave_pool(&app, &pool_kp, "bliwox", None).await; // leave pool test
            exec_leave_pool(&app, &pool_kp, "bliwox", Some("NotInPool")).await; // NotInPool pool test
        }

        exec_join_pool(&app, &pool_kp, "bliwox", None).await; // must have two user in pool for next tests

        let transfer_id = exec_create_transfer(&pool_kp, None).await.unwrap();
        {
            let transfers = exec_get_all_transfer(&app, &pool_kp, false).await;

            assert_eq!(transfers.len(), 1);
            assert!(transfers.iter().all(|t| !t.files_id.is_empty()));
            assert_eq!(transfers[0].from, "bliwox");
            assert_eq!(transfers[0].to, "ilingu");
        }

        let added_files_ids = exec_add_files_to_transfer(&pool_kp, &transfer_id, None)
            .await
            .unwrap();

        let transfers = exec_get_all_transfer(&app, &pool_kp, false).await;
        assert_eq!(transfers.len(), 1);
        assert!(transfers.iter().all(|t| !t.files_id.is_empty()));

        let added_transfer = &transfers[0];
        assert!(added_files_ids
            .iter()
            .all(|file_id| added_transfer.files_id.contains(file_id)));
        assert_eq!(added_transfer.files_id.len(), 3);

        // test file getters
        {
            exec_get_files_info(&app, &added_transfer.files_id, false).await;
            {
                let fake_pool_kp = KeyPhrase::new(KEY_PHRASE_LEN).unwrap().0;
                exec_get_files(&app, &fake_pool_kp, &added_transfer.files_id, true).await;
                // decryption error
            }
            exec_get_files(&app, &pool_kp, &added_transfer.files_id, false).await;
        }

        // test delete file
        let deleted_file_id = added_transfer.files_id[0].clone();
        {
            exec_delete_file(&app, &pool_kp, &deleted_file_id, None).await;
        }

        let transfers = exec_get_all_transfer(&app, &pool_kp, false).await;
        assert_eq!(transfers.len(), 1);

        let added_transfer = &transfers[0];

        // check that file has also been deleted of the transfer
        assert!(!added_transfer.files_id.contains(&deleted_file_id));

        // test delete transfer
        {
            exec_delete_transfer(&app, &pool_kp, &transfer_id, None).await;
        }

        // check that transfer really deleted and no files left
        exec_get_all_transfer(&app, &pool_kp, true).await;
        exec_get_files_info(&app, &added_transfer.files_id, true).await;

        // delete everyone in pool should delete pool
        {
            exec_leave_pool(&app, &pool_kp, "bliwox", None).await;
            exec_leave_pool(&app, &pool_kp, "ilingu", None).await;

            exec_get_pool(&app, &pool_kp, Some("PoolNotFound")).await; // check that pool has been deleted
        }

        // test delete pool with files and transfer left in pool
        {
            // recreate a new pool to test if delete pool works
            let pool_kp = exec_new_pool(&app).await;
            exec_join_pool(&app, &pool_kp, "bliwox", None).await;

            let _transfer_id = exec_create_transfer(&pool_kp, None).await.unwrap();
            let transfers = exec_get_all_transfer(&app, &pool_kp, false).await;
            assert_eq!(transfers.len(), 1);
            assert!(transfers.iter().all(|t| !t.files_id.is_empty()));

            let added_transfer = &transfers[0];
            assert_eq!(added_transfer.files_id.len(), 2);
            exec_get_files_info(&app, &added_transfer.files_id, false).await;

            // test delete pool
            {
                exec_delete_pool(&app, &pool_kp, None).await;
            }

            // check that nor pool nor transfer nor files are left
            exec_get_pool(&app, &pool_kp, Some("PoolNotFound")).await;
            exec_get_all_transfer(&app, &pool_kp, true).await;
            exec_get_files_info(&app, &added_transfer.files_id, true).await;
        }

        // test leave pool with files and transfer left in pool
        {
            // recreate a new pool to test if leave pool works and delete remaining transfer and files
            let pool_kp = exec_new_pool(&app).await;
            exec_join_pool(&app, &pool_kp, "bliwox", None).await;

            let _transfer_id = exec_create_transfer(&pool_kp, None).await.unwrap();
            let transfers = exec_get_all_transfer(&app, &pool_kp, false).await;
            assert_eq!(transfers.len(), 1);
            assert!(transfers.iter().all(|t| !t.files_id.is_empty()));

            let added_transfer = &transfers[0];
            assert_eq!(added_transfer.files_id.len(), 2);
            exec_get_files_info(&app, &added_transfer.files_id, false).await;

            // should delete transfer+files
            exec_leave_pool(&app, &pool_kp, "ilingu", None).await;

            // check that nor transfer nor files are left
            exec_get_all_transfer(&app, &pool_kp, true).await;
            exec_get_files_info(&app, &added_transfer.files_id, true).await;

            // delete pool
            exec_delete_pool(&app, &pool_kp, None).await;
            exec_get_pool(&app, &pool_kp, Some("PoolNotFound")).await; // check that pool has been deleted
        }

        println!("->> all tests succeed");
    }

    async fn exec_new_pool<S, B>(app: &S) -> String
    where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::post()
            .uri("/pool/new")
            .set_json(json!({"name": "ilovecat", "device_id": "ilingu", "device_name": "ilingu1"}))
            .to_request();
        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        assert!(resp.is_ok());

        let pool_key_phrase = resp.parse_data::<String>().unwrap();
        assert!(pool_key_phrase.split('-').count() == KEY_PHRASE_LEN);

        println!("->> Pool created: {pool_key_phrase}");
        pool_key_phrase
    }

    async fn exec_get_pool<S, B>(
        app: &S,
        pool_kp: &str,
        should_error: Option<&'static str>,
    ) -> Option<DevicesPool>
    where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::get()
            .uri("/pool")
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .to_request();

        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        match should_error {
            Some(err) => {
                assert!(!resp.is_ok());
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return None;
            }
            None => assert!(resp.is_ok()),
        }

        let pool = resp.parse_data::<DevicesPool>().unwrap();
        assert!(pool.devices_id.contains(&"ilingu".to_string()));
        assert_eq!(pool.pool_name, "ilovecat");

        println!("->> Pool fetched");
        Some(pool)
    }

    async fn exec_join_pool<S, B>(
        app: &S,
        pool_kp: &str,
        device_id: &str,
        should_error: Option<&'static str>,
    ) where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::put()
            .uri("/pool/join")
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .set_json(json!({ "device_id": device_id, "device_name" : device_id.to_string()+"1" }))
            .to_request();

        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        match should_error {
            Some(err) => {
                assert!(!resp.is_ok());
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return;
            }
            None => assert!(resp.is_ok()),
        }

        let pool = resp.parse_data::<DevicesPool>().unwrap();
        assert!(pool.devices_id.contains(&"bliwox".to_string()));
        assert_eq!(pool.pool_name, "ilovecat");

        println!("->> 'bliwox' joined the pool");
    }

    async fn exec_leave_pool<S, B>(
        app: &S,
        pool_kp: &str,
        device_id: &str,
        should_error: Option<&'static str>,
    ) where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::delete()
            .uri("/pool/leave")
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .set_json(json!({"device_id": device_id}))
            .to_request();

        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        match should_error {
            Some(err) => {
                assert!(!resp.is_ok());
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return;
            }
            None => assert!(resp.is_ok()),
        }

        println!("->> 'bliwox' left the pool");
    }

    async fn exec_get_all_transfer<S, B>(
        app: &S,
        pool_kp: &str,
        should_be_empty: bool,
    ) -> Vec<FilePoolTransferExt>
    where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::get()
            .uri("/file-transfer/ilingu/all")
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .to_request();

        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        let transfers = resp.parse_data::<Vec<FilePoolTransferExt>>().unwrap();
        match should_be_empty {
            true => {
                assert!(transfers.is_empty());
                return vec![];
            }
            false => assert!(!transfers.is_empty()),
        }

        println!("->> Transfers fetched");
        transfers
    }

    async fn exec_create_transfer(
        pool_kp: &str,
        should_error: Option<&'static str>,
    ) -> Option<String> {
        let (file1, file2) = join!(
            tokio::fs::read("./src/tests/Assets/test1.jpg"),
            tokio::fs::read_to_string("./src/tests/Assets/test2.txt")
        );

        let form = reqwest::multipart::Form::new()
            .part(
                "file1",
                reqwest::multipart::Part::bytes(file1.unwrap())
                    .file_name("test1.jpg")
                    .mime_str("image/jpeg")
                    .unwrap(),
            )
            .part(
                "file2",
                reqwest::multipart::Part::text(file2.unwrap())
                    .file_name("test2.txt")
                    .mime_str("text/plain")
                    .unwrap(),
            );

        let client = reqwest::Client::new();
        let res = client
            .post("http://localhost:3000/file-transfer?from=bliwox&to=ilingu")
            .header("Authorization", pool_kp)
            .multipart(form)
            .send()
            .await
            .unwrap();

        let resp = res.to_json::<ResponsePayload>().await.unwrap();
        match should_error {
            Some(err) => {
                assert!(!resp.is_ok());
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return None;
            }
            None => assert!(resp.is_ok()),
        }

        let transfers_id = resp.parse_data::<String>().unwrap();
        assert!(!transfers_id.is_empty());

        println!("->> Transfers created: {transfers_id}");
        Some(transfers_id)
    }
    async fn exec_add_files_to_transfer(
        pool_kp: &str,
        transfer_id: &str,
        should_error: Option<&'static str>,
    ) -> Option<Vec<String>> {
        let file3 = tokio::fs::read("./src/tests/Assets/test3.mp3")
            .await
            .unwrap();
        let form = reqwest::multipart::Form::new().part(
            "file3",
            reqwest::multipart::Part::bytes(file3)
                .file_name("test3.mp3")
                .mime_str("audio/mpeg")
                .unwrap(),
        );

        let client = reqwest::Client::new();
        let res = client
            .post(format!(
                "http://localhost:3000/file-transfer/{transfer_id}/add_files"
            ))
            .header("Authorization", pool_kp)
            .multipart(form)
            .send()
            .await
            .unwrap();

        let resp = res.to_json::<ResponsePayload>().await.unwrap();
        match should_error {
            Some(err) => {
                assert!(!resp.is_ok());
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return None;
            }
            None => assert!(resp.is_ok()),
        }

        let files_ids = resp.parse_data::<Vec<String>>().unwrap();
        assert!(!files_ids.is_empty());

        println!("->> Transfers created");
        Some(files_ids)
    }

    async fn exec_get_files_info<S, B>(app: &S, files_ids: &[String], should_error: bool)
    where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::get()
            .uri(&format!("/files/info?files_ids={}", files_ids.join(",")))
            .to_request();
        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        match should_error {
            true => {
                assert_eq!(resp.reason.as_ref().unwrap(), "FileNotFound");
                return;
            }
            false => assert!(resp.is_ok()),
        }

        let files_info = resp.parse_data::<Vec<FileInfo>>().unwrap();
        assert_eq!(files_info.len(), files_ids.len());
        assert!(files_info.iter().all(|info| info.filename == "test1.jpg"
            || info.filename == "test2.txt"
            || info.filename == "test3.mp3"));

        println!("->> Files info fetched");
    }

    async fn exec_get_files<S, B>(app: &S, pool_kp: &str, files_ids: &[String], should_error: bool)
    where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let (file1, file2, file3) = join!(
            tokio::fs::read("./src/tests/Assets/test1.jpg"),
            tokio::fs::read_to_string("./src/tests/Assets/test2.txt"),
            tokio::fs::read("./src/tests/Assets/test3.mp3")
        );

        let (file1_right_hash, file2_right_hash, file3_right_hash) = join!(
            tokio::task::spawn_blocking(move || xxh3_64(&file1.unwrap())),
            tokio::task::spawn_blocking(move || xxh3_64(file2.unwrap().as_bytes())),
            tokio::task::spawn_blocking(move || xxh3_64(&file3.unwrap()))
        );
        let (file1_right_hash, file2_right_hash, file3_right_hash) = (
            file1_right_hash.unwrap(),
            file2_right_hash.unwrap(),
            file3_right_hash.unwrap(),
        );

        let tasks = files_ids.iter().map(|file_id| {
            let req = test::TestRequest::get()
                .uri(&format!("/file/{file_id}"))
                .append_header((
                    HeaderName::from_static("authorization"),
                    HeaderValue::from_str(pool_kp).unwrap(),
                ))
                .to_request();
            async {
                let file_buf = test::call_and_read_body(app, req).await;
                tokio::task::spawn_blocking(move || xxh3_64(&file_buf)).await
            }
        });

        for resp in future::join_all(tasks).await {
            let file_hash = resp.unwrap();
            let file_integrity = file_hash == file1_right_hash
                || file_hash == file2_right_hash
                || file_hash == file3_right_hash;
            match should_error {
                true => {
                    assert!(!file_integrity);
                    return;
                }
                false => assert!(file_integrity),
            };
        }

        println!("->> File fetched without loss");
    }

    async fn exec_delete_file<S, B>(
        app: &S,
        pool_kp: &str,
        file_id: &str,
        should_error: Option<&'static str>,
    ) where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::delete()
            .uri(&format!("/file/{file_id}"))
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .to_request();
        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        match should_error {
            Some(err) => {
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return;
            }
            None => assert!(resp.is_ok()),
        }

        // check if file really deleted
        let req = test::TestRequest::get()
            .uri(&format!("/file/{file_id}"))
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .to_request();
        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await; // should not return file but json
        assert_eq!(resp.reason.unwrap(), "MongoError");

        println!("->> File deleted successfully.");
    }

    async fn exec_delete_transfer<S, B>(
        app: &S,
        pool_kp: &str,
        transfer_id: &str,
        should_error: Option<&'static str>,
    ) where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::delete()
            .uri(&format!("/file-transfer/ilingu/{transfer_id}"))
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .to_request();
        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        match should_error {
            Some(err) => {
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return;
            }
            None => assert!(resp.is_ok()),
        }

        println!("->> Transfer deleted successfully.");
    }

    async fn exec_delete_pool<S, B>(app: &S, pool_kp: &str, should_error: Option<&'static str>)
    where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::delete()
            .uri("/pool")
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .to_request();
        let resp: ResponsePayload = test::call_and_read_body_json(app, req).await;
        match should_error {
            Some(err) => {
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return;
            }
            None => assert!(resp.is_ok()),
        }

        println!("->> Pool deleted successfully.");
    }
}
