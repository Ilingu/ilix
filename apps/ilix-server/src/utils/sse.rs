use std::{sync::Arc, time::Duration};

use actix_web::rt::time::interval;
use actix_web_lab::sse::{self, ChannelStream, Event, Sse};
use anyhow::Result;
use futures_util::future;
use parking_lot::Mutex;
use tokio::task;

use crate::db::models::{DevicesPool, FilePoolTransferExt};

use super::{errors::ServerErrors, hash, keyphrase::KeyPhrase};

#[derive(serde::Serialize, Clone)]
pub enum SSEData {
    Pool(DevicesPool),
    Transfer(FilePoolTransferExt),
    Logout,
}

#[derive(serde::Serialize)]
enum BroadcastMessage {
    Ping,
    Connected,
    Data(SSEData),
}

impl From<BroadcastMessage> for Event {
    fn from(msg: BroadcastMessage) -> Self {
        match msg {
            BroadcastMessage::Ping => sse::Event::Comment("Ping".into()),
            BroadcastMessage::Connected => {
                sse::Data::new("client connected").event("connected").into()
            }
            BroadcastMessage::Data(data) => {
                let event_name = match data {
                    SSEData::Pool(_) => "pool",
                    SSEData::Transfer(_) => "transfer",
                    SSEData::Logout => "logout",
                };
                sse::Data::new_json(data)
                    .unwrap_or(sse::Data::new("Failed to stringify message"))
                    .event(event_name)
                    .into()
            }
        }
    }
}

pub struct Broadcaster {
    inner: Mutex<BroadcasterInner>,
}

#[derive(Debug, Clone, Default)]
struct BroadcasterInner {
    /// Vec<(device_id, sse_channel)>
    clients: Vec<(String, sse::Sender)>,
}

impl Broadcaster {
    /// Constructs new broadcaster and spawns ping loop.
    pub fn create() -> Arc<Self> {
        let this = Arc::new(Broadcaster {
            inner: Mutex::new(BroadcasterInner::default()),
        });

        Self::spawn_ping(Arc::clone(&this));
        this
    }

    /// Pings clients every 30 seconds to see if they are alive and remove them from the broadcast
    /// list if not.
    fn spawn_ping(this: Arc<Self>) {
        actix_web::rt::spawn(async move {
            let mut interval = interval(Duration::from_secs(30));

            loop {
                interval.tick().await;
                this.remove_stale_clients().await;
            }
        });
    }

    /// Removes all non-responsive clients from broadcast list.
    async fn remove_stale_clients(&self) {
        let clients = self.inner.lock().clients.clone();

        let tasks = clients.into_iter().map(|client| {
            task::spawn(async move {
                client.1.send(BroadcastMessage::Ping).await.ok()?;
                Some(client)
            })
        });

        let mut ok_clients = Vec::new();
        for ok_client in (future::join_all(tasks).await)
            .into_iter()
            .flatten()
            .flatten()
        {
            ok_clients.push(ok_client)
        }

        self.inner.lock().clients = ok_clients;
    }

    fn make_client_id(device_id: &str, pool_kp: &KeyPhrase) -> Result<String, ServerErrors> {
        Ok(hash(format!("{}:{}", device_id, pool_kp.hash()?)))
    }

    /// Registers client with broadcaster, returning an SSE response body.
    pub async fn new_client(
        &self,
        device_id: &str,
        pool_kp: &KeyPhrase,
    ) -> Result<Sse<ChannelStream>, ServerErrors> {
        let (tx, rx) = sse::channel(10);

        tx.send(BroadcastMessage::Connected).await.unwrap();
        self.inner
            .lock()
            .clients
            .push((Self::make_client_id(device_id, pool_kp)?, tx));

        Ok(rx)
    }

    /// Broadcasts `msg` to specified clients of the same pool.
    pub async fn broadcast_to(
        &self,
        device_id: &[String],
        pool_kp: &KeyPhrase,
        msg: SSEData,
    ) -> Result<(), ServerErrors> {
        let clients = self.inner.lock().clients.clone();
        let to_clients_ids = device_id
            .iter()
            .filter_map(|did| Self::make_client_id(did, pool_kp).ok())
            .collect::<Vec<_>>();
        if to_clients_ids.len() != device_id.len() {
            return Err(ServerErrors::HashError);
        }

        let sent_futures = clients
            .iter()
            .filter(|(client_id, _)| to_clients_ids.contains(client_id))
            .map(|(_, sender)| sender.send(BroadcastMessage::Data(msg.clone())));
        for res in future::join_all(sent_futures).await {
            res.map_err(|_| ServerErrors::SseFailedToSend)?
        }

        Ok(())
    }
}
