import { SS_Get, SS_Store, DEVICE_ID_KEY } from "../db/SecureStore";
import { Hash, IsEmptyString } from "../utils";

import * as Device from "expo-device";
import * as Application from "expo-application";

import type { AuthShape } from "../Context/Auth";

/**
 * @returns a promise with the **unique** user id
 */
const GetDeviceId = async (): Promise<string> => {
  let installationTime = "";
  try {
    installationTime = (await Application.getInstallationTimeAsync()).toISOString();
  } catch {}

  return Hash(
    `${Application.androidId}-${Device.brand}-${Device.deviceName}-${Device.manufacturer}-${Device.modelName}-${Device.osName}-${installationTime}`
  );
};

const defaultState: AuthShape = {
  cascading_update: true,
  logged_in: false,
  loading: false,
  get device_name() {
    return undefined;
  },
};

export const GetStoredAuthState = async (SS_key_hashed_kp?: string): Promise<AuthShape> => {
  let { succeed: id_succeed, data: DeviceId } = await SS_Get<string>(DEVICE_ID_KEY);
  if (!id_succeed || !DeviceId) {
    DeviceId = await GetDeviceId();
    const { succeed: set_succeed } = await SS_Store(DEVICE_ID_KEY, DeviceId);
    if (!set_succeed) return defaultState;
  }
  if (typeof SS_key_hashed_kp !== "string")
    return {
      ...defaultState,
      device_id: DeviceId,
    };

  const { succeed: kp_succeed, data: key_phrase } = await SS_Get<string>(SS_key_hashed_kp);
  if (!kp_succeed || !key_phrase)
    return {
      ...defaultState,
      device_id: DeviceId,
    };

  if (IsEmptyString(key_phrase) || IsEmptyString(DeviceId)) return defaultState;

  return {
    cascading_update: true,
    logged_in: true,
    loading: false,
    pool_key_phrase: key_phrase,
    device_id: DeviceId,
    get device_name() {
      return undefined;
    },
  };
};
