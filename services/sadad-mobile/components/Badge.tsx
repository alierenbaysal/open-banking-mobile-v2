/**
 * Status badge — pill with colored background + label.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RADIUS } from "../theme";

type Tone = "success" | "warning" | "error" | "info" | "neutral";

interface Props {
  label: string;
  tone?: Tone;
  dark?: boolean;
}

const LIGHT: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "#E8F5E9", fg: "#2E7D32" },
  warning: { bg: "#FFF3E0", fg: "#F57C00" },
  error: { bg: "#FFEBEE", fg: "#C62828" },
  info: { bg: "#E3F2FD", fg: "#1565C0" },
  neutral: { bg: "#F5F5F5", fg: "#555555" },
};

const DARK: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "rgba(0,230,118,0.12)", fg: "#00E676" },
  warning: { bg: "rgba(255,193,7,0.12)", fg: "#FFC107" },
  error: { bg: "rgba(255,82,82,0.12)", fg: "#FF5252" },
  info: { bg: "rgba(64,196,255,0.12)", fg: "#40C4FF" },
  neutral: { bg: "rgba(255,255,255,0.08)", fg: "#A8B2C4" },
};

export default function Badge({ label, tone = "neutral", dark = false }: Props) {
  const palette = dark ? DARK[tone] : LIGHT[tone];
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});
