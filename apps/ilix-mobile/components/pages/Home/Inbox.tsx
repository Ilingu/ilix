import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../screens/Home";
import { Text, View } from "react-native";

type InboxNavigationProps = NativeStackScreenProps<HomeNestedStack, "inbox">;
const Inbox: React.FC<InboxNavigationProps> = ({ navigation }) => {
  return (
    <View>
      <Text>Inbox</Text>
    </View>
  );
};
export default Inbox;
