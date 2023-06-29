import { createContext } from "react";
import type { DevicesPool, FunctionResult } from "../types/interfaces";
import { AS_Get, POOL_KEY as POOL_KEY } from "../db/AsyncStorage";

export interface PoolCtxShape {
  pool?: DevicesPool;
  loading: boolean;
  setPool?: (pool: DevicesPool) => Promise<FunctionResult>;
}

export const GetStoredPools = async (): Promise<PoolCtxShape> => {
  const { succeed, data } = await AS_Get<DevicesPool>(POOL_KEY);
  return !succeed || !data
    ? { loading: false }
    : { pool: data, loading: false };
};

const PoolContext = createContext<PoolCtxShape>({ loading: true });
export default PoolContext;
