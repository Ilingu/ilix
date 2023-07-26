import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import type { RootStackParamList } from "../App";
import PreventNavHook from "../lib/hooks/PreventNav";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useContext } from "react";
import AuthContext from "../lib/Context/Auth";
import ColorScheme from "../lib/Theme";

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Home">;
export default function Home(nav: NavigationProps) {
  const { device_name } = useContext(AuthContext);
  PreventNavHook(nav, true);

  return (
    <SafeAreaProvider>
      <View style={tw`mt-2`}>
        <View>
          <Text style={tw`text-center text-xl text-[${ColorScheme.TEXT}]`}>
            Welcome <Text>{device_name}</Text>!
          </Text>
        </View>
      </View>
    </SafeAreaProvider>
  );
}
