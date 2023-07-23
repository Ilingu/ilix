import { useContext, useEffect, useState } from "react";
import PoolContext from "../Context/Pool";
import AuthContext from "../Context/Auth";
import { TransfersCtx } from "../Context/Transfer";
import ApiClient from "../ApiClient";
import type { FunctionResult } from "../types/interfaces";

const TransferHook = (): [boolean, boolean | null, TransfersCtx] => {
  const {
    pool_key_phrase,
    device_id,
    loading: AuthLoading,
  } = useContext(AuthContext);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [transfers, setTransfers] = useState<TransfersCtx>([]);

  const fecthTransfers = async (): Promise<FunctionResult<TransfersCtx>> => {
    if (AuthLoading || device_id === undefined) return { succeed: false };
    const KP_Copy = `${pool_key_phrase}`;

    const { succeed, data, reason } = await ApiClient.get(
      "/file-transfer/{pool_kp}/{device_id}/all",
      {
        pool_kp: KP_Copy,
        device_id,
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
    // when "pool_key_phrase" is set for the 1st time, the pools are already loaded, if it isn't the 1st time it's a pool change
    (async () => {
      setIsSuccess(null);
      setIsLoading(true);

      const { succeed, data } = await fecthTransfers();
      const realSuccess = succeed && data !== undefined && data.length > 0;

      if (realSuccess) setTransfers(data);
      setIsSuccess(realSuccess);
      setIsLoading(false);
    })();
  }, [pool_key_phrase]);

  return [isLoading, isSuccess, transfers];
};
export default TransferHook;
