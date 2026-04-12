/**
 * Payment approval screen — SCA simulation for payment consents.
 *
 * Shows:
 * - Payment summary (amount, creditor, reference)
 * - Source account selection
 * - PIN entry (any 4 digits accepted in sandbox)
 * - Confirm / Cancel buttons
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import PaymentSummary from "../../components/PaymentSummary";
import { getCurrentCustomer, TestCustomer } from "../../utils/auth";
import {
  ConsentResponse,
  getConsent,
} from "../../utils/api";

// Mock consent for sandbox fallback
function getMockPaymentConsent(consentId: string): ConsentResponse | null {
  if (consentId === "c3d4e5f6-a7b8-9012-cdef-123456789012") {
    return {
      consent_id: consentId,
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
      status: "Authorised",
      status_update_time: "2026-04-09T10:58:00Z",
      creation_time: "2026-04-09T10:55:00Z",
      expiration_time: null,
      authorization_time: "2026-04-09T10:58:00Z",
      revocation_time: null,
      revocation_reason: null,
      risk_data: null,
    };
  }
  return null;
}

const TPP_NAMES: Record<string, string> = {
  "TPP-FINTECHOMAN": "FinTech Oman",
  "TPP-BUDGETAPP": "BudgetApp",
  "TPP-PAYOM": "PayOM",
};

export default function PaymentApprovalScreen() {
  const router = useRouter();
  const { consentId } = useLocalSearchParams<{ consentId: string }>();

  const [loading, setLoading] = useState(true);
  const [consent, setConsent] = useState<ConsentResponse | null>(null);
  const [customer, setCustomer] = useState<TestCustomer | null>(null);
  const [pin, setPin] = useState("");
  const [selectedSourceAccount, setSelectedSourceAccount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pinError, setPinError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const cust = await getCurrentCustomer();
      if (!cust) {
        router.replace("/login");
        return;
      }
      setCustomer(cust);

      if (cust.accounts.length > 0) {
        setSelectedSourceAccount(cust.accounts[0].account_id);
      }

      if (!consentId) {
        setError("Missing consent ID");
        setLoading(false);
        return;
      }

      let consentData: ConsentResponse | null = null;
      try {
        consentData = await getConsent(consentId);
      } catch {
        consentData = getMockPaymentConsent(consentId);
      }

      if (!consentData) {
        setError("Payment consent not found");
      } else {
        setConsent(consentData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load payment details"
      );
    } finally {
      setLoading(false);
    }
  }, [consentId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirm = async () => {
    setPinError("");

    if (pin.length !== 4) {
      setPinError("Please enter a 4-digit PIN");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setPinError("PIN must be 4 digits");
      return;
    }

    if (!selectedSourceAccount) {
      Alert.alert("Select Account", "Please select a source account for the payment.");
      return;
    }

    setSubmitting(true);

    // Simulate SCA verification delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // In sandbox, any 4 digits are accepted
    Alert.alert(
      "Payment Confirmed",
      `Payment of ${consent?.payment_details?.instructed_amount?.currency || "OMR"} ${consent?.payment_details?.instructed_amount?.amount || "0.000"} to ${consent?.payment_details?.creditor_account?.name || "payee"} has been authorized.\n\nThe payment will be processed shortly.`,
      [
        {
          text: "Done",
          onPress: () => router.replace("/"),
        },
      ]
    );

    setSubmitting(false);
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Payment",
      "Are you sure you want to cancel this payment?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => router.replace("/"),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4D9134" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (error || !consent || !customer) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error || "Unable to load payment"}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const pd = consent.payment_details;
  const tppName = TPP_NAMES[consent.tpp_id] || consent.tpp_id;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="card-outline" size={32} color="#4D9134" />
          <Text style={styles.headerTitle}>Confirm Payment</Text>
          <Text style={styles.headerTitleAr}>
            {"\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062f\u0641\u0639"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {tppName} wants to make a payment from your account
          </Text>
        </View>

        {/* Payment Details */}
        {pd && (
          <View style={styles.section}>
            <PaymentSummary payment={pd} tppName={tppName} />
          </View>
        )}

        {/* Source Account Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay from</Text>
          <Text style={styles.sectionTitleAr}>
            {"\u0627\u0644\u062f\u0641\u0639 \u0645\u0646"}
          </Text>
          {customer.accounts.map((account) => {
            const isSelected = selectedSourceAccount === account.account_id;
            return (
              <Pressable
                key={account.account_id}
                style={[
                  styles.sourceAccount,
                  isSelected && styles.sourceAccountSelected,
                ]}
                onPress={() => setSelectedSourceAccount(account.account_id)}
              >
                <Ionicons
                  name={isSelected ? "radio-button-on" : "radio-button-off"}
                  size={22}
                  color={isSelected ? "#4D9134" : "#999"}
                />
                <View style={styles.sourceAccountInfo}>
                  <Text style={styles.sourceAccountName}>{account.name}</Text>
                  <Text style={styles.sourceAccountNumber}>
                    {"\u2022\u2022\u2022\u2022"} {account.account_number.slice(-4)}
                  </Text>
                </View>
                <Text style={styles.sourceAccountBalance}>
                  {account.currency}{" "}
                  {account.balance.toLocaleString("en", {
                    minimumFractionDigits: 3,
                  })}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* PIN Entry (SCA Simulation) */}
        <View style={styles.section}>
          <View style={styles.pinHeader}>
            <Ionicons name="lock-closed" size={18} color="#4D9134" />
            <Text style={styles.sectionTitle}>Enter your PIN</Text>
          </View>
          <Text style={styles.pinSubtitle}>
            Strong Customer Authentication (SCA)
          </Text>
          <Text style={styles.pinSubtitleAr}>
            {"\u0627\u0644\u0645\u0635\u0627\u062f\u0642\u0629 \u0627\u0644\u0642\u0648\u064a\u0629 \u0644\u0644\u0639\u0645\u064a\u0644"}
          </Text>

          <View style={styles.pinContainer}>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(text) => {
                setPinError("");
                setPin(text.replace(/[^0-9]/g, "").slice(0, 4));
              }}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              placeholder="\u2022 \u2022 \u2022 \u2022"
              placeholderTextColor="#CCC"
              textAlign="center"
            />
            {/* PIN dots visualization */}
            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    pin.length > i && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
          </View>

          {pinError ? (
            <Text style={styles.pinErrorText}>{pinError}</Text>
          ) : null}

          <View style={styles.sandboxPinNote}>
            <Ionicons name="flask-outline" size={14} color="#FF9800" />
            <Text style={styles.sandboxPinNoteText}>
              Sandbox: any 4-digit PIN is accepted
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <Pressable
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[
            styles.confirmButton,
            (submitting || pin.length < 4) && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={submitting || pin.length < 4}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="#FFF" />
              <Text style={styles.confirmButtonText}>
                Confirm Payment
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 32,
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    fontSize: 14,
    color: "#888",
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
  backBtn: {
    backgroundColor: "#4D9134",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  backBtnText: {
    color: "#FFF",
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#222",
    marginTop: 8,
  },
  headerTitleAr: {
    fontSize: 18,
    color: "#888",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
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
    marginBottom: 10,
  },
  sourceAccount: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 8,
    gap: 12,
  },
  sourceAccountSelected: {
    backgroundColor: "#F0F8ED",
    borderColor: "#4D9134",
  },
  sourceAccountInfo: {
    flex: 1,
  },
  sourceAccountName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
  },
  sourceAccountNumber: {
    fontSize: 13,
    color: "#888",
    fontFamily: "monospace",
    marginTop: 2,
  },
  sourceAccountBalance: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4D9134",
  },
  pinHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  pinSubtitle: {
    fontSize: 13,
    color: "#888",
    marginBottom: 2,
  },
  pinSubtitleAr: {
    fontSize: 12,
    color: "#BBB",
    textAlign: "right",
    marginBottom: 16,
  },
  pinContainer: {
    alignItems: "center",
    gap: 16,
  },
  pinInput: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    fontSize: 28,
    fontWeight: "700",
    width: 200,
    textAlign: "center",
    letterSpacing: 16,
    color: "#222",
  },
  pinDots: {
    flexDirection: "row",
    gap: 16,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E0E0E0",
  },
  pinDotFilled: {
    backgroundColor: "#4D9134",
  },
  pinErrorText: {
    fontSize: 13,
    color: "#F44336",
    textAlign: "center",
    marginTop: 8,
  },
  sandboxPinNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF8E1",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  sandboxPinNoteText: {
    fontSize: 12,
    color: "#F57F17",
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
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  confirmButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#4D9134",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
