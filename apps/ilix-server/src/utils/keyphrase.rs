use anyhow::Result;
use std::fs;

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
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
        let salt = SaltString::generate(&mut OsRng);

        // Argon2 with default params (Argon2id v19)
        let argon2 = Argon2::default();

        let kp_hash = argon2
            .hash_password(self.key_phrase.as_bytes(), &salt)
            .map_err(anyhow::Error::msg)?
            .to_string();

        Ok(kp_hash)
    }

    pub fn verify(kp_hash: String, kp_to_verify: String) -> bool {
        let parsed_hash = match PasswordHash::new(&kp_hash) {
            Ok(ph) => ph,
            Err(_) => return false,
        };
        Argon2::default()
            .verify_password(kp_to_verify.as_bytes(), &parsed_hash)
            .is_ok()
    }
}
