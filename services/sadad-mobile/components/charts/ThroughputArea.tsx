/**
 * ThroughputArea — simple area chart using react-native-svg.
 * Replaces the legacy victory-native implementation which isn't
 * compatible with modern Expo / new architecture.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Line, Text as SvgText } from "react-native-svg";

import { MERCHANT_THEME, RADIUS } from "../../theme";
import type { ThroughputPoint } from "../../utils/api";
import { formatHour } from "../../utils/format";

interface Props {
  data: ThroughputPoint[];
  width?: number;
  height?: number;
}

export default function ThroughputArea({ data, width = 320, height = 200 }: Props) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Throughput</Text>
        <Text style={styles.subtitle}>No data</Text>
      </View>
    );
  }
  const pad = { top: 20, bottom: 30, left: 36, right: 12 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((p) => p.count), 1);
  const step = plotW / Math.max(1, data.length - 1);

  const points = data.map((p, i) => ({
    x: pad.left + i * step,
    y: pad.top + plotH - (p.count / max) * plotH,
  }));

  const pathD =
    "M " +
    points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ") +
    ` L ${pad.left + plotW},${pad.top + plotH} L ${pad.left},${pad.top + plotH} Z`;

  const gridY = [0.25, 0.5, 0.75].map((t) => pad.top + plotH * t);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Throughput</Text>
        <Text style={styles.subtitle}>Last {data.length} hours</Text>
      </View>
      <Svg width={width} height={height}>
        {gridY.map((y, i) => (
          <Line
            key={i}
            x1={pad.left}
            x2={pad.left + plotW}
            y1={y}
            y2={y}
            stroke={MERCHANT_THEME.border.default}
            strokeDasharray="2,4"
          />
        ))}
        <Path d={pathD} fill={MERCHANT_THEME.primary + "33"} stroke={MERCHANT_THEME.primary} strokeWidth={2} />
        {data.filter((_, i) => i % 2 === 0).map((p, i) => (
          <SvgText
            key={i}
            x={pad.left + i * 2 * step}
            y={height - 10}
            fontSize="9"
            fill={MERCHANT_THEME.text.muted}
            textAnchor="middle"
          >
            {formatHour(p.hour)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MERCHANT_THEME.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 14, fontWeight: "700", color: MERCHANT_THEME.text.primary },
  subtitle: { fontSize: 11, color: MERCHANT_THEME.text.muted },
});
