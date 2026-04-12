import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { theme } from './theme';
import { AppShell } from './components/layout/AppShell';

import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/code-highlight/styles.css';

import LandingPage from './pages/Landing';
import ApiCatalog from './pages/ApiCatalog';
import ApiDetail from './pages/ApiCatalog/ApiDetail';
import SandboxPage from './pages/Sandbox';
import ApplicationsPage from './pages/Applications';
import AppDetailPage from './pages/Applications/AppDetail';
import AnalyticsPage from './pages/Analytics';
import GettingStarted from './pages/Content/GettingStarted';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
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
            <Route element={<AppShell />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/apis" element={<ApiCatalog />} />
              <Route path="/apis/:groupId" element={<ApiDetail />} />
              <Route path="/sandbox" element={<SandboxPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/applications/:appId" element={<AppDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/getting-started" element={<GettingStarted />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}
