import { useEffect, useState } from "react";
import { AuthShape, defaultAuthState } from "../Auth";
import type { FunctionResult } from "../types/interfaces";
import { KEY_PHRASE_KEY, SaveToSecureStore } from "../SecureStore";

const AuthHook = (): AuthShape => {
  const [authState, setAuthState] = useState<AuthShape>({
    logged_in: false,
    hasBeenAttempted: false,
  });

  const setInitialState = async () => {
    const defaultState = await defaultAuthState();
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
    return await SaveToSecureStore(KEY_PHRASE_KEY, pool_key_phrase);
  };

  useEffect(() => {
    setInitialState();
  }, []);

  return authState;
};
export default AuthHook;
