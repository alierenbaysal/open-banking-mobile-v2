/**
 * Stack for unauthenticated screens (welcome, login, signup, callback).
 */

import React from "react";
import { Stack } from "expo-router";

import { theme } from "../../utils/theme";

export default function PublicLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    />
  );
}
