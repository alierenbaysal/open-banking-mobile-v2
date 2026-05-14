import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { API_BASE, getStoredUser } from "../../../utils/api";
import { colors, gradients, radius, shadow, spacing } from "../../../utils/theme";
import Card from "../../../components/Card";
import PrimaryButton from "../../../components/PrimaryButton";
import Skeleton from "../../../components/Skeleton";

const INTERNAL_TOKEN = "bd-internal-loan-svc-token-CHANGE-ME";

interface CustomerView {
  application_id: string;
  status: string;
  customer_id: string | null;
  vehicle: { make: string; model: string; year: number };
  requested_amount: { amount: string; currency: string };
  down_payment: { amount: string; currency: string };
  requested_tenor_months: number;
  decision: {
    decision: "approved" | "declined" | "conditional";
    approved_amount?: { amount: string; currency: string } | null;
    interest_rate?: number | null;
    tenor_months?: number | null;
    monthly_installment?: { amount: string; currency: string } | null;
    total_repayable?: { amount: string; currency: string } | null;
    decline_reasons?: string[] | null;
    decided_at?: string;
    valid_until?: string;
  } | null;
  environment: "sandbox" | "production";
}

export default function LoanOfferScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: applicationId } = useLocalSearchParams<{ id?: string }>();

  const [app, setApp] = useState<CustomerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    const fetchApp = async () => {
      try {
        const r = await fetch(
          `${API_BASE}/api/loan/internal/v1/loan-applications/${applicationId}/customer-view`,
          { headers: { "X-Internal-Token": INTERNAL_TOKEN } },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!cancelled) setApp(data);
      } catch (e) {
        if (!cancelled && !app) setError((e as Error).message);
      }
    };
    fetchApp();
    const timer = setInterval(fetchApp, 1500);
    return () => { cancelled = true; clearInterval(timer); };
  }, [applicationId]);

  const handleSign = async () => {
    if (!app || !applicationId || otp.length !== 6) return;
    setSigning(true);
    try {
      const u = await getStoredUser();
      const customerId = u?.customer_id || "CUST-001";
      const r = await fetch(
        `${API_BASE}/api/loan/internal/v1/loan-applications/${applicationId}/sign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Internal-Token": INTERNAL_TOKEN },
          body: JSON.stringify({
            customer_id: customerId,
            signature_otp: otp,
            signature_proof: {
              method: "otp_biometric",
              device: "BD Online Mobile",
              signed_at: new Date().toISOString(),
            },
          }),
        },
      );
      if (!r.ok) {
        const body = await r.text();
        throw new Error(body.slice(0, 240));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (e) {
      setError((e as Error).message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setSigning(false);
    }
  };

  if (error && !app) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.xl, padding: spacing.lg }]}>
        <View style={styles.centerCard}>
          <Ionicons name="alert-circle" size={36} color={colors.danger} />
          <Text style={styles.centerTitle}>{error}</Text>
          <PrimaryButton label="Go Home" onPress={() => router.replace("/(auth)")} variant="outline" fullWidth />
        </View>
      </View>
    );
  }

  if (!app) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.md, padding: spacing.lg }]}>
        <Skeleton height={140} borderRadius={radius.xl} />
        <View style={{ height: spacing.lg }} />
        <Skeleton height={200} borderRadius={radius.lg} />
      </View>
    );
  }

  const { decision, status } = app;

  if (status === "pending_decision" || !decision) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.xl, padding: spacing.lg }]}>
        <View style={styles.centerCard}>
          <View style={styles.spinnerCircle}>
            <Ionicons name="hourglass" size={28} color={colors.primary} />
          </View>
          <Text style={styles.centerTitle}>Running your check...</Text>
          <Text style={styles.centerSub}>
            Bank Dhofar is pulling your income history and calculating affordability.
          </Text>
        </View>
      </View>
    );
  }

  if (decision.decision === "declined") {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.replace("/(auth)")} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Decision</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.centerCard}>
          <View style={[styles.spinnerCircle, { backgroundColor: "#FEF2F2" }]}>
            <Ionicons name="close-circle" size={28} color={colors.danger} />
          </View>
          <Text style={styles.centerTitle}>We couldn't approve this loan</Text>
          <Text style={styles.centerSub}>
            {decision.decline_reasons?.length
              ? `Reasons: ${decision.decline_reasons.join(", ").replace(/_/g, " ")}.`
              : "Please contact the branch for a manual review."}
          </Text>
          <PrimaryButton label="Back to dashboard" onPress={() => router.replace("/(auth)")} variant="outline" fullWidth />
        </View>
      </ScrollView>
    );
  }

  if (status === "disbursed") {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      >
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, shadow.hero]}>
          <View style={[styles.bannerIconCircle, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
            <Ionicons name="sparkles" size={28} color={colors.white} />
          </View>
          <Text style={styles.bannerTitle}>You're driving home</Text>
          <Text style={styles.bannerSub}>
            We've paid the dealer. Your standing order is set up for monthly repayments.
          </Text>
        </LinearGradient>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.dataRow}><Text style={styles.label}>Loan amount</Text><Text style={styles.valueStrong}>OMR {decision.approved_amount?.amount}</Text></View>
          <View style={styles.dataRow}><Text style={styles.label}>Monthly</Text><Text style={[styles.valueStrong, { color: colors.primary }]}>OMR {decision.monthly_installment?.amount}</Text></View>
          <View style={styles.dataRow}><Text style={styles.label}>Rate</Text><Text style={styles.value}>{decision.interest_rate}% APR</Text></View>
          <View style={styles.dataRow}><Text style={styles.label}>Tenor</Text><Text style={styles.value}>{decision.tenor_months} months</Text></View>
        </Card>

        <PrimaryButton
          label="Back to dashboard"
          onPress={() => router.replace("/(auth)")}
          size="lg"
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace("/(auth)")} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Offer</Text>
        <View style={{ width: 38 }} />
      </View>

      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, shadow.hero]}>
        <View style={styles.bannerIconCircle}>
          <Ionicons name="shield-checkmark" size={28} color={colors.white} />
        </View>
        <Text style={styles.bannerTitle}>Pre-approved</Text>
        <Text style={styles.bannerSub}>Valid for 10 minutes</Text>
      </LinearGradient>

      <Card style={{ marginTop: spacing.lg }}>
        <Text style={styles.sectionLabel}>Monthly instalment</Text>
        <Text style={styles.bigAmount}>OMR {decision.monthly_installment?.amount}</Text>
        <Text style={styles.subDetail}>for {decision.tenor_months} months @ {decision.interest_rate}% APR</Text>
        <View style={styles.divider} />
        <View style={styles.dataRow}><Text style={styles.label}>Loan principal</Text><Text style={styles.valueStrong}>OMR {decision.approved_amount?.amount}</Text></View>
        <View style={styles.dataRow}><Text style={styles.label}>Total repayable</Text><Text style={styles.valueStrong}>OMR {decision.total_repayable?.amount}</Text></View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={styles.sectionLabel}>Sign the contract</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Enter any 6-digit code in sandbox (production will use Theqa digital signature).
          </Text>
        </View>
        <View style={styles.otpRow}>
          <TextInput
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={colors.textFaint}
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={6}
            editable={!signing}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        )}

        <PrimaryButton
          label="Sign & disburse"
          onPress={handleSign}
          loading={signing}
          disabled={otp.length !== 6 || signing}
          size="lg"
          fullWidth
          rightIcon={!signing ? <Ionicons name="arrow-forward" size={18} color={colors.white} /> : undefined}
          style={{ marginTop: spacing.md }}
        />
        <Text style={styles.legal}>
          By signing, you authorise Bank Dhofar to disburse OMR {decision.approved_amount?.amount} to
          the dealer and set up a monthly standing order from your salary account.
        </Text>
      </Card>
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  banner: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  bannerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bannerSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  centerCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  centerTitle: { fontSize: 17, fontWeight: "700", color: colors.text, textAlign: "center" },
  centerSub: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
  spinnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bigAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  subDetail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: { fontSize: 13, color: colors.textMuted },
  value: { fontSize: 14, color: colors.text, fontWeight: "500" },
  valueStrong: { fontSize: 14, color: colors.text, fontWeight: "700" },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: { fontSize: 12, color: colors.info, lineHeight: 18 },
  otpRow: { alignItems: "center", marginVertical: spacing.md },
  otpInput: {
    width: 200,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 8,
    color: colors.text,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceMuted,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  errorBoxText: { color: colors.danger, fontSize: 13, flex: 1 },
  legal: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
