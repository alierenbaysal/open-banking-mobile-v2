/**
 * Root layout — auth gating + Stack navigator.
 *
 * Routes:
 *   (public)/login          — sign-in
 *   (auth)/...              — authenticated app shell (tab navigator)
 *
 * Auth gating: on every change of `segments`, decide which group the user
 * should be in based on the stored session. Unauthenticated users are
 * redirected to /login (preserving any deep-link consent params).
 */

import "react-native-gesture-handler";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getStoredUser, type BankUser } from "../utils/api";
import { colors } from "../utils/theme";

export default function RootLayout() {
  const [user, setUser] = useState<BankUser | null | undefined>(undefined);
  const segments = useSegments();
  const router = useRouter();
  const params = useGlobalSearchParams<{
    consent_id?: string;
    redirect_uri?: string;
    state?: string;
  }>();

  const checkAuth = useCallback(async () => {
    const u = await getStoredUser();
    setUser(u);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth, segments]);

  useEffect(() => {
    if (user === undefined) return; // still loading
    const inPublic = segments[0] === "(public)";
    const inAuth = segments[0] === "(auth)";

    if (!user && !inPublic) {
      // Not signed in, redirect to login (preserve consent params if present).
      const consentId = params.consent_id;
      if (consentId) {
        router.replace({
          pathname: "/(public)/login",
          params: {
            consent_id: consentId,
            redirect_uri: params.redirect_uri || "",
            state: params.state || "",
          },
        });
      } else {
        router.replace("/(public)/login");
      }
    } else if (user && inPublic) {
      router.replace("/(auth)");
    } else if (user && !inAuth && !inPublic) {
      router.replace("/(auth)");
    }
  }, [user, segments, router, params.consent_id, params.redirect_uri, params.state]);

  if (user === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
});
