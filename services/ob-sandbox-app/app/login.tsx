/**
 * Login screen — sandbox authentication with test customers.
 *
 * Bank Dhofar branded with green theme. Two test customers:
 * - Ahmed Al-Balushi (CUST-001): username "ahmed", password "ahmed"
 * - Fatima Al-Rashdi (CUST-002): username "fatima", password "fatima"
 */

import React, { useState } from "react";
import {
  Alert,
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

import { login, TEST_CUSTOMERS } from "../utils/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      const customer = await login(username.trim(), password.trim());
      if (customer) {
        router.replace("/");
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
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
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header / Branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#FFF" />
          </View>
          <Text style={styles.appName}>BD Sandbox</Text>
          <Text style={styles.bankName}>Bank Dhofar</Text>
          <Text style={styles.bankNameAr}>
            {"\u0628\u0646\u0643 \u0638\u0641\u0627\u0631"}
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.welcomeTextAr}>
            {"\u0623\u0647\u0644\u0627\u064b \u0628\u0643"}
          </Text>
          <Text style={styles.subtitle}>
            Sign in to manage your Open Banking consents
          </Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={18} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#BBB"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#BBB"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#999"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.loginButtonText}>Signing in...</Text>
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        {/* Sandbox Info */}
        <View style={styles.sandboxInfo}>
          <View style={styles.sandboxBadge}>
            <Ionicons name="flask-outline" size={16} color="#FF9800" />
            <Text style={styles.sandboxBadgeText}>SANDBOX</Text>
          </View>

          <Text style={styles.sandboxDescription}>
            This is a sandbox app for testing Open Banking consent flows.
            Use the test credentials below to sign in.
          </Text>

          <View style={styles.testCredentials}>
            <Text style={styles.credentialsTitle}>Test Customers:</Text>
            {TEST_CUSTOMERS.map((c) => (
              <Pressable
                key={c.customer_id}
                style={styles.credentialRow}
                onPress={() => {
                  setUsername(c.username);
                  setPassword(c.username);
                  setError("");
                }}
              >
                <View style={styles.credentialInfo}>
                  <Text style={styles.credentialName}>{c.full_name}</Text>
                  <Text style={styles.credentialNameAr}>{c.full_name_ar}</Text>
                  <Text style={styles.credentialDetail}>
                    {c.accounts.length} account{c.accounts.length !== 1 ? "s" : ""} | {c.customer_id}
                  </Text>
                </View>
                <View style={styles.credentialCreds}>
                  <Text style={styles.credentialLabel}>
                    {c.username} / {c.username}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#4D9134",
    paddingTop: 70,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
  },
  bankName: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  bankNameAr: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  formContainer: {
    backgroundColor: "#FFF",
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222",
  },
  welcomeTextAr: {
    fontSize: 20,
    color: "#888",
    textAlign: "right",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#D32F2F",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#222",
  },
  eyeButton: {
    padding: 14,
  },
  loginButton: {
    backgroundColor: "#4D9134",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  sandboxInfo: {
    padding: 20,
    marginTop: 8,
  },
  sandboxBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  sandboxBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FF9800",
    letterSpacing: 1,
  },
  sandboxDescription: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  testCredentials: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  credentialsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  credentialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  credentialInfo: {
    flex: 1,
  },
  credentialName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  credentialNameAr: {
    fontSize: 13,
    color: "#888",
    textAlign: "right",
  },
  credentialDetail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  credentialCreds: {
    backgroundColor: "#F0F8ED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 12,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4D9134",
    fontFamily: "monospace",
  },
});
