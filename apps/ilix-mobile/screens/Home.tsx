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
import SwitchPool from "../components/pages/Home/SwitchPool";
import SendTransfer from "../components/pages/Home/Send";

export type HomeNestedStack = {
  default: undefined;
  inbox: undefined;
  send: undefined;
  SwitchPool: undefined;
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
  const switchPool = () =>
    navigation.dispatch(CommonActions.navigate({ name: "SwitchPool" }));

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HomeHeader
          pool_name={pools?.current.pool_name}
          openAddPool={openAddPool}
          switchPool={switchPool}
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
      <Screen
        name="SwitchPool"
        component={SwitchPool}
        options={{ animation: "slide_from_bottom" }}
      />
    </Navigator>
  );
}

/*
<SlideInView
        style={tw`absolute top-0 z-10 h-full w-[62.5%] bg-white border-r-2 shadow-xl border-amber-300`}
        duration={500}
        isPercentage
        state={isDrawerOpened ? "forward" : "backward"}
        from={{ left: -310 }}
        to={{ left: 0 }}
      >
        <View
          style={tw`flex-1  mb-1 overflow-hidden border-b-2 border-amber-300`}
        >
          <Text
            style={tw`font-semibold text-[${ColorScheme.INFO}] text-center text-[20px]`}
          >
            <Text style={tw`text-black italic`}>{"[ "}</Text>
            User list
            <Text style={tw`text-black italic`}>{" ]"}</Text>
          </Text>
          {pools?.current.devices_id_to_name ? (
            <FlatList
              data={Object.values(pools?.current.devices_id_to_name)}
              renderItem={(name) => (
                <View
                  style={{
                    ...tw`border-2 border-[${ColorScheme.PRIMARY}] bg-black bg-opacity-5 rounded-lg flex flex-row items-center py-1 mx-2 mb-1`,
                    justifyContent: "space-between",
                  }}
                >
                  <ProfilePicture height={32} width={32} style={tw`ml-2`} />
                  <View
                    style={tw`flex justify-center items-center w-full -ml-[34px]`}
                  >
                    <Text
                      style={tw`text-lg text-[${ColorScheme.PRIMARY_CONTENT}]`}
                    >
                      {name.item}
                    </Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <Text>Nobody there</Text>
          )}
        </View>
        <Text
          selectable
          style={tw`text-center text-xl text-[${ColorScheme.TEXT}]`}
        >
          Welcome{" "}
          <Text style={tw`font-bold italic text-amber-900`}>{device_name}</Text>
          !
        </Text>
        <Button
          style={tw`bg-[${ColorScheme.PRIMARY}] text-[${ColorScheme.PRIMARY_CONTENT}] text-base rounded-lg h-10 text-center mb-2 pt-2 mx-2`}
        >
          <FontAwesome5
            name="sync"
            size={16}
            color={ColorScheme.PRIMARY_CONTENT}
          />{" "}
          Switch pool
        </Button>
        <Button
          style={tw`bg-[${ColorScheme.ERROR}] text-[${ColorScheme.PRIMARY_CONTENT}] text-base rounded-lg h-10 text-center mb-2 pt-2 mx-2`}
          onPress={() => logOut && logOut(nav)}
        >
          <AntDesign name="logout" size={16} color="black" /> Log out
        </Button>
      </SlideInView>
*/
