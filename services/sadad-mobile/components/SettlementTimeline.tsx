/**
 * SettlementTimeline — vertical timeline of settlement batches with status dots.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MERCHANT_THEME, RADIUS } from "../theme";
import type { Settlement } from "../utils/api";
import { formatDate, formatOMR } from "../utils/format";

interface Props {
  settlements: Settlement[];
}

const STATUS: Record<
  Settlement["status"],
  { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: { color: MERCHANT_THEME.status.info, label: "Queued", icon: "time-outline" },
  processing: { color: MERCHANT_THEME.status.warning, label: "Processing", icon: "sync-outline" },
  settled: { color: MERCHANT_THEME.status.success, label: "Settled", icon: "checkmark-done" },
  failed: { color: MERCHANT_THEME.status.error, label: "Failed", icon: "alert-circle-outline" },
};

export default function SettlementTimeline({ settlements }: Props) {
  return (
    <View style={styles.wrap}>
      {settlements.map((s, idx) => {
        const meta = STATUS[s.status];
        const last = idx === settlements.length - 1;
        return (
          <View key={s.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: meta.color, shadowColor: meta.color }]}>
                <Ionicons name={meta.icon} size={12} color={MERCHANT_THEME.bg.canvas} />
              </View>
              {!last ? <View style={styles.line} /> : null}
            </View>

            <View style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.batchId}>{s.id}</Text>
                <View style={[styles.badge, { backgroundColor: `${meta.color}22` }]}>
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              <Text style={styles.batchDate}>Batch {formatDate(s.batch_date)}</Text>

              <View style={styles.amountRow}>
                <View style={styles.amountCell}>
                  <Text style={styles.amountLabel}>Gross</Text>
                  <Text style={styles.amountValue}>{formatOMR(s.gross_amount)}</Text>
                </View>
                <View style={styles.amountCell}>
                  <Text style={styles.amountLabel}>Fees</Text>
                  <Text style={styles.amountValue}>{formatOMR(s.fee_amount)}</Text>
                </View>
                <View style={styles.amountCell}>
                  <Text style={styles.amountLabel}>Net</Text>
                  <Text style={[styles.amountValue, styles.net]}>{formatOMR(s.net_amount)}</Text>
                </View>
              </View>

              <Text style={styles.footer}>
                {s.tx_count} tx · value date {formatDate(s.expected_value_date)}
                {s.settled_at ? ` · settled ${formatDate(s.settled_at)}` : ""}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    minHeight: 120,
  },
  rail: {
    width: 20,
    alignItems: "center",
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 2,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: MERCHANT_THEME.border.default,
    marginTop: -2,
  },
  card: {
    flex: 1,
    backgroundColor: MERCHANT_THEME.bg.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
    padding: 14,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  batchId: {
    fontSize: 12,
    color: MERCHANT_THEME.text.muted,
    fontFamily: "monospace",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  batchDate: {
    fontSize: 15,
    fontWeight: "700",
    color: MERCHANT_THEME.text.primary,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  amountCell: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 10,
    color: MERCHANT_THEME.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 13,
    fontWeight: "700",
    color: MERCHANT_THEME.text.primary,
    fontVariant: ["tabular-nums"],
  },
  net: {
    color: MERCHANT_THEME.accent.lime,
  },
  footer: {
    fontSize: 11,
    color: MERCHANT_THEME.text.muted,
    borderTopWidth: 1,
    borderTopColor: MERCHANT_THEME.border.default,
    paddingTop: 8,
  },
});
