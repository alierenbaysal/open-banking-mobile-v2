/**
 * Merchant dashboard — KPI strip, throughput area chart, success-rate gauge,
 * live transaction ticker.
 *
 * Uses polling every 4s for the ticker; everything else refreshes on pull-to-
 * refresh or when the merchant ID changes.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FONT, MERCHANT_THEME, RADIUS } from "../../theme";
import {
  getLiveTicker,
  getMerchantKpis,
  getThroughput,
  type MerchantKpis,
  type ThroughputPoint,
  type TxTickerItem,
} from "../../utils/api";
import { formatCompact, formatOMR, formatPercent } from "../../utils/format";
import { getCurrentMerchant, type TestMerchant } from "../../utils/auth";

import KpiCard from "../../components/KpiCard";
import SuccessGauge from "../../components/charts/SuccessGauge";
import ThroughputArea from "../../components/charts/ThroughputArea";
import TxTicker from "../../components/TxTicker";

const TICKER_INTERVAL_MS = 4_000;

export default function Dashboard() {
  const [merchant, setMerchant] = useState<TestMerchant | null>(null);
  const [kpis, setKpis] = useState<MerchantKpis | null>(null);
  const [throughput, setThroughput] = useState<ThroughputPoint[]>([]);
  const [ticker, setTicker] = useState<TxTickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { width } = Dimensions.get("window");

  const loadAll = useCallback(async (merchantId: string) => {
    const [k, t, tk] = await Promise.all([
      getMerchantKpis(merchantId),
      getThroughput(merchantId),
      getLiveTicker(merchantId),
    ]);
    setKpis(k);
    setThroughput(t);
    setTicker(tk);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const m = await getCurrentMerchant();
      if (!mounted) return;
      setMerchant(m);
      if (m) {
        await loadAll(m.merchant_id);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [loadAll]);

  // Polling loop for live ticker
  useEffect(() => {
    if (!merchant) return;
    pollRef.current = setInterval(() => {
      getLiveTicker(merchant.merchant_id).then(setTicker).catch(() => undefined);
    }, TICKER_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [merchant]);

  const onRefresh = useCallback(async () => {
    if (!merchant) return;
    setRefreshing(true);
    try {
      await loadAll(merchant.merchant_id);
    } finally {
      setRefreshing(false);
    }
  }, [merchant, loadAll]);

  if (loading || !merchant || !kpis) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={MERCHANT_THEME.brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const chartWidth = width - 32;

  // Synthesize a sparkline from throughput counts (already trending data)
  const countSpark = throughput.map((p) => p.count);
  const amountSpark = throughput.map((p) => p.amount);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={MERCHANT_THEME.brand.primary}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Dashboard</Text>
            <Text style={styles.merchantName}>{merchant.display_name}</Text>
            <Text style={styles.merchantMeta}>
              {merchant.account_id} · MCC {merchant.mcc}
            </Text>
          </View>
          <View style={styles.liveChip}>
            <View style={styles.livePulse} />
            <Text style={styles.liveChipText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <KpiCard
            title="Today's volume"
            value={formatCompact(kpis.today_volume)}
            subtitle={formatOMR(kpis.today_volume)}
            icon="cash-outline"
            accent="lime"
            sparkline={amountSpark}
            delta={{ value: "+12.4%", positive: true }}
          />
          <KpiCard
            title="Tx count"
            value={kpis.today_count.toLocaleString()}
            subtitle="Since midnight"
            icon="swap-horizontal"
            accent="cyan"
            sparkline={countSpark}
            delta={{ value: "+8.1%", positive: true }}
          />
          <KpiCard
            title="Avg ticket"
            value={formatOMR(kpis.avg_ticket)}
            subtitle="Per transaction"
            icon="analytics-outline"
            accent="violet"
            delta={{ value: "-2.3%", positive: false }}
          />
          <KpiCard
            title="Throughput"
            value={`${kpis.throughput_per_min.toFixed(1)}/min`}
            subtitle="5-min rolling"
            icon="flash-outline"
            accent="magenta"
            sparkline={countSpark.slice(-8)}
          />
        </View>

        <View style={styles.rowCards}>
          <View style={styles.gaugeCard}>
            <SuccessGauge
              value={kpis.success_rate}
              sublabel={formatPercent(1 - kpis.success_rate, 1) + " errors"}
            />
          </View>
        </View>

        <ThroughputArea data={throughput} width={chartWidth - 28} height={200} />

        <View style={{ height: 14 }} />

        <TxTicker items={ticker} />

        <View style={styles.mtdCard}>
          <Text style={styles.mtdLabel}>Month to date</Text>
          <Text style={styles.mtdValue}>{formatOMR(kpis.month_to_date)}</Text>
          <View style={styles.mtdBar}>
            <View style={[styles.mtdFill, { width: "62%" }]} />
          </View>
          <Text style={styles.mtdHint}>62% of monthly target · OMR 460,000</Text>
        </View>
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
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  eyebrow: {
    fontSize: FONT.xs,
    color: MERCHANT_THEME.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  merchantName: {
    fontSize: FONT.xxl,
    fontWeight: "800",
    color: MERCHANT_THEME.text.primary,
    marginTop: 2,
  },
  merchantMeta: {
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.secondary,
    fontFamily: "monospace",
    marginTop: 4,
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(0,230,118,0.14)",
    borderWidth: 1,
    borderColor: "rgba(0,230,118,0.35)",
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MERCHANT_THEME.status.success,
  },
  liveChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: MERCHANT_THEME.status.success,
    letterSpacing: 1,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rowCards: {
    flexDirection: "row",
    gap: 10,
  },
  gaugeCard: {
    flex: 1,
    backgroundColor: MERCHANT_THEME.bg.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  mtdCard: {
    backgroundColor: MERCHANT_THEME.bg.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
    padding: 16,
    marginTop: 6,
  },
  mtdLabel: {
    fontSize: FONT.xs,
    color: MERCHANT_THEME.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  mtdValue: {
    fontSize: FONT.xxl,
    fontWeight: "800",
    color: MERCHANT_THEME.text.primary,
    fontVariant: ["tabular-nums"],
    marginTop: 4,
  },
  mtdBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: MERCHANT_THEME.bg.elevated,
    marginTop: 12,
    overflow: "hidden",
  },
  mtdFill: {
    height: "100%",
    backgroundColor: MERCHANT_THEME.accent.lime,
  },
  mtdHint: {
    fontSize: FONT.xs,
    color: MERCHANT_THEME.text.muted,
    marginTop: 8,
  },
});
