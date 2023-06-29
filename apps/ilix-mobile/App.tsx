import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Screens
import AuthRouter from "./screens/Auth";
import AuthContext from "./lib/Context/Auth";
import Home from "./screens/Home";
import { Platform, UIManager } from "react-native";
import Splash from "./screens/Splash";
import AuthHook from "./lib/hooks/Auth";
import PoolContext from "./lib/Context/Pool";
import PoolHook from "./lib/hooks/Pool";

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
  const defaultAuthState = AuthHook();
  const defaultPoolState = PoolHook();

  return (
    <NavigationContainer>
      <AuthContext.Provider value={defaultAuthState}>
        <PoolContext.Provider value={defaultPoolState}>
          <Navigator
            initialRouteName="Splash"
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
            }}
          >
            <Screen name="Splash" component={Splash} />
            <Screen name="Auth" component={AuthRouter} />
            <Screen name="Home" component={Home} />
          </Navigator>
        </PoolContext.Provider>
      </AuthContext.Provider>
    </NavigationContainer>
  );
}
