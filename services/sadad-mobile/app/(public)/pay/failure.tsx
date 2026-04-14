/**
 * Payment failure screen.
 * Clear error explanation + retry / contact support CTAs.
 */

import React from "react";
import {
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

const REASON_COPY: Record<string, { title: string; body: string }> = {
  cancelled: {
    title: "Payment cancelled",
    body: "You cancelled the approval in your bank's app. No money was moved.",
  },
  declined: {
    title: "Payment declined",
    body: "Your bank declined this payment. Please check your balance or try another account.",
  },
  timeout: {
    title: "Payment timed out",
    body: "We didn't hear back from your bank in time. Please try again.",
  },
  error: {
    title: "Something went wrong",
    body: "We couldn't complete your payment. Please retry, or choose a different bank.",
  },
};

export default function PaymentFailure() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    session_id?: string;
    reason?: string;
    message?: string;
  }>();

  const reasonKey = (params.reason as string) ?? "error";
  const copy = REASON_COPY[reasonKey] ?? REASON_COPY.error;
  const sessionId = (params.session_id as string) ?? "";

  const handleRetry = () => {
    if (sessionId) {
      router.replace(`/pay/${sessionId}`);
    } else {
      router.replace("/welcome");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="close" size={44} color={CUSTOMER_THEME.text.onBrand} />
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.sub}>{copy.body}</Text>
          {params.message ? (
            <View style={styles.detail}>
              <Text style={styles.detailLabel}>Details</Text>
              <Text style={styles.detailText}>{String(params.message)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>What can you do?</Text>
          <Bullet text="Check your account has sufficient balance." />
          <Bullet text="Try a different bank if the issue persists." />
          <Bullet text="Contact the merchant if you were charged but no confirmation appeared." />
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryBtn} onPress={handleRetry}>
            <Ionicons name="refresh" size={18} color={CUSTOMER_THEME.text.onBrand} />
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.replace("/welcome")}>
            <Text style={styles.secondaryBtnText}>Back to Sadad</Text>
          </Pressable>
        </View>

        {sessionId ? (
          <Text style={styles.footer}>Session {sessionId}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.dot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CUSTOMER_THEME.bg.surface,
  },
  scroll: {
    padding: 24,
    paddingBottom: 60,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 32,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: CUSTOMER_THEME.status.error,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: CUSTOMER_THEME.status.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 20,
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: "800",
    color: CUSTOMER_THEME.text.primary,
  },
  sub: {
    fontSize: FONT.md,
    color: CUSTOMER_THEME.text.secondary,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 320,
  },
  detail: {
    marginTop: 16,
    padding: 12,
    backgroundColor: CUSTOMER_THEME.status.errorBg,
    borderRadius: RADIUS.md,
    alignSelf: "stretch",
  },
  detailLabel: {
    fontSize: FONT.xs,
    fontWeight: "700",
    color: CUSTOMER_THEME.status.error,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailText: {
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.text.primary,
  },
  info: {
    backgroundColor: CUSTOMER_THEME.bg.card,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: CUSTOMER_THEME.border.default,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.primary,
    marginBottom: 12,
  },
  bullet: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CUSTOMER_THEME.brand.primary,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.text.secondary,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: CUSTOMER_THEME.brand.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: CUSTOMER_THEME.text.onBrand,
    fontSize: FONT.md,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: CUSTOMER_THEME.border.strong,
  },
  secondaryBtnText: {
    fontSize: FONT.md,
    fontWeight: "600",
    color: CUSTOMER_THEME.text.primary,
  },
  footer: {
    textAlign: "center",
    fontSize: FONT.xs,
    color: CUSTOMER_THEME.text.muted,
    fontFamily: "monospace",
    marginTop: 30,
  },
});
