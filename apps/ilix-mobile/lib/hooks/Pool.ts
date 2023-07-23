import { useContext, useEffect, useState } from "react";
import {
  DevicesPool,
  FunctionResult,
  StoredDevicesPool,
} from "../types/interfaces";
import { PoolCtxShape, StoredPools } from "../Context/Pool";
import { AS_Get, AS_Store, POOL_KEY } from "../db/AsyncStorage";
import AuthContext from "../Context/Auth";
import ApiClient from "../ApiClient";
import { IsCodeOk } from "../utils";

export const GetStoredPools = async (): Promise<PoolCtxShape> => {
  const { succeed, data } = await AS_Get<StoredPools>(POOL_KEY);
  return !succeed || !data
    ? { loading: false }
    : { pools: data, loading: false };
};

const PoolHook = (): PoolCtxShape => {
  const { pool_key_phrase } = useContext(AuthContext);

  const [poolsCtx, setPoolsCtx] = useState<PoolCtxShape>({ loading: true });

  const setInitialState = async () => {
    const defaultState = await GetStoredPools();

    defaultState.addPool = addPool;
    defaultState.setPool = setPool;

    setPoolsCtx(defaultState);
  };

  const addPool = async (pool: StoredDevicesPool): Promise<FunctionResult> => {
    const curState = { ...poolsCtx };
    const newState: PoolCtxShape = {
      pools: { current: 0, pools: [pool, ...(curState.pools?.pools ?? [])] },
      ...curState,
    };

    setPoolsCtx(newState);
    return await AS_Store(POOL_KEY, newState);
  };

  const setPool = async (new_index: number): Promise<FunctionResult> => {
    const curState = { ...poolsCtx };
    const newState: PoolCtxShape = {
      pools: { current: new_index, pools: curState.pools?.pools ?? [] },
      ...curState,
    };
    setPoolsCtx(newState);
    return await AS_Store(POOL_KEY, newState);
  };

  const updatePool = async (
    index: number,
    pool: StoredDevicesPool
  ): Promise<FunctionResult> => {
    const curState = { ...poolsCtx };
    curState.pools?.pools?.splice(index, 1, pool);
    const newState: PoolCtxShape = {
      pools: {
        current: curState.pools?.current ?? 0,
        pools: curState.pools?.pools ?? [],
      },
      ...curState,
    };

    setPoolsCtx(newState);
    return await AS_Store(POOL_KEY, newState);
  };

  const refresh_pool = async () => {
    /* when is this called?
    1. user change pool, new pool is set in the UI thanks to the cache
    2. pool kp is load separatly
    3. this function is called to refresh the pool data
    so all the currently loaded datas correspond to the pool to refresh 
    */
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

    const index = poolsCtx.pools?.current;
    if (index === undefined) return;
    const ss_key = poolsCtx.pools?.pools[index].SS_key_hashed_kp;
    if (ss_key === undefined) return;

    updatePool(index, {
      SS_key_hashed_kp: ss_key,
      ...data,
    });
  };

  useEffect(() => {
    setInitialState();
  }, []);

  useEffect(() => {
    refresh_pool();
  }, [pool_key_phrase]);

  return poolsCtx;
};
export default PoolHook;
