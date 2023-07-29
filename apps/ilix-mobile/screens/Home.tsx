import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import usePreventNav from "../lib/hooks/PreventNav";
import HomeDefault from "../components/pages/Home/default";
import Inbox from "../components/pages/Home/Inbox";
import { useContext, useEffect } from "react";
import HomeHeader from "../components/pages/Home/HomeHeader";
import PoolContext from "../lib/Context/Pool";
import { CommonActions } from "@react-navigation/native";
import PoolSettings from "../components/pages/Home/PoolSettings";
import SendTransfer from "../components/pages/Home/Send";
import { StoredDevicesPool } from "../lib/types/interfaces";
import JoinLink from "../components/pages/Home/JoinLink";

export type HomeNestedStack = {
  default: undefined;
  inbox: undefined;
  send: undefined;
  PoolSettings: undefined;
  JoinLink: {
    pool: StoredDevicesPool;
  };
};
const { Screen, Navigator } = createNativeStackNavigator<HomeNestedStack>();

export type HomeNavigationProps = NativeStackScreenProps<
  RootStackParamList,
  "Home"
>;
export default function Home({ navigation }: HomeNavigationProps) {
  const { pools } = useContext(PoolContext);
  usePreventNav(navigation, true);

  const openAddPool = () => navigation.navigate("Auth", { preventNav: false });
  const goHome = () =>
    navigation.dispatch(CommonActions.navigate({ name: "default" }));
  const switchPool = () =>
    navigation.dispatch(CommonActions.navigate({ name: "PoolSettings" }));

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HomeHeader
          pool_name={pools?.current?.pool_name}
          openAddPool={openAddPool}
          switchPool={switchPool}
          goHome={goHome}
        />
      ),
    });
  }, [navigation, pools]);

  return (
    <Navigator
      initialRouteName="default"
      screenOptions={{ headerShown: false, animation: "slide_from_right" }}
    >
      <Screen name="default" component={HomeDefault} />
      <Screen name="inbox" component={Inbox} />
      <Screen name="send" component={SendTransfer} />
      <Screen name="JoinLink" component={JoinLink} />
      <Screen
        name="PoolSettings"
        component={PoolSettings}
        options={{ animation: "slide_from_bottom" }}
      />
    </Navigator>
  );
}
