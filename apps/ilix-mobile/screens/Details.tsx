import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, Text, View } from "react-native";
import type { RootStackParamList } from "../App";

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Details">;
export default function DetailsScreen({ navigation }: NavigationProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Details Screen</Text>
      <Button
        title="Go to Details... again"
        onPress={() => navigation.push("Details")}
      />
    </View>
  );
}
