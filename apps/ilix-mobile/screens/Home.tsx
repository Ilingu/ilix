import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import tw from "twrnc";

export default function Home() {
  return (
    <View style={tw`flex-1 items-center justify-center bg-black`}>
      <Text style={tw`text-4xl text-white font-bold`}>Home Screen</Text>
      <Text style={tw`text-amber-500 font-bold`}>Hello World!</Text>
      <StatusBar style="auto" />
    </View>
  );
}
