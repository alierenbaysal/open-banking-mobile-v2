/**
 * BankOption — selectable bank card used in the customer checkout.
 *
 * Renders an emoji/avatar "logo", bank name, status badge (Live / Coming soon),
 * and a right-aligned selection indicator.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { CUSTOMER_THEME, RADIUS } from "../theme";
import Badge from "./Badge";

export interface BankChoice {
  id: string;
  name: string;
  shortName: string;
  accent: string;         // brand hex
  emoji: string;          // cheap placeholder "logo"
  available: boolean;
  note?: string;
}

interface Props {
  bank: BankChoice;
  selected: boolean;
  onPress: () => void;
}

export default function BankOption({ bank, selected, onPress }: Props) {
  const disabled = !bank.available;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
    >
      <View style={[styles.logo, { backgroundColor: bank.accent }]}>
        <Text style={styles.logoText}>{bank.emoji}</Text>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.name, disabled && styles.nameDisabled]}>{bank.name}</Text>
        <View style={styles.subRow}>
          {bank.available ? (
            <Badge label="Live" tone="success" />
          ) : (
            <Badge label="Coming soon" tone="neutral" />
          )}
          {bank.note ? <Text style={styles.note}>{bank.note}</Text> : null}
        </View>
      </View>

      <View style={styles.tail}>
        {selected ? (
          <Ionicons name="checkmark-circle" size={26} color={CUSTOMER_THEME.brand.primary} />
        ) : (
          <Ionicons
            name="chevron-forward"
            size={22}
            color={disabled ? CUSTOMER_THEME.text.muted : CUSTOMER_THEME.text.secondary}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: CUSTOMER_THEME.bg.card,
    borderWidth: 1.5,
    borderColor: CUSTOMER_THEME.border.default,
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: CUSTOMER_THEME.brand.primary,
    backgroundColor: CUSTOMER_THEME.brand.primarySoft,
  },
  cardDisabled: {
    opacity: 0.55,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 22,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: CUSTOMER_THEME.text.primary,
    marginBottom: 4,
  },
  nameDisabled: {
    color: CUSTOMER_THEME.text.secondary,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  note: {
    fontSize: 12,
    color: CUSTOMER_THEME.text.muted,
  },
  tail: {
    width: 28,
    alignItems: "center",
  },
});
