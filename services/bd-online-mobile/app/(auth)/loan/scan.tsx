/**
 * Loan QR scan — dual-mode screen:
 *
 * 1. Deep link mode (params a + d present): fetches loan application details
 *    from ob-loan-service and lets the customer approve → triggers decision.
 * 2. Camera mode (no params): opens camera to scan a dealer QR code.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { API_BASE, getStoredUser } from "../../../utils/api";
import { colors, gradients, radius, shadow, spacing } from "../../../utils/theme";
import Card from "../../../components/Card";
import Badge from "../../../components/Badge";
import PrimaryButton from "../../../components/PrimaryButton";
import Skeleton from "../../../components/Skeleton";

const INTERNAL_TOKEN = "bd-internal-loan-svc-token-CHANGE-ME";

interface ScanInfo {
  application_id: string;
  status: string;
  expired: boolean;
  dealer: { id: string; name: string };
  vehicle: { make: string; model: string; year: number; price: string };
  request: { amount: string; down_payment: string; tenor_months: number };
  environment: "sandbox" | "production";
}

export default function LoanScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { a: applicationId, d: dealerId } = useLocalSearchParams<{
    a?: string;
    d?: string;
  }>();

  // Deep link mode — show loan approval UI
  if (applicationId) {
    return (
      <LoanApprovalView
        applicationId={applicationId}
        dealerId={dealerId || ""}
        insets={insets}
        router={router}
      />
    );
  }

  // Camera mode — scan QR
  return <CameraScanView insets={insets} router={router} />;
}

// ─── Deep Link Approval View ──────────────────────────────────────────────

function LoanApprovalView({
  applicationId,
  dealerId,
  insets,
  router,
}: {
  applicationId: string;
  dealerId: string;
  insets: { top: number };
  router: ReturnType<typeof useRouter>;
}) {
  const [info, setInfo] = useState<ScanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(
        `${API_BASE}/api/loan/internal/v1/loan-applications/${applicationId}/scan-info`,
        { headers: { "X-Internal-Token": INTERNAL_TOKEN } },
      );
      if (!r.ok) {
        const body = await r.text();
        setError(`Could not load application: ${r.status} ${body.slice(0, 120)}`);
        return;
      }
      setInfo(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load loan request.");
    }
  }, [applicationId]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const handleApprove = async () => {
    if (!info) return;
    setSubmitting(true);
    setError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      const u = await getStoredUser();
      const customerId = u?.customer_id || "CUST-001";
      const consentId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const r = await fetch(
        `${API_BASE}/api/loan/internal/v1/loan-applications/${info.application_id}/customer-consent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Token": INTERNAL_TOKEN,
          },
          body: JSON.stringify({ customer_id: customerId, consent_id: consentId }),
        },
      );
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`Decision failed: ${r.status} ${body.slice(0, 200)}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      router.replace({
        pathname: "/(auth)/loan/offer",
        params: { id: info.application_id },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => undefined,
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + spacing.md, padding: spacing.lg, backgroundColor: colors.bg },
        ]}
      >
        <Skeleton height={140} borderRadius={radius.xl} />
        <View style={{ height: spacing.lg }} />
        <Skeleton height={120} borderRadius={radius.lg} />
        <View style={{ height: spacing.md }} />
        <Skeleton height={200} borderRadius={radius.lg} />
      </View>
    );
  }

  if (error && !info) {
    return (
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + spacing.md, padding: spacing.lg, backgroundColor: colors.bg },
        ]}
      >
        <View style={styles.errorCard}>
          <Ionicons name="warning-outline" size={36} color={colors.warning} />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <PrimaryButton
            label="Go Home"
            onPress={() => router.replace("/(auth)")}
            variant="outline"
            fullWidth
          />
        </View>
      </View>
    );
  }

  if (!info) return null;

  if (info.expired) {
    return (
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + spacing.md, padding: spacing.lg, backgroundColor: colors.bg },
        ]}
      >
        <View style={styles.errorCard}>
          <Ionicons name="time-outline" size={36} color={colors.warning} />
          <Text style={styles.errorTitle}>QR Expired</Text>
          <Text style={styles.errorText}>
            This showroom QR has expired. Ask the dealer to generate a new one.
          </Text>
          <PrimaryButton
            label="Go Home"
            onPress={() => router.replace("/(auth)")}
            variant="outline"
            fullWidth
          />
        </View>
      </View>
    );
  }

  const price = Number(info.vehicle.price).toFixed(3);
  const requested = Number(info.request.amount).toFixed(3);
  const downPayment = Number(info.request.down_payment).toFixed(3);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.replace("/(auth)")}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Loan Request</Text>
        <View style={{ width: 38 }} />
      </View>

      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.banner, shadow.hero]}
      >
        <View style={styles.bannerIconCircle}>
          <Ionicons name="car-sport" size={28} color={colors.white} />
        </View>
        <Text style={styles.bannerTitle}>Auto Loan Request</Text>
        <Text style={styles.bannerSub}>
          {info.environment === "sandbox"
            ? "SANDBOX · no real money moves"
            : "Production"}
        </Text>
      </LinearGradient>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.dealerRow}>
          <View style={styles.dealerIcon}>
            <Ionicons name="storefront" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dealerName}>{info.dealer.name}</Text>
            <Text style={styles.dealerMeta}>
              is requesting a pre-approval for an auto loan.
            </Text>
          </View>
        </View>
        <Badge
          label={`Dealer: ${info.dealer.id}`}
          color={colors.warning}
          variant="soft"
        />
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Vehicle</Text>
        <Text style={styles.vehicleName}>
          {info.vehicle.year} {info.vehicle.make} {info.vehicle.model}
        </Text>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Sticker price</Text>
          <Text style={styles.value}>OMR {price}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Down payment</Text>
          <Text style={styles.value}>OMR {downPayment}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Loan amount</Text>
          <Text
            style={[
              styles.value,
              { color: colors.primary, fontSize: 17, fontWeight: "800" },
            ]}
          >
            OMR {requested}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tenor</Text>
          <Text style={styles.value}>{info.request.tenor_months} months</Text>
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
        >
          <Ionicons name="lock-closed" size={16} color={colors.primary} />
          <Text style={styles.sectionTitle}>What Bank Dhofar will check</Text>
        </View>
        <Text style={styles.checkDescription}>
          To decide on your loan, Bank Dhofar will look at:
        </Text>
        {[
          "Your income over the last 3 months",
          "Your existing loan obligations",
          "Your Mala’a credit score",
        ].map((item) => (
          <View key={item} style={styles.checkItem}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your details stay at the bank. The dealer only sees whether you were
            approved and, if so, the monthly instalment — never your income or
            debts.
          </Text>
        </View>
      </Card>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={colors.danger} />
          <Text style={styles.errorBoxText}>{error}</Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label="Decline"
            onPress={() => router.replace("/(auth)")}
            disabled={submitting}
            variant="outline"
            size="lg"
            fullWidth
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label="Approve"
            onPress={handleApprove}
            loading={submitting}
            disabled={submitting}
            size="lg"
            fullWidth
            rightIcon={
              !submitting ? (
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              ) : undefined
            }
          />
        </View>
      </View>

      <Text style={styles.legal}>
        Your data is protected under Central Bank of Oman Open Banking
        regulations.
      </Text>
      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

// ─── Camera Scan View (original behaviour) ────────────────────────────────

function CameraScanView({
  insets,
  router,
}: {
  insets: { top: number };
  router: ReturnType<typeof useRouter>;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<string | null>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleScan = (result: BarcodeScanningResult) => {
    if (scanned) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    setScanned(result.data);
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );
    router.replace("/(auth)");
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.camHeaderRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.camBackBtn}
        >
          <Ionicons name="close" size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.camHeaderTitle}>Scan QR</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.cameraWrap}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
          />
        ) : (
          <View style={styles.permissionWrap}>
            <Ionicons name="camera-outline" size={48} color={colors.white} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              Allow camera access to scan QR codes for car loan applications.
            </Text>
            <PrimaryButton
              label="Grant Permission"
              onPress={() => requestPermission()}
              variant="filled"
              size="md"
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}

        {permission?.granted && !scanned && (
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.reticle}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.hint}>
              Point your camera at the dealer's QR code
            </Text>
          </View>
        )}
      </View>

      {scanned && (
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.scanResult, shadow.hero]}
        >
          <View style={styles.resultIconCircle}>
            <Ionicons name="checkmark-circle" size={28} color={colors.white} />
          </View>
          <Text style={styles.resultTitle}>QR Detected</Text>
          <Text style={styles.resultData} numberOfLines={3}>
            {scanned}
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: spacing.md,
              marginTop: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Re-scan"
                onPress={() => setScanned(null)}
                variant="outline"
                fullWidth
                style={{
                  borderColor: colors.white,
                  backgroundColor: "transparent",
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label="Apply for Loan"
                onPress={handleSubmit}
                variant="filled"
                fullWidth
                style={{ backgroundColor: colors.white }}
              />
            </View>
          </View>
        </LinearGradient>
      )}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const RETICLE_SIZE = 240;
const CORNER_LEN = 28;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  // ── Approval view styles ──
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
  dealerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dealerIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dealerName: { fontSize: 17, fontWeight: "700", color: colors.text },
  dealerMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: { fontSize: 13, color: colors.textMuted },
  value: { fontSize: 14, color: colors.text, fontWeight: "600" },
  checkDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 3,
  },
  checkText: { fontSize: 13, color: colors.text },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  infoText: { fontSize: 12, color: colors.info, lineHeight: 18 },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  errorCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  errorTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  errorText: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  errorBoxText: { color: colors.danger, fontSize: 13, flex: 1 },
  legal: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: "center",
    marginTop: spacing.md,
  },

  // ── Camera view styles ──
  camHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  camBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  camHeaderTitle: { fontSize: 17, fontWeight: "700", color: colors.white },
  cameraWrap: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#111",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: { width: RETICLE_SIZE, height: RETICLE_SIZE },
  corner: {
    position: "absolute",
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: colors.white,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 8,
  },
  hint: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: spacing.lg,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  permissionWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  permissionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  permissionText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  scanResult: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    alignItems: "center",
  },
  resultIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  resultTitle: { color: colors.white, fontSize: 17, fontWeight: "800" },
  resultData: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: "Courier",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: spacing.md,
  },
});
