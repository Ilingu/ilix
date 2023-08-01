use actix_web::web;
use anyhow::Result;
use std::{env, fs};

use rand::Rng;

use crate::app::ServerErrors;

pub const KEY_PHRASE_LEN: usize = 20;

fn is_key_phrase(str: &str) -> bool {
    str.split('-').count() == KEY_PHRASE_LEN
}

#[derive(Clone)]
pub struct KeyPhrase(pub String);

impl TryFrom<&str> for KeyPhrase {
    type Error = ServerErrors;

    fn try_from(key_phrase: &str) -> Result<Self, ServerErrors> {
        if !is_key_phrase(key_phrase) {
            return Err(ServerErrors::InvalidKeyPhrase);
        }

        Ok(KeyPhrase(key_phrase.to_string()))
    }
}

impl TryFrom<web::Path<String>> for KeyPhrase {
    type Error = ServerErrors;

    fn try_from(key_phrase: web::Path<String>) -> Result<Self, ServerErrors> {
        let kp = key_phrase.into_inner();
        if !is_key_phrase(&kp) {
            return Err(ServerErrors::InvalidKeyPhrase);
        }

        Ok(KeyPhrase(kp))
    }
}

impl TryFrom<String> for KeyPhrase {
    type Error = ServerErrors;

    fn try_from(key_phrase: String) -> Result<Self, ServerErrors> {
        if !is_key_phrase(&key_phrase) {
            return Err(ServerErrors::InvalidKeyPhrase);
        }

        Ok(KeyPhrase(key_phrase))
    }
}

impl KeyPhrase {
    /// generate an unique key phrase.
    ///
    /// words_number determine how many words will be in the final key phrase, the bigger it is, the more secure and unique the final hash is
    ///
    /// e.g:
    ///     - for `words_number=5`; there are approx **1e26** unique possibilities
    ///     - for `words_number=20`; there are approx **1e105** unique possibilities
    ///     - more globally there are: **178187^words_number** unique possibilities
    pub fn new(words_number: usize) -> Result<Self, ServerErrors> {
        let dictionary = fs::read_to_string("./Assets/english_dictionary_words.txt")
            .map_err(|_| ServerErrors::DictionnaryNotFound)?;
        let words = dictionary.lines().collect::<Vec<_>>();

        let mut rng = rand::thread_rng();

        let key_phrase = (0..words_number)
            .map(|_| {
                let idx = rng.gen_range(0..words.len());
                words[idx]
            })
            .collect::<Vec<_>>();

        Ok(Self(key_phrase.join("-")))
    }

    pub fn hash(&self) -> Result<String, ServerErrors> {
        let hash_round = env::var("HASH_ROUND")
            .map_err(|_| ServerErrors::EnvVarNotFound)?
            .parse::<usize>()
            .map_err(|_| ServerErrors::ParseError)?;
        if hash_round < 5 {
            return Err(ServerErrors::HashError);
        }

        let mut result = self.0.clone();
        for _ in 0..hash_round {
            result = super::hash(result);
        }
        Ok(result)
    }

    #[allow(dead_code)]
    pub fn verify(right_kp_hash: String, kp_to_verify: &str) -> bool {
        let kp = match KeyPhrase::try_from(kp_to_verify) {
            Ok(d) => d,
            Err(_) => return false,
        };
        let hashed_kp_to_verify = match kp.hash() {
            Ok(v) => v,
            Err(_) => return false,
        };
        hashed_kp_to_verify == right_kp_hash
    }
}
