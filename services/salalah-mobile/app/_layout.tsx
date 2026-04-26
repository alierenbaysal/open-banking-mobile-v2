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
      if (
        parsed.hostname === 'callback' ||
        pathStr === 'callback' ||
        pathStr.endsWith('/callback')
      ) {
        const qp = parsed.queryParams || {};
        router.replace({
          pathname: '/checkout/callback',
          params: {
            fromBank: '1',
            code: (qp.code as string) || '',
            state: (qp.state as string) || '',
            error: (qp.error as string) || '',
          },
        });
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
