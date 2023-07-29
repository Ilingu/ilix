import { PropsWithChildren, ReactNode } from "react";
import {
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
  type TextProps,
  type ViewStyle,
} from "react-native";
import tw from "twrnc";

type ButtonViewProps = PropsWithChildren<{
  childStyle?: ViewStyle;
  parentProps?: TouchableOpacityProps;
  pChild?: ReactNode;
  childProps?: Omit<TextProps, "style">;
}>;
const Button: React.FC<ButtonViewProps> = ({
  children,
  pChild,
  parentProps,
  childStyle,
  childProps,
}) => (
  <TouchableOpacity {...parentProps}>
    {pChild}
    <Text
      {...childProps}
      style={{
        ...tw`text-base shadow-sm rounded-lg h-10 text-center pt-2`,
        ...childStyle,
      }}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

export default Button;
