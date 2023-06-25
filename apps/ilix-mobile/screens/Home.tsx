import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, Text, View } from "react-native";
import type { RootStackParamList } from "../App";
import PreventNavHook from "../lib/hooks/PreventNav";

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Home">;
export default function Home(nav: NavigationProps) {
  PreventNavHook(nav, true);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Home Screen</Text>
      <Button
        title="Go to Home... again"
        onPress={() => nav.navigation.push("Home")}
      />
    </View>
  );
}
