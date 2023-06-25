import { FunctionResult } from "./types/interfaces";
import * as SecureStore from "expo-secure-store";

export const KEY_PHRASE_KEY = "key_phrase";
export const DEVICE_ID_KEY = "device_id";

export const SaveToSecureStore = async (
  key: string,
  value: any
): Promise<FunctionResult> => {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
    return { succeed: true };
  } catch (_) {
    return { succeed: false };
  }
};

export const GetFromSecureStore = async <T = never>(
  key: string
): Promise<FunctionResult<T>> => {
  try {
    let raw_result = await SecureStore.getItemAsync(key);
    if (typeof raw_result !== "string") return { succeed: false };

    let result: T = JSON.parse(raw_result);
    return { succeed: true, data: result };
  } catch (_) {
    return { succeed: false };
  }
};
