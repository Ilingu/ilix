import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../../screens/Home";
import { Text, View } from "react-native";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ParticleView from "../../../animations/Particles";

type ViewTransferNavigationProps = NativeStackScreenProps<
  HomeNestedStack,
  "ViewTransfer"
>;
const ViewTransfer: React.FC<ViewTransferNavigationProps> = ({
  navigation,
  route,
}) => {
  const transfer = route.params.transfer;

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <View
          style={tw`w-3/4 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}
        >
          <Text>{transfer._id}</Text>
        </View>
      </ParticleView>
    </SafeAreaProvider>
  );
};
export default ViewTransfer;
