/**
 * Welcome / landing screen — public entry point for merchants.
 *
 * Shown when a user opens the app without a payment deep-link and is not
 * logged in. Provides a short marketing intro + CTAs for sign-in and
 * "watch demo payment".
 */

import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { CUSTOMER_THEME, FONT, RADIUS } from "../../theme";

const FEATURES = [
  {
    icon: "flash" as const,
    title: "Instant settlement",
    body: "Same-day value dates for Bank Dhofar accounts, T+1 for others.",
  },
  {
    icon: "shield-checkmark" as const,
    title: "OBIE-grade security",
    body: "Every payment consented through BD Online OAuth — no card data on your phone.",
  },
  {
    icon: "trending-up" as const,
    title: "Real-time insights",
    body: "Live KPIs, success-rate gauge, throughput charts — right in your pocket.",
  },
];

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Text style={styles.logoGlyph}>S</Text>
            </View>
            <View>
              <Text style={styles.brand}>Sadad</Text>
              <Text style={styles.tagline}>Merchant payments by Bank Dhofar</Text>
            </View>
          </View>

          <Text style={styles.headline}>
            Accept payments{"\n"}from every bank in Oman.
          </Text>
          <Text style={styles.sub}>
            One SDK, one dashboard, one settlement file. Built on Bank Dhofar Open
            Banking rails.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={20} color={CUSTOMER_THEME.brand.primary} />
              </View>
              <View style={styles.featureBody}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureText}>{f.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.cta}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.primaryBtnText}>Merchant sign in</Text>
            <Ionicons name="arrow-forward" size={18} color={CUSTOMER_THEME.text.onBrand} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => router.push("/pay/demo-session-001")}
          >
            <Text style={styles.secondaryBtnText}>Try a demo payment</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Powered by Bank Dhofar Open Banking · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: CUSTOMER_THEME.bg.canvas,
  },
  scroll: {
    paddingBottom: 40,
  },
  hero: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 40,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: CUSTOMER_THEME.brand.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGlyph: {
    color: CUSTOMER_THEME.text.onBrand,
    fontSize: 24,
    fontWeight: "900",
  },
  brand: {
    fontSize: FONT.xl,
    fontWeight: "800",
    color: CUSTOMER_THEME.text.primary,
  },
  tagline: {
    fontSize: FONT.xs,
    color: CUSTOMER_THEME.text.muted,
    marginTop: 2,
  },
  headline: {
    fontSize: FONT.xxxl,
    fontWeight: "800",
    color: CUSTOMER_THEME.text.primary,
    lineHeight: 40,
    marginBottom: 10,
  },
  sub: {
    fontSize: FONT.md,
    color: CUSTOMER_THEME.text.secondary,
    lineHeight: 22,
  },
  features: {
    paddingHorizontal: 24,
    gap: 14,
    marginBottom: 32,
  },
  feature: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    backgroundColor: CUSTOMER_THEME.bg.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: CUSTOMER_THEME.border.default,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: CUSTOMER_THEME.brand.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureBody: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FONT.md,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.primary,
    marginBottom: 2,
  },
  featureText: {
    fontSize: FONT.sm,
    color: CUSTOMER_THEME.text.secondary,
    lineHeight: 18,
  },
  cta: {
    paddingHorizontal: 24,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: CUSTOMER_THEME.brand.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: {
    color: CUSTOMER_THEME.text.onBrand,
    fontSize: FONT.md,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 14,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: CUSTOMER_THEME.border.strong,
  },
  secondaryBtnText: {
    color: CUSTOMER_THEME.text.primary,
    fontSize: FONT.md,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  footer: {
    textAlign: "center",
    fontSize: FONT.xs,
    color: CUSTOMER_THEME.text.muted,
    marginTop: 30,
  },
});
