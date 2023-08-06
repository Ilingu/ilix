import * as SecureStore from "expo-secure-store";
import { Hash } from "../utils";

import type { FunctionResult, StoredDevicesPool } from "../types/interfaces";

export const DEVICE_ID_KEY = "device_id";

/**
 * Helper function to unify how key phrase key should be stored inside of a client pool
 * @param {string} key it should be the pool_key, this will later get hashed
 * @returns the key to access the pool kp on secure storage
 */
export const MakeKeyPhraseKey = (key: string) => `key_phrase_${Hash(key)}`;

/**
 * Helper function to store thing on SecureStore
 * @param {string} key the key where to store the `value`, it'll overwrite every existing data under this key
 * @param {any} value the value you want to securely store
 * @returns a promise whether it succeed or not
 *
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */
export const SS_Store = async (key: string, value: any): Promise<FunctionResult> => {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
    return { succeed: true };
  } catch (e) {
    return { succeed: false, reason: `${e}` };
  }
};

/**
 * Helper function to get thing from SecureStore
 * @param {string} key the key where to get the value from
 * @returns a promise with the data if it succeed
 *
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */
export const SS_Get = async <T = never>(key: string): Promise<FunctionResult<T>> => {
  try {
    const raw_result = await SecureStore.getItemAsync(key);
    if (typeof raw_result !== "string") return { succeed: false };

    const result: T = JSON.parse(raw_result);
    return { succeed: true, data: result };
  } catch (e) {
    return { succeed: false, reason: `${e}` };
  }
};

/**
 * Clear every existing `key_phrase` stored on SecureStore
 * @param {StoredDevicesPool[]} all the pool that you want the `key_phrase` to be deleted
 * @returns a promise whether it succeed or not
 *
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */
export const SS_clear = async (pools: StoredDevicesPool[]): Promise<FunctionResult<never>> => {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    await Promise.all(
      pools.map(({ SS_key_hashed_kp }) => SecureStore.deleteItemAsync(SS_key_hashed_kp))
    );
    return { succeed: true };
  } catch (e) {
    return { succeed: false, reason: `${e}` };
  }
};
