import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import tw from "twrnc";
import ColorScheme from "../lib/Theme";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

import FadeInView from "../components/animations/FadeIn";
import ParticleView from "../components/animations/Particles";
import Button from "../components/design/Button";
import { RootStackParamList } from "../App";
import { pushToast } from "../lib/utils";
import PreventNavHook from "../lib/hooks/PreventNav";

type NestedStackParamList = {
  Auth: undefined;
  Join: undefined;
  NewPool: undefined;
};
const { Screen, Navigator } =
  createNativeStackNavigator<NestedStackParamList>();

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Auth">;
export default function AuthRouter(nav: NavigationProps) {
  PreventNavHook(nav);

  return (
    <Navigator
      initialRouteName="Join"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Screen name="Join" component={Join} />
      <Screen name="NewPool" component={NewPool} />
    </Navigator>
  );
}

type NewPoolNavigationProps = NativeStackScreenProps<
  NestedStackParamList,
  "NewPool"
>;
const NewPool = ({ navigation }: NewPoolNavigationProps) => {
  return (
    <SafeAreaProvider>
      <ParticleView
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
        paticles_number={5}
      >
        <View
          style={tw`w-3/4 py-4 border-2 border-black rounded-xl bg-white z-10`}
        >
          <Image
            source={require("../assets/icon.png")}
            style={tw`w-[72px] h-[72px] rounded-xl mx-auto`}
          />
          <Text
            style={tw`text-2xl text-center font-bold mb-3 pr-3 text-[${ColorScheme.TEXT}]`}
          >
            <FontAwesome5 name="user-plus" size={16} color={ColorScheme.TEXT} />{" "}
            Sign up to <Text style={{ color: ColorScheme.PRIMARY }}>Ilix</Text>
          </Text>
          <View style={tw`px-3`}>
            <Button
              style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white text-[16px] rounded-lg h-10 text-center my-2 pt-2`}
            >
              <FontAwesome5
                name="lock"
                size={16}
                color={ColorScheme.SECONDARY}
              />
              {"  "}
              Generate Sync Code
            </Button>
            <Text style={tw`font-semibold text-xs`}>
              <AntDesign name="warning" size={16} color={ColorScheme.PRIMARY} />{" "}
              This code will be the{" "}
              <Text style={tw`text-[${ColorScheme.ERROR}]`}>
                only way to indentify yourself
              </Text>{" "}
              on ilix, so keep it safe!
            </Text>
          </View>
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};

type JoinNavigationProps = NativeStackScreenProps<NestedStackParamList, "Join">;
const Join = ({ navigation }: JoinNavigationProps) => {
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
            style={tw`text-2xl text-center font-bold mb-10 text-[${ColorScheme.TEXT}]`}
          >
            Sign in to <Text style={{ color: ColorScheme.PRIMARY }}>Ilix</Text>
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
                <Button
                  onPress={() => null}
                  style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white text-[16px] rounded-lg h-10 text-center mt-2 pt-2`}
                >
                  <AntDesign name="login" size={16} color="white" /> Sign In
                </Button>
              </FadeInView>
            )}

            <View style={tw`flex flex-row items-center mt-3 ml-2`}>
              <Text style={tw`italic text-xs`}>New to Ilix? </Text>
              <TouchableOpacity onPress={() => navigation.push("NewPool")}>
                <Text
                  style={tw`italic text-xs text-[${ColorScheme.PRIMARY}] underline`}
                >
                  Create account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <StatusBar style="light" backgroundColor="black" />
      </ParticleView>
    </SafeAreaProvider>
  );
};
