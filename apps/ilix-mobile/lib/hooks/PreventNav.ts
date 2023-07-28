import type { ParamListBase } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";
import { pushToast } from "../utils";
import { BackHandler } from "react-native";

export default function usePreventNav<
  T extends ParamListBase,
  U extends keyof T
>(navigation: NativeStackNavigationProp<T, U>, optionToQuit = false) {
  const quitNum = useRef(0);
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (e.data.action.type !== "GO_BACK") return;
      e.preventDefault();

      if (optionToQuit) quitNum.current += 1;
      if (quitNum.current >= 2) {
        quitNum.current = 0;
        pushToast("Bye!");
        return BackHandler.exitApp();
      }

      pushToast(optionToQuit ? "Again to exit" : "Where are you going? 👀");
    });
    return unsubscribe;
  }, [navigation]);
}
