/**
 * MerchantHeader — order / merchant summary card shown at the top of the
 * customer checkout screen.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CUSTOMER_THEME, RADIUS } from "../theme";
import { formatOMR } from "../utils/format";

interface Props {
  merchantName: string;
  orderReference: string;
  amount: number;
  description: string;
}

export default function MerchantHeader({
  merchantName,
  orderReference,
  amount,
  description,
}: Props) {
  const initial = merchantName.charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.logo}>
          <Text style={styles.logoInitial}>{initial}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.label}>Paying to</Text>
          <Text style={styles.merchant}>{merchantName}</Text>
          <Text style={styles.ref}>{orderReference}</Text>
        </View>
        <View style={styles.secureBadge}>
          <Ionicons name="lock-closed" size={12} color={CUSTOMER_THEME.brand.primary} />
          <Text style={styles.secureText}>Secure</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Amount</Text>
        <Text style={styles.amount}>{formatOMR(amount)}</Text>
      </View>

      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: CUSTOMER_THEME.bg.card,
    borderRadius: RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: CUSTOMER_THEME.border.default,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: CUSTOMER_THEME.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitial: {
    fontSize: 22,
    fontWeight: "800",
    color: CUSTOMER_THEME.brand.primary,
  },
  meta: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: CUSTOMER_THEME.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  merchant: {
    fontSize: 17,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.primary,
  },
  ref: {
    fontSize: 12,
    color: CUSTOMER_THEME.text.muted,
    fontFamily: "monospace",
    marginTop: 2,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: CUSTOMER_THEME.brand.primarySoft,
  },
  secureText: {
    fontSize: 10,
    fontWeight: "700",
    color: CUSTOMER_THEME.brand.primary,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: CUSTOMER_THEME.border.default,
    marginVertical: 16,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  amountLabel: {
    fontSize: 13,
    color: CUSTOMER_THEME.text.secondary,
  },
  amount: {
    fontSize: 28,
    fontWeight: "800",
    color: CUSTOMER_THEME.text.primary,
    fontVariant: ["tabular-nums"],
  },
  description: {
    fontSize: 13,
    color: CUSTOMER_THEME.text.muted,
    marginTop: 10,
  },
});
