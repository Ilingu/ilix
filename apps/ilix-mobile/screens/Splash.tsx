import { useContext, useEffect } from "react";
import AuthContext from "../lib/Context/Auth";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "react-native";
import tw from "twrnc";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import PoolContext from "../lib/Context/Pool";

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
