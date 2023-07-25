import type { PoolCtxShape, StoredPools } from "../Context/Pool";
import { AS_Get, POOL_KEY } from "./AsyncStorage";

export const GetStoredPools = async (): Promise<PoolCtxShape> => {
  const defaultState: PoolCtxShape = { loading: false, cascading_update: true };
  const { succeed, data } = await AS_Get<StoredPools>(POOL_KEY);
  return !succeed || !data ? defaultState : { pools: data, ...defaultState };
};
