/**
 * Root layout — Stack navigator wrapping the entire app.
 *
 * Handles:
 * - Auth gating (redirect to login if not authenticated)
 * - Global error boundary
 * - Status bar configuration
 */

import React, { useCallback, useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { getCurrentCustomer, TestCustomer } from "../utils/auth";

export default function RootLayout() {
  const [customer, setCustomer] = useState<TestCustomer | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    const c = await getCurrentCustomer();
    setCustomer(c);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Auth gating: redirect to login if not authenticated,
  // unless already on the login screen or on consent/authorize (deep link entry)
  useEffect(() => {
    if (customer === undefined) return; // still loading

    const onLoginScreen = segments[0] === "login";
    const onConsentAuthorize = segments[0] === "consent" && segments[1] === "authorize";

    if (!customer && !onLoginScreen && !onConsentAuthorize) {
      router.replace("/login");
    } else if (customer && onLoginScreen) {
      router.replace("/");
    }
  }, [customer, segments, router]);

  // Loading state
  if (customer === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#4D9134" />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#4D9134" },
          headerTintColor: "#FFF",
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: "#F5F5F5" },
        }}
      >
        <Stack.Screen
          name="login"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="consent/authorize"
          options={{
            title: "Authorize Consent",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="consent/[consentId]"
          options={{ title: "Consent Details" }}
        />
        <Stack.Screen
          name="payment/[consentId]"
          options={{
            title: "Confirm Payment",
            presentation: "modal",
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
});
