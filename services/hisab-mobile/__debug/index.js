import { registerRootComponent } from "expo";
import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

function App() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.card}>
        <Text style={s.t}>Hisab · Raw RN probe (no expo-router)</Text>
        <Text style={s.b}>If you can read this, the crash was in expo-router init.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F9FB", justifyContent: "center", paddingHorizontal: 20 },
  card: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 12 },
  t: { fontSize: 20, fontWeight: "700", color: "#101624", marginBottom: 8 },
  b: { fontSize: 14, color: "#5B6573", lineHeight: 20 },
});

registerRootComponent(App);
