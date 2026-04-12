/**
 * Home tab — active consents dashboard.
 *
 * Shows:
 * - Welcome message with customer name
 * - Summary cards: active consents, pending approvals
 * - Recent consent activity
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getCurrentCustomer, TestCustomer } from "../../utils/auth";

export default function HomeScreen() {
  const router = useRouter();
  const [customer, setCustomer] = useState<TestCustomer | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Mock data for the dashboard (in production, fetched from consent service)
  const [stats, setStats] = useState({
    activeConsents: 0,
    pendingApprovals: 0,
    revokedThisMonth: 0,
  });

  const loadData = useCallback(async () => {
    const c = await getCurrentCustomer();
    setCustomer(c);

    // Simulated dashboard stats for sandbox
    // In production, these would come from GET /consents?customer_id=X&status=Authorised
    if (c) {
      setStats({
        activeConsents: c.customer_id === "CUST-001" ? 3 : 1,
        pendingApprovals: c.customer_id === "CUST-001" ? 1 : 0,
        revokedThisMonth: 0,
      });
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4D9134" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Please log in to continue</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4D9134" />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {customer.full_name.charAt(0)}
            </Text>
          </View>
          <View style={styles.welcomeText}>
            <Text style={styles.greeting}>
              {getGreeting()}, {customer.full_name.split(" ")[0]}
            </Text>
            <Text style={styles.greetingAr}>{customer.full_name_ar}</Text>
            <Text style={styles.customerId}>{customer.customer_id}</Text>
          </View>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Pressable
          style={[styles.statCard, styles.statCardActive]}
          onPress={() => router.push("/consents")}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="shield-checkmark" size={24} color="#4D9134" />
          </View>
          <Text style={styles.statNumber}>{stats.activeConsents}</Text>
          <Text style={styles.statLabel}>Active Consents</Text>
        </Pressable>

        <Pressable
          style={[styles.statCard, styles.statCardPending]}
          onPress={() => router.push("/consents")}
        >
          <View style={[styles.statIconContainer, { backgroundColor: "#FFF3E0" }]}>
            <Ionicons name="time" size={24} color="#FF9800" />
          </View>
          <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Pressable>

        <View style={[styles.statCard, styles.statCardRevoked]}>
          <View style={[styles.statIconContainer, { backgroundColor: "#FFEBEE" }]}>
            <Ionicons name="close-circle" size={24} color="#F44336" />
          </View>
          <Text style={styles.statNumber}>{stats.revokedThisMonth}</Text>
          <Text style={styles.statLabel}>Revoked</Text>
        </View>
      </View>

      {/* Accounts Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Accounts</Text>
        <Text style={styles.sectionTitleAr}>
          {"\u062d\u0633\u0627\u0628\u0627\u062a\u0643"}
        </Text>
        {customer.accounts.map((account) => (
          <View key={account.account_id} style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={styles.accountNameRow}>
                <Ionicons
                  name={account.type === "savings" ? "wallet" : "card"}
                  size={20}
                  color="#4D9134"
                />
                <Text style={styles.accountName}>{account.name}</Text>
              </View>
              <View
                style={[
                  styles.accountTypeBadge,
                  account.type === "savings"
                    ? styles.savingsTypeBadge
                    : styles.currentTypeBadge,
                ]}
              >
                <Text style={styles.accountTypeText}>
                  {account.type === "savings" ? "Savings" : "Current"}
                </Text>
              </View>
            </View>
            <Text style={styles.accountNumber}>
              {account.sort_code} | {"\u2022\u2022\u2022\u2022"} {account.account_number.slice(-4)}
            </Text>
            <Text style={styles.accountBalance}>
              {account.currency}{" "}
              {account.balance.toLocaleString("en", {
                minimumFractionDigits: 3,
              })}
            </Text>
          </View>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Text style={styles.sectionTitleAr}>
          {"\u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u0623\u062e\u064a\u0631"}
        </Text>
        <View style={styles.activityCard}>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: "#4CAF50" }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                Consent authorized for FinTech Oman
              </Text>
              <Text style={styles.activityTime}>Today, 10:30 AM</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: "#FF9800" }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                New consent request from PayOM
              </Text>
              <Text style={styles.activityTime}>Yesterday, 3:15 PM</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={[styles.activityDot, { backgroundColor: "#2196F3" }]} />
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>
                Account balances accessed by BudgetApp
              </Text>
              <Text style={styles.activityTime}>2 days ago</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sandbox Notice */}
      <View style={styles.sandboxNotice}>
        <Ionicons name="flask-outline" size={16} color="#FF9800" />
        <Text style={styles.sandboxText}>
          Sandbox environment — all data is simulated for testing
        </Text>
      </View>
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
  },
  welcomeCard: {
    backgroundColor: "#4D9134",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
  },
  welcomeText: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
  },
  greetingAr: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  customerId: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
    fontFamily: "monospace",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statCardActive: {},
  statCardPending: {},
  statCardRevoked: {},
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F8ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  sectionTitleAr: {
    fontSize: 15,
    color: "#888",
    textAlign: "right",
    marginBottom: 12,
  },
  accountCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  accountNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  accountTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currentTypeBadge: {
    backgroundColor: "#E3F2FD",
  },
  savingsTypeBadge: {
    backgroundColor: "#FFF3E0",
  },
  accountTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
  },
  accountNumber: {
    fontSize: 13,
    color: "#999",
    fontFamily: "monospace",
  },
  accountBalance: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4D9134",
    marginTop: 6,
  },
  activityCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  sandboxNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  sandboxText: {
    fontSize: 12,
    color: "#F57F17",
  },
});
