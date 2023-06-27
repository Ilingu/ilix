import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import tw from "twrnc";
import ColorScheme from "../lib/Theme";
import { useContext, useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

import FadeInView from "../components/animations/FadeIn";
import ParticleView from "../components/animations/Particles";
import Button from "../components/design/Button";
import { RootStackParamList } from "../App";
import { IsEmptyString, ToastDuration, pushToast } from "../lib/utils";
import PreventNavHook from "../lib/hooks/PreventNav";
import ApiClient, { HandleGetFileAndSave } from "../lib/ApiClient";
import AuthContext from "../lib/Auth";

type NestedStackParamList = {
  Auth: undefined;
  Join: undefined;
  NewPool: undefined;
};
const { Screen, Navigator } =
  createNativeStackNavigator<NestedStackParamList>();

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Auth">;
export default function AuthRouter(nav: NavigationProps) {
  PreventNavHook(nav, true);

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
  const SubmitNewPool = async () => {};

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
            Create New <Text style={{ color: ColorScheme.PRIMARY }}>Ilix</Text>{" "}
            Pool
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
  const { device_id, setPoolKeyPhrase } = useContext(AuthContext);

  const [SyncCode, setSyncCode] = useState("");
  const [DeviceName, setDeviceName] = useState("");

  const SubmitJoinReq = async () => {
    if (typeof device_id !== "string") return pushToast("No device_id found");
    if (!IsArgsOk()) return pushToast("Invalid arguments");
    const [SyncCodeCopy, DeviceNameCopy] = [`${SyncCode}`, `${DeviceName}`];

    let { succeed, data, reason } = await ApiClient.put(
      "/pool/{pool_kp}/join",
      { pool_kp: SyncCodeCopy },
      { device_id, device_name: DeviceNameCopy }
    );

    if (!succeed && reason === "AlreadyInPool") {
      const {
        succeed: getSuccess,
        data: PoolData,
        reason,
      } = await ApiClient.get("/pool/{pool_kp}", {
        pool_kp: SyncCodeCopy,
      });

      if (!getSuccess || !PoolData)
        return pushToast(
          reason ?? "Couldn't retrieve pool datas, try again",
          ToastDuration.LONG
        );

      data = PoolData;
    }
    if (!succeed || !data) return pushToast(reason ?? "Failed to join pool");
    if (!("pool_name" in data) || !("devices_id" in data))
      return pushToast(reason ?? "Failed to join pool");

    setPoolKeyPhrase && setPoolKeyPhrase(SyncCodeCopy);
    // set the Pool Context
  };

  const IsArgsOk = (): boolean =>
    SyncCode.split("-").length == 20 &&
    !IsEmptyString(DeviceName) &&
    DeviceName.length <= 50;

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
              Device Name
            </Text>
            <TextInput
              placeholder="0000 0000 0000 0000 0000"
              value={DeviceName}
              onChangeText={setDeviceName}
              maxLength={50}
              style={tw`border-2 border-black rounded-lg w-full h-10 text-center`}
            />

            <Text style={tw`font-bold text-[${ColorScheme.TEXT}] ml-2`}>
              Sync Code
            </Text>
            <TextInput
              placeholder="20 words sync code"
              multiline
              value={SyncCode}
              onChangeText={setSyncCode}
              style={tw`border-2 border-black rounded-lg w-full h-10 text-center`}
            />

            {IsArgsOk() && (
              <FadeInView duration={500}>
                <Button
                  onPress={SubmitJoinReq}
                  style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white text-[16px] rounded-lg h-10 text-center mt-2 pt-2`}
                >
                  <AntDesign name="login" size={16} color="white" /> Sign In
                </Button>
              </FadeInView>
            )}

            <View style={tw`flex flex-row items-center mt-3 ml-2`}>
              <TouchableOpacity onPress={() => navigation.push("NewPool")}>
                <Text
                  style={tw`italic text-xs text-[${ColorScheme.PRIMARY}] underline`}
                >
                  Or create a new pool
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
