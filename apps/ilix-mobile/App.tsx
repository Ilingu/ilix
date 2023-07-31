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
import useAppState from "./lib/hooks/AppState";
import HomeHeader from "./components/pages/Home/HomeHeader";

export type RootStackParamList = {
  Auth?: {
    preventNav?: boolean;
  };
  Splash: undefined;
  Home: undefined;
};
const { Screen, Navigator } = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { authState, poolState, transferState } = useAppState();

  // console.log({
  //   AuthState: JSON.stringify(authState, null, 2),
  //   PoolState: JSON.stringify(poolState, null, 2),
  //   TransferState: JSON.stringify(transferState, null, 2),
  // });

  return (
    <NavigationContainer>
      <AuthContext.Provider value={authState}>
        <PoolContext.Provider value={poolState}>
          <TransfersContext.Provider value={transferState}>
            <Navigator
              initialRouteName="Splash"
              screenOptions={{
                headerShown: false,
                animation: "slide_from_right",
              }}>
              <Screen name="Splash" component={Splash} />
              <Screen name="Auth" component={AuthRouter} />
              <Screen
                name="Home"
                component={Home}
                options={() => ({
                  headerTitle: () => <HomeHeader pool_name={poolState.pools?.current.pool_name} />,
                  headerShown: true,
                  headerBackVisible: false,
                  headerStyle: {
                    backgroundColor: "black",
                  },
                })}
              />
            </Navigator>
          </TransfersContext.Provider>
        </PoolContext.Provider>
      </AuthContext.Provider>
    </NavigationContainer>
  );
}
