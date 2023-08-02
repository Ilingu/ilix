use anyhow::{anyhow, Result};

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum ServerErrors {
    MongoError,
    DictionnaryNotFound,
    InvalidObjectId,
    PoolNotFound,
    TransferNotFound,
    AlreadyInPool,
    NotInPool,
    NotInTransfer,
    EnvVarNotFound,
    ParseError,
    InvalidKeyPhrase,
    EncryptionError,
    DecryptionError,
    FileNotFound,
    HashError,
    SseFailedToSend,
}

impl ServerErrors {
    #[allow(dead_code)]
    pub fn parse(input: &str) -> Result<Self> {
        match input {
            "MongoError" => Ok(Self::MongoError),
            "DictionnaryNotFound" => Ok(Self::DictionnaryNotFound),
            "InvalidObjectId" => Ok(Self::InvalidObjectId),
            "PoolNotFound" => Ok(Self::PoolNotFound),
            "TransferNotFound" => Ok(Self::TransferNotFound),
            "AlreadyInPool" => Ok(Self::AlreadyInPool),
            "NotInPool" => Ok(Self::NotInPool),
            "NotInTransfer" => Ok(Self::NotInTransfer),
            "EnvVarNotFound" => Ok(Self::EnvVarNotFound),
            "ParseError" => Ok(Self::ParseError),
            "InvalidKeyPhrase" => Ok(Self::InvalidKeyPhrase),
            "EncryptionError" => Ok(Self::EncryptionError),
            "DecryptionError" => Ok(Self::DecryptionError),
            "FileNotFound" => Ok(Self::FileNotFound),
            _ => Err(anyhow!("")),
        }
    }
}

impl ToString for ServerErrors {
    fn to_string(&self) -> String {
        format!("{self:?}")
    }
}
