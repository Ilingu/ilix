import { useContext, useRef, useState } from "react";

// datas
import PoolContext from "../../lib/Context/Pool";
import AuthContext from "../../lib/Context/Auth";
import ApiClient from "../../lib/ApiClient";
import {
  IsCodeOk,
  IsEmptyString,
  ToastDuration,
  pushToast,
  range,
} from "../../lib/utils";

// ui
import tw from "twrnc";
import ColorScheme from "../../lib/Theme";

// React native
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Animated,
} from "react-native";
import ParticleView from "../animations/Particles";
import Button from "../design/Button";
import FadeInView from "../animations/FadeIn";
import { StatusBar } from "expo-status-bar";

// types
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthNestedStack } from "../../screens/Auth";

// Icons
import AntDesign from "@expo/vector-icons/AntDesign";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import QrCodeScanner from "../qrCode";
import { MakeKeyPhraseKey } from "../../lib/db/SecureStore";

const [ScreenWidth, ScreenHeight] = [
  Dimensions.get("window").width,
  Dimensions.get("window").height,
];

const JoinHomeCenterYPos = ScreenHeight / 2 - (289.9 - 28) / 2;
const QrCodeCenterYPos = ScreenHeight / 2 - 335 / 4 + 2;

const GAP = 610;
type JoinNavigationProps = NativeStackScreenProps<AuthNestedStack, "Join">;
const Join = ({ navigation }: JoinNavigationProps) => {
  const { device_id, addPoolKeyPhrase: setPoolKeyPhrase } =
    useContext(AuthContext);
  const { addPool } = useContext(PoolContext);

  const [SyncCode, setSyncCode] = useState("");
  const [DeviceName, setDeviceName] = useState("");

  // animation
  const [JoinHomeYPos, setPositions] = useState(JoinHomeCenterYPos); // Initial value for opacity: 0
  const QrCodeYPos = JoinHomeYPos + GAP;

  const updatePositions = (keyframes: number[], endVal: number) => {
    const nextFrame = keyframes.shift();
    if (nextFrame === undefined) {
      return setPositions(endVal);
    }
    setPositions(nextFrame);
    requestAnimationFrame(() => updatePositions(keyframes.slice(50), endVal));
  };

  const [posState, setPosState] = useState<"JoinHome" | "QrCode">("JoinHome");
  const ChangeInHandle = (next: "JoinHome" | "QrCode") => {
    if (next === posState) return;

    if (next === "QrCode") {
      const JHKeyframe = range(
        Math.round(JoinHomeYPos),
        Math.round(QrCodeCenterYPos) - GAP
      );
      updatePositions(JHKeyframe, QrCodeCenterYPos - GAP);
    } else {
      const JHKeyframe = range(
        Math.round(QrCodeCenterYPos) - GAP,
        Math.round(JoinHomeCenterYPos)
      );
      updatePositions(JHKeyframe, JoinHomeCenterYPos);
    }

    setPosState(next);
  };

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
    if (!succeed || !data) return pushToast(err_msg);
    if (
      !("pool_name" in data) ||
      !("devices_id" in data) ||
      !("devices_id_to_name" in data)
    )
      return pushToast(err_msg);

    // store datas client-side
    const { succeed: kpSucceed } = setPoolKeyPhrase
      ? await setPoolKeyPhrase(SyncCodeCopy)
      : { succeed: false };
    const { succeed: poolSucceed } = addPool
      ? await addPool({
          SS_key_hashed_kp: MakeKeyPhraseKey(SyncCodeCopy),
          ...data,
        })
      : { succeed: false };

    if (!kpSucceed || !poolSucceed)
      return pushToast("Failed to store data client-side, try again");

    // change to home page
    navigation.getParent()?.navigate("Home");
  };

  const IsArgsOk = (): boolean =>
    IsCodeOk(SyncCode) && !IsEmptyString(DeviceName) && DeviceName.length <= 50;

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <View
          style={{
            ...tw`absolute w-3/4 py-4 border-2 border-black rounded-xl bg-white z-10`,
            top: JoinHomeYPos,
          }}
        >
          <Image
            source={require("../../assets/icon.png")}
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
              onPress={() => ChangeInHandle("QrCode")}
              style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white text-[16px] rounded-lg h-10 text-center mt-2 pt-2`}
            >
              <FontAwesome5 name="qrcode" size={16} color="white" /> Scan or
              enter sync code
            </Button>

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
        </View>

        <QrCodeHandler
          initialCode={SyncCode}
          y_pos={QrCodeYPos}
          reportToParent={(code) => {
            setSyncCode(code);
            ChangeInHandle("JoinHome");
          }}
        />

        <StatusBar style="light" backgroundColor="black" />
      </ParticleView>
    </SafeAreaProvider>
  );
};

type QrProps = {
  initialCode?: string;
  y_pos: number;
  reportToParent: (code: string) => void;
};
const QrCodeHandler: React.FC<QrProps> = ({
  reportToParent,
  initialCode,
  y_pos,
}) => {
  const [SyncCode, setSyncCode] = useState(initialCode ?? "");
  const [scanning, setScanning] = useState(false);

  return scanning ? (
    <QrCodeScanner
      onScanned={(data) => {
        if (!IsCodeOk(data)) pushToast("Invalid sync code");
        setScanning(false);
        setSyncCode(data);
      }}
    />
  ) : (
    <View
      style={{
        ...tw`absolute w-3/4 p-4 border-2 border-black bg-white rounded-xl z-10`,
        top: y_pos,
      }}
    >
      <Button
        onPress={() => setScanning(true)}
        style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] mb-5 text-white text-[16px] rounded-lg h-10 text-center mt-2 pt-2`}
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
            onPress={() => reportToParent(SyncCode)}
            style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white text-[16px] rounded-lg h-10 text-center mt-2 pt-2`}
          >
            <FontAwesome5 name="save" size={16} color="white" /> Save
          </Button>
        </FadeInView>
      ) : (
        <Button
          onPress={() => {
            reportToParent("");
            pushToast("Saved ✅");
          }}
          style={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white text-[16px] rounded-lg h-10 text-center mt-2 pt-2`}
        >
          <FontAwesome5 name="backward" size={16} color="white" /> Back
        </Button>
      )}
    </View>
  );
};

export default Join;
