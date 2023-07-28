import { PropsWithChildren, ReactNode } from "react";
import { Text, TouchableOpacity, ViewStyle } from "react-native";
import tw from "twrnc";

type ButtonViewProps = PropsWithChildren<{
  style?: ViewStyle;
  pStyle?: ViewStyle;
  pChild?: ReactNode;
  onPress?: () => void;
}>;
const Button: React.FC<ButtonViewProps> = ({
  children,
  pStyle,
  pChild,
  style,
  onPress,
}) => (
  <TouchableOpacity onPress={() => onPress && onPress()} style={pStyle}>
    {pChild}
    <Text
      style={{
        ...tw`text-base shadow rounded-lg h-10 text-center pt-2`,
        ...style,
      }}
    >
      {children}
    </Text>
  </TouchableOpacity>
);

export default Button;
