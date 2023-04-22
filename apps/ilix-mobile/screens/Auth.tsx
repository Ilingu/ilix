import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { StatusBar } from "expo-status-bar";
import { Image, Text, TextInput, View } from "react-native";
import tw from "twrnc";
import ColorScheme from "../lib/Theme";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AntDesign from "@expo/vector-icons/AntDesign";

// Animation idea about little gray particule colliding with the login border

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Auth">;
export default function Auth({ navigation }: NavigationProps) {
  const [SyncCode, setSyncCode] = useState("");

  return (
    <SafeAreaProvider>
      <View
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <View style={tw`w-3/4 py-4 border-2 border-black rounded-xl bg-white`}>
          <Image
            source={require("../assets/icon.png")}
            style={tw`w-[72px] h-[72px] rounded-xl mx-auto`}
          />
          <Text
            style={tw`text-2xl text-center font-bold mb-10 pr-3 text-[${ColorScheme.TEXT}]`}
          >
            <AntDesign name="login" size={16} color={ColorScheme.TEXT} /> Sign
            in to <Text style={{ color: ColorScheme.PRIMARY }}>Ilix</Text>
          </Text>
          <View style={tw`px-3`}>
            <Text style={tw`font-bold text-[${ColorScheme.TEXT}] ml-2`}>
              Sync Code
            </Text>
            <TextInput
              onChangeText={(ntext) =>
                isFinite(ntext as unknown as number) && setSyncCode(ntext)
              }
              value={SyncCode}
              style={tw`border-2 border-black rounded-xl w-full h-10 px-2`}
            />
          </View>
        </View>

        <StatusBar style="light" backgroundColor="black" />
      </View>
    </SafeAreaProvider>
  );
}
