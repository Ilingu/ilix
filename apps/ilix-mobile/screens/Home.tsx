import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PanResponder, Text, View } from "react-native";
import type { RootStackParamList } from "../App";
import PreventNavHook from "../lib/hooks/PreventNav";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useContext, useRef, useState } from "react";
import AuthContext from "../lib/Context/Auth";
import ColorScheme from "../lib/Theme";
import { StatusBar } from "expo-status-bar";
import SlideInView from "../components/animations/SlideIn";

type NavigationProps = NativeStackScreenProps<RootStackParamList, "Home">;
export default function Home(nav: NavigationProps) {
  const { device_name } = useContext(AuthContext);
  PreventNavHook(nav, true);

  const [isDrawerOpened, setDrawerOpenState] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { dx }) => {
        if (dx <= -75) setDrawerOpenState(false);
        else if (dx >= 75) setDrawerOpenState(true);
      },
    })
  ).current;

  return (
    <SafeAreaProvider {...panResponder.panHandlers}>
      <SlideInView
        style={tw`absolute top-0 z-10 h-full w-[62.5%] bg-white border-r-2 shadow-xl border-amber-300`}
        duration={500}
        isPercentage
        state={isDrawerOpened ? "forward" : "backward"}
        from={{ left: -310 }}
        to={{ left: 0 }}
      >
        <Text>Here</Text>
      </SlideInView>

      <View style={tw`flex-1`}>
        <View style={tw`mt-2`}>
          <Text
            selectable
            style={tw`text-right text-xl text-[${ColorScheme.TEXT}]`}
          >
            Welcome <Text>{device_name}</Text>!
          </Text>
        </View>
      </View>
      <StatusBar style="auto" backgroundColor={ColorScheme.PRIMARY} />
    </SafeAreaProvider>
  );
}
