import { useContext, useEffect, useState } from "react";
import { DevicesPool, FunctionResult } from "../types/interfaces";
import { PoolCtxShape, GetStoredPools } from "../Context/Pool";
import { AS_Store, POOL_KEY } from "../db/AsyncStorage";
import AuthContext from "../Context/Auth";
import ApiClient from "../ApiClient";
import { IsCodeOk } from "../utils";

const PoolHook = (): PoolCtxShape => {
  const { pool_key_phrase } = useContext(AuthContext);

  const [poolsCtx, setPoolsCtx] = useState<PoolCtxShape>({ loading: true });

  const setInitialState = async () => {
    const defaultState = await GetStoredPools();
    defaultState.setPool = setPool;
    setPoolsCtx(defaultState);
  };

  const setPool = async (pool: DevicesPool): Promise<FunctionResult> => {
    setPoolsCtx((prev) => ({
      pool,
      ...prev,
    }));
    return await AS_Store(POOL_KEY, pool);
  };

  const refresh = async () => {
    if (typeof pool_key_phrase !== "string" || !IsCodeOk(pool_key_phrase))
      return;

    const { succeed, data } = await ApiClient.get("/pool/{pool_kp}", {
      pool_kp: pool_key_phrase,
    });

    if (!succeed || !data) return;
    if (
      !("pool_name" in data) ||
      !("devices_id" in data) ||
      !("devices_id_to_name" in data)
    )
      return;

    setPool(data);
  };

  useEffect(() => {
    setInitialState();
  }, []);

  useEffect(() => {
    refresh();
  }, [pool_key_phrase]);

  return poolsCtx;
};
export default PoolHook;
