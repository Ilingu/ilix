import { View } from "react-native";
import tw from "twrnc";

export default function Separator() {
  return (
    <View style={tw`flex justify-center items-center my-2`}>
      <View style={tw`w-3/4 border-t-[1px] border-gray-500`}></View>
    </View>
  );
}
