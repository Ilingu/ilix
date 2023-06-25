import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Screens
import AuthRouter from "./screens/Auth";
import AuthContext from "./lib/Auth";
import Home from "./screens/Home";
import { Platform, UIManager } from "react-native";
import Splash from "./screens/Splash";
import AuthHook from "./lib/hooks/Auth";

export type RootStackParamList = {
  Auth: undefined;
  Splash: undefined;
  Home: undefined;
};
const { Screen, Navigator } = createNativeStackNavigator<RootStackParamList>();

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  let defaultAuthState = AuthHook();

  return (
    <NavigationContainer>
      <AuthContext.Provider value={defaultAuthState}>
        <Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false, animation: "slide_from_right" }}
        >
          <Screen name="Splash" component={Splash} />
          <Screen name="Auth" component={AuthRouter} />
          <Screen name="Home" component={Home} />
        </Navigator>
      </AuthContext.Provider>
    </NavigationContainer>
  );
}
