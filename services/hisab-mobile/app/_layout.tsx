/**
 * Debug #3 — Stack with zero props. If this crashes, Stack itself is
 * broken on SDK 54 for this env. If it works, then one of the original
 * screenOptions was the bad input.
 */
import React from "react";
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack />;
}
