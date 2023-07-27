import { Image, Text, TouchableOpacity, View } from "react-native";
import tw from "twrnc";

export default function HomeHeader(pool_name?: string) {
  return (
    <View style={tw`flex-1`}>
      <View style={tw`absolute left-0 -top-1.5 z-10`}>
        <TouchableOpacity onPress={() => {}}>
          <Image
            source={require("../../assets/icon.png")}
            style={tw`w-[40px] h-[40px] rounded-lg`}
          />
        </TouchableOpacity>
      </View>
      <Text style={tw`font-semibold text-white text-center text-[20px] mr-6`}>
        <Text style={tw`text-white italic`}>{"[ "}</Text>
        {pool_name}
        <Text style={tw`text-white italic`}>{" ]"}</Text>
      </Text>
    </View>
  );
}
