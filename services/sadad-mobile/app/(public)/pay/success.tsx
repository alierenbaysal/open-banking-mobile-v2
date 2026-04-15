/**
 * Payment success screen.
 * Confetti animation, receipt card, "back to merchant" CTA.
 */

import React from "react";
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { CUSTOMER_THEME, FONT, RADIUS } from "../../../theme";
import { formatOMR } from "../../../utils/format";
import Confetti from "../../../components/Confetti";

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    session_id?: string;
    amount?: string;
    reference?: string;
    merchant?: string;
    return_url?: string;
  }>();

  const amount = Number(params.amount ?? 0);
  const reference = (params.reference as string) ?? "INV-2026-000000";
  const merchant = (params.merchant as string) ?? "Merchant";
  const returnUrl = params.return_url as string | undefined;
  const completedAt = new Date().toISOString();

  const handleReturn = async () => {
    if (returnUrl) {
      try {
        await Linking.openURL(returnUrl);
        return;
      } catch {
        // fall through
      }
    }
    router.replace("/welcome");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Confetti />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.check}>
            <Ionicons name="checkmark" size={44} color={CUSTOMER_THEME.text.onBrand} />
          </View>
          <Text style={styles.title}>Payment successful</Text>
          <Text style={styles.sub}>
            Your payment to {merchant} has been approved and settled.
          </Text>
        </View>

        <View style={styles.receipt}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>Receipt</Text>
            <Text style={styles.receiptRef}>{reference}</Text>
          </View>

          <Row label="Merchant" value={merchant} />
          <Row label="Amount" value={formatOMR(amount)} highlight />
          <Row label="Method" value="Bank Dhofar" />
          <Row label="Status" value="COMPLETED" badge />
          <Row label="Date" value={new Date(completedAt).toLocaleString()} />
          <Row label="Session" value={params.session_id ?? "-"} mono />
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={handleReturn}>
            <Text style={styles.primaryBtnText}>Back to {merchant}</Text>
            <Ionicons name="arrow-forward" size={18} color={CUSTOMER_THEME.text.onBrand} />
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.replace("/welcome")}>
            <Text style={styles.secondaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  highlight,
  badge,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      {badge ? (
        <View style={rowStyles.badge}>
          <Text style={rowStyles.badgeText}>{value}</Text>
        </View>
      ) : (
        <Text
          style={[
            rowStyles.value,
            highlight && rowStyles.highlight,
            mono && rowStyles.mono,
          ]}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: CUSTOMER_THEME.border.default,
  },
  label: {
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.text.muted,
  },
  value: {
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.text.primary,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  highlight: {
    fontSize: FONT.lg,
    fontWeight: "800",
    color: CUSTOMER_THEME.status.success,
    fontVariant: ["tabular-nums"],
  },
  mono: {
    fontFamily: "monospace",
    fontSize: FONT.xs,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: CUSTOMER_THEME.status.successBg,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: CUSTOMER_THEME.status.success,
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CUSTOMER_THEME.bg.surface,
  },
  scroll: {
    padding: 24,
    paddingBottom: 60,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 32,
  },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: CUSTOMER_THEME.status.success,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: CUSTOMER_THEME.status.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: "800",
    color: CUSTOMER_THEME.text.primary,
  },
  sub: {
    fontSize: FONT.md,
    color: CUSTOMER_THEME.text.secondary,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 300,
  },
  receipt: {
    backgroundColor: CUSTOMER_THEME.bg.card,
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: CUSTOMER_THEME.border.default,
    marginBottom: 24,
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  receiptTitle: {
    fontSize: FONT.lg,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.primary,
  },
  receiptRef: {
    fontSize: FONT.xs,
    color: CUSTOMER_THEME.text.muted,
    fontFamily: "monospace",
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: CUSTOMER_THEME.brand.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: CUSTOMER_THEME.text.onBrand,
    fontSize: FONT.md,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: CUSTOMER_THEME.border.strong,
  },
  secondaryBtnText: {
    fontSize: FONT.md,
    fontWeight: "600",
    color: CUSTOMER_THEME.text.primary,
  },
});
