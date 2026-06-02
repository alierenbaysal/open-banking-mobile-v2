/**
 * More — beneficiaries, profile, settings, sign out.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  bankLogout,
  fetchBeneficiaries,
  getStoredUser,
  type Beneficiary,
  type BankUser,
} from "../../utils/api";
import { colors, radius, shadow, spacing } from "../../utils/theme";
import { maskIban } from "../../utils/format";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import Skeleton from "../../components/Skeleton";

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<BankUser | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    const u = await getStoredUser();
    if (!u) return;
    setUser(u);
    const bens = await fetchBeneficiaries(u.customer_id);
    setBeneficiaries(bens);
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
    setSigningOut(true);
    await bankLogout();
    router.replace("/(public)/login");
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.title}>More</Text>

      {/* Profile card */}
      <Card style={{ marginTop: spacing.lg }}>
        {loading ? (
          <Skeleton height={64} borderRadius={radius.md} />
        ) : (
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.first_name?.[0] || "U").toUpperCase()}
                {(user?.last_name?.[0] || "").toUpperCase()}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.profileName}>
                {user ? `${user.first_name} ${user.last_name}`.trim() || "Customer" : "Customer"}
              </Text>
              <Text style={styles.profileSub}>{user?.email || ""}</Text>
              <Text style={styles.profileSub}>Customer ID: {user?.customer_id || ""}</Text>
            </View>
          </View>
        )}
      </Card>

      {/* Beneficiaries */}
      <Text style={styles.sectionHeader}>Beneficiaries</Text>
      <Card padding="md">
        {loading ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={48} />
            <Skeleton height={48} />
          </View>
        ) : beneficiaries.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={28} color={colors.textFaint} />
            <Text style={styles.emptyText}>No saved beneficiaries.</Text>
          </View>
        ) : (
          <View>
            {beneficiaries.map((b, idx) => (
              <View key={b.beneficiary_id}>
                <View style={styles.beneRow}>
                  <View style={styles.beneIcon}>
                    <Ionicons name="person" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.beneName}>{b.name}</Text>
                    <Text style={styles.beneIban}>
                      {maskIban(b.iban)} · {b.bank_name}
                    </Text>
                  </View>
                </View>
                {idx < beneficiaries.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Settings menu */}
      <Text style={styles.sectionHeader}>Settings</Text>
      <Card padding="none">
        <MenuRow
          icon="shield-checkmark-outline"
          label="Verify Identity (THEQA)"
          onPress={() => router.push("/(auth)/verify")}
        />
        <MenuRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
        <MenuRow icon="lock-closed-outline" label="Security" onPress={() => {}} />
        <MenuRow icon="finger-print-outline" label="Biometric Login" onPress={() => {}} />
        <MenuRow icon="card-outline" label="Cards" onPress={() => {}} />
        <MenuRow icon="document-text-outline" label="Statements" onPress={() => {}} last />
      </Card>

      <Text style={styles.sectionHeader}>Support</Text>
      <Card padding="none">
        <MenuRow icon="help-circle-outline" label="Help & FAQs" onPress={() => {}} />
        <MenuRow icon="call-outline" label="Contact Us" onPress={() => {}} />
        <MenuRow icon="information-circle-outline" label="About" onPress={() => {}} last />
      </Card>

      <PrimaryButton
        label={signingOut ? "Signing out..." : "Sign Out"}
        onPress={handleSignOut}
        loading={signingOut}
        variant="outline"
        size="lg"
        fullWidth
        leftIcon={
          !signingOut ? (
            <Ionicons name="log-out-outline" size={18} color={colors.primary} />
          ) : undefined
        }
        style={{ marginTop: spacing.xl }}
      />

      <Text style={styles.version}>Bank Dhofar Online · v0.1.0</Text>
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.menuRow,
        !last && styles.menuRowDivider,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  flex: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  profileSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  beneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  beneIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  beneName: { fontSize: 14, fontWeight: "600", color: colors.text },
  beneIban: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  empty: { alignItems: "center", padding: spacing.lg, gap: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textMuted },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  menuRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
  version: {
    textAlign: "center",
    color: colors.textFaint,
    fontSize: 11,
    marginTop: spacing.lg,
  },
});
