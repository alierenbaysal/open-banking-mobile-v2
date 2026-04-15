import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <SafeAreaView style={s.root}>
      <View style={s.card}>
        <Text style={s.t}>Hisab · expo-router Slot probe</Text>
        <Text style={s.b}>expo-router Slot + registerRootComponent worked — Stack is the culprit if this renders.</Text>
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
