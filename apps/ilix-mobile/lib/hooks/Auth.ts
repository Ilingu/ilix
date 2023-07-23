import { useContext, useEffect, useState } from "react";
import { AuthShape, GetStoredAuthState } from "../Context/Auth";
import type { FunctionResult } from "../types/interfaces";
import { MakeKeyPhraseKey, SS_Get, SS_Store } from "../db/SecureStore";
import PoolContext from "../Context/Pool";

const AuthHook = (): AuthShape => {
  const { pools } = useContext(PoolContext);

  const [authState, setAuthState] = useState<AuthShape>({
    logged_in: false,
    loading: true,
  });

  const setInitialState = async () => {
    const defaultState = await GetStoredAuthState();
    defaultState.addPoolKeyPhrase = addPoolKeyPhrase;
    setAuthState(defaultState);
  };

  const addPoolKeyPhrase = async (
    pool_key_phrase: string
  ): Promise<FunctionResult> => {
    setAuthState((prev) => ({
      pool_key_phrase,
      ...prev,
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
      pool_key_phrase: new_key_phrase,
      ...prev,
    }));
    return { succeed: true };
  };

  useEffect(() => {
    setInitialState();
  }, []);

  useEffect(() => {
    const newPoolKp = pools?.pools[pools?.current].SS_key_hashed_kp;
    if (newPoolKp === undefined) return;
    setPoolKeyPhrase(newPoolKp);
  }, [pools?.current]);

  return authState;
};
export default AuthHook;
