import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import usePreventNav from "../lib/hooks/PreventNav";

import Join from "../components/pages/Auth/Join";
import NewPool from "../components/pages/Auth/NewPool";

export type AuthNestedStack = {
  Auth: undefined;
  Join: undefined;
  NewPool: undefined;
};
const { Screen, Navigator } = createNativeStackNavigator<AuthNestedStack>();

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Auth">;
export default function AuthRouter({ navigation, route }: NavigationProps) {
  (route.params?.preventNav ?? true) && usePreventNav(navigation, true);

  return (
    <Navigator
      initialRouteName="Join"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Screen name="Join" component={Join} />
      <Screen name="NewPool" component={NewPool} />
    </Navigator>
  );
}
