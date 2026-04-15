import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import Layout from './components/Layout';
import Login from './pages/Login';
import Inventory from './pages/Inventory';
import Sale from './pages/Sale';
import History from './pages/History';
import Webhooks from './pages/Webhooks';
import { isLoggedIn } from './utils/auth';

const theme = createTheme({
  primaryColor: 'yellow',
  primaryShade: 6,
  colors: {
    yellow: [
      '#fffbea',
      '#fff3c4',
      '#fce588',
      '#fadb5f',
      '#f7c948',
      '#f0b429',
      '#ffc107',
      '#cb6e17',
      '#b44d12',
      '#8d2b0b',
    ],
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  defaultRadius: 'md',
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactElement }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Navigate to="/inventory" replace />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/sale" element={<Sale />} />
              <Route path="/sale/:applicationId" element={<Sale />} />
              <Route path="/history" element={<History />} />
              <Route path="/webhooks" element={<Webhooks />} />
            </Route>
            <Route path="*" element={<Navigate to="/inventory" replace />} />
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}
