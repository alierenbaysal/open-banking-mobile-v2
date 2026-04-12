/**
 * Multi-select account list for consent authorization.
 *
 * Displays the customer's accounts with balances and allows
 * selecting which accounts to share with the TPP.
 */

import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { TestAccount } from "../utils/auth";

interface AccountPickerProps {
  accounts: TestAccount[];
  selectedIds: string[];
  onToggle: (accountId: string) => void;
}

export default function AccountPicker({
  accounts,
  selectedIds,
  onToggle,
}: AccountPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select accounts to share:</Text>
      <Text style={styles.labelAr}>
        {"\u0627\u062e\u062a\u0631 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0644\u0644\u0645\u0634\u0627\u0631\u0643\u0629:"}
      </Text>

      {accounts.map((account) => {
        const isSelected = selectedIds.includes(account.account_id);
        return (
          <Pressable
            key={account.account_id}
            style={[styles.accountRow, isSelected && styles.accountRowSelected]}
            onPress={() => onToggle(account.account_id)}
          >
            <View style={styles.checkbox}>
              {isSelected ? (
                <Ionicons name="checkbox" size={24} color="#4D9134" />
              ) : (
                <Ionicons name="square-outline" size={24} color="#999" />
              )}
            </View>
            <View style={styles.accountInfo}>
              <View style={styles.accountHeader}>
                <Text style={styles.accountName}>{account.name}</Text>
                <View
                  style={[
                    styles.typeBadge,
                    account.type === "savings"
                      ? styles.savingsBadge
                      : styles.currentBadge,
                  ]}
                >
                  <Text style={styles.typeBadgeText}>
                    {account.type === "savings" ? "Savings" : "Current"}
                  </Text>
                </View>
              </View>
              <Text style={styles.accountNumber}>
                {maskAccountNumber(account.account_number)}
              </Text>
              <Text style={styles.balance}>
                {account.currency} {account.balance.toLocaleString("en", { minimumFractionDigits: 3 })}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {selectedIds.length === 0 && (
        <Text style={styles.hint}>
          Please select at least one account to continue
        </Text>
      )}
    </View>
  );
}

function maskAccountNumber(num: string): string {
  if (num.length <= 4) return num;
  return "\u2022\u2022\u2022\u2022 " + num.slice(-4);
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  labelAr: {
    fontSize: 14,
    color: "#888",
    textAlign: "right",
    marginBottom: 4,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  accountRowSelected: {
    backgroundColor: "#F0F8ED",
    borderColor: "#4D9134",
  },
  checkbox: {
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadge: {
    backgroundColor: "#E3F2FD",
  },
  savingsBadge: {
    backgroundColor: "#FFF3E0",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
  },
  accountNumber: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    fontFamily: "monospace",
  },
  balance: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4D9134",
    marginTop: 4,
  },
  hint: {
    fontSize: 13,
    color: "#FF9800",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
});
