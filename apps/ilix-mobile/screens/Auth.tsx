import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Image, Text, TextInput, View } from "react-native";
import tw from "twrnc";
import ColorScheme from "../lib/Theme";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AntDesign from "@expo/vector-icons/AntDesign";
import FadeInView from "../components/animations/FadeIn";
import ParticleView from "../components/animations/Particles";

type NestedStackParamList = {
  SingIn: undefined;
  SignUp: undefined;
};
const { Screen, Navigator } =
  createNativeStackNavigator<NestedStackParamList>();

export default function Auth() {
  return (
    <Navigator
      initialRouteName="SingIn"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Screen name="SingIn" component={SingIn} />
      <Screen name="SignUp" component={SignUp} />
    </Navigator>
  );
}

const SignUp = () => {
  return (
    <SafeAreaProvider>
      <ParticleView
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
        paticles_number={5}
      >
        <Text style={tw`text-black font-bold text-xl`}>test</Text>
      </ParticleView>
    </SafeAreaProvider>
  );
};

type SignInNavigationProps = NativeStackScreenProps<
  NestedStackParamList,
  "SingIn"
>;
const SingIn = ({ navigation }: SignInNavigationProps) => {
  const [SyncCode, setSyncCode] = useState("");

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <View
          style={tw`w-3/4 py-4 border-2 border-black rounded-xl bg-white z-10`}
        >
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
              placeholder="0000 0000 0000 0000 0000"
              value={SyncCode}
              onChangeText={(ntext) =>
                isFinite(ntext as unknown as number) && setSyncCode(ntext)
              }
              maxLength={20}
              style={tw`border-2 border-black rounded-lg w-full h-10 text-center`}
            />

            {SyncCode.length == 20 && (
              <FadeInView duration={500}>
                <Text
                  onPress={() => null}
                  style={tw`bg-[${ColorScheme.PRIMARY}] text-[${ColorScheme.PRIMARY_CONTENT}] text-[16px] rounded-lg h-10 text-center mt-2 pt-2`}
                >
                  Sign In
                </Text>
              </FadeInView>
            )}

            <Text style={tw`italic mt-3 text-xs ml-2`}>
              New to Ilix?{" "}
              <Text
                style={tw`text-[${ColorScheme.PRIMARY}] underline`}
                onPress={() => navigation.push("SignUp")}
              >
                Create account
              </Text>
            </Text>
          </View>
        </View>

        <StatusBar style="light" backgroundColor="black" />
      </ParticleView>
    </SafeAreaProvider>
  );
};
