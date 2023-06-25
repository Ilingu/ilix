import { PropsWithChildren, useEffect, useState } from "react";
import { View, ViewStyle, useWindowDimensions } from "react-native";
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
    tick: number;
  };

  const { height, width } = useWindowDimensions();
  const [particles, setParticles] = useState<Config[]>(() =>
    [...Array(paticles_number)].map(() => ({
      x: Math.round(Math.random() * width),
      y: Math.round(Math.random() * height),
      velocity: Math.round(Math.random() * 3) + 3,
      angle: Math.round(Math.random() * 360),
      size: Math.round(Math.random() * 80) + 20,
      tick: Math.round(Math.random() * 100_000),
    }))
  );

  const LauchAnimation = () => {
    setParticles((prev) =>
      prev.map((p) => {
        let newX = p.x + (Math.cos(DegToRad(p.angle)) * p.velocity) / 10;
        if (newX + p.size < 0) newX = width + p.size;
        if (newX - p.size > width) newX = -p.size;

        let newY = p.y + (Math.sin(DegToRad(p.angle)) * p.velocity) / 10;
        if (newY + p.size < 0) newY = height + p.size;
        if (newY - p.size > height) newY = -p.size;

        return {
          ...p,
          x: newX,
          y: newY,
          tick: (p.tick + 1) % 100_000,
        };
      })
    );
    requestAnimationFrame(LauchAnimation);
  };
  useEffect(LauchAnimation, []);

  return (
    <View style={style}>
      {children}

      <View style={tw`absolute w-full h-full`}>
        {particles.map(({ x, y, size, tick }, i) => {
          const size_variation = size + Math.cos(DegToRad(tick * 0.5)) * 5;
          return (
            <View
              key={i}
              style={{
                position: "absolute",
                bottom: y,
                left: x,
                width: size_variation,
                height: size_variation,
                transform: [{ rotate: `${(tick * 0.05) % 360}deg` }],
                borderRadius: Math.abs(Math.cos(DegToRad(tick * 0.3)) * 5),
                zIndex: -10,
                backgroundColor: "#000000",
                opacity:
                  ((i + 1) / particles.length) *
                  (0.5 + Math.cos(DegToRad(tick * 0.25)) * 0.05),
              }}
            />
          );
        })}
      </View>
    </View>
  );
};
export default ParticleView;
