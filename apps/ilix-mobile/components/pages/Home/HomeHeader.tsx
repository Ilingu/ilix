import { Image, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";
import { AntDesign } from "@expo/vector-icons";

type Props = {
  pool_name?: string;
  openAddPool?: () => void;
  switchPool?: () => void;
  goHome?: () => void;
};
export default function HomeHeader({
  pool_name,
  openAddPool,
  switchPool,
  goHome,
}: Props) {
  return (
    <View style={tw`flex-1`}>
      <View style={tw`absolute left-0 -top-1.5 z-10`}>
        <TouchableOpacity onPress={goHome}>
          <Image
            source={require("../../../assets/Images/icon.png")}
            style={tw`w-[40px] h-[40px] rounded-lg border-[1px] border-white`}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={switchPool}>
        <Text style={tw`font-semibold text-white text-center text-[20px] mr-6`}>
          <Text style={tw`text-white italic`}>{"[ "}</Text>
          <Text
            style={{
              fontFamily: "monospace",
            }}
          >
            {pool_name}
          </Text>
          <Text style={tw`text-white italic`}>{" ]"}</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={openAddPool}
        style={tw`absolute right-7 -top-1 z-10 bg-white w-8 h-8 rounded flex justify-center items-center`}
      >
        <AntDesign name="plussquare" size={16} color="black" />
      </TouchableOpacity>
    </View>
  );
}
