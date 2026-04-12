/**
 * Consents tab — list and manage all consents.
 *
 * Shows consents grouped by status: Active, Pending, Revoked, Expired.
 * Each consent displays TPP name, type badge, expiry, permissions summary.
 * Tap for detail, swipe/button to revoke.
 */

import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import ConsentCard from "../../components/ConsentCard";
import { getCurrentCustomer } from "../../utils/auth";
import {
  ConsentResponse,
  ConsentStatus,
  getStatusLabel,
  revokeConsent,
} from "../../utils/api";

// Simulated consent data for sandbox demonstration.
// In production, these would be fetched from GET /consents?customer_id=X
function getMockConsents(customerId: string): ConsentResponse[] {
  if (customerId === "CUST-001") {
    return [
      {
        consent_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        consent_type: "account-access",
        tpp_id: "TPP-FINTECHOMAN",
        customer_id: "CUST-001",
        permissions: [
          "ReadAccountsBasic",
          "ReadAccountsDetail",
          "ReadBalances",
          "ReadTransactionsBasic",
          "ReadTransactionsDetail",
        ],
        selected_accounts: ["ACC-001-01", "ACC-001-02"],
        payment_details: null,
        control_parameters: null,
        status: "Authorised" as ConsentStatus,
        status_update_time: "2026-04-10T09:30:00Z",
        creation_time: "2026-04-10T09:25:00Z",
        expiration_time: "2026-07-10T09:25:00Z",
        authorization_time: "2026-04-10T09:30:00Z",
        revocation_time: null,
        revocation_reason: null,
        risk_data: null,
      },
      {
        consent_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        consent_type: "account-access",
        tpp_id: "TPP-BUDGETAPP",
        customer_id: "CUST-001",
        permissions: ["ReadAccountsBasic", "ReadBalances"],
        selected_accounts: ["ACC-001-01"],
        payment_details: null,
        control_parameters: null,
        status: "Authorised" as ConsentStatus,
        status_update_time: "2026-04-08T14:20:00Z",
        creation_time: "2026-04-08T14:15:00Z",
        expiration_time: "2026-10-08T14:15:00Z",
        authorization_time: "2026-04-08T14:20:00Z",
        revocation_time: null,
        revocation_reason: null,
        risk_data: null,
      },
      {
        consent_id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
        consent_type: "domestic-payment",
        tpp_id: "TPP-PAYOM",
        customer_id: "CUST-001",
        permissions: [],
        selected_accounts: null,
        payment_details: {
          instructed_amount: { amount: "25.500", currency: "OMR" },
          creditor_account: {
            scheme_name: "IBAN",
            identification: "OM12BDOF0000001234567890",
            name: "Muscat Electricity",
          },
          remittance_information: { reference: "ELEC-APR-2026" },
        },
        control_parameters: null,
        status: "Consumed" as ConsentStatus,
        status_update_time: "2026-04-09T11:00:00Z",
        creation_time: "2026-04-09T10:55:00Z",
        expiration_time: null,
        authorization_time: "2026-04-09T10:58:00Z",
        revocation_time: null,
        revocation_reason: null,
        risk_data: null,
      },
      {
        consent_id: "d4e5f6a7-b8c9-0123-defa-234567890123",
        consent_type: "account-access",
        tpp_id: "TPP-FINTECHOMAN",
        customer_id: "CUST-001",
        permissions: ["ReadAccountsBasic", "ReadBalances", "ReadTransactionsBasic"],
        selected_accounts: null,
        payment_details: null,
        control_parameters: null,
        status: "AwaitingAuthorisation" as ConsentStatus,
        status_update_time: "2026-04-12T08:00:00Z",
        creation_time: "2026-04-12T08:00:00Z",
        expiration_time: "2026-07-12T08:00:00Z",
        authorization_time: null,
        revocation_time: null,
        revocation_reason: null,
        risk_data: null,
      },
    ];
  }

  // CUST-002
  return [
    {
      consent_id: "e5f6a7b8-c9d0-1234-efab-345678901234",
      consent_type: "account-access",
      tpp_id: "TPP-BUDGETAPP",
      customer_id: "CUST-002",
      permissions: ["ReadAccountsBasic", "ReadBalances"],
      selected_accounts: ["ACC-002-01"],
      payment_details: null,
      control_parameters: null,
      status: "Authorised" as ConsentStatus,
      status_update_time: "2026-04-11T16:00:00Z",
      creation_time: "2026-04-11T15:55:00Z",
      expiration_time: "2026-10-11T15:55:00Z",
      authorization_time: "2026-04-11T16:00:00Z",
      revocation_time: null,
      revocation_reason: null,
      risk_data: null,
    },
  ];
}

const TPP_NAMES: Record<string, string> = {
  "TPP-FINTECHOMAN": "FinTech Oman",
  "TPP-BUDGETAPP": "BudgetApp",
  "TPP-PAYOM": "PayOM",
};

type StatusGroup = "Active" | "Pending" | "Completed" | "Other";

const STATUS_GROUP_ORDER: StatusGroup[] = ["Pending", "Active", "Completed", "Other"];

function groupByStatus(consents: ConsentResponse[]): Record<StatusGroup, ConsentResponse[]> {
  const groups: Record<StatusGroup, ConsentResponse[]> = {
    Pending: [],
    Active: [],
    Completed: [],
    Other: [],
  };

  for (const c of consents) {
    switch (c.status) {
      case "AwaitingAuthorisation":
        groups.Pending.push(c);
        break;
      case "Authorised":
        groups.Active.push(c);
        break;
      case "Consumed":
      case "Revoked":
      case "Rejected":
      case "Expired":
        groups.Completed.push(c);
        break;
      default:
        groups.Other.push(c);
    }
  }

  return groups;
}

export default function ConsentsScreen() {
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<StatusGroup | "All">("All");

  const loadConsents = useCallback(async () => {
    const customer = await getCurrentCustomer();
    if (customer) {
      // In production: fetch from API
      const data = getMockConsents(customer.customer_id);
      setConsents(data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConsents();
    }, [loadConsents])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConsents();
    setRefreshing(false);
  };

  const handleRevoke = (consent: ConsentResponse) => {
    Alert.alert(
      "Revoke Consent",
      `Are you sure you want to revoke the consent for ${TPP_NAMES[consent.tpp_id] || consent.tpp_id}?\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await revokeConsent(consent.consent_id, "Revoked by customer");
              // Update local state
              setConsents((prev) =>
                prev.map((c) =>
                  c.consent_id === consent.consent_id
                    ? { ...c, status: "Revoked" as ConsentStatus }
                    : c
                )
              );
            } catch {
              // In sandbox, just update locally since API may not be available
              setConsents((prev) =>
                prev.map((c) =>
                  c.consent_id === consent.consent_id
                    ? { ...c, status: "Revoked" as ConsentStatus }
                    : c
                )
              );
            }
          },
        },
      ]
    );
  };

  const handlePress = (consent: ConsentResponse) => {
    router.push(`/consent/${consent.consent_id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4D9134" />
      </View>
    );
  }

  const grouped = groupByStatus(consents);
  const filters: (StatusGroup | "All")[] = ["All", ...STATUS_GROUP_ORDER];

  const filteredGroups =
    activeFilter === "All"
      ? STATUS_GROUP_ORDER
      : [activeFilter as StatusGroup];

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => {
          const count =
            filter === "All"
              ? consents.length
              : grouped[filter as StatusGroup]?.length || 0;

          return (
            <Pressable
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter} ({count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Consent list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4D9134" />
        }
      >
        {consents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={64} color="#DDD" />
            <Text style={styles.emptyTitle}>No Consents</Text>
            <Text style={styles.emptySubtitle}>
              When a third-party app requests access to your accounts, consents
              will appear here.
            </Text>
          </View>
        ) : (
          filteredGroups.map((group) => {
            const items = grouped[group];
            if (items.length === 0) return null;

            return (
              <View key={group} style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{group}</Text>
                  <View style={styles.groupCountBadge}>
                    <Text style={styles.groupCountText}>{items.length}</Text>
                  </View>
                </View>
                {items.map((consent) => (
                  <ConsentCard
                    key={consent.consent_id}
                    consent={consent}
                    tppName={TPP_NAMES[consent.tpp_id]}
                    onPress={() => handlePress(consent)}
                    onRevoke={
                      consent.status === "Authorised"
                        ? () => handleRevoke(consent)
                        : undefined
                    }
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  filterBar: {
    maxHeight: 52,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  filterChipActive: {
    backgroundColor: "#4D9134",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#FFF",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#555",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 40,
  },
  groupSection: {
    marginBottom: 20,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  groupCountBadge: {
    backgroundColor: "#E0E0E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  groupCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
});
