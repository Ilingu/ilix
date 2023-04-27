import { PropsWithChildren, useEffect, useState } from "react";
import { FlatList, View, ViewStyle, useWindowDimensions } from "react-native";
import tw from "twrnc";
import { DegToRad } from "../../lib/utils";

type ParticleViewProps = PropsWithChildren<{
  style?: ViewStyle;
  paticles_number: number;
}>;
const ParticleView: React.FC<ParticleViewProps> = ({
  style,
  paticles_number,
  children,
}) => {
  type Config = {
    x: number;
    y: number;
    velocity: number;
    angle: number;
    size: number;
  };

  const { height, width } = useWindowDimensions();
  const [particles, setParticles] = useState<Config[]>(() =>
    Array(paticles_number).fill({
      x: Math.round(Math.random() * width),
      y: Math.round(Math.random() * height),
      velocity: Math.random() + 1,
      angle: Math.round(Math.random() * 360),
      size: Math.round(Math.random() * 80) + 20,
    })
  );

  const LauchAnimation = () => {
    setParticles(
      particles.map((p) => {
        const newX = (p.x + Math.cos(DegToRad(p.angle)) * p.velocity) % width;
        const newY = (p.y + Math.sin(DegToRad(p.angle)) * p.velocity) % height;

        return { ...p, x: newX, y: newY };
      })
    );
    requestAnimationFrame(LauchAnimation);
  };
  useEffect(LauchAnimation, []);

  return (
    <View style={style}>
      {children}

      <View style={tw`absolute w-full h-full`}>
        <FlatList
          data={particles}
          renderItem={({ item: { x, y, size } }) => {
            return (
              <View
                style={{
                  bottom: y,
                  left: x,
                  width: size,
                  height: size,
                  borderRadius: 50,
                  backgroundColor: "#000000",
                  opacity: 0.1,
                }}
              />
            );
          }}
          keyExtractor={(_, i) => `${i}`}
        />
      </View>
    </View>
  );
};
export default ParticleView;
