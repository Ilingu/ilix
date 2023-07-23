import { useContext, useEffect, useState } from "react";
import type { FunctionResult, StoredDevicesPool } from "../types/interfaces";
import { PoolCtxShape, StoredPools } from "../Context/Pool";
import { AS_Get, AS_Store, POOL_KEY } from "../db/AsyncStorage";
import AuthContext from "../Context/Auth";
import ApiClient from "../ApiClient";
import { IsCodeOk } from "../utils";

export const GetStoredPools = async (): Promise<PoolCtxShape> => {
  const defaultState: PoolCtxShape = { loading: false, cascading_update: true };
  const { succeed, data } = await AS_Get<StoredPools>(POOL_KEY);
  return !succeed || !data ? defaultState : { pools: data, ...defaultState };
};

const PoolHook = (): PoolCtxShape => {
  const { pool_key_phrase, cascading_update: AuthCCUpdate } =
    useContext(AuthContext);

  const [poolsCtx, setPoolsCtx] = useState<PoolCtxShape>({
    loading: true,
    cascading_update: true,
  });

  const setInitialState = async () => {
    const defaultState = await GetStoredPools();

    defaultState.addPool = addPool;
    defaultState.setPool = setPool;

    setPoolsCtx(defaultState);
  };

  const addPool = async (
    pool: StoredDevicesPool,
    with_CC_update = false
  ): Promise<FunctionResult> => {
    const curState = { ...poolsCtx };
    const newState: PoolCtxShape = {
      ...curState,
      pools: {
        current_index: 0,
        pools: [pool, ...(curState.pools?.pools ?? [])],
        get current() {
          return this.pools[this.current_index];
        },
      },
      cascading_update: with_CC_update,
    };

    setPoolsCtx(newState);
    return await AS_Store(POOL_KEY, newState);
  };

  const setPool = async (new_index: number): Promise<FunctionResult> => {
    const curState = { ...poolsCtx };
    const newState: PoolCtxShape = {
      ...curState,
      pools: {
        current_index: new_index,
        pools: curState.pools?.pools ?? [],
        get current() {
          return this.pools[this.current_index];
        },
      },
      cascading_update: true,
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

    const same_index = curState.pools?.current_index;
    if (same_index === undefined) return { succeed: false };

    const newState: PoolCtxShape = {
      ...curState,
      pools: {
        current_index: same_index,
        pools: curState.pools?.pools ?? [],
        get current() {
          return this.pools[this.current_index];
        },
      },
      cascading_update: true,
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

    const index = poolsCtx.pools?.current_index;
    if (index === undefined) return;
    const ss_key = poolsCtx.pools?.current.SS_key_hashed_kp;
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
    if (!AuthCCUpdate) return;
    refresh_pool();
  }, [pool_key_phrase]);

  return poolsCtx;
};
export default PoolHook;
