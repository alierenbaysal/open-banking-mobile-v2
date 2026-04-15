/**
 * Debug root layout #2 — minimal expo-router. Just <Slot />.
 * No Stack, no auth gating. Tests whether any expo-router use works on SDK 54.
 */
import React from "react";
import { Slot } from "expo-router";

export default function RootLayout() {
  return <Slot />;
}
