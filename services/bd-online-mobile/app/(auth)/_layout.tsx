/**
 * (auth) layout — bottom tab navigator for the authenticated app shell.
 * Tabs: Home, Transfer, Consents, More.
 *
 * Non-tab routes (consent/approve, accounts/[id], consents/[id], loan/scan)
 * are declared as Stack screens that hide the tab bar via `tabBarStyle`
 * — but expo-router tabs handles this when navigating into a stack-only
 * route by hiding via `Tabs.Screen` declaration with `href: null`.
 */

import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { colors } from "../../utils/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={focused ? name : (`${name}-outline` as IoniconName)} size={size} color={color} />
    </View>
  );
}

export default function AuthLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: tabIcon("home"),
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{
          title: "Transfer",
          tabBarIcon: tabIcon("swap-horizontal"),
        }}
      />
      <Tabs.Screen
        name="consents"
        options={{
          title: "Consents",
          tabBarIcon: tabIcon("shield-checkmark"),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: tabIcon("grid"),
        }}
      />

      {/* Hidden routes — accessible via push, not in the tab bar */}
      <Tabs.Screen name="accounts/[id]" options={{ href: null }} />
      <Tabs.Screen name="consents/[id]" options={{ href: null }} />
      <Tabs.Screen name="consent/approve" options={{ href: null }} />
      <Tabs.Screen name="loan/scan" options={{ href: null }} />
      <Tabs.Screen name="loan/apply" options={{ href: null }} />
      <Tabs.Screen name="loan/offer" options={{ href: null }} />
    </Tabs>
  );
}
