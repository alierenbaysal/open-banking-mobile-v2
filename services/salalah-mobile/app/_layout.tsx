import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { theme } from '../utils/theme';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const handle = (event: { url: string }) => {
      const { url } = event;
      if (!url) return;
      const parsed = Linking.parse(url);
      const pathStr = (parsed.path || '').replace(/^--\//, '');
      const isCallback =
        parsed.hostname === 'callback' ||
        pathStr === 'callback' ||
        pathStr.endsWith('/callback');
      if (isCallback) {
        const params: Record<string, string> = {};
        const qp = parsed.queryParams || {};
        for (const [k, v] of Object.entries(qp)) {
          if (typeof v === 'string') params[k] = v;
        }
        router.push({ pathname: '/checkout/callback', params });
      }
    };

    Linking.getInitialURL().then((initial) => {
      if (initial) handle({ url: initial });
    });

    const sub = Linking.addEventListener('url', handle);
    return () => sub.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={theme.colors.bg} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.bg },
            animation: 'slide_from_right',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
