import { useContext, useEffect } from "react";
import { CommonActions } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";

// expo
import { StatusBar } from "expo-status-bar";

// type
import type { RootStackParamList } from "../App";
import type { StoredDevicesPool } from "../lib/types/interfaces";

// data
import PoolContext from "../lib/Context/Pool";

// hooks
import usePreventNav from "../lib/hooks/PreventNav";

// pages
import HomeHeader from "../components/pages/Home/HomeHeader";
import HomeDefault from "../components/pages/Home/default";
import Inbox from "../components/pages/Home/Inbox/Inbox";
import SendTransfer from "../components/pages/Home/Send/Send";
import PoolSettings from "../components/pages/Home/PoolSettings";
import JoinLink from "../components/pages/Home/JoinLink";
import ViewTransfer from "../components/pages/Home/Inbox/ViewTransfer";
import AddFiles from "../components/pages/Home/Send/AddFiles";

export type HomeNestedStack = {
  default: undefined;
  inbox: undefined;
  send: undefined;
  PoolSettings: undefined;
  JoinLink: {
    pool: StoredDevicesPool;
  };
  ViewTransfer: {
    transfer_id: string;
  };
  AddFiles: {
    device_id_from: string;
    device_id_to: string;
    pool_kp: string;
  };
};
const { Screen, Navigator } = createNativeStackNavigator<HomeNestedStack>();

export type HomeNavigationProps = NativeStackScreenProps<RootStackParamList, "Home">;
export default function Home({ navigation }: HomeNavigationProps) {
  const { pools } = useContext(PoolContext);
  usePreventNav(navigation, true, true);

  const openAddPool = () => navigation.navigate("Auth", { preventNav: false });
  const goHome = () => navigation.dispatch(CommonActions.navigate({ name: "default" }));
  const switchPool = () => navigation.dispatch(CommonActions.navigate({ name: "PoolSettings" }));

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
    <>
      <Navigator
        initialRouteName="default"
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        <Screen name="default" component={HomeDefault} />
        <Screen name="inbox" component={Inbox} />
        <Screen name="send" component={SendTransfer} />
        <Screen name="JoinLink" component={JoinLink} />
        <Screen name="ViewTransfer" component={ViewTransfer} />
        <Screen name="AddFiles" component={AddFiles} options={{ animation: "slide_from_bottom" }} />
        <Screen
          name="PoolSettings"
          component={PoolSettings}
          options={{ animation: "slide_from_bottom" }}
        />
      </Navigator>
      <StatusBar style="auto" backgroundColor="black" />
    </>
  );
}
