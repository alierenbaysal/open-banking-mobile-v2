/**
 * Consent detail screen — full view of a single consent.
 *
 * Shows:
 * - TPP info
 * - Consent type and status
 * - Permissions granted
 * - Selected accounts
 * - Date timeline (created, authorized, expires)
 * - Audit history
 * - Revoke button (for active consents)
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import PermissionList from "../../components/PermissionList";
import PaymentSummary from "../../components/PaymentSummary";
import {
  ConsentHistoryEntry,
  ConsentResponse,
  ConsentStatus,
  getConsent,
  getConsentHistory,
  getConsentTypeColor,
  getConsentTypeLabel,
  getStatusColor,
  getStatusLabel,
  isPaymentConsent,
  revokeConsent,
} from "../../utils/api";

// Mock TPP names for sandbox
const TPP_NAMES: Record<string, string> = {
  "TPP-FINTECHOMAN": "FinTech Oman",
  "TPP-BUDGETAPP": "BudgetApp",
  "TPP-PAYOM": "PayOM",
};

// Mock history for sandbox demonstration
function getMockHistory(consentId: string): ConsentHistoryEntry[] {
  return [
    {
      id: 1,
      consent_id: consentId,
      event_type: "CREATED",
      event_time: "2026-04-10T09:25:00Z",
      actor_type: "TPP",
      actor_id: "TPP-FINTECHOMAN",
      previous_status: null,
      new_status: "AwaitingAuthorisation",
      details: { consent_type: "account-access" },
      ip_address: "10.150.24.15",
      user_agent: null,
    },
    {
      id: 2,
      consent_id: consentId,
      event_type: "AUTHORISED",
      event_time: "2026-04-10T09:30:00Z",
      actor_type: "CUSTOMER",
      actor_id: "CUST-001",
      previous_status: "AwaitingAuthorisation",
      new_status: "Authorised",
      details: { selected_accounts: ["ACC-001-01", "ACC-001-02"] },
      ip_address: "10.150.24.22",
      user_agent: "BD Sandbox/1.0.0",
    },
  ];
}

// Mock consent detail data
function getMockConsent(consentId: string): ConsentResponse | null {
  const consents: Record<string, ConsentResponse> = {
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": {
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
      status: "Authorised",
      status_update_time: "2026-04-10T09:30:00Z",
      creation_time: "2026-04-10T09:25:00Z",
      expiration_time: "2026-07-10T09:25:00Z",
      authorization_time: "2026-04-10T09:30:00Z",
      revocation_time: null,
      revocation_reason: null,
      risk_data: null,
    },
    "b2c3d4e5-f6a7-8901-bcde-f12345678901": {
      consent_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      consent_type: "account-access",
      tpp_id: "TPP-BUDGETAPP",
      customer_id: "CUST-001",
      permissions: ["ReadAccountsBasic", "ReadBalances"],
      selected_accounts: ["ACC-001-01"],
      payment_details: null,
      control_parameters: null,
      status: "Authorised",
      status_update_time: "2026-04-08T14:20:00Z",
      creation_time: "2026-04-08T14:15:00Z",
      expiration_time: "2026-10-08T14:15:00Z",
      authorization_time: "2026-04-08T14:20:00Z",
      revocation_time: null,
      revocation_reason: null,
      risk_data: null,
    },
    "c3d4e5f6-a7b8-9012-cdef-123456789012": {
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
      status: "Consumed",
      status_update_time: "2026-04-09T11:00:00Z",
      creation_time: "2026-04-09T10:55:00Z",
      expiration_time: null,
      authorization_time: "2026-04-09T10:58:00Z",
      revocation_time: null,
      revocation_reason: null,
      risk_data: null,
    },
    "d4e5f6a7-b8c9-0123-defa-234567890123": {
      consent_id: "d4e5f6a7-b8c9-0123-defa-234567890123",
      consent_type: "account-access",
      tpp_id: "TPP-FINTECHOMAN",
      customer_id: "CUST-001",
      permissions: ["ReadAccountsBasic", "ReadBalances", "ReadTransactionsBasic"],
      selected_accounts: null,
      payment_details: null,
      control_parameters: null,
      status: "AwaitingAuthorisation",
      status_update_time: "2026-04-12T08:00:00Z",
      creation_time: "2026-04-12T08:00:00Z",
      expiration_time: "2026-07-12T08:00:00Z",
      authorization_time: null,
      revocation_time: null,
      revocation_reason: null,
      risk_data: null,
    },
    "e5f6a7b8-c9d0-1234-efab-345678901234": {
      consent_id: "e5f6a7b8-c9d0-1234-efab-345678901234",
      consent_type: "account-access",
      tpp_id: "TPP-BUDGETAPP",
      customer_id: "CUST-002",
      permissions: ["ReadAccountsBasic", "ReadBalances"],
      selected_accounts: ["ACC-002-01"],
      payment_details: null,
      control_parameters: null,
      status: "Authorised",
      status_update_time: "2026-04-11T16:00:00Z",
      creation_time: "2026-04-11T15:55:00Z",
      expiration_time: "2026-10-11T15:55:00Z",
      authorization_time: "2026-04-11T16:00:00Z",
      revocation_time: null,
      revocation_reason: null,
      risk_data: null,
    },
  };

  return consents[consentId] || null;
}

export default function ConsentDetailScreen() {
  const router = useRouter();
  const { consentId } = useLocalSearchParams<{ consentId: string }>();

  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState<ConsentResponse | null>(null);
  const [history, setHistory] = useState<ConsentHistoryEntry[]>([]);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState(false);

  const loadData = useCallback(async () => {
    if (!consentId) {
      setError("No consent ID provided");
      setLoading(false);
      return;
    }

    try {
      // Try API first, fall back to mock data
      let consentData: ConsentResponse | null = null;
      let historyData: ConsentHistoryEntry[] = [];

      try {
        consentData = await getConsent(consentId);
        historyData = await getConsentHistory(consentId);
      } catch {
        // Fall back to mock data for sandbox
        consentData = getMockConsent(consentId);
        historyData = getMockHistory(consentId);
      }

      if (!consentData) {
        setError("Consent not found");
      } else {
        setConsent(consentData);
        setHistory(historyData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load consent"
      );
    } finally {
      setLoading(false);
    }
  }, [consentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRevoke = () => {
    if (!consent) return;

    Alert.alert(
      "Revoke Consent",
      `This will permanently revoke ${TPP_NAMES[consent.tpp_id] || consent.tpp_id}'s access to your data.\n\nThis action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke Access",
          style: "destructive",
          onPress: async () => {
            setRevoking(true);
            try {
              await revokeConsent(consentId!, "Revoked by customer");
              setConsent((prev) =>
                prev ? { ...prev, status: "Revoked" as ConsentStatus } : prev
              );
            } catch {
              // In sandbox, update locally
              setConsent((prev) =>
                prev ? { ...prev, status: "Revoked" as ConsentStatus } : prev
              );
            } finally {
              setRevoking(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4D9134" />
      </View>
    );
  }

  if (error || !consent) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error || "Consent not found"}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const statusColor = getStatusColor(consent.status);
  const statusLabel = getStatusLabel(consent.status);
  const typeColor = getConsentTypeColor(consent.consent_type);
  const isActive = consent.status === "Authorised";
  const isPayment = isPaymentConsent(consent.consent_type);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Status Banner */}
      <View style={[styles.statusBanner, { backgroundColor: statusColor + "15" }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>

      {/* TPP Info */}
      <View style={styles.card}>
        <View style={styles.tppRow}>
          <View style={styles.tppIcon}>
            <Ionicons name="business" size={24} color="#4D9134" />
          </View>
          <View style={styles.tppInfo}>
            <Text style={styles.tppName}>
              {TPP_NAMES[consent.tpp_id] || consent.tpp_id}
            </Text>
            <Text style={styles.tppId}>{consent.tpp_id}</Text>
          </View>
        </View>

        <View style={[styles.typeBadge, { backgroundColor: typeColor + "15" }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>
            {getConsentTypeLabel(consent.consent_type)}
          </Text>
        </View>
      </View>

      {/* Payment Details */}
      {isPayment && consent.payment_details && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <PaymentSummary
            payment={consent.payment_details}
            tppName={TPP_NAMES[consent.tpp_id]}
          />
        </View>
      )}

      {/* Permissions */}
      {consent.permissions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions Granted</Text>
          <Text style={styles.sectionTitleAr}>
            {"\u0627\u0644\u0623\u0630\u0648\u0646\u0627\u062a \u0627\u0644\u0645\u0645\u0646\u0648\u062d\u0629"}
          </Text>
          <View style={styles.card}>
            <PermissionList permissions={consent.permissions} />
          </View>
        </View>
      )}

      {/* Selected Accounts */}
      {consent.selected_accounts && consent.selected_accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared Accounts</Text>
          <View style={styles.card}>
            {consent.selected_accounts.map((accId) => (
              <View key={accId} style={styles.accountRow}>
                <Ionicons name="wallet-outline" size={18} color="#4D9134" />
                <Text style={styles.accountId}>{accId}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.card}>
          <TimelineRow
            icon="add-circle-outline"
            color="#2196F3"
            label="Created"
            date={consent.creation_time}
          />
          {consent.authorization_time && (
            <TimelineRow
              icon="checkmark-circle-outline"
              color="#4CAF50"
              label="Authorized"
              date={consent.authorization_time}
            />
          )}
          {consent.expiration_time && (
            <TimelineRow
              icon="hourglass-outline"
              color="#FF9800"
              label={consent.status === "Expired" ? "Expired" : "Expires"}
              date={consent.expiration_time}
            />
          )}
          {consent.revocation_time && (
            <TimelineRow
              icon="close-circle-outline"
              color="#F44336"
              label="Revoked"
              date={consent.revocation_time}
              detail={consent.revocation_reason || undefined}
            />
          )}
        </View>
      </View>

      {/* Audit History */}
      {history.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audit History</Text>
          <View style={styles.card}>
            {history.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View
                  style={[
                    styles.historyDot,
                    { backgroundColor: getEventColor(entry.event_type) },
                  ]}
                />
                <View style={styles.historyContent}>
                  <Text style={styles.historyEvent}>{entry.event_type}</Text>
                  <Text style={styles.historyDetail}>
                    {entry.actor_type}
                    {entry.actor_id ? ` (${entry.actor_id})` : ""}
                  </Text>
                  <Text style={styles.historyTime}>
                    {formatDateTime(entry.event_time)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Consent ID */}
      <View style={styles.metaSection}>
        <Text style={styles.metaLabel}>Consent ID</Text>
        <Text style={styles.metaValue}>{consent.consent_id}</Text>
      </View>

      {/* Revoke Button */}
      {isActive && (
        <Pressable
          style={[styles.revokeButton, revoking && styles.revokeButtonDisabled]}
          onPress={handleRevoke}
          disabled={revoking}
        >
          <Ionicons name="shield-outline" size={20} color="#F44336" />
          <Text style={styles.revokeButtonText}>
            {revoking ? "Revoking..." : "Revoke This Consent"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function TimelineRow({
  icon,
  color,
  label,
  date,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  date: string;
  detail?: string;
}) {
  return (
    <View style={styles.timelineRow}>
      <Ionicons name={icon} size={20} color={color} />
      <View style={styles.timelineContent}>
        <Text style={styles.timelineLabel}>{label}</Text>
        <Text style={styles.timelineDate}>{formatDateTime(date)}</Text>
        {detail && <Text style={styles.timelineDetail}>{detail}</Text>}
      </View>
    </View>
  );
}

function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "CREATED":
      return "#2196F3";
    case "AUTHORISED":
      return "#4CAF50";
    case "REJECTED":
      return "#F44336";
    case "REVOKED":
      return "#F44336";
    case "CONSUMED":
      return "#607D8B";
    case "EXPIRED":
      return "#9E9E9E";
    default:
      return "#757575";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
    backgroundColor: "#F5F5F5",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },
  errorText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  backButton: {
    backgroundColor: "#4D9134",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  backButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 4,
  },
  tppRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  tppIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F8ED",
    alignItems: "center",
    justifyContent: "center",
  },
  tppInfo: {
    flex: 1,
  },
  tppName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
  },
  tppId: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
    marginTop: 2,
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginTop: 16,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  sectionTitleAr: {
    fontSize: 14,
    color: "#888",
    textAlign: "right",
    marginBottom: 8,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  accountId: {
    fontSize: 14,
    fontFamily: "monospace",
    color: "#555",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  timelineDate: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  timelineDetail: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    marginTop: 2,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  historyContent: {
    flex: 1,
  },
  historyEvent: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  historyDetail: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  historyTime: {
    fontSize: 12,
    color: "#BBB",
    marginTop: 2,
  },
  metaSection: {
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  metaLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#888",
  },
  revokeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFCDD2",
    backgroundColor: "#FFF",
  },
  revokeButtonDisabled: {
    opacity: 0.6,
  },
  revokeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F44336",
  },
});
