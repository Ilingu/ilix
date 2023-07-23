import { createContext } from "react";
import type {
  DevicesPool,
  FunctionResult,
  StoredDevicesPool,
} from "../types/interfaces";

export type StoredPools = {
  current: number;
  pools: StoredDevicesPool[];
};

export interface PoolCtxShape {
  pools?: StoredPools;
  loading: boolean;
  addPool?: (pool: StoredDevicesPool) => Promise<FunctionResult>;
  setPool?: (new_index: number) => Promise<FunctionResult>;
}

const PoolContext = createContext<PoolCtxShape>({ loading: true });
export default PoolContext;
