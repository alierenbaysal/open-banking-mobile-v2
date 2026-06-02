/**
 * THEQA identity verification screen.
 *
 * Two modes, driven by route params:
 *   - No `ref`  → initiate: call startVerification(), open the THEQA SAS URL.
 *   - `ref`+`status` (returned via bdonline://verify/callback) → show the
 *     result, polling getVerificationResult() until it settles.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { getStoredUser } from "../../utils/api";
import {
  getVerificationResult,
  startVerification,
  type VerificationStatus,
} from "../../utils/theqa";
import { colors, radius, spacing } from "../../utils/theme";
import PrimaryButton from "../../components/PrimaryButton";

type Phase = "starting" | "redirecting" | "polling" | "verified" | "failed";

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string; status?: string }>();
  const [phase, setPhase] = useState<Phase>(params.ref ? "polling" : "starting");
  const [message, setMessage] = useState<string>("");
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- initiate a fresh verification ----
  const initiate = useCallback(async () => {
    try {
      setPhase("starting");
      const user = await getStoredUser();
      if (!user) {
        setPhase("failed");
        setMessage("Please sign in before verifying your identity.");
        return;
      }
      const { redirect_url } = await startVerification(user.customer_id);
      setPhase("redirecting");
      // Hand off to the THEQA SAS IdP — the customer approves in the THEQA app.
      await Linking.openURL(redirect_url);
    } catch (e) {
      setPhase("failed");
      setMessage(e instanceof Error ? e.message : "Could not start verification.");
    }
  }, []);

  // ---- poll a returning verification ----
  const poll = useCallback(async (reference: string) => {
    try {
      const result = await getVerificationResult(reference);
      if (result.status === "pending") {
        pollTimer.current = setTimeout(() => poll(reference), 2000);
        return;
      }
      setPhase(result.status === "verified" ? "verified" : "failed");
      setMessage(
        result.status === "verified"
          ? "Your identity has been verified with THEQA."
          : result.error || "Verification was not completed.",
      );
    } catch (e) {
      setPhase("failed");
      setMessage(e instanceof Error ? e.message : "Could not read verification result.");
    }
  }, []);

  useEffect(() => {
    if (params.ref) {
      const incoming = (params.status as VerificationStatus) || "pending";
      if (incoming === "failed") {
        setPhase("failed");
        setMessage("Verification was cancelled or failed.");
      } else {
        poll(params.ref);
      }
    } else {
      initiate();
    }
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [params.ref, params.status, initiate, poll]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {phase === "verified" ? (
          <Ionicons name="shield-checkmark" size={64} color={colors.primary} />
        ) : phase === "failed" ? (
          <Ionicons name="close-circle" size={64} color={colors.danger} />
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}

        <Text style={styles.title}>
          {phase === "verified"
            ? "Identity Verified"
            : phase === "failed"
              ? "Verification Failed"
              : phase === "redirecting"
                ? "Opening THEQA…"
                : phase === "polling"
                  ? "Confirming with THEQA…"
                  : "Starting verification…"}
        </Text>

        {!!message && <Text style={styles.message}>{message}</Text>}

        {(phase === "verified" || phase === "failed") && (
          <View style={styles.actions}>
            {phase === "failed" && (
              <PrimaryButton title="Try Again" onPress={initiate} />
            )}
            <Text style={styles.link} onPress={() => router.replace("/(auth)")}>
              Back to Home
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
  message: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: { marginTop: spacing.md, alignItems: "center", gap: spacing.md, alignSelf: "stretch" },
  link: { color: colors.primary, fontWeight: "600", fontSize: 15, paddingVertical: spacing.sm },
});
