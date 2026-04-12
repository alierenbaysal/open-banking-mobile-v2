/**
 * Settings tab — user info, app settings, and logout.
 */

import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getCurrentCustomer, logout, TestCustomer } from "../../utils/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const [customer, setCustomer] = useState<TestCustomer | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const c = await getCurrentCustomer();
        setCustomer(c);
      })();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/login");
          },
        },
      ]
    );
  };

  if (!customer) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {customer.full_name.charAt(0)}
          </Text>
        </View>
        <Text style={styles.fullName}>{customer.full_name}</Text>
        <Text style={styles.fullNameAr}>{customer.full_name_ar}</Text>
        <View style={styles.profileDetails}>
          <View style={styles.profileRow}>
            <Ionicons name="finger-print-outline" size={16} color="#888" />
            <Text style={styles.profileLabel}>Customer ID</Text>
            <Text style={styles.profileValue}>{customer.customer_id}</Text>
          </View>
          <View style={styles.profileRow}>
            <Ionicons name="id-card-outline" size={16} color="#888" />
            <Text style={styles.profileLabel}>Civil ID</Text>
            <Text style={styles.profileValue}>{customer.civil_id}</Text>
          </View>
          <View style={styles.profileRow}>
            <Ionicons name="wallet-outline" size={16} color="#888" />
            <Text style={styles.profileLabel}>Accounts</Text>
            <Text style={styles.profileValue}>{customer.accounts.length}</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>

        <View style={styles.settingsCard}>
          <SettingsRow
            icon="globe-outline"
            title="Language"
            value="English"
          />
          <SettingsRow
            icon="notifications-outline"
            title="Notifications"
            value="Enabled"
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Biometric Auth"
            value="Off"
          />
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingsCard}>
          <SettingsRow
            icon="information-circle-outline"
            title="Version"
            value="1.0.0"
          />
          <SettingsRow
            icon="server-outline"
            title="Environment"
            value="Sandbox"
          />
          <SettingsRow
            icon="link-outline"
            title="API Endpoint"
            value="qantara.tnd.bankdhofar.com"
            small
          />
        </View>
      </View>

      {/* Open Banking Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Open Banking</Text>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <View style={styles.infoContent}>
            <Text style={styles.infoText}>
              Open Banking allows you to securely share your financial data with
              third-party providers you trust. You can review and revoke access
              at any time.
            </Text>
            <Text style={styles.infoTextAr}>
              {"\u064a\u062a\u064a\u062d \u0644\u0643 \u0627\u0644\u0645\u0635\u0631\u0641\u064a\u0629 \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629 \u0645\u0634\u0627\u0631\u0643\u0629 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0627\u0644\u0645\u0627\u0644\u064a\u0629 \u0628\u0634\u0643\u0644 \u0622\u0645\u0646 \u0645\u0639 \u0645\u0642\u062f\u0645\u064a \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0645\u0648\u062b\u0648\u0642\u064a\u0646. \u064a\u0645\u0643\u0646\u0643 \u0645\u0631\u0627\u062c\u0639\u0629 \u0648\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0648\u0635\u0648\u0644 \u0641\u064a \u0623\u064a \u0648\u0642\u062a."}
            </Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          BD Sandbox v1.0.0
        </Text>
        <Text style={styles.footerText}>
          Qantara Open Banking Platform
        </Text>
        <Text style={styles.footerText}>
          Bank Dhofar S.A.O.G.
        </Text>
      </View>
    </ScrollView>
  );
}

function SettingsRow({
  icon,
  title,
  value,
  small,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  small?: boolean;
}) {
  return (
    <View style={settingsRowStyles.row}>
      <Ionicons name={icon} size={20} color="#666" />
      <Text style={settingsRowStyles.title}>{title}</Text>
      <Text
        style={[settingsRowStyles.value, small && settingsRowStyles.valueSmall]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const settingsRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  title: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  value: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  valueSmall: {
    fontSize: 12,
    maxWidth: 180,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#4D9134",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFF",
  },
  fullName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222",
  },
  fullNameAr: {
    fontSize: 18,
    color: "#888",
    marginTop: 2,
    marginBottom: 16,
  },
  profileDetails: {
    width: "100%",
    gap: 4,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  profileLabel: {
    flex: 1,
    fontSize: 14,
    color: "#666",
  },
  profileValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    fontFamily: "monospace",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  settingsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 20,
    marginBottom: 8,
  },
  infoTextAr: {
    fontSize: 13,
    color: "#666",
    lineHeight: 22,
    textAlign: "right",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
  },
  footer: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 12,
    color: "#BBB",
  },
});
