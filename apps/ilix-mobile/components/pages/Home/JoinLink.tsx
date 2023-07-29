import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HomeNestedStack } from "../../../screens/Home";
import { Text, View } from "react-native";

type JoinLinkNavigationProps = NativeStackScreenProps<
  HomeNestedStack,
  "JoinLink"
>;
const JoinLink: React.FC<JoinLinkNavigationProps> = ({ navigation, route }) => {
  const pool = route.params.pool;

  return (
    <View>
      <Text>Link: {pool.pool_name}</Text>
    </View>
  );
};
export default JoinLink;
