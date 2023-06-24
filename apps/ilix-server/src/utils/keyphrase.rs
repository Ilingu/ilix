use anyhow::Result;
use hex_string::HexString;
use sha3::{Digest, Sha3_256};
use std::{env, fs};

use rand::Rng;

use crate::app::ServerErrors;

pub struct KeyPhrase {
    pub key_phrase: String,
}

impl From<String> for KeyPhrase {
    fn from(kp: String) -> Self {
        KeyPhrase { key_phrase: kp }
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
    pub fn new(words_number: usize) -> Result<Self, ServerErrors<'static>> {
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

        Ok(Self {
            key_phrase: key_phrase.join("-"),
        })
    }

    pub fn hash(&self) -> Result<String, ServerErrors<'static>> {
        let hash_round = env::var("HASH_ROUND")
            .map_err(|_| ServerErrors::HashFailed)?
            .parse::<usize>()
            .map_err(|_| ServerErrors::HashFailed)?;
        if hash_round < 5 {
            return Err(ServerErrors::Custom("hash round not safe enough"));
        }

        let mut hasher = Sha3_256::new();
        let mut result = self.key_phrase.clone();

        for _ in 0..hash_round {
            hasher.update(result.as_bytes());
            let result_buf = hasher.finalize().to_vec();
            result = HexString::from_bytes(&result_buf).as_string();
            hasher = Sha3_256::new();
        }
        Ok(result)
    }

    pub fn verify(right_kp_hash: String, kp_to_verify: String) -> bool {
        let hashed_kp_to_verify = match KeyPhrase::from(kp_to_verify).hash() {
            Ok(v) => v,
            Err(_) => return false,
        };
        hashed_kp_to_verify == right_kp_hash
    }
}
