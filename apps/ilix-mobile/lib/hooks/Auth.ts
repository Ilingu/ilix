import { useContext, useEffect, useRef, useState } from "react";
import { AuthShape } from "../Context/Auth";
import type { FunctionResult } from "../types/interfaces";
import {
  MakeKeyPhraseKey,
  SS_Get,
  SS_Store,
  DEVICE_ID_KEY,
} from "../db/SecureStore";
import PoolContext from "../Context/Pool";
import * as Device from "expo-device";
import { Hash, IsEmptyString } from "../utils";
import * as Application from "expo-application";

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

const defaultState: AuthShape = {
  cascading_update: true,
  logged_in: false,
  loading: false,
};

const GetStoredAuthState = async (
  SS_key_hashed_kp: string
): Promise<AuthShape> => {
  let { succeed: id_succeed, data: DeviceId } = await SS_Get<string>(
    DEVICE_ID_KEY
  );
  if (!id_succeed || !DeviceId) {
    DeviceId = await GetDeviceId();
    const { succeed: set_succeed } = await SS_Store(DEVICE_ID_KEY, DeviceId);
    if (!set_succeed) return defaultState;
  }
  const { succeed: kp_succeed, data: key_phrase } = await SS_Get<string>(
    SS_key_hashed_kp
  );
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
  };
};

const AuthHook = (): AuthShape => {
  const {
    pools,
    loading,
    cascading_update: PoolCCUpdate,
  } = useContext(PoolContext);

  const [authState, setAuthState] = useState<AuthShape>({
    cascading_update: true,
    logged_in: false,
    loading: true,
  });

  const setInitialState = async (SS_key_hashed_kp: string) => {
    const defaultState = await GetStoredAuthState(SS_key_hashed_kp);

    defaultState.addPoolKeyPhrase = addPoolKeyPhrase;
    defaultState.setPoolKeyPhrase = setPoolKeyPhrase;

    setAuthState(defaultState);
  };

  const addPoolKeyPhrase = async (
    pool_key_phrase: string,
    with_CC_update = false
  ): Promise<FunctionResult> => {
    setAuthState((prev) => ({
      ...prev,
      pool_key_phrase,
      cascading_update: with_CC_update,
    }));
    return await SS_Store(MakeKeyPhraseKey(pool_key_phrase), pool_key_phrase);
  };

  const setPoolKeyPhrase = async (
    SS_key_hashed_kp: string
  ): Promise<FunctionResult> => {
    const { succeed, data: new_key_phrase } = await SS_Get<string>(
      SS_key_hashed_kp
    );
    if (!succeed) return { succeed: false };

    setAuthState((prev) => ({
      ...prev,
      pool_key_phrase: new_key_phrase,
      cascading_update: true,
    }));
    return { succeed: true };
  };

  const lastPoolLoadingState = useRef(false);
  useEffect(() => {
    const isFirstLoad = lastPoolLoadingState.current === false;
    if (!PoolCCUpdate && !isFirstLoad) return;

    const poolKp = pools?.current.SS_key_hashed_kp;
    if (poolKp === undefined) {
      isFirstLoad && setAuthState(defaultState);
      return;
    }

    if (isFirstLoad) lastPoolLoadingState.current = true;
    (isFirstLoad ? setInitialState : setPoolKeyPhrase)(poolKp);
  }, [loading, pools?.current_index]);

  return authState;
};
export default AuthHook;
