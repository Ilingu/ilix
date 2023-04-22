import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Screens
import Home from "./screens/Home";
import AuthContext, { defaultStore } from "./lib/AuthContext";
import DetailsScreen from "./screens/Details";
import { Button } from "react-native";

export type RootStackParamList = {
  Home: undefined;
  Details: undefined;
};
const { Screen, Navigator } = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <AuthContext.Provider value={defaultStore}>
        <Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false, animation: "slide_from_right" }}
        >
          <Screen name="Home" component={Home} />
          <Screen name="Details" component={DetailsScreen} />
        </Navigator>
      </AuthContext.Provider>
    </NavigationContainer>
  );
}
