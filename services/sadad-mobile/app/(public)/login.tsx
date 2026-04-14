/**
 * Merchant login screen.
 * Demo auth with a small list of test merchants (see utils/auth.ts).
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { CUSTOMER_THEME, FONT, RADIUS } from "../../theme";
import { login, TEST_MERCHANTS } from "../../utils/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in both fields");
      return;
    }
    setLoading(true);
    try {
      const m = await login(username.trim(), password.trim());
      if (m) {
        router.replace("/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Login failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={CUSTOMER_THEME.text.primary} />
          </Pressable>
          <View style={styles.logo}>
            <Text style={styles.logoGlyph}>S</Text>
          </View>
          <Text style={styles.brand}>Sadad Merchant</Text>
          <Text style={styles.sub}>Sign in to your merchant dashboard</Text>
        </View>

        <View style={styles.card}>
          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={CUSTOMER_THEME.status.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Merchant username</Text>
            <View style={styles.input}>
              <Ionicons name="storefront-outline" size={18} color={CUSTOMER_THEME.text.muted} />
              <TextInput
                style={styles.textInput}
                placeholder="salalah"
                placeholderTextColor={CUSTOMER_THEME.text.muted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.input}>
              <Ionicons name="lock-closed-outline" size={18} color={CUSTOMER_THEME.text.muted} />
              <TextInput
                style={styles.textInput}
                placeholder="password"
                placeholderTextColor={CUSTOMER_THEME.text.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPassword((s) => !s)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={CUSTOMER_THEME.text.muted}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? "Signing in..." : "Sign in"}</Text>
          </Pressable>
        </View>

        <View style={styles.hints}>
          <Text style={styles.hintTitle}>Demo merchants</Text>
          {TEST_MERCHANTS.map((m) => (
            <Pressable
              key={m.merchant_id}
              style={styles.hintRow}
              onPress={() => {
                setUsername(m.username);
                setPassword(m.username);
                setError("");
              }}
            >
              <View style={styles.hintMeta}>
                <Text style={styles.hintName}>{m.display_name}</Text>
                <Text style={styles.hintDetail}>{m.legal_name}</Text>
              </View>
              <View style={styles.hintCreds}>
                <Text style={styles.hintCredsText}>{m.username} / {m.username}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CUSTOMER_THEME.bg.canvas,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: "center",
  },
  back: {
    position: "absolute",
    top: 20,
    left: 16,
    padding: 8,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    backgroundColor: CUSTOMER_THEME.brand.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  logoGlyph: {
    color: CUSTOMER_THEME.text.onBrand,
    fontSize: 28,
    fontWeight: "900",
  },
  brand: {
    fontSize: FONT.xl,
    fontWeight: "800",
    color: CUSTOMER_THEME.text.primary,
  },
  sub: {
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.text.muted,
    marginTop: 4,
  },
  card: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: RADIUS.xl,
    backgroundColor: CUSTOMER_THEME.bg.card,
    borderWidth: 1,
    borderColor: CUSTOMER_THEME.border.default,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: RADIUS.md,
    backgroundColor: CUSTOMER_THEME.status.errorBg,
    marginBottom: 14,
  },
  errorText: {
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.status.error,
    flex: 1,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: FONT.sm,
    fontWeight: "600",
    color: CUSTOMER_THEME.text.secondary,
    marginBottom: 6,
  },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: CUSTOMER_THEME.bg.muted,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: CUSTOMER_THEME.border.default,
  },
  textInput: {
    flex: 1,
    fontSize: FONT.md,
    color: CUSTOMER_THEME.text.primary,
  },
  btn: {
    backgroundColor: CUSTOMER_THEME.brand.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.onBrand,
  },
  hints: {
    marginTop: 28,
    marginHorizontal: 24,
    padding: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: CUSTOMER_THEME.bg.surface,
    borderWidth: 1,
    borderColor: CUSTOMER_THEME.border.default,
  },
  hintTitle: {
    fontSize: FONT.sm,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.secondary,
    marginBottom: 10,
  },
  hintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: CUSTOMER_THEME.border.default,
  },
  hintMeta: {
    flex: 1,
  },
  hintName: {
    fontSize: FONT.sm,
    fontWeight: "600",
    color: CUSTOMER_THEME.text.primary,
  },
  hintDetail: {
    fontSize: FONT.xs,
    color: CUSTOMER_THEME.text.muted,
    marginTop: 2,
  },
  hintCreds: {
    backgroundColor: CUSTOMER_THEME.brand.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  hintCredsText: {
    fontSize: FONT.xs,
    fontWeight: "700",
    color: CUSTOMER_THEME.brand.primary,
    fontFamily: "monospace",
  },
});
