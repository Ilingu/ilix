import { createContext } from "react";
import type { FunctionResult, StoredDevicesPool } from "../types/interfaces";

export type StoredPools = {
  current_index: number;
  pools: StoredDevicesPool[];
  get current(): StoredDevicesPool;
  get currentName(): (device_id: string) => string;
};

export interface PoolCtxShape {
  pools?: StoredPools;
  loading: boolean;
  cascading_update: boolean;
  addPool?: (pool: StoredDevicesPool, with_CC_update?: boolean) => Promise<FunctionResult>;
  setPool?: (new_index: number) => Promise<FunctionResult>;
  leavePool?: (pool_index: number) => Promise<FunctionResult>;
  /** should not be used directly (destined to inner data model).
   *
   * It replaces the pool at `index` by `new_pool`
   *
   * @param {number} index
   * @param {StoredDevicesPool} new_pool
   * @returns {FunctionResult} whether it succeed or not
   */
  _updatePool?: (index: number, new_pool?: StoredDevicesPool) => Promise<FunctionResult>;
}

const PoolContext = createContext<PoolCtxShape>({
  loading: true,
  cascading_update: true,
});
export default PoolContext;
