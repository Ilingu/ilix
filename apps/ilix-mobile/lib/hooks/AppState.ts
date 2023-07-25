import { AuthShape } from "../Context/Auth";
import type { PoolCtxShape } from "../Context/Pool";
import { TransfersCtx } from "../Context/Transfer";
import type {
  FilePoolTransfer,
  FunctionResult,
  StoredDevicesPool,
} from "../types/interfaces";
import { MakeKeyPhraseKey, SS_Get, SS_Store } from "../db/SecureStore";
import { useEffect, useRef, useState } from "react";
import { GetStoredAuthState } from "../db/Auth";
import { AS_Store, POOL_KEY } from "../db/AsyncStorage";
import ApiClient from "../ApiClient";
import { IsCodeOk } from "../utils";
import { GetStoredPools } from "../db/Pools";

interface AppStateShape {
  authState: AuthShape;
  poolState: PoolCtxShape;
  transferState: TransfersCtx;
}

const AppState = (): AppStateShape => {
  //#region : Auth State
  const [authState, setAuthState] = useState<AuthShape>({
    cascading_update: true,
    logged_in: false,
    loading: true,
  });
  //#endregion

  //#region : Pool State
  const [poolState, setPoolState] = useState<PoolCtxShape>({
    loading: true,
    cascading_update: true,
  });
  //#endregion

  //#region : Transfer State
  const [transferState, setTransferState] = useState<TransfersCtx>([
    false,
    null,
    [],
  ]);
  //#endregion

  //#region : Auth Hook
  {
    const setAuthInitialState = async (SS_key_hashed_kp?: string) => {
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
      if (!poolState.cascading_update || poolState.loading) return;

      const poolKp = poolState.pools?.current.SS_key_hashed_kp;
      if (poolKp === undefined) {
        isFirstLoad && setAuthInitialState();
        return;
      }

      if (isFirstLoad) lastPoolLoadingState.current = true;
      (isFirstLoad ? setAuthInitialState : setPoolKeyPhrase)(poolKp);
    }, [poolState.loading, poolState.pools?.current_index]);
  }
  //#endregion

  //#region : Pool Hook
  {
    const setPoolInitialState = async () => {
      const defaultState = await GetStoredPools();

      defaultState.addPool = addPool;
      defaultState.setPool = setPool;

      setPoolState(defaultState);
    };

    const addPool = async (
      pool: StoredDevicesPool,
      with_CC_update = false
    ): Promise<FunctionResult> => {
      const curState = { ...poolState };
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

      setPoolState(newState);
      return await AS_Store(POOL_KEY, newState.pools);
    };

    const setPool = async (new_index: number): Promise<FunctionResult> => {
      const curState = { ...poolState };
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
      setPoolState(newState);
      return await AS_Store(POOL_KEY, newState.pools);
    };

    const updatePool = async (
      index: number,
      pool: StoredDevicesPool
    ): Promise<FunctionResult> => {
      const curState = { ...poolState };
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

      setPoolState(newState);
      return await AS_Store(POOL_KEY, newState.pools);
    };

    const refresh_pool = async () => {
      /* when is this called?
    1. user change pool, new pool is set in the UI thanks to the cache
    2. pool kp is load separatly
    3. this function is called to refresh the pool data
    so all the currently loaded datas correspond to the pool to refresh 
    */
      if (
        typeof authState.pool_key_phrase !== "string" ||
        !IsCodeOk(authState.pool_key_phrase)
      )
        return;

      const { succeed, data } = await ApiClient.get("/pool/{pool_kp}", {
        pool_kp: authState.pool_key_phrase,
      });

      if (!succeed || !data) return;
      if (
        !("pool_name" in data) ||
        !("devices_id" in data) ||
        !("devices_id_to_name" in data)
      )
        return;

      const index = poolState.pools?.current_index;
      if (index === undefined) return;
      const ss_key = poolState.pools?.current.SS_key_hashed_kp;
      if (ss_key === undefined) return;

      updatePool(index, {
        SS_key_hashed_kp: ss_key,
        ...data,
      });
    };

    useEffect(() => {
      setPoolInitialState();
    }, []);

    useEffect(() => {
      if (!authState.cascading_update) return;
      refresh_pool();
    }, [authState.pool_key_phrase]);
  }
  //#endregion

  //#region : Transfer Hook
  {
    const fecthTransfers = async (): Promise<
      FunctionResult<FilePoolTransfer[]>
    > => {
      if (authState.loading || authState.device_id === undefined)
        return { succeed: false };
      const KP_Copy = `${authState.pool_key_phrase}`;

      const { succeed, data, reason } = await ApiClient.get(
        "/file-transfer/{pool_kp}/{device_id}/all",
        {
          pool_kp: KP_Copy,
          device_id: authState.device_id,
        }
      );
      if (!succeed || data === undefined || data.length === 0)
        return { succeed: false, reason };
      if (
        !data.every(
          (d) => "_id" in d && "to" in d && "from" in d && "files_id" in d
        )
      )
        return { succeed: false, reason: "Corrupted datas" };
      return { succeed: true, data };
    };

    useEffect(() => {
      if (authState.loading || authState.device_id === undefined) return;
      // when "pool_key_phrase" is set for the 1st time, the pools are already loaded, if it isn't the 1st time it's a pool change
      (async () => {
        setTransferState([true, null, []]);

        const { succeed, data } = await fecthTransfers();
        const realSuccess = succeed && data !== undefined && data.length > 0;

        if (realSuccess) setTransferState([false, true, data]);
        else setTransferState([false, false, []]);
      })();
    }, [authState.pool_key_phrase]);
  }
  //#endregion

  return {
    authState,
    poolState,
    transferState,
  };
};
export default AppState;