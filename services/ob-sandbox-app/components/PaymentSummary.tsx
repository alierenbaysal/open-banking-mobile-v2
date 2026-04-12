/**
 * Payment details display component.
 *
 * Shows the payment amount, creditor, and reference in a styled card
 * for payment consent authorization and approval screens.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PaymentDetails } from "../utils/api";

interface PaymentSummaryProps {
  payment: PaymentDetails;
  tppName?: string;
}

export default function PaymentSummary({ payment, tppName }: PaymentSummaryProps) {
  const amount = payment.instructed_amount?.amount || "0.000";
  const currency = payment.instructed_amount?.currency || "OMR";
  const creditorName = payment.creditor_account?.name || "Unknown";
  const creditorAccount = payment.creditor_account?.identification || "";
  const reference = payment.remittance_information?.reference || "";
  const unstructured = payment.remittance_information?.unstructured || "";

  return (
    <View style={styles.container}>
      {/* Amount hero */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Payment Amount</Text>
        <Text style={styles.amountLabelAr}>
          {"\u0645\u0628\u0644\u063a \u0627\u0644\u062f\u0641\u0639"}
        </Text>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>{currency}</Text>
          <Text style={styles.amount}>{formatAmount(amount)}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Flow: From TPP -> To Creditor */}
      {tppName && (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="business-outline" size={18} color="#666" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Initiated by</Text>
            <Text style={styles.detailValue}>{tppName}</Text>
          </View>
        </View>
      )}

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Ionicons name="person-outline" size={18} color="#666" />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Pay to</Text>
          <Text style={styles.detailValue}>{creditorName}</Text>
          {creditorAccount ? (
            <Text style={styles.detailSubValue}>
              {maskAccount(creditorAccount)}
            </Text>
          ) : null}
        </View>
      </View>

      {reference ? (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="document-text-outline" size={18} color="#666" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Reference</Text>
            <Text style={styles.detailValue}>{reference}</Text>
          </View>
        </View>
      ) : null}

      {unstructured ? (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="chatbox-outline" size={18} color="#666" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>{unstructured}</Text>
          </View>
        </View>
      ) : null}

      {payment.end_to_end_identification ? (
        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons name="key-outline" size={18} color="#666" />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>End-to-End ID</Text>
            <Text style={[styles.detailValue, styles.mono]}>
              {payment.end_to_end_identification}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  return num.toLocaleString("en", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function maskAccount(account: string): string {
  if (account.length <= 4) return account;
  return "\u2022\u2022\u2022\u2022 " + account.slice(-4);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  amountSection: {
    alignItems: "center",
    paddingBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  amountLabelAr: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  currency: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
  },
  amount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#222",
  },
  divider: {
    height: 1,
    backgroundColor: "#E8E8E8",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 8,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  detailSubValue: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    fontFamily: "monospace",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 13,
  },
});
