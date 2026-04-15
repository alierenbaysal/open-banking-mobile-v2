/**
 * TEMPORARY DEBUG ROOT LAYOUT — SDK 54 isolation test.
 * If this minimal layout renders on Expo Go, the "expected boolean got string"
 * error is in the Stack/router/auth path below. Revert after diagnosis.
 */
import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function RootLayout() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Hisab · SDK 54 probe</Text>
        <Text style={styles.body}>
          If you can read this, Expo Go renders the app. The root layout is
          intentionally minimal — no Stack, no router effects — to isolate the
          "expected boolean got string" error.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F9FB", justifyContent: "center", paddingHorizontal: 20 },
  card: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 12 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8, color: "#101624" },
  body: { fontSize: 14, color: "#5B6573", lineHeight: 20 },
});
