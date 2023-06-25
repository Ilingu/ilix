import { useEffect, useState } from "react";
import { AuthShape, defaultAuthState } from "../Auth";

const AuthHook = (): AuthShape => {
  const [authState, setAuthState] = useState<AuthShape>({
    logged_in: false,
    hasBeenAttempted: false,
  });

  const setInitialState = async () => {
    const defaultState = await defaultAuthState();
    setAuthState(defaultState);
  };

  useEffect(() => {
    setInitialState();
  }, []);

  return authState;
};
export default AuthHook;
