import { AuthShape } from "../Context/Auth";
import type { PoolCtxShape } from "../Context/Pool";
import { TransfersCtx } from "../Context/Transfer";
import type { FilePoolTransfer, FunctionResult, StoredDevicesPool } from "../types/interfaces";
import { MakeKeyPhraseKey, SS_Get, SS_Store, SS_clear } from "../db/SecureStore";
import { useEffect, useRef, useState } from "react";
import { GetStoredAuthState } from "../db/Auth";
import { AS_Clear, AS_Store, POOL_KEY } from "../db/AsyncStorage";
import ApiClient from "../ApiClient";
import { IsCodeOk, ToastDuration, pushToast } from "../utils";
import { GetStoredPools } from "../db/Pools";
import SSEClient from "../sse";

interface AppStateShape {
  authState: AuthShape;
  poolState: PoolCtxShape;
  transferState: TransfersCtx;
}

const useAppState = (): AppStateShape => {
  //#region : SSE State
  //#endregion

  //#region : Auth State
  const [authState, setAuthState] = useState<AuthShape>({
    cascading_update: true,
    logged_in: false,
    loading: true,
    get device_name() {
      return undefined;
    },
  });
  const authStateRef = useRef(authState);
  authStateRef.current = authState;
  //#endregion

  //#region : Pool State
  const [poolState, setPoolState] = useState<PoolCtxShape>({
    loading: true,
    cascading_update: true,
  });
  const poolStateRef = useRef(poolState);
  poolStateRef.current = poolState;
  //#endregion

  //#region : Transfer State
  const [transferState, setTransferState] = useState<TransfersCtx>([
    false,
    null,
    [],
    async () => {},
  ]);
  const transferStateRef = useRef(transferState);
  transferStateRef.current = transferState;
  //#endregion

  //#region : Auth Hook
  {
    const setAuthInitialState = async (SS_key_hashed_kp?: string) => {
      const defaultState = await GetStoredAuthState(SS_key_hashed_kp);

      defaultState.addPoolKeyPhrase = addPoolKeyPhrase;
      defaultState.setPoolKeyPhrase = setPoolKeyPhrase;
      defaultState.logOut = logOut;

      setAuthState({
        ...defaultState,
        get device_name() {
          return getDeviceName(defaultState.device_id);
        },
      });
    };

    const getDeviceName = (device_id?: string) => {
      const authState = authStateRef.current;
      const poolState = poolStateRef.current;
      return (device_id ?? authState.device_id) === undefined
        ? undefined
        : poolState.pools?.current.devices_id_to_name[(device_id ?? authState.device_id) as string];
    };

    const logOut = async () => {
      const poolState = poolStateRef.current;

      let ss_ok = true;
      if (poolState.pools?.pools !== undefined) {
        const { succeed } = await SS_clear(poolState.pools?.pools);
        ss_ok = succeed;
      }
      const { succeed: as_ok } = await AS_Clear();
      if (!ss_ok || !as_ok) return pushToast("Failed to log out");

      setAuthState((prev) => ({
        ...prev,
        cascading_update: true,
        loading: false,
        logged_in: false,
        pool_key_phrase: undefined,
        get device_name() {
          return undefined;
        },
      }));
      setPoolState((prev) => ({
        ...prev,
        cascading_update: true,
        loading: false,
        pools: undefined,
      }));
      setTransferState((prev) => [false, null, [], prev[3]]);

      pushToast("Successfully logged out");
    };

    const addPoolKeyPhrase = async (
      pool_key_phrase: string,
      with_CC_update = false
    ): Promise<FunctionResult> => {
      setAuthState((prev) => ({
        ...prev,
        pool_key_phrase,
        cascading_update: with_CC_update,
        get device_name() {
          return getDeviceName();
        },
      }));
      return await SS_Store(MakeKeyPhraseKey(pool_key_phrase), pool_key_phrase);
    };

    const setPoolKeyPhrase = async (SS_key_hashed_kp: string): Promise<FunctionResult> => {
      const { succeed, data: new_key_phrase } = await SS_Get<string>(SS_key_hashed_kp);
      if (!succeed) return { succeed: false };

      setAuthState((prev) => ({
        ...prev,
        pool_key_phrase: new_key_phrase,
        cascading_update: true,
        get device_name() {
          return getDeviceName();
        },
      }));
      return { succeed: true };
    };

    const handleSseEvent = async (sse_handler: SSEClient) => {
      sse_handler.addEventListener("on_pool", (updated_pool) => {
        const currIndex = poolStateRef.current.pools?.current_index;
        if (
          currIndex === undefined ||
          poolStateRef.current._updatePool === undefined ||
          authStateRef.current.pool_key_phrase === undefined
        )
          return;

        // by design, the "updated_pool" is the updated pool data of the current pool in the UI
        // because SSE is linked to the event of the current pool
        poolStateRef.current._updatePool(currIndex, {
          ...updated_pool,
          SS_key_hashed_kp: MakeKeyPhraseKey(authStateRef.current.pool_key_phrase),
        });
      });
      sse_handler.addEventListener("on_transfer", (updated_transfer) => {
        // update the old transfer by the updated one
        setTransferState(([l, s, transfers, refresh]) => {
          const update_index = transfers.findIndex(({ _id }) => _id === updated_transfer._id);
          if (update_index === -1) return [l, s, [updated_transfer, ...transfers], refresh];

          const newTransfers = [...transfers];
          newTransfers[update_index] = updated_transfer;

          return [l, s, newTransfers, refresh];
        });

        console.log({ updated_transfer });
      });
      sse_handler.addEventListener("on_logout", () => {
        pushToast("This pool has been deleted");
        logOut();
      });
    };

    useEffect(() => {
      (async () => {
        if (authState.device_id === undefined || authState.pool_key_phrase === undefined) return;
        const { succeed, data: SSEHandler } = await SSEClient.new_connection(
          authState.device_id,
          authState.pool_key_phrase
        );
        if (!succeed || !SSEHandler || !(SSEHandler instanceof SSEClient)) return;
        handleSseEvent(SSEHandler);
      })();
    }, [authState.device_id, authState.pool_key_phrase]);

    const isFirstLoad = useRef(true);
    useEffect(() => {
      if (!poolState.cascading_update || poolState.loading) return;

      const poolKp = poolState.pools?.current.SS_key_hashed_kp;
      if (poolKp === undefined) {
        isFirstLoad.current && setAuthInitialState();
        return;
      }

      (isFirstLoad.current ? setAuthInitialState : setPoolKeyPhrase)(poolKp);
      if (isFirstLoad.current) isFirstLoad.current = false;
    }, [poolState.loading, poolState.pools?.current_index, poolState.cascading_update]);
  }
  //#endregion

  //#region : Pool Hook
  {
    const setPoolInitialState = async () => {
      const defaultState = await GetStoredPools();

      defaultState.addPool = addPool;
      defaultState.setPool = setPool;
      defaultState.leavePool = leavePool;
      defaultState._updatePool = updatePool;

      setPoolState(defaultState);
    };

    const addPool = async (
      pool: StoredDevicesPool,
      with_CC_update = false
    ): Promise<FunctionResult> => {
      const curState = { ...poolStateRef.current };
      const newState: PoolCtxShape = {
        ...curState,
        pools: {
          current_index: 0,
          pools: [pool, ...(curState.pools?.pools ?? [])],
          get current() {
            return this.pools[this.current_index];
          },
          get currentName() {
            return (device_id: string): string => {
              return this.current.devices_id_to_name[device_id];
            };
          },
        },
        cascading_update: with_CC_update,
      };

      setPoolState(newState);
      return await AS_Store(POOL_KEY, newState.pools);
    };

    const setPool = async (new_index: number): Promise<FunctionResult> => {
      const curState = { ...poolStateRef.current };
      const newState: PoolCtxShape = {
        ...curState,
        pools: {
          current_index: new_index,
          pools: curState.pools?.pools ?? [],
          get current() {
            return this.pools[new_index];
          },
          get currentName() {
            return (device_id: string): string => {
              return this.current.devices_id_to_name[device_id];
            };
          },
        },
        cascading_update: true,
      };
      setPoolState(newState);
      return await AS_Store(POOL_KEY, newState.pools);
    };

    const updatePool = async (
      index: number,
      new_pool?: StoredDevicesPool
    ): Promise<FunctionResult> => {
      const curState = { ...poolStateRef.current };
      const curPool = { ...curState.pools?.current };

      if (new_pool === undefined) curState.pools?.pools?.splice(index, 1); // delete
      else curState.pools?.pools?.splice(index, 1, new_pool); // replace

      const next_index =
        new_pool === undefined
          ? curState.pools?.pools.findIndex(
              ({ SS_key_hashed_kp }) => curPool?.SS_key_hashed_kp === SS_key_hashed_kp
            ) ?? 0
          : curState.pools?.current_index;
      if (next_index === undefined) return { succeed: false };

      const newState: PoolCtxShape = {
        ...curState,
        pools:
          curState.pools?.pools === undefined || curState.pools?.pools.length <= 0
            ? undefined
            : {
                current_index: next_index,
                pools: curState.pools?.pools,
                get current() {
                  return this.pools[this.current_index];
                },
                get currentName() {
                  return (device_id: string): string => {
                    return this.current.devices_id_to_name[device_id];
                  };
                },
              },
        cascading_update: true,
      };

      setPoolState(newState);
      return await AS_Store(POOL_KEY, newState.pools);
    };

    const leavePool = async (pool_index: number): Promise<FunctionResult> => {
      const poolState = { ...poolStateRef.current };
      const authState = { ...authStateRef.current };
      if (authState.device_id === undefined) return { succeed: false };

      if (poolState.pools?.pools.length === 1) {
        if (authState.pool_key_phrase === undefined) return { succeed: false };

        const { succeed: leave_ok } = await ApiClient.Delete(
          "/pool/leave",
          undefined,
          { device_id: authState.device_id },
          { pool_kp: authState.pool_key_phrase }
        );
        if (!leave_ok) return { succeed: false };

        authStateRef.current.logOut?.();
        return { succeed: true };
      }

      if (poolState.pools?.current_index === pool_index) {
        // switch before delete
        const next_index = poolState.pools?.pools.findIndex((_, i) => i !== pool_index);

        if (next_index === undefined) return { succeed: false };
        const { succeed } = await setPool(next_index);
        if (!succeed) return { succeed: false };
      }

      const pool = poolState.pools?.pools[pool_index];
      if (pool === undefined) return { succeed: false };

      const { succeed, data: pool_key_phrase } = await SS_Get<string>(pool.SS_key_hashed_kp);
      if (!succeed || typeof pool_key_phrase !== "string") return { succeed: false };

      const { succeed: leave_ok } = await ApiClient.Delete(
        "/pool/leave",
        undefined,
        { device_id: authState.device_id },
        { pool_kp: pool_key_phrase }
      );
      if (!leave_ok) return { succeed: false };

      return updatePool(pool_index, undefined); // replace this pool with "nothing" => it deletes pool
    };

    const refresh_pool = async () => {
      /* when is this called?
    1. user change pool, new pool is set in the UI thanks to the cache
    2. pool kp is load separatly
    3. this function is called to refresh the pool data
    so all the currently loaded datas correspond to the pool to refresh 
    */
      const authState = { ...authStateRef.current };
      if (typeof authState.pool_key_phrase !== "string" || !IsCodeOk(authState.pool_key_phrase))
        return;

      const { succeed, data, reason } = await ApiClient.Get("/pool", undefined, undefined, {
        pool_kp: authState.pool_key_phrase,
      });

      if (!succeed && reason === "PoolNotFound" && authState.logOut) {
        pushToast("This pool no longer exists, logging out...", ToastDuration.LONG);
        return await authState.logOut();
      }

      if (!succeed || !data) return;
      if (!("pool_name" in data) || !("devices_id" in data) || !("devices_id_to_name" in data))
        return;

      const index = poolState.pools?.current_index;
      if (index === undefined) return;
      const ss_key = poolState.pools?.current.SS_key_hashed_kp;
      if (ss_key === undefined) return;

      updatePool(index, {
        ...data,
        SS_key_hashed_kp: ss_key,
      });
    };

    useEffect(() => {
      setPoolInitialState();
    }, []);

    useEffect(() => {
      if (!authState.cascading_update) return;
      refresh_pool();
    }, [authState.pool_key_phrase, authState.cascading_update]);
  }
  //#endregion

  //#region : Transfer Hook
  {
    const fecthTransfers = async (): Promise<FunctionResult<FilePoolTransfer[]>> => {
      const authStateCopy = { ...authState };
      if (
        authStateCopy.loading ||
        authStateCopy.device_id === undefined ||
        authStateCopy.pool_key_phrase === undefined
      )
        return { succeed: false };

      const { succeed, data, reason } = await ApiClient.Get(
        "/file-transfer/{device_id}/all",
        {
          device_id: authStateCopy.device_id,
        },
        undefined,
        { pool_kp: authStateCopy.pool_key_phrase }
      );
      if (!succeed || data === undefined || data.length === 0) return { succeed: false, reason };
      if (!data.every((d) => "_id" in d && "to" in d && "from" in d && "files_id" in d))
        return { succeed: false, reason: "Corrupted datas" };
      return { succeed: true, data };
    };

    const refresh = async () => {
      setTransferState((prev) => [true, null, prev[2], refresh]);

      const { succeed, data } = await fecthTransfers();
      const realSuccess = succeed && data !== undefined && data.length > 0;

      if (realSuccess) setTransferState([false, true, data, refresh]);
      else setTransferState([false, false, [], refresh]);
    };

    useEffect(() => {
      if (
        authState.loading ||
        authState.device_id === undefined ||
        authState.pool_key_phrase === undefined
      )
        return;

      // when "pool_key_phrase" is set for the 1st time, the pools are already loaded, if it isn't the 1st time it's a pool change
      refresh();
    }, [authState.pool_key_phrase, authState.loading]);
  }
  //#endregion

  return {
    authState,
    poolState,
    transferState,
  };
};
export default useAppState;
