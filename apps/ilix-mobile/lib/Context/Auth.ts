import { createContext } from "react";
import {
  DEVICE_ID_KEY,
  SS_Get,
  KEY_PHRASE_KEY,
  SS_Store,
} from "../db/SecureStore";
import * as Device from "expo-device";
import { Hash, IsEmptyString } from "../utils";
import * as Application from "expo-application";
import type { FunctionResult } from "../types/interfaces";

export interface AuthShape {
  logged_in: boolean;
  loading: boolean;
  pool_key_phrase?: string;
  device_id?: string;
  addPoolKeyPhrase?: (pool_key_phrase: string) => Promise<FunctionResult>;
}

const GetDeviceId = async (): Promise<string> => {
  let installationTime = "";
  try {
    installationTime = (
      await Application.getInstallationTimeAsync()
    ).toISOString();
  } catch (_) {}

  return Hash(
    `${Application.androidId}-${Device.brand}-${Device.deviceName}-${Device.manufacturer}-${Device.modelName}-${Device.osName}-${installationTime}`
  );
};

export const GetStoredAuthState = async (): Promise<AuthShape> => {
  let { succeed: id_succeed, data: DeviceId } = await SS_Get<string>(
    DEVICE_ID_KEY
  );
  if (!id_succeed || !DeviceId) {
    DeviceId = await GetDeviceId();
    const { succeed: set_succeed } = await SS_Store(DEVICE_ID_KEY, DeviceId);
    if (!set_succeed)
      return {
        logged_in: false,
        loading: false,
      };
  }
  const { succeed: kp_succeed, data: key_phrase } = await SS_Get<string>(
    KEY_PHRASE_KEY
  );
  if (!kp_succeed || !key_phrase)
    return {
      logged_in: false,
      loading: false,
      device_id: DeviceId,
    };

  if (IsEmptyString(key_phrase) || IsEmptyString(DeviceId))
    return {
      logged_in: false,
      loading: false,
    };

  return {
    logged_in: true,
    loading: false,
    pool_key_phrase: key_phrase,
    device_id: DeviceId,
  };
};

const AuthContext = createContext<AuthShape>({
  logged_in: false,
  loading: true,
});
export default AuthContext;
