import { Platform, UIManager } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Screens
import AuthRouter from "./screens/Auth";
import Home from "./screens/Home";
import Splash from "./screens/Splash";
// Ctx
import AuthContext from "./lib/Context/Auth";
import PoolContext from "./lib/Context/Pool";
import TransfersContext from "./lib/Context/Transfer";
// Hooks
import AuthHook from "./lib/hooks/Auth";
import PoolHook from "./lib/hooks/Pool";
import TransferHook from "./lib/hooks/Transfer";

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
  const AuthState = AuthHook();
  const PoolState = PoolHook();
  const TransferState = TransferHook();

  return (
    <NavigationContainer>
      <AuthContext.Provider value={AuthState}>
        <PoolContext.Provider value={PoolState}>
          <TransfersContext.Provider value={TransferState}>
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
          </TransfersContext.Provider>
        </PoolContext.Provider>
      </AuthContext.Provider>
    </NavigationContainer>
  );
}
