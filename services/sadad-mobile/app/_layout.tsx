/**
 * Root layout.
 *
 * Two route groups:
 *   (public)   — customer checkout flow (deep-link entry) + merchant login
 *   (merchant) — logged-in merchant dashboard tabs
 *
 * Auth gating redirects to `(public)/login` when a merchant route is hit
 * without a session. The checkout flow is always reachable via deep link.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getCurrentMerchant, TestMerchant } from "../utils/auth";
import { CUSTOMER_THEME } from "../theme";

export default function RootLayout() {
  const [merchant, setMerchant] = useState<TestMerchant | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    const m = await getCurrentMerchant();
    setMerchant(m);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth, segments]);

  useEffect(() => {
    if (merchant === undefined) return;
    const group = segments[0] as string | undefined;
    const inMerchantArea = group === "(merchant)";
    const onLogin = group === "(public)" && (segments[1] as string) === "login";

    if (!merchant && inMerchantArea) {
      router.replace("/login");
    } else if (merchant && onLogin) {
      router.replace("/dashboard");
    }
  }, [merchant, segments, router]);

  if (merchant === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={CUSTOMER_THEME.brand.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(merchant)" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: CUSTOMER_THEME.bg.canvas,
  },
});
