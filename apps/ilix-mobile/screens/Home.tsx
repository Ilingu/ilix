import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { StatusBar } from "expo-status-bar";
import { Button, Text, View } from "react-native";
import tw from "twrnc";

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Home">;
export default function Home({ navigation }: NavigationProps) {
  return (
    <View style={tw`flex-1 items-center justify-center bg-black`}>
      <Text style={tw`text-4xl text-white font-bold`}>Home Screen</Text>
      <Text style={tw`text-amber-500 font-bold`}>Hello World!</Text>

      <Button
        title="Go to Details"
        onPress={() => navigation.navigate("Details")}
      />
      <StatusBar style="auto" />
    </View>
  );
}
