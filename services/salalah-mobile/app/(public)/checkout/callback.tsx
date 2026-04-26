import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { exchangeAuthCode, validateState, getPendingConsentId } from '../../../utils/consent';
import { theme } from '../../../utils/theme';
import PrimaryButton from '../../../components/PrimaryButton';

type Phase = 'processing' | 'success' | 'error';

export default function CheckoutCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const [phase, setPhase] = useState<Phase>('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const process = async () => {
      try {
        const code = typeof params.code === 'string' ? params.code : null;
        const stateParam = typeof params.state === 'string' ? params.state : null;

        if (!code) {
          if (params.error) {
            throw new Error(
              typeof params.error_description === 'string'
                ? params.error_description
                : 'Payment was declined'
            );
          }
          throw new Error('Missing authorization code from Bank Dhofar');
        }

        if (stateParam) {
          const valid = await validateState(stateParam);
          if (!valid) {
            throw new Error('Security check failed. Please try the payment again.');
          }
        }

        const result = await exchangeAuthCode(code);
        const consentId = result.consent_id || (await getPendingConsentId());
        setPhase('success');

        setTimeout(() => {
          router.replace({
            pathname: '/checkout/success',
            params: { ref: consentId || 'BD-PAY', total: '0' },
          });
        }, 1500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Payment could not be completed';
        setError(msg);
        setPhase('error');
      }
    };
    process();
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.card}>
        {phase === 'processing' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.title}>Confirming payment</Text>
            <Text style={styles.desc}>
              Verifying your Bank Dhofar approval...
            </Text>
          </View>
        )}

        {phase === 'success' && (
          <View style={styles.center}>
            <LinearGradient colors={['#43A047', '#1B5E20']} style={styles.iconCircle}>
              <Ionicons name="checkmark" size={40} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>Payment approved!</Text>
            <Text style={styles.desc}>Bank Dhofar has confirmed your payment.</Text>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.center}>
            <View style={[styles.iconCircle, { backgroundColor: '#FFE5E5' }]}>
              <Ionicons name="alert-circle" size={40} color={theme.colors.danger} />
            </View>
            <Text style={styles.title}>Payment failed</Text>
            <Text style={styles.desc}>{error}</Text>
            <PrimaryButton
              title="Try again"
              icon="refresh"
              onPress={() => router.replace('/checkout')}
              style={{ marginTop: 20, alignSelf: 'stretch' }}
            />
            <PrimaryButton
              title="Back to souq"
              icon="storefront-outline"
              variant="outline"
              onPress={() => router.replace('/store')}
              style={{ marginTop: 10, alignSelf: 'stretch' }}
            />
          </View>
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
});
