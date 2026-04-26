/**
 * Checkout — order review, delivery details, payment method (Bank Dhofar),
 * and "Pay with Bank Dhofar" CTA. The CTA simulates a Sadad deep-link into
 * the BD Online OAuth flow and then lands the user on the success screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCart, computeTotals } from '../../../utils/cart';
import { formatOMR } from '../../../utils/format';
import { theme } from '../../../utils/theme';
import ProductArtwork from '../../../components/ProductArtwork';
import ScreenHeader from '../../../components/ScreenHeader';
import PrimaryButton from '../../../components/PrimaryButton';
import { createPaymentIntent } from '../../../utils/payment';
import { openBankConsent } from '../../../utils/consent';

type PayMethod = 'bdpay' | 'card';

export default function CheckoutScreen() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.price, 0);
  const totals = computeTotals(subtotal);

  const [fullName, setFullName] = useState('Ahmed Al-Hinai');
  const [phone, setPhone] = useState('+968 9123 4567');
  const [address, setAddress] = useState('Haffa House, Salalah, Dhofar');
  const [method, setMethod] = useState<PayMethod>('bdpay');
  const [submitting, setSubmitting] = useState(false);

  if (lines.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <ScreenHeader title="Checkout" />
        <View style={styles.empty}>
          <Ionicons name="bag-outline" size={40} color={theme.colors.textFaint} />
          <Text style={styles.emptyTitle}>Nothing to check out</Text>
          <PrimaryButton
            title="Back to souq"
            icon="arrow-back"
            variant="outline"
            onPress={() => router.replace('/store')}
            style={{ marginTop: 20 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handlePay = async () => {
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      Alert.alert('Missing details', 'Please fill in name, phone, and address.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setSubmitting(true);
    try {
      const intent = createPaymentIntent(totals.total);
      await openBankConsent(intent.merchantRef, totals.total.toFixed(3));
    } catch {
      Alert.alert(
        'Cannot open Bank Dhofar',
        'Make sure BD Online is installed on this device.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScreenHeader title="Checkout" subtitle={`${lines.length} items`} showCart={false} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Order summary */}
        <Animated.View entering={FadeInDown} style={styles.section}>
          <Text style={styles.sectionTitle}>Your order</Text>
          {lines.map((l) => (
            <View key={l.productId} style={styles.lineRow}>
              <View style={styles.lineArt}>
                <ProductArtwork kind={l.kind} size={44} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineName} numberOfLines={1}>{l.name}</Text>
                <Text style={styles.lineMeta}>
                  {l.quantity} × {formatOMR(l.price)}
                </Text>
              </View>
              <Text style={styles.linePrice}>{formatOMR(l.quantity * l.price)}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Delivery */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery address</Text>
          <Field label="Full name" value={fullName} onChangeText={setFullName} icon="person-outline" />
          <Field label="Phone" value={phone} onChangeText={setPhone} icon="call-outline" />
          <Field
            label="Street address"
            value={address}
            onChangeText={setAddress}
            icon="location-outline"
            multiline
          />
        </Animated.View>

        {/* Payment method */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <Text style={styles.sectionTitle}>Payment method</Text>
          <Pressable
            onPress={() => setMethod('bdpay')}
            style={[styles.methodCard, method === 'bdpay' && styles.methodActive]}
          >
            <LinearGradient
              colors={['#D35400', '#A04000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bdLogo}
            >
              <Ionicons name="business" size={22} color="#FFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle}>Pay with Bank Dhofar</Text>
              <Text style={styles.methodSubtitle}>
                Approve via BD Online · No card details shared
              </Text>
            </View>
            <Ionicons
              name={method === 'bdpay' ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={theme.colors.primary}
            />
          </Pressable>

          <Pressable
            onPress={() => setMethod('card')}
            style={[styles.methodCard, method === 'card' && styles.methodActive]}
          >
            <View style={[styles.bdLogo, { backgroundColor: theme.colors.gold }]}>
              <Ionicons name="card" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle}>Credit / debit card</Text>
              <Text style={styles.methodSubtitle}>Visa, Mastercard, and Oman Net</Text>
            </View>
            <Ionicons
              name={method === 'card' ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={theme.colors.primary}
            />
          </Pressable>
        </Animated.View>

        {/* Totals */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Row label="Subtotal" value={formatOMR(totals.subtotal)} />
          <Row label="Shipping" value={formatOMR(totals.shipping)} />
          <Row label="VAT (5%)" value={formatOMR(totals.vat)} />
          <View style={styles.divider} />
          <Row label="Total" value={formatOMR(totals.total)} bold />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(260)} style={styles.trust}>
          <Ionicons name="lock-closed" size={16} color={theme.colors.success} />
          <Text style={styles.trustText}>
            Secured by Bank Dhofar Sadad gateway · PCI-DSS compliant
          </Text>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyTotalLabel}>Pay total</Text>
          <Text style={styles.stickyTotal}>{formatOMR(totals.total)}</Text>
        </View>
        <PrimaryButton
          title={method === 'bdpay' ? 'Pay with Bank Dhofar' : 'Pay securely'}
          icon="shield-checkmark"
          onPress={handlePay}
          loading={submitting}
          style={{ flex: 1 }}
          testID="pay-btn"
        />
      </View>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  icon,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: any;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={theme.colors.textFaint} />
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <TextInput
          style={[styles.fieldInput, multiline && { minHeight: 40 }]}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          placeholderTextColor={theme.colors.textFaint}
        />
      </View>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryLabelBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 16 },
  section: {
    backgroundColor: theme.colors.bgCard,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: 10,
  },

  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  lineArt: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  lineMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  linePrice: { fontWeight: '800', color: theme.colors.primary },

  field: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  fieldLabel: {
    fontSize: 11,
    color: theme.colors.textFaint,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  fieldInput: {
    paddingVertical: 4,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },

  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: 10,
  },
  methodActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.bgMuted,
  },
  bdLogo: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: { fontWeight: '800', color: theme.colors.text, fontSize: 14 },
  methodSubtitle: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: { color: theme.colors.textMuted, fontSize: 13 },
  summaryLabelBold: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  summaryValue: { color: theme.colors.text, fontWeight: '600' },
  summaryValueBold: { color: theme.colors.primary, fontWeight: '800', fontSize: 17 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 8 },

  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    padding: 12,
    backgroundColor: '#F1F8E9',
    borderRadius: theme.radius.md,
  },
  trustText: { flex: 1, color: theme.colors.success, fontSize: 12, fontWeight: '600' },

  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    paddingBottom: 20,
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  stickyTotalLabel: { color: theme.colors.textFaint, fontSize: 11, fontWeight: '700' },
  stickyTotal: { fontWeight: '800', color: theme.colors.primary, fontSize: 18 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginTop: 16 },
});
