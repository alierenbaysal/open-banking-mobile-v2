import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getStoredPaymentState, clearPaymentState, exchangeCodeAndPay } from '../utils/consent';
import { formatMerchantRef } from '../utils/payment';
import { formatOMR } from '../utils/format';
import { useCart } from '../utils/cart';
import { theme } from '../utils/theme';

type Phase = 'processing' | 'approved' | 'error';

export default function DeepLinkCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
  }>();
  const clearCart = useCart((s) => s.clear);
  const [phase, setPhase] = useState<Phase>('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payTotal, setPayTotal] = useState('0');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const stored = await getStoredPaymentState();
      const ref = stored.ref || 'BD-PAY';
      const total = stored.total || '0';
      setPayRef(ref);
      setPayTotal(total);

      if (params.error) {
        setErrorMsg('Payment was declined by Bank Dhofar.');
        setPhase('error');
        await clearPaymentState();
        return;
      }

      if (params.state && stored.state && params.state !== stored.state) {
        setErrorMsg('Security validation failed. Please try again.');
        setPhase('error');
        await clearPaymentState();
        return;
      }

      if (!params.code) {
        setErrorMsg('No authorization code received.');
        setPhase('error');
        await clearPaymentState();
        return;
      }

      try {
        const result = await exchangeCodeAndPay(params.code);
        if (cancelled) return;

        setPhase('approved');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => {},
        );
        await clearPaymentState();
        clearCart();
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.message || 'Payment execution failed.');
        setPhase('error');
        await clearPaymentState();
        return;
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.card}>
        {phase === 'processing' && (
          <Animated.View entering={FadeIn} style={styles.center}>
            <LinearGradient
              colors={['#1565C0', '#0D47A1']}
              style={styles.iconCircle}
            >
              <Ionicons name="shield-checkmark" size={36} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>Processing approval</Text>
            <Text style={styles.desc}>
              Bank Dhofar approved — finalizing payment...
            </Text>
            {payRef ? (
              <Text style={styles.refText}>
                Ref: {formatMerchantRef(payRef)}
              </Text>
            ) : null}
            <View style={styles.dots}>
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
            </View>
          </Animated.View>
        )}

        {phase === 'approved' && (
          <Animated.View entering={FadeInDown} style={styles.center}>
            <LinearGradient
              colors={['#43A047', '#1B5E20']}
              style={styles.iconCircle}
            >
              <Ionicons name="checkmark" size={44} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>Payment approved!</Text>
            <Text style={styles.desc}>
              Bank Dhofar has confirmed your payment.
            </Text>
            <Text style={styles.amount}>{formatOMR(parseFloat(payTotal))}</Text>
            <Text style={styles.refText}>
              Ref: {formatMerchantRef(payRef)}
            </Text>
            <View style={styles.dots}>
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
            </View>
            <Pressable
              style={styles.homeBtn}
              onPress={() => router.replace('/store')}
            >
              <Ionicons name="storefront-outline" size={18} color="#FFF" />
              <Text style={styles.homeBtnText}>Back to souq</Text>
            </Pressable>
          </Animated.View>
        )}

        {phase === 'error' && (
          <Animated.View entering={FadeInDown} style={styles.center}>
            <LinearGradient
              colors={['#C62828', '#B71C1C']}
              style={styles.iconCircle}
            >
              <Ionicons name="close" size={44} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>Payment failed</Text>
            <Text style={styles.desc}>{errorMsg}</Text>
            <Pressable
              style={[styles.homeBtn, { backgroundColor: theme.colors.textMuted }]}
              onPress={() => router.replace('/store')}
            >
              <Ionicons name="storefront-outline" size={18} color="#FFF" />
              <Text style={styles.homeBtnText}>Back to souq</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: theme.colors.bgCard,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  center: { alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 14,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 12,
  },
  refText: {
    fontSize: 12,
    color: theme.colors.textFaint,
    fontFamily: 'monospace',
    marginTop: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
  },
  dotDone: {
    backgroundColor: theme.colors.success,
  },
  homeBtn: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  homeBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
