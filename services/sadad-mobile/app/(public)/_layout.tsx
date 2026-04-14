/**
 * Public routes — customer checkout + merchant login.
 * Light Stack navigator, no header (screens draw their own chrome).
 */

import React from "react";
import { Stack } from "expo-router";

import { CUSTOMER_THEME } from "../../theme";

export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: CUSTOMER_THEME.bg.canvas },
        animation: "slide_from_right",
      }}
    />
  );
}
