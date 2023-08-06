import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FunctionResult } from "../types/interfaces";

export const POOL_KEY = "device_pools";

export const FILES_INFO_CACHE_KEY = (transfer_id: string) => `transfer-${transfer_id}`;

/**
 * Helper function to store thing on AsyncStorage
 * @param {string} key the key where to store the `value`, it'll overwrite every existing data under this key
 * @param {any} value the value you want to store
 * @returns a promise whether it succeed or not
 *
 * @see https://docs.expo.dev/versions/latest/sdk/securestore/
 */
export const AS_Store = async <T = any>(key: string, value: T): Promise<FunctionResult> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return { succeed: true };
  } catch (e) {
    return { succeed: false, reason: e as string };
  }
};

/**
 * Helper function to get thing from AsyncStorage
 * @param {string} key the key where to get the value from
 * @returns a promise with the data if it succeed
 * @see https://docs.expo.dev/versions/latest/sdk/async-storage/
 */
export const AS_Get = async <T = never>(key: string): Promise<FunctionResult<T>> => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) {
      return { succeed: false, reason: "value not found" };
    }

    const parsedValue = JSON.parse(value);
    return { succeed: true, data: parsedValue };
  } catch (e) {
    return { succeed: false, reason: e as string };
  }
};

/**
 * Helper function to delete thing from AsyncStorage
 * @param {string} key
 * @returns a promise with the data if it succeed
 * @see https://docs.expo.dev/versions/latest/sdk/async-storage/
 */
export const AS_Delete = async (key: string): Promise<FunctionResult<never>> => {
  try {
    await AsyncStorage.removeItem(key);
    return { succeed: true };
  } catch (e) {
    return { succeed: false, reason: e as string };
  }
};

/**
 * Helper function to clear everything stored on async storage
 * @returns a promise with the data if it succeed
 * @see https://docs.expo.dev/versions/latest/sdk/async-storage/
 */
export const AS_Clear = async (): Promise<FunctionResult<never>> => {
  try {
    await AsyncStorage.clear();
    return { succeed: true };
  } catch (e) {
    return { succeed: false, reason: e as string };
  }
};
