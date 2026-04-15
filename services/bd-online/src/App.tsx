/**
 * BD Online — Bank Dhofar Internet Banking for Open Banking consent authorization.
 *
 * Routes:
 *  /                      → Login page (bank's own login form)
 *  /login                 → Login page (explicit)
 *  /dashboard             → Customer home
 *  /consent/approve       → Consent authorization flow (THE key page)
 *  /consents              → Consent list
 *  /consents/:consentId   → Consent detail
 *  /transfer              → Transfer funds
 */

import { MantineProvider, createTheme, MantineColorsTuple } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ConsentApproval from '@/pages/ConsentApproval';
import ConsentList from '@/pages/ConsentList';
import ConsentDetail from '@/pages/ConsentDetail';
import Transfer from '@/pages/Transfer';
import LoanScan from '@/pages/LoanScan';
import LoanOffer from '@/pages/LoanOffer';

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Authenticated routes (Layout provides the app shell) */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/consent/approve" element={<ConsentApproval />} />
              <Route path="/consents" element={<ConsentList />} />
              <Route path="/consents/:consentId" element={<ConsentDetail />} />
              <Route path="/transfer" element={<Transfer />} />
              <Route path="/loan/scan" element={<LoanScan />} />
              <Route path="/loan/offer/:applicationId" element={<LoanOffer />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}
