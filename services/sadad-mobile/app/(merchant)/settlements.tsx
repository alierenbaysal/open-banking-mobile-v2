/**
 * Settlements — timeline view of settlement batches.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONT, MERCHANT_THEME, RADIUS } from "../../theme";
import SettlementTimeline from "../../components/SettlementTimeline";
import { getSettlements, type Settlement } from "../../utils/api";
import { formatOMR } from "../../utils/format";
import { getCurrentMerchant } from "../../utils/auth";

export default function Settlements() {
  const [items, setItems] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const merchant = await getCurrentMerchant();
      if (!merchant || !mounted) {
        setLoading(false);
        return;
      }
      const s = await getSettlements(merchant.merchant_id);
      if (mounted) {
        setItems(s);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const settled = items.filter((s) => s.status === "settled");
    const pending = items.filter((s) => s.status !== "settled" && s.status !== "failed");
    const totalSettled = settled.reduce((sum, s) => sum + s.net_amount, 0);
    const totalPending = pending.reduce((sum, s) => sum + s.net_amount, 0);
    return { totalSettled, totalPending, pendingCount: pending.length };
  }, [items]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={MERCHANT_THEME.brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settlements</Text>
        <Text style={styles.sub}>
          Payments are batched at 00:00 Asia/Muscat and settled to your account the next
          banking day.
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Settled (last 7 days)</Text>
            <Text style={[styles.summaryValue, { color: MERCHANT_THEME.accent.lime }]}>
              {formatOMR(summary.totalSettled)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>In pipeline</Text>
            <Text style={[styles.summaryValue, { color: MERCHANT_THEME.accent.cyan }]}>
              {formatOMR(summary.totalPending)}
            </Text>
            <Text style={styles.summarySub}>{summary.pendingCount} batches</Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Recent batches</Text>
        <SettlementTimeline settlements={items} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: MERCHANT_THEME.bg.canvas,
  },
  scroll: {
    padding: 16,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: "800",
    color: MERCHANT_THEME.text.primary,
  },
  sub: {
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.secondary,
    marginTop: 4,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
    backgroundColor: MERCHANT_THEME.bg.card,
  },
  summaryLabel: {
    fontSize: FONT.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: MERCHANT_THEME.text.muted,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: FONT.xl,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  summarySub: {
    fontSize: FONT.xs,
    color: MERCHANT_THEME.text.muted,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: MERCHANT_THEME.text.primary,
    marginBottom: 14,
  },
});
