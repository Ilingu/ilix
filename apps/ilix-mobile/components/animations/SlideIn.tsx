import { PropsWithChildren, useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

type AbsolutePos = {
  top?: number;
  bottom?: number;
  right?: number;
  left?: number;
};
type SlideInViewProps = PropsWithChildren<{
  style?: ViewStyle;
  duration: number;
  state: "forward" | "backward";
  from: AbsolutePos;
  to: AbsolutePos;
}>;
const SlideInView: React.FC<SlideInViewProps> = ({
  style,
  duration,
  children,
  from,
  to,
  state,
}) => {
  const top = useRef(new Animated.Value(from.top ?? 0)).current;
  const bottom = useRef(new Animated.Value(from.bottom ?? 0)).current;
  const right = useRef(new Animated.Value(from.right ?? 0)).current;
  const left = useRef(new Animated.Value(from.left ?? 0)).current;

  useEffect(() => {
    // from->to
    if (from.top === undefined || to.top === undefined) return;

    if (state === "forward")
      Animated.timing(top, {
        toValue: to.top,
        duration,
        useNativeDriver: false,
      }).start();
    else
      Animated.timing(top, {
        toValue: from.top,
        duration,
        useNativeDriver: false,
      }).start();
  }, [state, top]);

  useEffect(() => {
    if (from.bottom === undefined || to.bottom === undefined) return;

    if (state === "forward")
      Animated.timing(bottom, {
        toValue: to.bottom,
        duration,
        useNativeDriver: false,
      }).start();
    else
      Animated.timing(bottom, {
        toValue: from.bottom,
        duration,
        useNativeDriver: false,
      }).start();
  }, [state, bottom]);

  useEffect(() => {
    if (from.right === undefined || to.right === undefined) return;

    if (state === "forward")
      Animated.timing(right, {
        toValue: to.right,
        duration,
        useNativeDriver: false,
      }).start();
    else
      Animated.timing(right, {
        toValue: from.right,
        duration,
        useNativeDriver: false,
      }).start();
  }, [state, right]);

  useEffect(() => {
    if (from.left === undefined || to.left === undefined) return;

    if (state === "forward")
      Animated.timing(left, {
        toValue: to.left,
        duration,
        useNativeDriver: false,
      }).start();
    else
      Animated.timing(left, {
        toValue: from.left,
        duration,
        useNativeDriver: false,
      }).start();
  }, [state, left]);

  return (
    <Animated.View // Special animatable View
      style={{
        ...style,
        position: "absolute",
        top: from.top === undefined || to.top === undefined ? undefined : top,
        bottom:
          from.bottom === undefined || to.bottom === undefined
            ? undefined
            : bottom,
        right:
          from.right === undefined || to.right === undefined
            ? undefined
            : right,
        left:
          from.left === undefined || to.left === undefined ? undefined : left,
      }}
    >
      {children}
    </Animated.View>
  );
};
export default SlideInView;
