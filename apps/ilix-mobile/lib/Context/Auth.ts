import { createContext } from "react";
import type { FunctionResult } from "../types/interfaces";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

export interface AuthShape {
  logged_in: boolean;
  loading: boolean;
  cascading_update: boolean;
  pool_key_phrase?: string;
  device_id?: string;
  get device_name(): string | undefined;
  addPoolKeyPhrase?: (
    pool_key_phrase: string,
    with_CC_update?: boolean
  ) => Promise<FunctionResult>;
  setPoolKeyPhrase?: (hashed_kp: string) => Promise<FunctionResult>;
  logOut?: <T extends keyof RootStackParamList>({
    navigation,
  }: NativeStackScreenProps<RootStackParamList, T>) => Promise<void>;
}

const AuthContext = createContext<AuthShape>({
  logged_in: false,
  loading: true,
  cascading_update: true,
  get device_name() {
    return undefined;
  },
});
export default AuthContext;
