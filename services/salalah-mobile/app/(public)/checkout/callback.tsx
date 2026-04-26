import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getStoredPaymentState, clearPaymentState } from '../../../utils/consent';
import { formatMerchantRef } from '../../../utils/payment';
import { theme } from '../../../utils/theme';

type Phase = 'processing' | 'approved' | 'error';

export default function CheckoutCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    fromBank?: string;
    ref?: string;
    total?: string;
  }>();
  const [phase, setPhase] = useState<Phase>('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const [payRef, setPayRef] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const stored = await getStoredPaymentState();
      const ref = stored.ref || params.ref || 'BD-PAY';
      const total = stored.total || params.total || '0';
      setPayRef(ref);

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

      await new Promise((r) => setTimeout(r, 1400));
      if (cancelled) return;

      setPhase('approved');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      await clearPaymentState();

      await new Promise((r) => setTimeout(r, 1500));
      if (cancelled) return;

      router.replace({
        pathname: '/checkout/success',
        params: { ref, total },
      });
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
            <View style={styles.dots}>
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
              <View style={[styles.dot, styles.dotDone]} />
            </View>
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
});
