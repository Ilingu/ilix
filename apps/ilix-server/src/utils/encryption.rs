use anyhow::Result;
use chacha20poly1305::{aead::Aead, AeadCore, Key, KeyInit, XChaCha20Poly1305};
use rand::rngs::OsRng;

use crate::app::ServerErrors;

/// return the encrypted datas (nonce + encrypted datas)
pub fn encrypt_datas(datas: &[u8], key: &str) -> Result<Vec<u8>, ServerErrors<'static>> {
    let key = Key::from_slice(key.as_bytes());

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
pub fn decrypt_datas(enc_datas: &[u8], key: &str) -> Result<Vec<u8>, ServerErrors<'static>> {
    let key = Key::from_slice(key.as_bytes());
    let cipher = XChaCha20Poly1305::new(key);

    let (nonce_bytes, encrypted_data) = enc_datas.split_at(24);
    let decrypted_data = cipher
        .decrypt(nonce_bytes.into(), encrypted_data.as_ref())
        .map_err(|_| ServerErrors::DecryptionError)?;

    Ok(decrypted_data)
}

#[cfg(test)]
mod tests {
    use crate::utils::encryption::decrypt_datas;

    use super::encrypt_datas;

    const SECRET_KEY: &str = "i-love-yaoi-and-sleeping-and-bls";

    #[test]
    fn full_encryption_test() {
        let super_secret_text_that_no_one_should_see = b"sasaki_and_miyano".to_vec();

        let encrypted_datas =
            encrypt_datas(&super_secret_text_that_no_one_should_see, SECRET_KEY).unwrap();
        assert_ne!(encrypted_datas, super_secret_text_that_no_one_should_see);

        let decrypted_datas = decrypt_datas(&encrypted_datas, SECRET_KEY).unwrap();
        assert_eq!(decrypted_datas, super_secret_text_that_no_one_should_see);
    }
}
