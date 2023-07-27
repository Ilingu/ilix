import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text, View } from "react-native";
import type { RootStackParamList } from "../App";
import PreventNavHook from "../lib/hooks/PreventNav";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useContext } from "react";
import AuthContext from "../lib/Context/Auth";
import ColorScheme from "../lib/Theme";
import { StatusBar } from "expo-status-bar";
import PoolContext from "../lib/Context/Pool";
import Button from "../components/design/Button";
import { AntDesign } from "@expo/vector-icons";
import ParticleView from "../components/animations/Particles";

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Home">;
export default function Home(nav: NavigationProps) {
  const { device_name, logOut } = useContext(AuthContext);
  const { pools } = useContext(PoolContext);
  PreventNavHook(nav, true);

  return (
    <SafeAreaProvider>
      <ParticleView
        paticles_number={5}
        style={tw`flex-1 justify-center items-center bg-white bg-opacity-50`}
      >
        <View
          style={tw`w-3/4 border-2 border-black rounded-xl bg-white z-10 overflow-hidden`}
        >
          <Text
            selectable
            style={tw`text-center text-xl text-[${ColorScheme.TEXT}]`}
          >
            Welcome{" "}
            <Text style={tw`font-bold text-amber-400`}>{device_name}</Text>!
          </Text>
          <Button
            style={tw`bg-[${ColorScheme.ERROR}] text-[${ColorScheme.PRIMARY_CONTENT}] text-base rounded-lg h-10 text-center mb-2 pt-2 mx-2`}
            onPress={() => logOut && logOut(nav)}
          >
            <AntDesign name="logout" size={16} color="black" /> Log out
          </Button>
        </View>
      </ParticleView>
      <StatusBar style="auto" backgroundColor="black" />
    </SafeAreaProvider>
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
