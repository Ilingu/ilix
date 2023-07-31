import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../../screens/Home";
import { FlatList, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ParticleView from "../../../animations/Particles";
import tw from "twrnc";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import ColorScheme from "../../../../lib/Theme";
import { useContext } from "react";
import PoolContext from "../../../../lib/Context/Pool";
import ProfilePicture from "../../../design/ProfilePicture";
import AuthContext from "../../../../lib/Context/Auth";
import Separator from "../../../design/Separator";

type SendNavigationProps = NativeStackScreenProps<HomeNestedStack, "send">;
const SendTransfer: React.FC<SendNavigationProps> = ({ navigation }) => {
  const { device_id } = useContext(AuthContext);
  const { pools } = useContext(PoolContext);

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
              <Text>Nobody there?</Text>
            ) : (
              <FlatList
                data={Object.entries(pools?.current.devices_id_to_name)
                  .filter(([did]) => did !== device_id)
                  .map(([, name]) => name)}
                renderItem={({ index, item: name }) => (
                  <View
                    key={index}
                    style={tw`flex flex-row items-center gap-x-2 mx-2 p-2 border-2 border-black rounded-lg mb-2`}>
                    <ProfilePicture width={32} height={32} />
                    <Text style={tw`flex-1 font-semibold`}>{name}</Text>
                    <FontAwesome name="caret-right" size={24} color="black" />
                  </View>
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
