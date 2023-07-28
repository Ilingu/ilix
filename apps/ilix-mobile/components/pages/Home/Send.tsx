import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../screens/Home";
import { Text, View } from "react-native";

type SendNavigationProps = NativeStackScreenProps<HomeNestedStack, "send">;
const SendTransfer: React.FC<SendNavigationProps> = ({ navigation }) => {
  return (
    <View>
      <Text>Send</Text>
    </View>
  );
};
export default SendTransfer;
