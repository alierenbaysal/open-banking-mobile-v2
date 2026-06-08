/**
 * THEQA sign-in / registration — PRE-LOGIN.
 *
 * Unlike (auth)/verify.tsx (step-up eKYC for an already-logged-in customer),
 * this screen lets a customer register *or* log in with their THEQA national
 * digital identity before any bank session exists:
 *
 *   1. startVerification() → { reference, redirect_url }
 *   2. open redirect_url → THEQA SAS IdP → the customer approves in the THEQA app
 *      (SAS posts the SAML assertion to our SP's ACS, which records the
 *       verified national_id against the reference)
 *   3. poll getVerificationResult(reference) until it settles
 *   4. on `verified` → bankLoginWithTheqa(reference): the bank reads the verified
 *      identity server-side and create-or-finds the customer (onboard or login)
 *   5. store the BankUser → enter the authenticated app
 *
 * The deep-link return (bdonline://verify/callback) just brings the app back to
 * the foreground; the poll is the source of truth, so it works either way.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { bankLoginWithTheqa } from "../../utils/api";
import { getVerificationResult, startVerification } from "../../utils/theqa";
import { colors, radius, spacing } from "../../utils/theme";
import PrimaryButton from "../../components/PrimaryButton";

type Phase = "starting" | "redirecting" | "polling" | "success" | "failed";

export default function PublicTheqaScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("starting");
  const [message, setMessage] = useState<string>("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);

  // ---- exchange a verified reference for a bank session ----
  const finish = useCallback(
    async (reference: string) => {
      try {
        const user = await bankLoginWithTheqa(reference);
        setPhase("success");
        setMessage(
          user.onboarded
            ? `Welcome, ${user.first_name}. Your account is ready.`
            : `Signed in as ${user.first_name} ${user.last_name}.`,
        );
        setTimeout(() => router.replace("/(auth)"), 900);
      } catch (e) {
        setPhase("failed");
        setMessage(
          e instanceof Error ? e.message : "Could not complete sign-in.",
        );
      }
    },
    [router],
  );

  // ---- poll the verification until it settles ----
  const poll = useCallback(
    async (reference: string) => {
      if (stopped.current) return;
      try {
        const result = await getVerificationResult(reference);
        if (result.status === "pending") {
          pollTimer.current = setTimeout(() => poll(reference), 2000);
          return;
        }
        if (result.status === "verified") {
          await finish(reference);
        } else {
          setPhase("failed");
          setMessage(result.error || "Verification was not completed.");
        }
      } catch (e) {
        setPhase("failed");
        setMessage(
          e instanceof Error ? e.message : "Could not read verification result.",
        );
      }
    },
    [finish],
  );

  // ---- kick off a fresh verification ----
  const initiate = useCallback(async () => {
    try {
      setPhase("starting");
      stopped.current = false;
      // No customer exists yet — identity is established by THEQA itself.
      const { reference, redirect_url } = await startVerification(
        "bd-online",
        "login",
      );
      setPhase("redirecting");
      poll(reference); // start polling immediately; survives the browser hop
      await Linking.openURL(redirect_url);
    } catch (e) {
      setPhase("failed");
      setMessage(
        e instanceof Error ? e.message : "Could not start THEQA sign-in.",
      );
    }
  }, [poll]);

  useEffect(() => {
    initiate();
    return () => {
      stopped.current = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [initiate]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {phase === "success" ? (
          <Ionicons name="shield-checkmark" size={64} color={colors.primary} />
        ) : phase === "failed" ? (
          <Ionicons name="close-circle" size={64} color={colors.danger} />
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}

        <Text style={styles.title}>
          {phase === "success"
            ? "You're in"
            : phase === "failed"
              ? "Sign-in Failed"
              : phase === "redirecting"
                ? "Opening THEQA…"
                : phase === "polling"
                  ? "Confirming with THEQA…"
                  : "Starting THEQA sign-in…"}
        </Text>

        <Text style={styles.subtitle}>
          Sign in or register with your THEQA national digital identity.
        </Text>

        {!!message && <Text style={styles.message}>{message}</Text>}

        {phase === "failed" && (
          <View style={styles.actions}>
            <PrimaryButton label="Try Again" onPress={initiate} fullWidth />
            <Text
              style={styles.link}
              onPress={() => router.replace("/(public)/login")}
            >
              Use email & password instead
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  message: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: spacing.md,
    alignSelf: "stretch",
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 15,
    paddingVertical: spacing.sm,
  },
});
