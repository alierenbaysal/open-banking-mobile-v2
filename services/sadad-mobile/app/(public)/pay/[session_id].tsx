/**
 * Customer checkout screen.
 *
 * Entry point is the deep-link `sadad://pay?session_id=...` from a merchant
 * app (e.g. Salalah Souq mobile). Also reachable via the "Try a demo payment"
 * CTA on the welcome screen, which routes to `/pay/demo-session-001`.
 *
 * Flow:
 *   1. Fetch payment session by id (merchant, amount, order ref).
 *   2. Show multi-bank picker — Bank Dhofar "Live", others "Coming soon".
 *   3. On continue, redirect via `bdonline://consent/approve?...` for OAuth.
 *   4. BD Online returns via `sadad://pay/callback` → success / failure screen.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { CUSTOMER_THEME, FONT, RADIUS } from "../../../theme";
import {
  buildBdOnlineDeepLink,
  getPaymentSession,
  type PaymentSession,
} from "../../../utils/api";
import { formatOMR, genState } from "../../../utils/format";
import BankOption, { BankChoice } from "../../../components/BankOption";
import MerchantHeader from "../../../components/MerchantHeader";

const BANKS: BankChoice[] = [
  {
    id: "bank-dhofar",
    name: "Bank Dhofar",
    shortName: "BD",
    emoji: "\u{1F3E6}",
    accent: "#2E7D32",
    available: true,
    note: "Instant",
  },
  {
    id: "nbo",
    name: "National Bank of Oman",
    shortName: "NBO",
    emoji: "\u{1F3DB}",
    accent: "#1565C0",
    available: false,
    note: "Q2 2026",
  },
  {
    id: "bank-muscat",
    name: "Bank Muscat",
    shortName: "BM",
    emoji: "\u{1F307}",
    accent: "#C62828",
    available: false,
    note: "Q2 2026",
  },
  {
    id: "sohar-intl",
    name: "Sohar International",
    shortName: "Sohar",
    emoji: "\u{2693}",
    accent: "#F57C00",
    available: false,
    note: "Q3 2026",
  },
  {
    id: "bank-nizwa",
    name: "Bank Nizwa",
    shortName: "Nizwa",
    emoji: "\u{1F3DE}",
    accent: "#4527A0",
    available: false,
    note: "Q3 2026",
  },
];

export default function Checkout() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>("bank-dhofar");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    getPaymentSession(String(session_id))
      .then((s) => {
        if (mounted) setSession(s);
      })
      .catch((e) => {
        if (mounted) setError(String(e));
      });
    return () => {
      mounted = false;
    };
  }, [session_id]);

  const handleContinue = async () => {
    if (!session) return;
    const bank = BANKS.find((b) => b.id === selectedBank);
    if (!bank || !bank.available) return;

    setSubmitting(true);
    try {
      // In production the consent_id would come from a POST to the Sadad
      // backend. For the mobile demo we derive it from the session id.
      const consentId = `consent_${session.session_id}`;
      const url = buildBdOnlineDeepLink({
        sessionId: session.session_id,
        consentId,
        state: genState(),
      });

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        // BD Online app not installed — simulate success for demo.
        router.replace({
          pathname: "/pay/success",
          params: {
            session_id: session.session_id,
            amount: String(session.amount),
            reference: session.order_reference,
            merchant: session.merchant.name,
          },
        });
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Payment failed", String(e));
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={48} color={CUSTOMER_THEME.status.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => router.back()} style={styles.linkBtn}>
            <Text style={styles.linkText}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={CUSTOMER_THEME.brand.primary} size="large" />
          <Text style={styles.loadingText}>Loading payment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={CUSTOMER_THEME.text.primary} />
        </Pressable>
        <Text style={styles.topTitle}>Confirm payment</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <MerchantHeader
          merchantName={session.merchant.name}
          orderReference={session.order_reference}
          amount={session.amount}
          description={session.description}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Choose your bank</Text>
          <Text style={styles.sectionHint}>
            You'll be redirected to approve the payment in your bank's app.
          </Text>
        </View>

        <View>
          {BANKS.map((b) => (
            <BankOption
              key={b.id}
              bank={b}
              selected={selectedBank === b.id}
              onPress={() => b.available && setSelectedBank(b.id)}
            />
          ))}
        </View>

        <View style={styles.legalBox}>
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={CUSTOMER_THEME.brand.primary}
          />
          <Text style={styles.legalText}>
            Payment secured by OBIE v4.0 open banking. Sadad never sees your
            password or card number.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatOMR(session.amount)}</Text>
        </View>
        <Pressable
          style={[styles.payBtn, submitting && styles.payBtnDisabled]}
          onPress={handleContinue}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={CUSTOMER_THEME.text.onBrand} />
          ) : (
            <>
              <Text style={styles.payBtnText}>Continue to Bank Dhofar</Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={CUSTOMER_THEME.text.onBrand}
              />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CUSTOMER_THEME.bg.surface,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CUSTOMER_THEME.bg.canvas,
    borderBottomWidth: 1,
    borderBottomColor: CUSTOMER_THEME.border.default,
  },
  topTitle: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.primary,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: FONT.lg,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.primary,
  },
  sectionHint: {
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.text.muted,
    marginTop: 4,
  },
  legalBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.md,
    backgroundColor: CUSTOMER_THEME.brand.primarySoft,
    marginTop: 8,
  },
  legalText: {
    flex: 1,
    fontSize: FONT.xs,
    color: CUSTOMER_THEME.text.secondary,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: CUSTOMER_THEME.bg.canvas,
    borderTopWidth: 1,
    borderTopColor: CUSTOMER_THEME.border.default,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.text.secondary,
  },
  totalValue: {
    fontSize: FONT.xl,
    fontWeight: "800",
    color: CUSTOMER_THEME.text.primary,
    fontVariant: ["tabular-nums"],
  },
  payBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: CUSTOMER_THEME.brand.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnDisabled: {
    opacity: 0.6,
  },
  payBtnText: {
    color: CUSTOMER_THEME.text.onBrand,
    fontSize: FONT.md,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontSize: FONT.md,
    color: CUSTOMER_THEME.text.primary,
    textAlign: "center",
  },
  loadingText: {
    color: CUSTOMER_THEME.text.muted,
    marginTop: 8,
  },
  linkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  linkText: {
    color: CUSTOMER_THEME.brand.primary,
    fontWeight: "700",
  },
});
