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
    // No timeout — AsyncStorage.getItem on a freshly-loaded bundle can
    // take a beat on cold start; racing it against a short timer caused
    // us to treat legit sessions as signed-out on every deep-link return
    // ("asking for login again and again"). If the read genuinely hangs
    // the Stack below still renders so the UI never freezes; only the
    // auth-redirect side-effect waits for a real answer.
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => { refreshAuth(); }, [refreshAuth, segments]);

  // Deep-link listener — route BD Online callbacks into /(public)/callback.
  // Matches BOTH URL shapes:
  //   masroofi://callback?code=...&state=...                (standalone)
  //   exp://expo-masroofi.omtd.bankdhofar.com/--/callback?… (Expo Go)
  // In the Expo Go form, hostname is the Metro host and the in-app path
  // lives in parsed.path ("callback" with the --/ stripped by Linking).
  useEffect(() => {
    const handle = (event: { url: string }) => {
      const { url } = event;
      if (!url) return;
      const parsed = Linking.parse(url);
      const pathStr = (parsed.path || "").replace(/^--\//, "");
      const isCallback =
        parsed.hostname === "callback" || pathStr === "callback" || pathStr.endsWith("/callback");
      if (isCallback) {
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

  // Render the Stack immediately even while auth is still resolving. A
  // gating spinner here blocks router.push() events queued during mount
  // (deep-link callbacks) because the navigator hasn't been created yet;
  // that caused a frozen purple ActivityIndicator on return from BD Online.
  // Auth redirects happen in the effect above once `user` resolves; until
  // then the initial route renders naturally.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(auth)" />
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
