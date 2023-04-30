import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Screens
import Auth from "./screens/Auth";
import AuthContext, { defaultStore } from "./lib/AuthContext";
import DetailsScreen from "./screens/Details";
import { Platform, UIManager } from "react-native";

export type RootStackParamList = {
  Auth: undefined;
  Details: undefined;
};
const { Screen, Navigator } = createNativeStackNavigator<RootStackParamList>();

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  return (
    <NavigationContainer>
      <AuthContext.Provider value={defaultStore}>
        <Navigator
          initialRouteName="Auth"
          screenOptions={{ headerShown: false, animation: "slide_from_right" }}
        >
          <Screen name="Auth" component={Auth} />
          <Screen name="Details" component={DetailsScreen} />
        </Navigator>
      </AuthContext.Provider>
    </NavigationContainer>
  );
}
