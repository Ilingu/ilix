use anyhow::{anyhow, Result};
use hex_string::HexString;
use sha3::{Digest, Sha3_256};
use std::{env, fs};

use rand::Rng;

pub struct KeyPhrase {
    pub key_phrase: String,
}

impl From<String> for KeyPhrase {
    fn from(kp: String) -> Self {
        KeyPhrase { key_phrase: kp }
    }
}

impl KeyPhrase {
    pub fn new(words_number: usize) -> Self {
        let dictionary = fs::read_to_string("./Assets/english_dictionary_words.txt")
            .expect("English Dictionnary not found");
        let words = dictionary.lines().collect::<Vec<_>>();

        let mut rng = rand::thread_rng();

        let key_phrase = (0..words_number)
            .map(|_| {
                let idx = rng.gen_range(0..words.len());
                words[idx]
            })
            .collect::<Vec<_>>();

        Self {
            key_phrase: key_phrase.join("-"),
        }
    }

    pub fn hash(&self) -> Result<String> {
        let hash_round = env::var("HASH_ROUND")?.parse::<usize>()?;
        if hash_round < 5 {
            return Err(anyhow!("hash round not safe enough"));
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
