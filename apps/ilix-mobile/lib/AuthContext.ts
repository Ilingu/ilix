import { createContext } from "react";

export interface AuthShape {
  loggedIn: boolean;
}

export const defaultStore: AuthShape = {
  loggedIn: false,
};

const AuthContext = createContext<AuthShape>(defaultStore);
export default AuthContext;
