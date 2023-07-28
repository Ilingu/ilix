import { useContext, useEffect, useRef, useState } from "react";

// datas
import PoolContext from "../../../lib/Context/Pool";
import AuthContext from "../../../lib/Context/Auth";
import ApiClient from "../../../lib/ApiClient";
import {
  IsCodeOk,
  IsEmptyString,
  ToastDuration,
  pushToast,
} from "../../../lib/utils";

// ui
import tw from "twrnc";
import ColorScheme from "../../../lib/Theme";

// React native
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  PanResponder,
} from "react-native";
import ParticleView from "../../animations/Particles";
import Button from "../../design/Button";
import FadeInView from "../../animations/FadeIn";
import { StatusBar } from "expo-status-bar";

// types
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthNestedStack } from "../../../screens/Auth";

// Icons
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import QrCodeScanner from "../../qrCode";
import { MakeKeyPhraseKey } from "../../../lib/db/SecureStore";
import SlideInView from "../../animations/SlideIn";

const [ScreenWidth, ScreenHeight] = [
  Dimensions.get("window").width,
  Dimensions.get("window").height,
];

const JoinHomeCenterYPos = ScreenHeight / 2 - (289.9 - 28) / 2;
const QrCodeCenterYPos = ScreenHeight / 2 - 335 / 4 + 2;

type JoinNavigationProps = NativeStackScreenProps<AuthNestedStack, "Join">;
const Join: React.FC<JoinNavigationProps> = ({ navigation }) => {
  const { device_id, addPoolKeyPhrase } = useContext(AuthContext);
  const { addPool } = useContext(PoolContext);

  const [SyncCode, setSyncCode] = useState("");
  const [DeviceName, setDeviceName] = useState("");

  // animation
  const [posState, setPosState] = useState<"JoinHome" | "QrCode">("JoinHome");

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dy }) => {
        if (dy <= -75) setPosState("QrCode");
        else if (dy >= 75) setPosState("JoinHome");
      },
    })
  ).current;

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

    const err_msg = `Failed to join pool: ${
      reason ?? "error reason not specified"
    }`;
    if ((!succeed && reason !== "AlreadyInPool") || !data)
      return pushToast(err_msg);
    if (
      !("pool_name" in data) ||
      !("devices_id" in data) ||
      !("devices_id_to_name" in data)
    )
      return pushToast(err_msg);

    // store datas client-side
    const { succeed: kpSucceed } = addPoolKeyPhrase
      ? await addPoolKeyPhrase(SyncCodeCopy, false)
      : { succeed: false };
    const { succeed: poolSucceed } = addPool
      ? await addPool(
          {
            SS_key_hashed_kp: MakeKeyPhraseKey(SyncCodeCopy),
            ...data,
          },
          false
        )
      : { succeed: false };

    if (!kpSucceed || !poolSucceed)
      return pushToast("Failed to store data client-side, try again");

    // reset
    setDeviceName("");
    setSyncCode("");
    // change to home page
    navigation.getParent()?.navigate("Home");
  };

  const IsArgsOk = (): boolean =>
    IsCodeOk(SyncCode) && !IsEmptyString(DeviceName) && DeviceName.length <= 50;

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        panResponder={panResponder}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <SlideInView
          duration={500}
          from={{ top: JoinHomeCenterYPos }}
          to={{ top: -400 }}
          state={posState === "JoinHome" ? "backward" : "forward"}
          style={tw`w-3/4 py-4 border-2 border-black rounded-xl bg-white z-10`}
        >
          <Image
            source={require("../../../assets/icon.png")}
            style={tw`w-[72px] h-[72px] rounded-xl mx-auto`}
          />
          <Text
            style={tw`text-2xl text-center font-bold mb-8 text-[${ColorScheme.TEXT}]`}
          >
            Join an <Text style={{ color: ColorScheme.PRIMARY }}>Ilix</Text>{" "}
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

            <Button
              onPress={() => setPosState("QrCode")}
              style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white mt-2`}
            >
              <FontAwesome5 name="qrcode" size={16} color="white" /> Scan or
              enter sync code
            </Button>

            {IsArgsOk() && (
              <FadeInView duration={500}>
                <Button
                  onPress={SubmitJoinReq}
                  style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white mt-2`}
                >
                  <AntDesign name="login" size={16} color="white" /> Sign In
                </Button>
              </FadeInView>
            )}

            <View style={tw`flex flex-row items-center mt-2 ml-1`}>
              <TouchableOpacity onPress={() => navigation.push("NewPool")}>
                <Text
                  style={tw`italic text-xs text-[${ColorScheme.PRIMARY}] underline`}
                >
                  Or create a new pool
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SlideInView>

        <SlideInView
          duration={500}
          from={{ top: 950 }}
          to={{ top: QrCodeCenterYPos }}
          state={posState === "JoinHome" ? "backward" : "forward"}
          style={tw`w-3/4 p-4 border-2 border-black bg-white rounded-xl z-10`}
        >
          <QrCodeHandler
            reportToParent={(code, back = false) => {
              setSyncCode(code);
              back && setPosState("JoinHome");
            }}
          />
        </SlideInView>

        <StatusBar style="light" backgroundColor="black" />
      </ParticleView>
    </SafeAreaProvider>
  );
};

type QrProps = {
  reportToParent: (code: string, back?: boolean) => void;
};
const QrCodeHandler: React.FC<QrProps> = ({ reportToParent }) => {
  const [SyncCode, setSyncCode] = useState("");
  const [scanning, setScanning] = useState(false);

  const writeTimeout = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    writeTimeout.current && clearTimeout(writeTimeout.current);
    writeTimeout.current = setTimeout(() => reportToParent(SyncCode), 5000);
  }, [SyncCode]);

  return scanning ? (
    <QrCodeScanner
      onScanned={(data) => {
        if (!IsCodeOk(data)) pushToast("Invalid sync code");
        setScanning(false);
        setSyncCode(data);
      }}
    />
  ) : (
    <>
      <Button
        onPress={() => setScanning(true)}
        style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white mb-5 mt-2`}
      >
        <FontAwesome5 name="qrcode" size={16} color="white" /> Scan Qr Code
      </Button>

      <Text style={{ color: ColorScheme.PRIMARY_CONTENT }}>
        Or enter sync code manually
      </Text>
      <TextInput
        placeholder="20 words sync code"
        value={SyncCode}
        onChangeText={setSyncCode}
        style={tw`border-2 border-black rounded-lg w-full h-10 text-center`}
      />

      {IsCodeOk(SyncCode) ? (
        <FadeInView duration={500}>
          <Button
            onPress={() => reportToParent(SyncCode, true)}
            style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white mt-2`}
          >
            <FontAwesome5 name="save" size={16} color="white" /> Save
          </Button>
        </FadeInView>
      ) : (
        <Button
          onPress={() => reportToParent(SyncCode, true)}
          style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white mt-2`}
        >
          <FontAwesome5 name="backward" size={16} color="white" /> Back
        </Button>
      )}
    </>
  );
};

export default Join;
