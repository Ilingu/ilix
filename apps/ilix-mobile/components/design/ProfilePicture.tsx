import { ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";

type Props = {
  size?: number;
  width: number;
  height: number;
  style?: ViewStyle;
};
export default function ProfilePicture({ size, width, height, style }: Props) {
  return (
    <SvgUri
      width={width}
      height={height}
      style={style}
      uri={`https://source.boringavatars.com/beam/${size ?? 120}/?colors=FECA4E,FECA4E,5380CC`}
    />
  );
}
