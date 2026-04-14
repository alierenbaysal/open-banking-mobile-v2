/**
 * SuccessGauge — radial gauge using react-native-svg directly.
 *
 * victory-native v36 uses react-native-svg primitives but the radial gauge
 * requires the extra add-on. Building this by hand keeps the dep surface
 * minimal and still looks sharp on dark theme.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { MERCHANT_THEME } from "../../theme";

interface Props {
  value: number;             // 0..1
  size?: number;
  label?: string;
  sublabel?: string;
}

export default function SuccessGauge({
  value,
  size = 180,
  label = "Success rate",
  sublabel,
}: Props) {
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const arc = 0.75 * circ;            // three-quarter track
  const offset = arc * (1 - Math.min(1, Math.max(0, value)));
  const rotate = 135;                 // start at bottom-left
  const percent = Math.round(value * 1000) / 10;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={MERCHANT_THEME.accent.cyan} />
            <Stop offset="100%" stopColor={MERCHANT_THEME.accent.lime} />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={MERCHANT_THEME.bg.elevated}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
          origin={`${size / 2}, ${size / 2}`}
          rotation={rotate}
        />

        {/* Value arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gauge)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${arc} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          origin={`${size / 2}, ${size / 2}`}
          rotation={rotate}
        />
      </Svg>

      <View style={styles.centerStack} pointerEvents="none">
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{percent.toFixed(1)}%</Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  centerStack: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: MERCHANT_THEME.text.muted,
  },
  value: {
    fontSize: 34,
    fontWeight: "800",
    color: MERCHANT_THEME.text.primary,
    fontVariant: ["tabular-nums"],
    marginTop: 4,
  },
  sublabel: {
    fontSize: 12,
    color: MERCHANT_THEME.text.secondary,
    marginTop: 2,
  },
});
