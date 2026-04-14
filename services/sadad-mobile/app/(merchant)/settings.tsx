/**
 * Settings — webhook config, API keys (masked), account info, logout.
 */

import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { FONT, MERCHANT_THEME, RADIUS } from "../../theme";
import { getCurrentMerchant, logout, type TestMerchant } from "../../utils/auth";

interface ApiKey {
  id: string;
  label: string;
  prefix: string;
  suffix: string;
  created: string;
}

const API_KEYS: ApiKey[] = [
  {
    id: "key_live_main",
    label: "Production",
    prefix: "sk_live_",
    suffix: "9f21",
    created: "2025-11-14",
  },
  {
    id: "key_live_backup",
    label: "Production (backup)",
    prefix: "sk_live_",
    suffix: "a7b3",
    created: "2025-12-02",
  },
  {
    id: "key_test",
    label: "Sandbox",
    prefix: "sk_test_",
    suffix: "1c0d",
    created: "2024-08-01",
  },
];

export default function Settings() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<TestMerchant | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(
    "https://salalahsouq.tnd.bankdhofar.com/webhooks/sadad",
  );
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [eventPayment, setEventPayment] = useState(true);
  const [eventSettlement, setEventSettlement] = useState(true);
  const [eventRefund, setEventRefund] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentMerchant().then((m) => {
      if (mounted) setMerchant(m);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/welcome");
        },
      },
    ]);
  };

  if (!merchant) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Merchant profile</Text>
          <View style={styles.card}>
            <InfoRow label="Display name" value={merchant.display_name} />
            <InfoRow label="Legal name" value={merchant.legal_name} />
            <InfoRow label="Account ID" value={merchant.account_id} mono />
            <InfoRow label="IBAN" value={merchant.iban} mono />
            <InfoRow label="MCC" value={merchant.mcc} />
            <InfoRow label="Onboarded" value={merchant.onboarded_at} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Webhooks</Text>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.fieldLabel}>Enable webhooks</Text>
              <Switch
                value={webhookEnabled}
                onValueChange={setWebhookEnabled}
                trackColor={{
                  false: MERCHANT_THEME.bg.elevated,
                  true: MERCHANT_THEME.brand.primary,
                }}
                thumbColor={MERCHANT_THEME.text.primary}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Endpoint URL</Text>
              <TextInput
                style={styles.input}
                value={webhookUrl}
                onChangeText={setWebhookUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://..."
                placeholderTextColor={MERCHANT_THEME.text.muted}
                editable={webhookEnabled}
              />
            </View>

            <Text style={styles.groupLabel}>Events</Text>
            <ToggleRow label="payment.succeeded" value={eventPayment} onChange={setEventPayment} />
            <ToggleRow label="settlement.completed" value={eventSettlement} onChange={setEventSettlement} />
            <ToggleRow label="payment.refunded" value={eventRefund} onChange={setEventRefund} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>API keys</Text>
          <View style={styles.card}>
            {API_KEYS.map((k, idx) => {
              const revealed = revealedKey === k.id;
              const masked = `${k.prefix}${"\u2022".repeat(24)}${k.suffix}`;
              const display = revealed
                ? `${k.prefix}pretend_key_value_${k.suffix}`
                : masked;
              return (
                <View
                  key={k.id}
                  style={[styles.keyRow, idx > 0 && styles.keyRowBorder]}
                >
                  <View style={styles.keyMeta}>
                    <Text style={styles.keyLabel}>{k.label}</Text>
                    <Text style={styles.keyValue}>{display}</Text>
                    <Text style={styles.keyCreated}>Created {k.created}</Text>
                  </View>
                  <Pressable
                    onPress={() => setRevealedKey(revealed ? null : k.id)}
                    style={styles.eyeBtn}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={revealed ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={MERCHANT_THEME.text.secondary}
                    />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={MERCHANT_THEME.status.error} />
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.version}>Sadad Merchant v1.0.0 · build 1</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, mono && infoStyles.mono]}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={infoStyles.row}>
      <Text style={[infoStyles.value, { flex: 1, fontFamily: "monospace", fontSize: FONT.sm }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: MERCHANT_THEME.bg.elevated,
          true: MERCHANT_THEME.brand.primary,
        }}
        thumbColor={MERCHANT_THEME.text.primary}
      />
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: MERCHANT_THEME.border.default,
  },
  label: {
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.muted,
  },
  value: {
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.primary,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  mono: {
    fontFamily: "monospace",
    fontSize: FONT.xs,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: MERCHANT_THEME.bg.canvas,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: "800",
    color: MERCHANT_THEME.text.primary,
    marginBottom: 16,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: FONT.xs,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: MERCHANT_THEME.text.muted,
    marginBottom: 8,
  },
  card: {
    backgroundColor: MERCHANT_THEME.bg.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
    paddingHorizontal: 14,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: MERCHANT_THEME.border.default,
  },
  fieldLabel: {
    fontSize: FONT.sm,
    fontWeight: "600",
    color: MERCHANT_THEME.text.primary,
  },
  field: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: MERCHANT_THEME.border.default,
  },
  input: {
    marginTop: 6,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: MERCHANT_THEME.bg.muted,
    fontSize: FONT.sm,
    color: MERCHANT_THEME.text.primary,
    borderWidth: 1,
    borderColor: MERCHANT_THEME.border.default,
  },
  groupLabel: {
    fontSize: FONT.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: MERCHANT_THEME.text.muted,
    marginTop: 14,
    marginBottom: 2,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  keyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: MERCHANT_THEME.border.default,
  },
  keyMeta: {
    flex: 1,
  },
  keyLabel: {
    fontSize: FONT.sm,
    fontWeight: "700",
    color: MERCHANT_THEME.text.primary,
  },
  keyValue: {
    fontSize: FONT.xs,
    color: MERCHANT_THEME.text.secondary,
    fontFamily: "monospace",
    marginTop: 2,
  },
  keyCreated: {
    fontSize: 10,
    color: MERCHANT_THEME.text.muted,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eyeBtn: {
    padding: 8,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: MERCHANT_THEME.status.errorBg,
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.25)",
    marginTop: 6,
  },
  logoutText: {
    color: MERCHANT_THEME.status.error,
    fontWeight: "700",
    fontSize: FONT.md,
  },
  version: {
    fontSize: FONT.xs,
    color: MERCHANT_THEME.text.muted,
    textAlign: "center",
    marginTop: 24,
  },
});
