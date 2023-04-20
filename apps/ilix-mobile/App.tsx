import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
// Screens
import Home from "./screens/Home";

const { Screen, Navigator } = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Navigator>
        <Screen name="Home" component={Home} />
      </Navigator>
    </NavigationContainer>
  );
}
