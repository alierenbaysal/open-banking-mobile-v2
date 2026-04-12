/**
 * Consent authorization screen — entry point from TPP OAuth2 redirect.
 *
 * Deep link: bdsandbox://consent/authorize?consent_id=xxx&redirect_uri=xxx&state=xxx
 *
 * Flow:
 * 1. Parse consent_id, redirect_uri, state from URL params
 * 2. Ensure user is authenticated (redirect to login if not)
 * 3. Fetch consent details from consent service
 * 4. Display consent approval screen with TPP info, permissions, account picker
 * 5. On approve: POST /consents/{id}/authorize, redirect back to TPP
 * 6. On reject: POST /consents/{id}/reject, redirect back to TPP
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
import * as Linking from "expo-linking";

import AccountPicker from "../../components/AccountPicker";
import PaymentSummary from "../../components/PaymentSummary";
import PermissionList from "../../components/PermissionList";
import { getCurrentCustomer, TestCustomer } from "../../utils/auth";
import {
  authorizeConsent,
  ConsentResponse,
  getConsent,
  getConsentTypeLabel,
  getConsentTypeColor,
  getTPP,
  isPaymentConsent,
  rejectConsent,
  TPPInfo,
} from "../../utils/api";

export default function AuthorizeConsentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    consent_id: string;
    redirect_uri?: string;
    state?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState<ConsentResponse | null>(null);
  const [tpp, setTpp] = useState<TPPInfo | null>(null);
  const [customer, setCustomer] = useState<TestCustomer | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const consentId = params.consent_id;
  const redirectUri = params.redirect_uri;
  const state = params.state;

  const loadData = useCallback(async () => {
    try {
      const cust = await getCurrentCustomer();
      if (!cust) {
        // Redirect to login, preserving the consent params
        router.replace("/login");
        return;
      }
      setCustomer(cust);

      if (!consentId) {
        setError("Missing consent_id parameter");
        setLoading(false);
        return;
      }

      // Fetch consent details
      const consentData = await getConsent(consentId);
      setConsent(consentData);

      // Pre-select all accounts for convenience
      setSelectedAccounts(cust.accounts.map((a) => a.account_id));

      // Try to fetch TPP info
      try {
        const tppData = await getTPP(consentData.tpp_id);
        setTpp(tppData);
      } catch {
        // TPP info is optional; proceed without it
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load consent details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [consentId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async () => {
    if (!consent || !customer) return;

    // For AIS consents, require account selection
    if (
      consent.consent_type === "account-access" &&
      selectedAccounts.length === 0
    ) {
      Alert.alert(
        "Select Accounts",
        "Please select at least one account to share."
      );
      return;
    }

    setSubmitting(true);
    try {
      const accounts =
        consent.consent_type === "account-access" ? selectedAccounts : undefined;

      await authorizeConsent(consentId!, customer.customer_id, accounts);

      // If this is a payment consent, redirect to payment confirmation
      if (isPaymentConsent(consent.consent_type)) {
        router.replace(`/payment/${consentId}`);
        return;
      }

      // Redirect back to TPP with authorization code
      if (redirectUri) {
        const code = generateAuthCode();
        const separator = redirectUri.includes("?") ? "&" : "?";
        let callbackUrl = `${redirectUri}${separator}code=${code}`;
        if (state) {
          callbackUrl += `&state=${encodeURIComponent(state)}`;
        }
        await Linking.openURL(callbackUrl);
      }

      // Show success and navigate home
      Alert.alert(
        "Consent Authorized",
        `You have authorized ${tpp?.tpp_name || consent.tpp_id} to access your data.`,
        [{ text: "OK", onPress: () => router.replace("/") }]
      );
    } catch (err) {
      Alert.alert(
        "Authorization Failed",
        err instanceof Error ? err.message : "An error occurred. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!consent) return;

    Alert.alert(
      "Reject Consent",
      `Are you sure you want to reject this request from ${tpp?.tpp_name || consent.tpp_id}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await rejectConsent(
                consentId!,
                customer?.customer_id,
                "Customer rejected the consent"
              );

              // Redirect back to TPP with error
              if (redirectUri) {
                const separator = redirectUri.includes("?") ? "&" : "?";
                let callbackUrl = `${redirectUri}${separator}error=access_denied&error_description=The+customer+rejected+the+consent`;
                if (state) {
                  callbackUrl += `&state=${encodeURIComponent(state)}`;
                }
                await Linking.openURL(callbackUrl);
              }

              router.replace("/");
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Failed to reject consent."
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4D9134" />
        <Text style={styles.loadingText}>Loading consent details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorTitle}>Unable to Load Consent</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!consent || !customer) return null;

  const typeColor = getConsentTypeColor(consent.consent_type);
  const isPayment = isPaymentConsent(consent.consent_type);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TPP Header */}
        <View style={styles.tppHeader}>
          <View style={styles.tppIcon}>
            <Ionicons name="business" size={28} color="#4D9134" />
          </View>
          <Text style={styles.tppName}>
            {tpp?.tpp_name || consent.tpp_id}
          </Text>
          {tpp?.tpp_name_ar && (
            <Text style={styles.tppNameAr}>{tpp.tpp_name_ar}</Text>
          )}
          <Text style={styles.tppRequest}>
            is requesting access to your account{!isPayment ? " data" : ""}
          </Text>
          <Text style={styles.tppRequestAr}>
            {isPayment
              ? "\u064a\u0637\u0644\u0628 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u062d\u0633\u0627\u0628\u0643"
              : "\u064a\u0637\u0644\u0628 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a \u062d\u0633\u0627\u0628\u0643"}
          </Text>
        </View>

        {/* Consent Type Badge */}
        <View style={[styles.typeBadge, { backgroundColor: typeColor + "15" }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>
            {getConsentTypeLabel(consent.consent_type)}
          </Text>
        </View>

        {/* Payment Details (for PIS) */}
        {isPayment && consent.payment_details && (
          <View style={styles.section}>
            <PaymentSummary
              payment={consent.payment_details}
              tppName={tpp?.tpp_name || consent.tpp_id}
            />
          </View>
        )}

        {/* Permissions (for AIS) */}
        {consent.permissions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requested Permissions</Text>
            <Text style={styles.sectionTitleAr}>
              {"\u0627\u0644\u0623\u0630\u0648\u0646\u0627\u062a \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629"}
            </Text>
            <View style={styles.permissionsCard}>
              <PermissionList permissions={consent.permissions} />
            </View>
          </View>
        )}

        {/* Account Selection (for AIS) */}
        {consent.consent_type === "account-access" && (
          <View style={styles.section}>
            <AccountPicker
              accounts={customer.accounts}
              selectedIds={selectedAccounts}
              onToggle={toggleAccount}
            />
          </View>
        )}

        {/* Expiry Info */}
        {consent.expiration_time && (
          <View style={styles.expiryInfo}>
            <Ionicons name="time-outline" size={16} color="#888" />
            <Text style={styles.expiryText}>
              This consent will expire on{" "}
              {new Date(consent.expiration_time).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        )}

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Ionicons name="lock-closed" size={16} color="#4D9134" />
          <Text style={styles.securityText}>
            You can revoke this consent at any time from the Consents tab.
            Your data is shared securely and only for the permissions listed above.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.rejectButton}
          onPress={handleReject}
          disabled={submitting}
        >
          <Ionicons name="close" size={20} color="#F44336" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>

        <Pressable
          style={[styles.approveButton, submitting && styles.buttonDisabled]}
          onPress={handleApprove}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFF" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Generate a pseudo-random authorization code for sandbox use.
 */
function generateAuthCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
    gap: 12,
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
  },
  errorContainer: {
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
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#4D9134",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tppHeader: {
    alignItems: "center",
    paddingVertical: 20,
  },
  tppIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0F8ED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tppName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
  },
  tppNameAr: {
    fontSize: 17,
    color: "#888",
    marginTop: 2,
  },
  tppRequest: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  tppRequestAr: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  typeBadge: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  typeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  sectionTitleAr: {
    fontSize: 14,
    color: "#888",
    textAlign: "right",
    marginBottom: 10,
  },
  permissionsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  expiryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  expiryText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
    lineHeight: 18,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0F8ED",
    borderRadius: 8,
    padding: 14,
  },
  securityText: {
    fontSize: 13,
    color: "#555",
    flex: 1,
    lineHeight: 18,
  },
  actionBar: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFCDD2",
    backgroundColor: "#FFF",
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F44336",
  },
  approveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#4D9134",
  },
  approveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
