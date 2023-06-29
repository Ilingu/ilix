import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FunctionResult } from "../types/interfaces";

export const POOL_KEY = "device_pool";

export const AS_Store = async (
  key: string,
  value: any
): Promise<FunctionResult> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return { succeed: true };
  } catch (e) {
    return { succeed: false, reason: e as string };
  }
};

export const AS_Get = async <T = never>(
  key: string
): Promise<FunctionResult<T>> => {
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
