/**
 * KpiCard — dark, neon-accented KPI tile for the merchant dashboard.
 * Optional sparkline rendered with react-native-svg.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polyline, LinearGradient, Defs, Stop, Polygon } from "react-native-svg";

import { MERCHANT_THEME, RADIUS } from "../theme";

type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  icon: IconName;
  accent?: keyof typeof MERCHANT_THEME.accent;
  sparkline?: number[];
  delta?: { value: string; positive: boolean };
}

const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 36;

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = SPARK_WIDTH / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = SPARK_HEIGHT - ((v - min) / range) * (SPARK_HEIGHT - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const fillPoints = `0,${SPARK_HEIGHT} ${points} ${SPARK_WIDTH},${SPARK_HEIGHT}`;

  return (
    <Svg width={SPARK_WIDTH} height={SPARK_HEIGHT}>
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.5} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Polygon points={fillPoints} fill="url(#g)" />
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent = "cyan",
  sparkline,
  delta,
}: Props) {
  const accentColor = MERCHANT_THEME.accent[accent];

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
          <Ionicons name={icon} size={18} color={accentColor} />
        </View>
        {delta ? (
          <View
            style={[
              styles.delta,
              {
                backgroundColor: delta.positive
                  ? "rgba(0,230,118,0.14)"
                  : "rgba(255,82,82,0.14)",
              },
            ]}
          >
            <Ionicons
              name={delta.positive ? "trending-up" : "trending-down"}
              size={12}
              color={delta.positive ? MERCHANT_THEME.status.success : MERCHANT_THEME.status.error}
            />
            <Text
              style={[
                styles.deltaText,
                {
                  color: delta.positive
                    ? MERCHANT_THEME.status.success
                    : MERCHANT_THEME.status.error,
                },
              ]}
            >
              {delta.value}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {sparkline && sparkline.length > 1 ? (
        <View style={styles.sparkWrap}>
          <Sparkline data={sparkline} color={accentColor} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    backgroundColor: MERCHANT_THEME.bg.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  delta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: MERCHANT_THEME.text.muted,
    marginBottom: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    color: MERCHANT_THEME.text.primary,
    fontVariant: ["tabular-nums"],
  },
  subtitle: {
    fontSize: 11,
    color: MERCHANT_THEME.text.secondary,
    marginTop: 2,
  },
  sparkWrap: {
    marginTop: 10,
    overflow: "hidden",
  },
});
