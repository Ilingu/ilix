import { useContext, useEffect } from "react";
import { Image } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";

// type
import type { RootStackParamList } from "../App";

// ctx
import AuthContext from "../lib/Context/Auth";
import PoolContext from "../lib/Context/Pool";

// ui
import tw from "twrnc";
import { StatusBar } from "expo-status-bar";

// -- end import

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Splash">;
export default function Splash({ navigation }: NavigationProps) {
  const AuthState = useContext(AuthContext);
  const PoolState = useContext(PoolContext);

  // Always listen to changes in auth, e.g: if user logout it'll automatically redirect him to the "Auth" page
  useEffect(() => {
    if (!AuthState.loading && !PoolState.loading) {
      if (AuthState.logged_in && PoolState.pools !== undefined) navigation.navigate("Home");
      else navigation.navigate("Auth");
    }
  }, [AuthState.loading, PoolState.loading, AuthState.logged_in, PoolState.pools]);

  return (
    <SafeAreaProvider>
      <Image source={require("../assets/Images/splash.png")} style={tw`w-full h-full`} />
      <StatusBar style="light" backgroundColor="black" />
    </SafeAreaProvider>
  );
}
