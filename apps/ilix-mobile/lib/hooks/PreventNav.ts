import { ParamListBase } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { pushToast } from "../utils";
import { BackHandler } from "react-native";

export default function PreventNavHook<
  T extends ParamListBase,
  U extends keyof T
>({ navigation }: NativeStackScreenProps<T, U>, optionToQuit = false) {
  const quitNum = useRef(0);

  useEffect(() => {
    navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      if (optionToQuit) quitNum.current += 1;
      if (quitNum.current >= 2) {
        quitNum.current = 0;
        pushToast("Bye!");
        return BackHandler.exitApp();
      }

      pushToast(optionToQuit ? "Do again to quit" : "Where are you going? 👀");
    });
  }, []);
}