import { useEffect, useState } from "react";
import { AuthShape, GetStoredAuthState } from "../Context/Auth";
import type { FunctionResult } from "../types/interfaces";
import { KEY_PHRASE_KEY, SS_Store } from "../db/SecureStore";

const AuthHook = (): AuthShape => {
  const [authState, setAuthState] = useState<AuthShape>({
    logged_in: false,
    loading: true,
  });

  const setInitialState = async () => {
    const defaultState = await GetStoredAuthState();
    defaultState.setPoolKeyPhrase = setPoolKeyPhrase;
    setAuthState(defaultState);
  };

  const setPoolKeyPhrase = async (
    pool_key_phrase: string
  ): Promise<FunctionResult> => {
    setAuthState((prev) => ({
      pool_key_phrase,
      ...prev,
    }));
    return await SS_Store(KEY_PHRASE_KEY, pool_key_phrase);
  };

  useEffect(() => {
    setInitialState();
  }, []);

  return authState;
};
export default AuthHook;
