/**
 * Login screen — bank's own login form (email + password).
 * Calls POST /api/bank-auth/login. On success the session cookie is captured
 * and the user is redirected either to the consent approval flow (if a
 * consent_id is present) or to the authenticated home.
 */

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { bankLogin } from "../../utils/api";
import { colors, gradients, radius, shadow, spacing } from "../../utils/theme";
import PrimaryButton from "../../components/PrimaryButton";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    consent_id?: string;
    redirect_uri?: string;
    state?: string;
    loan_app_id?: string;
    loan_dealer_id?: string;
  }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasConsent = !!params.consent_id;
  const hasLoan = !!params.loan_app_id;

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await bankLogin(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
      if (hasConsent) {
        router.replace({
          pathname: "/(auth)/consent/approve",
          params: {
            consent_id: params.consent_id || "",
            redirect_uri: params.redirect_uri || "",
            state: params.state || "",
          },
        });
      } else if (hasLoan) {
        router.replace({
          pathname: "/(auth)/loan/scan",
          params: {
            a: params.loan_app_id || "",
            d: params.loan_dealer_id || "",
          },
        });
      } else {
        router.replace("/(auth)");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Login failed";
      setError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => undefined,
      );
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
      {/* BUILD_BADGE_INJECTED */}
      <View style={{position:"absolute",top:4,right:8,zIndex:10,backgroundColor:"#F59E0B",paddingHorizontal:8,paddingVertical:3,borderRadius:6}}>
        <Text style={{color:"white",fontSize:10,fontWeight:"700"}}>v3 · 2026-05-14 22:16 Oman</Text>
      </View>
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.logoCircle}>
            <Ionicons name="business" size={36} color={colors.white} />
          </View>
          <Text style={styles.brand}>Bank Dhofar</Text>
          <Text style={styles.tagline}>Online Banking</Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.welcome}>Welcome back</Text>
          <Text style={styles.welcomeSub}>
            Sign in to manage your accounts and approvals
          </Text>

          {(hasConsent || hasLoan) && (
            <View style={styles.consentNotice}>
              <Ionicons name={hasLoan ? "car-sport" : "shield-checkmark"} size={18} color={colors.primary} />
              <Text style={styles.consentNoticeText}>
                {hasLoan
                  ? "A dealer is requesting loan pre-approval. Sign in to review."
                  : "A service is requesting access to your account. Sign in to review."}
              </Text>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                style={styles.eye}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          <PrimaryButton
            label={submitting ? "Signing in..." : "Sign In"}
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            fullWidth
            rightIcon={
              !submitting ? (
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              ) : undefined
            }
            style={{ marginTop: spacing.md }}
          />

          <Text style={styles.footnote}>
            Secured by Bank Dhofar. Your session is encrypted end-to-end.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { flexGrow: 1 },
  hero: {
    paddingTop: 80,
    paddingBottom: 60,
    alignItems: "center",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  brand: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.4,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    marginTop: 4,
  },
  formCard: {
    marginHorizontal: spacing.lg,
    marginTop: -28,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radius.xl,
    ...shadow.raised,
  },
  welcome: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  welcomeSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  consentNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  consentNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryDark,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FEF2F2",
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
  },
  field: { marginBottom: spacing.md },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: { paddingLeft: spacing.md },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  eye: { padding: spacing.md },
  footnote: {
    fontSize: 11,
    color: colors.textFaint,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
