/**
 * OAuth callback handler.
 *
 * BD Online redirects back to `sadad://pay/callback?session_id=...&status=...&...`
 * after the user approves or rejects the payment consent. This screen is shown
 * only briefly while we decide which outcome route to land on.
 */

import React, { useEffect } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CUSTOMER_THEME, FONT } from "../../../theme";
import { getPaymentSession } from "../../../utils/api";

export default function PaymentCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    session_id?: string;
    status?: string;
    reason?: string;
    message?: string;
  }>();

  useEffect(() => {
    let cancelled = false;
    const sessionId = String(params.session_id ?? "");
    const status = String(params.status ?? "");

    (async () => {
      if (status && status !== "approved") {
        if (cancelled) return;
        router.replace({
          pathname: "/pay/failure",
          params: {
            session_id: sessionId,
            reason: (params.reason as string) ?? "declined",
            message: (params.message as string) ?? "",
          },
        });
        return;
      }

      // Either success or unknown — try to load the session so we can show a
      // rich receipt. If anything fails, we still land on success with stubs.
      try {
        const session = sessionId
          ? await getPaymentSession(sessionId)
          : null;
        if (cancelled) return;
        router.replace({
          pathname: "/pay/success",
          params: {
            session_id: sessionId,
            amount: session ? String(session.amount) : "",
            reference: session?.order_reference ?? "",
            merchant: session?.merchant.name ?? "",
            return_url: session?.return_url ?? "",
          },
        });
      } catch {
        if (cancelled) return;
        router.replace({
          pathname: "/pay/failure",
          params: { session_id: sessionId, reason: "error" },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={CUSTOMER_THEME.brand.primary} />
        <Text style={styles.text}>Confirming your payment...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CUSTOMER_THEME.bg.canvas,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  text: {
    fontSize: FONT.md,
    color: CUSTOMER_THEME.text.secondary,
  },
});
