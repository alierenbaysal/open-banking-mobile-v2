/**
 * SuccessGauge — half-ring gauge showing payment success rate.
 * Pure react-native-svg. Replaces legacy victory-native pie.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

import { MERCHANT_THEME, RADIUS } from "../../theme";

interface Props {
  value: number; // 0-100
  label?: string;
  size?: number;
}

export default function SuccessGauge({ value, label = "Success rate", size = 140 }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2 + 6;
  // Half circle from 180° (left) to 360°/0° (right)
  // Convert pct to angle (0-180°)
  const startAng = Math.PI;
  const endAng = Math.PI + (Math.PI * pct) / 100;
  const x0 = cx + r * Math.cos(startAng);
  const y0 = cy + r * Math.sin(startAng);
  const x1 = cx + r * Math.cos(endAng);
  const y1 = cy + r * Math.sin(endAng);
  const largeArc = endAng - startAng > Math.PI ? 1 : 0;
  const arc = `M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`;
  const bgArcEnd = cx + r * Math.cos(2 * Math.PI);
  const bgArc = `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${bgArcEnd} ${cy}`;
  const color = pct >= 95 ? MERCHANT_THEME.success : pct >= 80 ? MERCHANT_THEME.primary : MERCHANT_THEME.danger;

  return (
    <View style={[styles.card, { width: size + 28 }]}>
      <Svg width={size} height={size / 2 + 20}>
        <Path d={bgArc} stroke={MERCHANT_THEME.border.default} strokeWidth={12} fill="none" strokeLinecap="round" />
        <Path d={arc} stroke={color} strokeWidth={12} fill="none" strokeLinecap="round" />
      </Svg>
      <Text style={styles.value}>{pct.toFixed(1)}%</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MERCHANT_THEME.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
  },
  value: { fontSize: 24, fontWeight: "700", color: MERCHANT_THEME.text.primary, marginTop: 4 },
  label: { fontSize: 11, color: MERCHANT_THEME.text.muted, marginTop: 2 },
});
