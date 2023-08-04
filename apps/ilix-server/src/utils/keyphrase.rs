use actix_web::web;
use anyhow::Result;
use std::{env, fs};

use rand::Rng;

use super::{errors::ServerErrors, hash};

pub const KEY_PHRASE_LEN: usize = 20;

/// check if the keyphrase is valid, **it does not** check if this keyphrase is linked to a pool
fn is_key_phrase(str: &str) -> bool {
    str.split('-').count() == KEY_PHRASE_LEN
}

/// Utility struct to manage `key phrase` in this application, which are the common and unique identifier and password of a pool
///
/// This is also an actix extractor, that can be used to extract from the "Autorization" header the key phrase
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

    /// **Hash** the plain text key phrase to be able to securely stores it in a db.
    ///
    /// Key phrase are both pool unique identifier and password, thus this can be hashed with "Argon2" for exemple
    ///
    /// This is a security drawback that is partially patched with a secret amount of hash round and a secret server key
    /// acting as a unique salt (not as good as rng salt, but I can't do more)
    pub fn hash(&self) -> Result<String, ServerErrors> {
        let hash_round = env::var("HASH_ROUND")
            .map_err(|_| ServerErrors::EnvVarNotFound)?
            .parse::<usize>()
            .map_err(|_| ServerErrors::ParseError)?;
        let salt = env::var("SALT").map_err(|_| ServerErrors::EnvVarNotFound)?;
        if hash_round < 5 {
            return Err(ServerErrors::HashError);
        }

        let mut result = format!("{salt}{}", self.0.clone());
        for _ in 0..hash_round {
            result = hash(result);
        }
        Ok(result)
    }

    /// It return if the user provided key phrase: `kp_to_verify`, match the right key phrase in db: `right_hashed_kp`
    ///
    /// However in pratice this is never called throughout the application because key phrase are also the unique identifier
    /// of a pool. Thus this check is done while searching pool in db corresponding the the user key phrase.
    #[allow(dead_code)]
    pub fn verify(right_hashed_kp: String, kp_to_verify: &str) -> bool {
        let kp = match KeyPhrase::try_from(kp_to_verify) {
            Ok(d) => d,
            Err(_) => return false,
        };
        let hashed_kp_to_verify = match kp.hash() {
            Ok(v) => v,
            Err(_) => return false,
        };
        hashed_kp_to_verify == right_hashed_kp
    }
}

#[cfg(test)]
mod tests {
    use std::env;

    use crate::utils::keyphrase::is_key_phrase;

    use super::KeyPhrase;

    #[test]
    fn key_phrase_test() {
        env::set_var("HASH_ROUND", "10");
        env::set_var("SALT", "sasamiya");

        const N_WORDS: usize = 20;
        let kp = KeyPhrase::new(N_WORDS).unwrap();

        assert!(is_key_phrase(&kp.0));
        let kp = KeyPhrase::try_from(kp.0).unwrap();

        let hashed_kp = kp.hash().unwrap();
        assert!(KeyPhrase::verify(hashed_kp, &kp.0));
    }
}
