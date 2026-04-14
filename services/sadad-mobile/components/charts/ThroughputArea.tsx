/**
 * ThroughputArea — area chart for hourly tx count over the last 12 hours.
 * Uses victory-native for the area geometry.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryTheme,
} from "victory-native";

import { MERCHANT_THEME, RADIUS } from "../../theme";
import type { ThroughputPoint } from "../../utils/api";
import { formatHour } from "../../utils/format";

interface Props {
  data: ThroughputPoint[];
  width?: number;
  height?: number;
}

export default function ThroughputArea({ data, width = 320, height = 200 }: Props) {
  const chartData = data.map((p) => ({
    x: formatHour(p.hour),
    y: p.count,
  }));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Throughput</Text>
        <Text style={styles.subtitle}>Last 12 hours</Text>
      </View>
      <VictoryChart
        theme={VictoryTheme.material}
        width={width}
        height={height}
        padding={{ top: 10, bottom: 30, left: 36, right: 12 }}
        domainPadding={{ x: [8, 8], y: [0, 10] }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: MERCHANT_THEME.border.default },
            tickLabels: { fill: MERCHANT_THEME.text.muted, fontSize: 9, padding: 4 },
            grid: { stroke: "transparent" },
          }}
          tickValues={chartData.filter((_, i) => i % 2 === 0).map((d) => d.x)}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: "transparent" },
            tickLabels: { fill: MERCHANT_THEME.text.muted, fontSize: 9, padding: 2 },
            grid: { stroke: MERCHANT_THEME.border.default, strokeDasharray: "2,4" },
          }}
        />
        <VictoryArea
          data={chartData}
          interpolation="monotoneX"
          style={{
            data: {
              fill: MERCHANT_THEME.accent.cyan,
              fillOpacity: 0.18,
              stroke: MERCHANT_THEME.accent.cyan,
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: MERCHANT_THEME.bg.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
    padding: 14,
  },
  header: {
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: MERCHANT_THEME.text.primary,
  },
  subtitle: {
    fontSize: 11,
    color: MERCHANT_THEME.text.muted,
    marginTop: 2,
  },
});
