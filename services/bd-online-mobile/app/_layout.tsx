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
import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getStoredUser, type BankUser } from "../utils/api";
import { colors } from "../utils/theme";

interface PendingConsent {
  consent_id: string;
  redirect_uri: string;
  state: string;
}

interface PendingLoan {
  application_id: string;
  dealer_id: string;
}

function parseConsentFromUrl(url: string | null | undefined): PendingConsent | null {
  if (!url) return null;
  try {
    const p = Linking.parse(url);
    const qp = p.queryParams || {};
    const consent_id = typeof qp.consent_id === "string" ? qp.consent_id : null;
    if (!consent_id) return null;
    return {
      consent_id,
      redirect_uri: typeof qp.redirect_uri === "string" ? qp.redirect_uri : "",
      state: typeof qp.state === "string" ? qp.state : "",
    };
  } catch {
    return null;
  }
}

function parseLoanFromUrl(url: string | null | undefined): PendingLoan | null {
  if (!url) return null;
  try {
    const p = Linking.parse(url);
    if (!p.path?.includes("loan/apply")) return null;
    const qp = p.queryParams || {};
    const a = typeof qp.a === "string" ? qp.a : null;
    const d = typeof qp.d === "string" ? qp.d : "";
    if (!a) return null;
    return { application_id: a, dealer_id: d };
  } catch {
    return null;
  }
}

export default function RootLayout() {
  const [user, setUser] = useState<BankUser | null | undefined>(undefined);
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(null);
  const [pendingLoan, setPendingLoan] = useState<PendingLoan | null>(null);
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

  // Capture the INITIAL URL + any subsequent deep links. expo-router's
  // useGlobalSearchParams misses params on cold launch from a URL, so
  // parse them ourselves and stash in local state.
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const consent = parseConsentFromUrl(url);
      if (consent) { setPendingConsent(consent); return; }
      const loan = parseLoanFromUrl(url);
      if (loan) setPendingLoan(loan);
    });
    const sub = Linking.addEventListener("url", (ev) => {
      const consent = parseConsentFromUrl(ev.url);
      if (consent) { setPendingConsent(consent); return; }
      const loan = parseLoanFromUrl(ev.url);
      if (loan) setPendingLoan(loan);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (user === undefined) return; // still loading
    const inPublic = segments[0] === "(public)";
    const inAuth = segments[0] === "(auth)";
    // Deep link with consent params — user is coming from a TPP (Masroofi,
    // Hisab, etc.) wanting consent approval, regardless of which route
    // expo-router initially landed on. Honour that before anything else.
    // Prefer the locally-stashed pendingConsent (captured from initial URL
    // + Linking events) over useGlobalSearchParams, which is unreliable
    // on cold-launch deep links.
    const consentId = pendingConsent?.consent_id || params.consent_id;
    const redirectUri = pendingConsent?.redirect_uri || params.redirect_uri || "";
    const state = pendingConsent?.state || params.state || "";
    const alreadyOnApprove = inAuth && segments[1] === "consent" && segments[2] === "approve";

    if (consentId && !alreadyOnApprove) {
      if (!user) {
        router.replace({
          pathname: "/(public)/login",
          params: { consent_id: consentId, redirect_uri: redirectUri, state },
        });
      } else {
        router.replace({
          pathname: "/(auth)/consent/approve",
          params: { consent_id: consentId, redirect_uri: redirectUri, state },
        });
      }
      setPendingConsent(null);
      return;
    }

    const loanAppId = pendingLoan?.application_id;
    const loanDealerId = pendingLoan?.dealer_id || "";
    const alreadyOnLoan = inAuth && segments[1] === "loan" && segments[2] === "apply";

    if (loanAppId && !alreadyOnLoan) {
      if (!user) {
        router.replace({
          pathname: "/(public)/login",
          params: { loan_app_id: loanAppId, loan_dealer_id: loanDealerId },
        });
      } else {
        router.replace({
          pathname: "/(auth)/loan/apply",
          params: { a: loanAppId, d: loanDealerId },
        });
      }
      setPendingLoan(null);
      return;
    }

    if (!user && !inPublic) {
      router.replace("/(public)/login");
    } else if (user && inPublic) {
      router.replace("/(auth)");
    } else if (user && !inAuth && !inPublic) {
      router.replace("/(auth)");
    }
  }, [user, segments, router, pendingConsent, pendingLoan, params.consent_id, params.redirect_uri, params.state]);

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
