/**
 * BD Online — Bank Dhofar Internet Banking for Open Banking consent authorization.
 *
 * Routes:
 *  /                      → Login page (redirect to Keycloak)
 *  /login                 → Login page (explicit)
 *  /auth/callback         → OIDC callback handler
 *  /auth/silent-renew     → Silent token refresh (iframe)
 *  /dashboard             → Customer home
 *  /consent/approve       → Consent authorization flow (THE key page)
 *  /consents              → Consent list
 *  /consents/:consentId   → Consent detail
 */

import { useEffect } from 'react';
import { MantineProvider, createTheme, MantineColorsTuple } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { handleCallback, handleSilentRenew } from '@/utils/auth';

import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ConsentApproval from '@/pages/ConsentApproval';
import ConsentList from '@/pages/ConsentList';
import ConsentDetail from '@/pages/ConsentDetail';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Bank Dhofar green palette
const bankGreen: MantineColorsTuple = [
  '#f0f9ed',
  '#dff0d9',
  '#bee0b3',
  '#99cf89',
  '#79c065',
  '#5db44c',
  '#4D9134',
  '#3f7a2b',
  '#326323',
  '#264c1b',
];

const theme = createTheme({
  primaryColor: 'bankGreen',
  colors: {
    bankGreen,
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000,
    },
  },
});

/**
 * OIDC callback handler — processes the Keycloak redirect and navigates.
 */
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    handleCallback()
      .then(() => {
        // Check if there was a pending consent redirect
        const pending = sessionStorage.getItem('bd_online_consent_redirect');
        if (pending) {
          try {
            const { consentId, redirectUri, state, clientId } = JSON.parse(pending);
            sessionStorage.removeItem('bd_online_consent_redirect');
            const params = new URLSearchParams();
            if (consentId) params.set('consent_id', consentId);
            if (redirectUri) params.set('redirect_uri', redirectUri);
            if (state) params.set('state', state);
            if (clientId) params.set('client_id', clientId);
            navigate(`/consent/approve?${params.toString()}`, { replace: true });
            return;
          } catch {
            // Ignore malformed pending data
          }
        }
        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        console.error('OIDC callback failed:', err?.message || err);
        navigate('/login', { replace: true });
      });
  }, [navigate]);

  return null;
}

/**
 * Silent renew handler — called in hidden iframe for token refresh.
 */
function SilentRenew() {
  useEffect(() => {
    handleSilentRenew().catch(() => {
      // Silent renew failed — user will be prompted on next API call
    });
  }, []);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/silent-renew" element={<SilentRenew />} />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Authenticated routes (Layout provides the app shell) */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/consent/approve" element={<ConsentApproval />} />
              <Route path="/consents" element={<ConsentList />} />
              <Route path="/consents/:consentId" element={<ConsentDetail />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}
