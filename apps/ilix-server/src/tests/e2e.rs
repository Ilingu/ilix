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
        tests::{DevicesPool, FilePoolTransferExt},
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
    use serde::{de, Deserialize};
    use serde_json::json;
    use tokio::join;

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
            self.success && self.reason.is_none()
        }
    }

    #[actix_web::test]
    async fn test_full_api() {
        {
            let res = reqwest::blocking::get("http://localhost:3000/ping")
                .expect("This server should be launched before tests");
            let fetch_res = res
                .text()
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

        /* Note: Everything that is not in a scope block is not important to future test */

        // InvalidKeyPhrase tests
        {
            exec_get_pool(&app, "not valid kp", Some("InvalidKeyPhrase")).await;
            exec_join_pool(&app, "not valid kp", Some("InvalidKeyPhrase")).await;
            exec_leave_pool(&app, "not valid kp", Some("InvalidKeyPhrase")).await;
            exec_create_transfer("not valid kp", Some("InvalidKeyPhrase")).await;
        }

        // PoolNotFound tests
        {
            let pool_kp = KeyPhrase::new(KEY_PHRASE_LEN).unwrap().0;
            exec_get_pool(&app, &pool_kp, Some("PoolNotFound")).await;
            exec_join_pool(&app, &pool_kp, Some("PoolNotFound")).await;
            exec_leave_pool(&app, &pool_kp, Some("PoolNotFound")).await;
            exec_create_transfer(&pool_kp, Some("PoolNotFound")).await;
        }

        // check that no transfer exists
        {
            let pool_kp = KeyPhrase::new(KEY_PHRASE_LEN).unwrap().0;
            exec_get_all_transfer(&app, &pool_kp, true).await;
        }

        let pool_kp = exec_new_pool(&app).await; // new pool test, must create a pool for next tests

        // get pool test
        {
            exec_get_pool(&app, &pool_kp, None).await;
        }

        // join
        {
            exec_join_pool(&app, &pool_kp, None).await; // join pool test
            exec_join_pool(&app, &pool_kp, Some("AlreadyInPool")).await; // AlreadyInPool pool test
        }

        // leave
        {
            exec_leave_pool(&app, &pool_kp, None).await; // leave pool test
            exec_leave_pool(&app, &pool_kp, Some("NotInPool")).await; // NotInPool pool test
        }

        exec_join_pool(&app, &pool_kp, None).await; // must have two user in pool for next tests

        let transfer_id = exec_create_transfer(&pool_kp, None).await.unwrap();
        {
            let transfers = exec_get_all_transfer(&app, &pool_kp, false).await;

            assert!(!transfers.is_empty());
            assert!(transfers.iter().any(|t| t._id == transfer_id));
            assert!(transfers.iter().all(|t| !t.files_id.is_empty()));
        }

        let added_files_ids = exec_add_files_to_transfer(&pool_kp, &transfer_id, None)
            .await
            .unwrap();

        let transfers = exec_get_all_transfer(&app, &pool_kp, false).await;
        assert!(!transfers.is_empty());
        assert!(transfers.iter().any(|t| t._id == transfer_id));
        assert!(transfers.iter().all(|t| !t.files_id.is_empty()));

        let added_transfer = transfers.iter().find(|t| t._id == transfer_id).unwrap();
        assert!(added_files_ids
            .iter()
            .all(|file_id| added_transfer.files_id.contains(file_id)));
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

    async fn exec_join_pool<S, B>(app: &S, pool_kp: &str, should_error: Option<&'static str>)
    where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::put()
            .uri("/pool/join")
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .set_json(json!({ "device_id": "bliwox", "device_name" : "bliwox1" }))
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

    async fn exec_leave_pool<S, B>(app: &S, pool_kp: &str, should_error: Option<&'static str>)
    where
        S: Service<Request, Response = ServiceResponse<B>, Error = actix_web::error::Error>,
        B: MessageBody,
    {
        let req = test::TestRequest::delete()
            .uri("/pool/leave")
            .append_header((
                HeaderName::from_static("authorization"),
                HeaderValue::from_str(pool_kp).unwrap(),
            ))
            .set_json(json!({"device_id": "bliwox"}))
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
        let form = reqwest::blocking::multipart::Form::new()
            .file("test1.jpg", "./src/tests/Assets/test1.jpg")
            .unwrap()
            .file("test2.txt", "./src/tests/Assets/test2.txt")
            .unwrap();

        println!("here");
        let client = reqwest::blocking::Client::new();
        let res = client
            .post("http://localhost:3000/file-transfer/ilingu/all?from=bliwox&to=ilingu")
            .header("authorization", pool_kp)
            .multipart(form)
            .send()
            .unwrap();
        let resp = res.json::<ResponsePayload>().unwrap();
        let transfers_id = resp.parse_data::<String>().unwrap();
        match should_error {
            Some(err) => {
                assert!(!resp.is_ok());
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return None;
            }
            None => assert!(resp.is_ok()),
        }
        assert!(!transfers_id.is_empty());

        println!("->> Transfers created");
        Some(transfers_id)
    }
    async fn exec_add_files_to_transfer(
        pool_kp: &str,
        transfer_id: &str,
        should_error: Option<&'static str>,
    ) -> Option<Vec<String>> {
        let form = reqwest::blocking::multipart::Form::new()
            .file("test3.mp3", "./src/tests/Assets/test3.mp3")
            .unwrap();

        let client = reqwest::blocking::Client::new();
        let res = client
            .post(format!(
                "http://localhost:3000/file-transfer/{transfer_id}/add_files"
            ))
            .header("authorization", pool_kp)
            .multipart(form)
            .send()
            .unwrap();
        let resp = res.json::<ResponsePayload>().unwrap();
        let transfers_id = resp.parse_data::<Vec<String>>().unwrap();
        match should_error {
            Some(err) => {
                assert!(!resp.is_ok());
                assert_eq!(resp.reason.as_ref().unwrap(), err);
                return None;
            }
            None => assert!(resp.is_ok()),
        }
        assert!(!transfers_id.is_empty());

        println!("->> Transfers created");
        Some(transfers_id)
    }
}
