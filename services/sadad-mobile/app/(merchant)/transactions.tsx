/**
 * Transactions list — searchable, status-filterable list with pills.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FONT, MERCHANT_THEME, RADIUS } from "../../theme";
import Badge from "../../components/Badge";
import { getTransactions, type Transaction } from "../../utils/api";
import { formatOMR, formatRelative } from "../../utils/format";
import { getCurrentMerchant } from "../../utils/auth";

type StatusFilter = "all" | Transaction["status"];

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "refunded", label: "Refunded" },
];

function toneForStatus(s: Transaction["status"]): "success" | "warning" | "error" | "info" {
  switch (s) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "error";
    case "refunded":
      return "info";
  }
}

export default function Transactions() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const merchant = await getCurrentMerchant();
      if (!merchant || !mounted) {
        setLoading(false);
        return;
      }
      const txs = await getTransactions(merchant.merchant_id);
      if (mounted) {
        setItems(txs);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (q && !`${t.reference} ${t.customer_masked}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, filter, query]);

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
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.sub}>{items.length.toLocaleString()} total</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={MERCHANT_THEME.text.muted} />
        <TextInput
          style={styles.search}
          placeholder="Search by reference or customer"
          placeholderTextColor={MERCHANT_THEME.text.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={MERCHANT_THEME.text.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search" size={36} color={MERCHANT_THEME.text.muted} />
            <Text style={styles.emptyText}>No transactions match.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMeta}>
              <Text style={styles.ref}>{item.reference}</Text>
              <Text style={styles.customer}>
                {item.customer_masked} · {formatRelative(item.timestamp)}
              </Text>
              <View style={styles.rowBadges}>
                <Badge label={item.status.toUpperCase()} tone={toneForStatus(item.status)} dark />
                <Badge
                  label={item.method === "bank-dhofar" ? "BD" : item.method.toUpperCase()}
                  tone="neutral"
                  dark
                />
              </View>
            </View>
            <Text style={styles.amount}>
              {item.status === "refunded" ? "-" : ""}
              {formatOMR(item.amount)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: MERCHANT_THEME.bg.canvas,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: "800",
    color: MERCHANT_THEME.text.primary,
  },
  sub: {
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.muted,
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: MERCHANT_THEME.bg.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
  },
  search: {
    flex: 1,
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.primary,
  },
  filters: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: MERCHANT_THEME.bg.surface,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
  },
  filterActive: {
    backgroundColor: MERCHANT_THEME.brand.primarySoft,
    borderColor: MERCHANT_THEME.brand.primary,
  },
  filterText: {
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.secondary,
    fontWeight: "600",
  },
  filterTextActive: {
    color: MERCHANT_THEME.brand.primary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sep: {
    height: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: MERCHANT_THEME.bg.card,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
  },
  rowMeta: {
    flex: 1,
  },
  ref: {
    fontSize: FONT.sm,
    fontWeight: "700",
    color: MERCHANT_THEME.text.primary,
    fontFamily: "monospace",
  },
  customer: {
    fontSize: FONT.xs,
    color: MERCHANT_THEME.text.muted,
    marginTop: 2,
  },
  rowBadges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  amount: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: MERCHANT_THEME.text.primary,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.muted,
  },
});
