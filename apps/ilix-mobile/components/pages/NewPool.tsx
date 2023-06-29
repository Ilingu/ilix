import { useContext, useState } from "react";
// rn
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image, Text, TextInput, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { AuthNestedStack } from "../../screens/Auth";

// ui
import ParticleView from "../animations/Particles";
import Button from "../design/Button";
import tw from "twrnc";
import ColorScheme from "../../lib/Theme";

// icon
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

// data
import { IsEmptyString, pushToast } from "../../lib/utils";
import ApiClient from "../../lib/ApiClient";
import AuthContext from "../../lib/Context/Auth";
import PoolContext from "../../lib/Context/Pool";

type NewPoolNavigationProps = NativeStackScreenProps<
  AuthNestedStack,
  "NewPool"
>;
const NewPool = ({ navigation }: NewPoolNavigationProps) => {
  const { device_id, setPoolKeyPhrase } = useContext(AuthContext);
  const { setPool } = useContext(PoolContext);

  const [PoolName, setPoolName] = useState("");
  const [DeviceName, setDeviceName] = useState("");

  const SubmitNewPool = async () => {
    if (typeof device_id !== "string") return pushToast("No device_id found");
    if (!IsArgsOk()) return pushToast("Invalid arguments");
    const [DeviceNameCopy, PoolNameCopy] = [`${DeviceName}`, `${PoolName}`];

    const {
      succeed,
      data: pool_kp,
      reason,
    } = await ApiClient.post("/pool/new", undefined, undefined, {
      device_id,
      device_name: DeviceNameCopy,
      name: PoolNameCopy,
    });
    const err_msg = `Failed to join pool: ${
      reason ?? "error reason not specified"
    }`;
    if (!succeed || !pool_kp || IsEmptyString(pool_kp))
      return pushToast(err_msg);

    // store datas client-side
    const { succeed: kpSucceed } = setPoolKeyPhrase
      ? await setPoolKeyPhrase(pool_kp)
      : { succeed: false };
    const { succeed: poolSucceed } = setPool
      ? await setPool({
          devices_id: [device_id],
          pool_name: PoolNameCopy,
          devices_id_to_name: { device_id: DeviceName },
        })
      : { succeed: false };

    if (!kpSucceed || !poolSucceed)
      return pushToast("Failed to store data client-side, try again");

    // change to home page
    navigation.getParent()?.navigate("Home");
  };

  const IsArgsOk = () => !IsEmptyString(DeviceName) && !IsEmptyString(PoolName);
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
            source={require("../../assets/icon.png")}
            style={tw`w-[72px] h-[72px] rounded-xl mx-auto`}
          />
          <Text
            style={tw`text-2xl text-center font-bold mb-2 pr-3 text-[${ColorScheme.TEXT}]`}
          >
            Create New <Text style={{ color: ColorScheme.PRIMARY }}>Ilix</Text>{" "}
            Pool
          </Text>
          <View style={tw`px-3`}>
            <Text style={tw`font-bold text-[${ColorScheme.TEXT}] ml-2`}>
              Device Name
            </Text>
            <TextInput
              placeholder="Goon 👻"
              value={DeviceName}
              onChangeText={setDeviceName}
              maxLength={50}
              style={tw`border-2 border-black rounded-lg w-full h-10 text-center`}
            />

            <Text style={tw`font-bold text-[${ColorScheme.TEXT}] ml-2`}>
              Pool Name
            </Text>
            <TextInput
              placeholder="Cats pics exchange 🐈"
              value={PoolName}
              onChangeText={setPoolName}
              style={tw`border-2 border-black rounded-lg w-full h-10 text-center`}
            />

            {IsArgsOk() && (
              <Button
                style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white text-[16px] rounded-lg h-10 text-center my-2 pt-2`}
                onPress={SubmitNewPool}
              >
                <FontAwesome5
                  name="lock"
                  size={16}
                  color={ColorScheme.SECONDARY}
                />
                {"  "}
                Create Pool
              </Button>
            )}

            {/* <Text style={tw`font-semibold text-xs`}>
              <AntDesign name="warning" size={16} color={ColorScheme.PRIMARY} />{" "}
              This code will be the{" "}
              <Text style={tw`text-[${ColorScheme.ERROR}]`}>
                only way to indentify yourself
              </Text>{" "}
              on ilix, so keep it safe!
            </Text> */}
          </View>
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};
export default NewPool;
