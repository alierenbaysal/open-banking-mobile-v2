/**
 * Displays OBIE permissions in a human-readable grouped list.
 *
 * Shows both English and Arabic text for each permission,
 * grouped by category (Accounts, Balances, Transactions, etc.).
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getPermissionLabel, groupPermissions } from "../utils/permissions";

interface PermissionListProps {
  permissions: string[];
  compact?: boolean;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Accounts: "wallet-outline",
  Balances: "cash-outline",
  Transactions: "swap-horizontal-outline",
  Beneficiaries: "people-outline",
  "Standing Orders": "repeat-outline",
  "Direct Debits": "arrow-down-circle-outline",
  Products: "cube-outline",
  Offers: "gift-outline",
  "Personal Info": "person-outline",
  "Scheduled Payments": "calendar-outline",
  Statements: "document-text-outline",
  "Funds Confirmation": "checkmark-circle-outline",
  "Card Details": "card-outline",
  Other: "ellipsis-horizontal-outline",
};

export default function PermissionList({ permissions, compact }: PermissionListProps) {
  const groups = groupPermissions(permissions);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {permissions.map((perm) => (
          <View key={perm} style={styles.compactRow}>
            <Ionicons name="checkmark" size={14} color="#4D9134" />
            <Text style={styles.compactText} numberOfLines={1}>
              {getPermissionLabel(perm)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Object.entries(groups).map(([category, perms]) => (
        <View key={category} style={styles.group}>
          <View style={styles.categoryHeader}>
            <Ionicons
              name={CATEGORY_ICONS[category] || "ellipsis-horizontal-outline"}
              size={18}
              color="#4D9134"
            />
            <Text style={styles.categoryTitle}>{category}</Text>
          </View>
          {perms.map((perm) => (
            <View key={perm} style={styles.permissionRow}>
              <Ionicons name="checkmark-circle" size={16} color="#4D9134" />
              <View style={styles.permissionText}>
                <Text style={styles.permissionEn}>
                  {getPermissionLabel(perm, "en")}
                </Text>
                <Text style={styles.permissionAr}>
                  {getPermissionLabel(perm, "ar")}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  group: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  permissionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  permissionText: {
    flex: 1,
  },
  permissionEn: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  permissionAr: {
    fontSize: 13,
    color: "#888",
    lineHeight: 20,
    textAlign: "right",
  },
  compactContainer: {
    gap: 4,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactText: {
    fontSize: 13,
    color: "#555",
    flex: 1,
  },
});
