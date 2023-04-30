import { PropsWithChildren } from "react";
import { Text, TouchableOpacity, ViewStyle } from "react-native";

type ButtonViewProps = PropsWithChildren<{
  style?: ViewStyle;
  onPress?: () => void;
}>;
const Button: React.FC<ButtonViewProps> = ({ children, style, onPress }) => (
  <TouchableOpacity onPress={() => onPress && onPress()}>
    <Text style={[style]}>{children}</Text>
  </TouchableOpacity>
);

export default Button;
