/**
 * Confetti — lightweight confetti animation for the success screen.
 * Uses Animated loops + random particles; no native deps required.
 */

import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, Easing, StyleSheet, View } from "react-native";

interface Props {
  count?: number;
  colors?: string[];
  duration?: number;
}

const DEFAULT_COLORS = ["#F57C00", "#FF4081", "#40C4FF", "#C6FF00", "#B388FF"];

export default function Confetti({
  count = 28,
  colors = DEFAULT_COLORS,
  duration = 2800,
}: Props) {
  const { width, height } = Dimensions.get("window");

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        color: colors[i % colors.length],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 600,
        rotation: Math.random() * 360,
        drift: (Math.random() - 0.5) * 120,
      })),
    [count, width, colors],
  );

  const anims = useRef(particles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const runners = particles.map((p, i) =>
      Animated.timing(anims[i], {
        toValue: 1,
        duration,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    Animated.stagger(40, runners).start();
  }, [anims, particles, duration]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => {
        const translateY = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-30, height + 40],
        });
        const translateX = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });
        const rotate = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [`${p.rotation}deg`, `${p.rotation + 540}deg`],
        });
        const opacity = anims[i].interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                width: p.size,
                height: p.size * 0.4,
                backgroundColor: p.color,
                transform: [{ translateY }, { translateX }, { rotate }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    top: 0,
    borderRadius: 2,
  },
});
