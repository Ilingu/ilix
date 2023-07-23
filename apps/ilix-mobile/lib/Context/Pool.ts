import { createContext } from "react";
import type { FunctionResult, StoredDevicesPool } from "../types/interfaces";

export type StoredPools = {
  current_index: number;
  pools: StoredDevicesPool[];
  get current(): StoredDevicesPool;
};

export interface PoolCtxShape {
  pools?: StoredPools;
  loading: boolean;
  cascading_update: boolean;
  addPool?: (
    pool: StoredDevicesPool,
    with_CC_update?: boolean
  ) => Promise<FunctionResult>;
  setPool?: (new_index: number) => Promise<FunctionResult>;
}

const PoolContext = createContext<PoolCtxShape>({
  loading: true,
  cascading_update: true,
});
export default PoolContext;
