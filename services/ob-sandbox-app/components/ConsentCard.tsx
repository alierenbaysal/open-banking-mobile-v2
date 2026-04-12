/**
 * Card component showing a consent summary.
 *
 * Used in the consent list (tabs/consents.tsx) and home dashboard.
 * Shows TPP name, consent type badge, permissions summary, and status.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  ConsentResponse,
  ConsentType,
  getConsentTypeColor,
  getConsentTypeLabel,
  getStatusColor,
  getStatusLabel,
  isPaymentConsent,
} from "../utils/api";
import { getPermissionLabel } from "../utils/permissions";

interface ConsentCardProps {
  consent: ConsentResponse;
  tppName?: string;
  onPress?: () => void;
  onRevoke?: () => void;
}

const TYPE_ICONS: Record<ConsentType, keyof typeof Ionicons.glyphMap> = {
  "account-access": "eye-outline",
  "domestic-payment": "send-outline",
  "scheduled-payment": "calendar-outline",
  "standing-order": "repeat-outline",
  "domestic-vrp": "swap-vertical-outline",
  "funds-confirmation": "checkmark-done-outline",
};

export default function ConsentCard({
  consent,
  tppName,
  onPress,
  onRevoke,
}: ConsentCardProps) {
  const typeColor = getConsentTypeColor(consent.consent_type);
  const statusColor = getStatusColor(consent.status);
  const statusLabel = getStatusLabel(consent.status);
  const isActive = consent.status === "Authorised";
  const isPending = consent.status === "AwaitingAuthorisation";

  const permissionSummary = consent.permissions.length > 0
    ? consent.permissions
        .slice(0, 3)
        .map((p) => getPermissionLabel(p))
        .join(", ")
    : isPaymentConsent(consent.consent_type)
      ? formatPaymentSummary(consent)
      : "No permissions";

  const moreCount = Math.max(0, consent.permissions.length - 3);

  return (
    <Pressable
      style={[styles.card, isPending && styles.cardPending]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={TYPE_ICONS[consent.consent_type] || "document-outline"}
            size={20}
            color={typeColor}
          />
          <Text style={styles.tppName} numberOfLines={1}>
            {tppName || consent.tpp_id}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.typeBadge, { backgroundColor: typeColor + "15" }]}>
        <Text style={[styles.typeText, { color: typeColor }]}>
          {getConsentTypeLabel(consent.consent_type)}
        </Text>
      </View>

      <Text style={styles.permissions} numberOfLines={2}>
        {permissionSummary}
        {moreCount > 0 ? ` +${moreCount} more` : ""}
      </Text>

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Ionicons name="time-outline" size={14} color="#999" />
          <Text style={styles.dateText}>
            {formatDate(consent.creation_time)}
          </Text>
        </View>

        {consent.expiration_time && (
          <View style={styles.dateContainer}>
            <Ionicons name="hourglass-outline" size={14} color="#999" />
            <Text style={styles.dateText}>
              Expires {formatDate(consent.expiration_time)}
            </Text>
          </View>
        )}
      </View>

      {isActive && onRevoke && (
        <Pressable style={styles.revokeButton} onPress={onRevoke}>
          <Ionicons name="close-circle-outline" size={16} color="#F44336" />
          <Text style={styles.revokeText}>Revoke</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatPaymentSummary(consent: ConsentResponse): string {
  if (!consent.payment_details) return "Payment consent";
  const pd = consent.payment_details;
  if (pd.instructed_amount) {
    return `${pd.instructed_amount.currency} ${pd.instructed_amount.amount} to ${pd.creditor_account?.name || "payee"}`;
  }
  return "Payment consent";
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  cardPending: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  tppName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  permissions: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#999",
  },
  revokeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  revokeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F44336",
  },
});
