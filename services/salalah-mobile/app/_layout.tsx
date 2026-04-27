import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { theme } from '../utils/theme';

export default function RootLayout() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
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
        routerRef.current.replace({
          pathname: '/callback',
          params: {
            code: (qp.code as string) || '',
            state: (qp.state as string) || '',
            error: (qp.error as string) || '',
          },
        });
      }
    });
    return () => sub.remove();
  }, []);

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
