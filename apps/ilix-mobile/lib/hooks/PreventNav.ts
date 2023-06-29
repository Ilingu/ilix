import type { EventArg, ParamListBase } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";
import { pushToast } from "../utils";
import { BackHandler } from "react-native";

export default function PreventNavHook<
  T extends ParamListBase,
  U extends keyof T
>({ navigation }: NativeStackScreenProps<T, U>, optionToQuit = false) {
  const quitNum = useRef(0);
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      if (optionToQuit) quitNum.current += 1;
      if (quitNum.current >= 2) {
        quitNum.current = 0;
        pushToast("Bye!");
        return BackHandler.exitApp();
      }

      pushToast(optionToQuit ? "Do again to quit" : "Where are you going? 👀");
    });
    return unsubscribe;
  }, [navigation]);
}
