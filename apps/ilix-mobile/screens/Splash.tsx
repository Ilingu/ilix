import { useContext, useEffect } from "react";
import AuthContext from "../lib/Auth";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Image } from "react-native";
import tw from "twrnc";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Splash">;
export default function Splash({ navigation }: NavigationProps) {
  const AuthState = useContext(AuthContext);

  useEffect(() => {
    if (AuthState.hasBeenAttempted) {
      if (AuthState.logged_in) navigation.push("Home");
      else navigation.push("Auth");
    }
  }, [AuthState]);

  return (
    <SafeAreaProvider>
      <Image
        source={require("../assets/splash.png")}
        style={tw`w-full h-full`}
      />
      <StatusBar style="light" backgroundColor="black" />
    </SafeAreaProvider>
  );
}
