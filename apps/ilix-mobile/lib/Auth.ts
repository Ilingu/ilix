import { createContext, useEffect, useState } from "react";
import {
  DEVICE_ID_KEY,
  GetFromSecureStore,
  KEY_PHRASE_KEY,
  SaveToSecureStore,
} from "./SecureStore";
import * as Device from "expo-device";
import { Hash, IsEmptyString } from "./utils";
import * as Application from "expo-application";

export interface AuthShape {
  logged_in: boolean;
  hasBeenAttempted: boolean;
  pool_key_phrase?: string;
  device_id?: string;
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

export const defaultAuthState = async (): Promise<AuthShape> => {
  let { succeed: id_succeed, data: DeviceId } =
    await GetFromSecureStore<string>(DEVICE_ID_KEY);
  if (!id_succeed || !DeviceId) {
    DeviceId = await GetDeviceId();
    await SaveToSecureStore(DEVICE_ID_KEY, DeviceId);
  }
  const { succeed: kp_succeed, data: key_phrase } =
    await GetFromSecureStore<string>(KEY_PHRASE_KEY);
  console.log({ DeviceId, key_phrase });
  if (!kp_succeed || !key_phrase)
    return {
      logged_in: false,
      hasBeenAttempted: true,
    };
  if (IsEmptyString(key_phrase) || IsEmptyString(DeviceId))
    return {
      logged_in: false,
      hasBeenAttempted: true,
    };

  return {
    logged_in: true,
    hasBeenAttempted: true,
    pool_key_phrase: key_phrase,
    device_id: DeviceId,
  };
};

const AuthContext = createContext<AuthShape>({
  logged_in: false,
  hasBeenAttempted: false,
});
export default AuthContext;
