use anyhow::Result;
use chacha20poly1305::{aead::Aead, AeadCore, Key, KeyInit, XChaCha20Poly1305};
use hex_string::HexString;
use rand::rngs::OsRng;
use sha3::{Digest, Sha3_256};

use crate::app::ServerErrors;

fn hash_key(key: &str) -> String {
    let mut hasher = Sha3_256::new();
    let mut result = key.to_string();

    hasher.update(result.as_bytes());
    let result_buf = hasher.finalize().to_vec();
    result = HexString::from_bytes(&result_buf).as_string();

    result[..32].to_string()
}

/// return the encrypted datas (nonce + encrypted datas)
pub fn encrypt_datas(key: &str, datas: &[u8]) -> Result<Vec<u8>, ServerErrors> {
    let valid_key = hash_key(key);
    let key = Key::from_slice(valid_key.as_bytes());

    let cipher = XChaCha20Poly1305::new(key);
    let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);

    let encrypted_datas = cipher
        .encrypt(&nonce, datas.as_ref())
        .map_err(|_| ServerErrors::EncryptionError)?;

    let mut encrypted_datas_with_nonce = nonce.to_vec();
    encrypted_datas_with_nonce.extend(encrypted_datas);

    Ok(encrypted_datas_with_nonce)
}

/// return the decrypted datas (the encrypted datas must contains the nonce)
pub fn decrypt_datas(key: &str, enc_datas: &[u8]) -> Result<Vec<u8>, ServerErrors> {
    let valid_key = hash_key(key);
    let key = Key::from_slice(valid_key.as_bytes());
    let cipher = XChaCha20Poly1305::new(key);

    let (nonce_bytes, encrypted_data) = enc_datas.split_at(24);
    let decrypted_data = cipher
        .decrypt(nonce_bytes.into(), encrypted_data.as_ref())
        .map_err(|_| ServerErrors::DecryptionError)?;

    Ok(decrypted_data)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use crate::utils::encryption::decrypt_datas;

    use super::encrypt_datas;

    const SECRET_KEY: &str = "i-love-yaoi-and-sleeping-and-bls";

    #[test]
    fn encryption_little_test() {
        let super_secret_text_that_no_one_should_see = b"sasaki_and_miyano".to_vec();

        let encrypted_datas =
            encrypt_datas(SECRET_KEY, &super_secret_text_that_no_one_should_see).unwrap();
        assert_ne!(encrypted_datas, super_secret_text_that_no_one_should_see);

        let decrypted_datas = decrypt_datas(SECRET_KEY, &encrypted_datas).unwrap();
        assert_eq!(decrypted_datas, super_secret_text_that_no_one_should_see);
    }

    #[test]
    fn encryption_big_test() {
        let file_data = fs::read("./Assets/english_dictionary_words.txt").unwrap();

        let encrypted_datas = encrypt_datas(SECRET_KEY, &file_data).unwrap();
        assert_ne!(encrypted_datas, file_data);

        let decrypted_datas = decrypt_datas(SECRET_KEY, &encrypted_datas).unwrap();
        assert_eq!(decrypted_datas, file_data);
    }
}
