import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../screens/Home";
import { Text, TouchableOpacity, View } from "react-native";
import ParticleView from "../../animations/Particles";
import { SafeAreaProvider } from "react-native-safe-area-context";
import tw from "twrnc";
import { useEffect, useState } from "react";
import { SS_Get } from "../../../lib/db/SecureStore";
import FadeInView from "../../animations/FadeIn";
import { AntDesign } from "@expo/vector-icons";
import { copyToClipboard, pushToast } from "../../../lib/utils";
import QRCode from "react-native-qrcode-svg";
import { usePreventScreenCapture } from "expo-screen-capture";

type JoinLinkNavigationProps = NativeStackScreenProps<
  HomeNestedStack,
  "JoinLink"
>;
const JoinLink: React.FC<JoinLinkNavigationProps> = ({ navigation, route }) => {
  usePreventScreenCapture();
  const pool = route.params.pool;

  const [KeyPhrase, setKP] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { succeed, data: pool_key_phrase } = await SS_Get<string>(
        pool.SS_key_hashed_kp
      );
      setKP(
        !succeed || typeof pool_key_phrase !== "string" ? null : pool_key_phrase
      );
    })();
  }, [pool]);

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <View
          style={tw`w-5/6 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}
        >
          <Text style={tw`text-center text-xl font-semibold`}>
            How to join{" "}
            <Text style={{ fontFamily: "monospace" }}>{pool.pool_name}</Text>?
          </Text>
          <Text style={tw`font-bold text-red-800 mb-2 mx-2`}>
            Treat this code like a password. If someone gets ahold of it, they
            can read and modify all your datas.
          </Text>
          {KeyPhrase !== null && (
            <FadeInView
              style={tw`m-2 border-2 border-gray-700 p-2 rounded-md bg-gray-100`}
              duration={500}
            >
              <Text style={tw`italic`}>Scan the qr code...</Text>
              <View
                style={tw`border-2 border-gray-700 p-2 rounded-md mx-auto bg-white`}
              >
                <QRCode
                  value={KeyPhrase}
                  logo={require("../../../assets/icon.png")}
                  backgroundColor="#ffffff"
                  logoBorderRadius={15}
                  logoBackgroundColor="#fff"
                  size={240}
                />
              </View>

              <Text style={tw`italic mt-2`}>...or copy the sync code</Text>
              <View style={tw`p-2 bg-gray-700 rounded-md`}>
                <Text
                  selectable
                  style={{
                    ...tw`font-bold text-white`,
                    fontFamily: "monospace",
                  }}
                >
                  {KeyPhrase}
                </Text>
              </View>
              <View style={tw`flex flex-row justify-between mt-2 items-end`}>
                <Text style={tw`font-semibold text-gray-700`}>
                  Word count: {KeyPhrase.split("-").length}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    await copyToClipboard(KeyPhrase);
                    pushToast("Copied!");
                  }}
                  style={tw`bg-white w-7 h-7 shadow-sm rounded border-2 border-black flex justify-center items-center`}
                >
                  <AntDesign name="copy1" size={16} color="black" />
                </TouchableOpacity>
              </View>
            </FadeInView>
          )}
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};
export default JoinLink;
