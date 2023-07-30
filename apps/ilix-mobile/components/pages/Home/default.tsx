import { Text, View } from "react-native";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useContext } from "react";
import { StatusBar } from "expo-status-bar";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import ParticleView from "../../animations/Particles";
import type { HomeNestedStack } from "../../../screens/Home";
import AuthContext from "../../../lib/Context/Auth";
import ColorScheme from "../../../lib/Theme";
import Button from "../../design/Button";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import TransfersContext from "../../../lib/Context/Transfer";

type InboxNavigationProps = NativeStackScreenProps<HomeNestedStack, "default">;
const HomeDefault: React.FC<InboxNavigationProps> = ({ navigation }) => {
  const { device_name, logOut } = useContext(AuthContext);
  const [, , transfers] = useContext(TransfersContext);

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <View
          style={tw`w-3/4 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}
        >
          <Text style={tw`text-center text-xl text-[${ColorScheme.TEXT}] mt-1`}>
            Welcome{" "}
            <Text style={tw`font-bold text-amber-400`} selectable>
              {device_name}
            </Text>
            !
          </Text>

          <View style={tw`flex justify-center items-center my-2`}>
            <View style={tw`w-3/4 border-t-[1px] border-gray-500`}></View>
          </View>

          <Button
            childStyle={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white mb-2 mx-2`}
            pChild={
              transfers.length > 0 && (
                <View
                  style={tw`absolute -top-2 left-0 bg-[${ColorScheme.ERROR}] w-6 h-6 rounded-full z-10 flex justify-center items-center`}
                >
                  <Text>{transfers.length}</Text>
                </View>
              )
            }
            parentProps={{
              style: tw`relative`,
              onPress: () => navigation.navigate("inbox"),
            }}
          >
            <AntDesign name="inbox" size={16} color="white" />
            {"  "}Inbox Transfer
          </Button>
          <Button
            childStyle={tw`bg-[${ColorScheme.PRIMARY_CONTENT}] text-white mb-4 mx-2`}
            parentProps={{ onPress: () => navigation.navigate("send") }}
          >
            <Ionicons name="send-outline" size={16} color="white" />
            {"  "}Send Transfer
          </Button>

          <Button
            childStyle={tw`bg-[${ColorScheme.ERROR}] text-[${ColorScheme.PRIMARY_CONTENT}] mb-2 mx-2`}
            parentProps={{
              onPress: logOut,
            }}
          >
            <AntDesign name="logout" size={16} color="black" /> Log out
          </Button>
        </View>
      </ParticleView>
      <StatusBar style="auto" backgroundColor="black" />
    </SafeAreaProvider>
  );
};
export default HomeDefault;
