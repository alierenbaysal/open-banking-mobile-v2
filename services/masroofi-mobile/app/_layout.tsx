/**
 * Root layout — auth gating + global status bar + gesture root.
 *
 * Listens for deep-link callbacks from BD Online (`masroofi://callback`)
 * and routes them into the dedicated callback screen.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";

import { getCurrentUser, MasroofiUser } from "../utils/auth";
import { theme } from "../utils/theme";

export default function RootLayout() {
  const [user, setUser] = useState<MasroofiUser | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();

  const refreshAuth = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);
  }, []);

  useEffect(() => { refreshAuth(); }, [refreshAuth, segments]);

  // Deep-link listener — route BD Online callbacks into /(public)/callback
  useEffect(() => {
    const handle = (event: { url: string }) => {
      const { url } = event;
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.hostname === "callback") {
        const params: Record<string, string> = {};
        const qp = parsed.queryParams || {};
        for (const [k, v] of Object.entries(qp)) {
          if (typeof v === "string") params[k] = v;
        }
        router.push({ pathname: "/callback", params });
      }
    };

    Linking.getInitialURL().then((initial) => {
      if (initial) handle({ url: initial });
    });

    const sub = Linking.addEventListener("url", handle);
    return () => sub.remove();
  }, [router]);

  // Auth gating: redirect unauth'd users away from (auth) group.
  useEffect(() => {
    if (user === undefined) return; // still resolving

    const inAuthGroup = segments[0] === "(auth)";
    const inPublicGroup = segments[0] === "(public)";

    if (!user && inAuthGroup) {
      router.replace("/welcome");
    } else if (user && inPublicGroup) {
      // Allow explicit visits to the callback/connect flow even when signed in
      const sub = segments[1];
      if (sub !== "callback" && sub !== "connect") {
        router.replace("/");
      }
    }
  }, [user, segments, router]);

  if (user === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: "fade",
        }}
      >
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.bg,
  },
});
