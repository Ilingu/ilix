import type { FunctionResult, StoredDevicesPool } from "../types/interfaces";
import * as SecureStore from "expo-secure-store";
import { Hash } from "../utils";

export const DEVICE_ID_KEY = "device_id";

export const MakeKeyPhraseKey = (key: string) => `key_phrase_${Hash(key)}`;

export const SS_Store = async (
  key: string,
  value: any
): Promise<FunctionResult> => {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
    return { succeed: true };
  } catch (e) {
    return { succeed: false, reason: `${e}` };
  }
};

export const SS_Get = async <T = never>(
  key: string
): Promise<FunctionResult<T>> => {
  try {
    let raw_result = await SecureStore.getItemAsync(key);
    if (typeof raw_result !== "string") return { succeed: false };

    let result: T = JSON.parse(raw_result);
    return { succeed: true, data: result };
  } catch (e) {
    return { succeed: false, reason: `${e}` };
  }
};

export const SS_clear = async (
  pools: StoredDevicesPool[]
): Promise<FunctionResult<never>> => {
  try {
    await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
    await Promise.all(
      pools.map(({ SS_key_hashed_kp }) =>
        SecureStore.deleteItemAsync(SS_key_hashed_kp)
      )
    );
    return { succeed: true };
  } catch (e) {
    return { succeed: false, reason: `${e}` };
  }
};
