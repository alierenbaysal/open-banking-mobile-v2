/**
 * TxTicker — live-updating transaction feed for the merchant dashboard.
 * Each row fades between the neon accents to convey "something is happening".
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MERCHANT_THEME, RADIUS } from "../theme";
import type { TxTickerItem } from "../utils/api";
import { formatOMR, formatRelative } from "../utils/format";

interface Props {
  items: TxTickerItem[];
}

const STATUS_META: Record<
  TxTickerItem["status"],
  { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }
> = {
  completed: { icon: "checkmark-circle", color: MERCHANT_THEME.status.success, label: "Paid" },
  pending: { icon: "time-outline", color: MERCHANT_THEME.status.warning, label: "Pending" },
  failed: { icon: "close-circle", color: MERCHANT_THEME.status.error, label: "Failed" },
};

export default function TxTicker({ items }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.pulse} />
          <Text style={styles.title}>Live transactions</Text>
        </View>
        <Text style={styles.subtitle}>Polling every 4s</Text>
      </View>

      <View style={styles.list}>
        {items.length === 0 ? (
          <Text style={styles.empty}>Waiting for activity...</Text>
        ) : (
          items.map((item) => {
            const meta = STATUS_META[item.status];
            return (
              <View key={item.id} style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: `${meta.color}22` }]}>
                  <Ionicons name={meta.icon} size={16} color={meta.color} />
                </View>
                <View style={styles.meta}>
                  <Text style={styles.ref}>{item.reference}</Text>
                  <Text style={styles.sub}>
                    {item.customer_masked} · {formatRelative(item.timestamp)}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: meta.color }]}>
                  {formatOMR(item.amount)}
                </Text>
              </View>
            );
          })
        )}
      </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MERCHANT_THEME.accent.lime,
    shadowColor: MERCHANT_THEME.accent.lime,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: MERCHANT_THEME.text.primary,
  },
  subtitle: {
    fontSize: 10,
    color: MERCHANT_THEME.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    flex: 1,
  },
  ref: {
    fontSize: 13,
    fontWeight: "600",
    color: MERCHANT_THEME.text.primary,
    fontFamily: "monospace",
  },
  sub: {
    fontSize: 11,
    color: MERCHANT_THEME.text.muted,
    marginTop: 2,
  },
  amount: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  empty: {
    fontSize: 13,
    color: MERCHANT_THEME.text.muted,
    textAlign: "center",
    paddingVertical: 20,
  },
});
