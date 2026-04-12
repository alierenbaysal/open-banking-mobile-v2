import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import ConnectBank from './pages/ConnectBank';
import Callback from './pages/Callback';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Spending from './pages/Spending';

const theme = createTheme({
  primaryColor: 'violet',
  colors: {
    violet: [
      '#f3f0ff',
      '#e5dbff',
      '#d0bfff',
      '#b197fc',
      '#9775fa',
      '#845ef7',
      '#7950f2',
      '#6C5CE7',
      '#5f3dc4',
      '#5235a8',
    ],
  },
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  defaultRadius: 'md',
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
            <Route path="/" element={<Landing />} />
            <Route path="/callback" element={<Callback />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/connect" element={<ConnectBank />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/accounts/:accountId/transactions" element={<Transactions />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/spending" element={<Spending />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}
