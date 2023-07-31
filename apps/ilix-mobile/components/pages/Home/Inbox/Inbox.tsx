import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../../screens/Home";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useContext } from "react";
import TransfersContext from "../../../../lib/Context/Transfer";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ParticleView from "../../../animations/Particles";
import ColorScheme from "../../../../lib/Theme";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import PoolContext from "../../../../lib/Context/Pool";
import ProfilePicture from "../../../design/ProfilePicture";
import Separator from "../../../design/Separator";

type InboxNavigationProps = NativeStackScreenProps<HomeNestedStack, "inbox">;
const Inbox: React.FC<InboxNavigationProps> = ({ navigation }) => {
  const [, , transfer] = useContext(TransfersContext);
  const { pools } = useContext(PoolContext);

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}>
        <View style={tw`w-3/4 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}>
          <Text style={tw`text-center text-xl text-[${ColorScheme.TEXT}] mt-1`}>
            <AntDesign name="inbox" size={20} color="black" />
            Transfer Inbox
          </Text>
          <Text style={tw`text-center text-[${ColorScheme.TEXT}]`}>
            You have <Text>{transfer.length}</Text> transfer
            {transfer.length >= 2 ? "s" : ""} opened
          </Text>

          <Separator />

          <View style={tw`max-h-60 overflow-hidden`}>
            <FlatList
              data={transfer}
              renderItem={({ index, item }) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => navigation.push("ViewTransfer", { transfer_id: item._id })}
                  style={tw`flex flex-row items-center gap-x-2 mx-2 p-2 border-2 border-black rounded-lg mb-2`}>
                  <ProfilePicture width={32} height={32} />
                  <Text style={tw`flex-1 font-semibold`}>{pools?.currentName(item.from)}</Text>
                  <FontAwesome name="caret-right" size={24} color="black" />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};
export default Inbox;
