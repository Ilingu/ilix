import { useCallback, useContext } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";

// types
import type { HomeNestedStack } from "../../../../screens/Home";

// utils
import { pushToast } from "../../../../lib/utils";

// datas
import AuthContext from "../../../../lib/Context/Auth";
import PoolContext from "../../../../lib/Context/Pool";

// ui
import tw from "twrnc";
import Separator from "../../../design/Separator";
import ParticleView from "../../../animations/Particles";
import ProfilePicture from "../../../design/ProfilePicture";
import ColorScheme from "../../../../lib/Theme";

// icons
import { Ionicons, FontAwesome } from "@expo/vector-icons";

// -- end import

type SendNavigationProps = NativeStackScreenProps<HomeNestedStack, "send">;
const SendTransfer: React.FC<SendNavigationProps> = ({ navigation }) => {
  const { device_id, pool_key_phrase } = useContext(AuthContext);
  const { pools } = useContext(PoolContext);

  const NewTransfer = useCallback(
    async (did_to: string) => {
      if (pool_key_phrase === undefined || device_id === undefined)
        return pushToast("Join a pool before");

      navigation.push("AddFiles", {
        device_id_to: did_to,
        device_id_from: device_id,
        pool_kp: `${pool_key_phrase}`,
      });
    },
    [pool_key_phrase, device_id, navigation]
  );

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}>
        <View style={tw`w-3/4 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}>
          <Text style={tw`text-center text-xl text-[${ColorScheme.TEXT}] mt-1`}>
            <Ionicons name="send-outline" size={20} color="black" /> Send Transfer
          </Text>

          <Separator />

          <View style={tw`max-h-60 overflow-hidden`}>
            {pools?.current.devices_id_to_name === undefined || device_id === undefined ? (
              <Text>Nobody there.</Text>
            ) : (
              <FlatList
                data={Object.entries(pools?.current.devices_id_to_name).filter(
                  ([did]) => did !== device_id
                )}
                renderItem={({ index, item: [did, name] }) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => NewTransfer(did)}
                    style={tw`flex flex-row items-center gap-x-2 mx-2 p-2 border-2 border-black rounded-lg mb-2`}>
                    <ProfilePicture width={32} height={32} />
                    <Text style={tw`flex-1 font-semibold`}>{name}</Text>
                    <FontAwesome name="caret-right" size={24} color="black" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};
export default SendTransfer;
