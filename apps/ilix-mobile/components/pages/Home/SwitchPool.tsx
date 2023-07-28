import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../screens/Home";
import { Text, View } from "react-native";

type SwPNavigationProps = NativeStackScreenProps<HomeNestedStack, "SwitchPool">;
const SwitchPool: React.FC<SwPNavigationProps> = ({ navigation }) => {
  return (
    <View>
      <Text>Switch Pool</Text>
    </View>
  );
};
export default SwitchPool;
