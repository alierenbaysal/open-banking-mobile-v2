import React from 'react';
import ReactDOM from 'react-dom/client';
import { handleCallback } from './utils/auth';
import App from './App';

// Handle OIDC callback BEFORE React mounts — window.location.search is guaranteed intact
if (window.location.pathname === '/auth/callback') {
  const params = new URLSearchParams(window.location.search);
  if (params.has('code')) {
    handleCallback()
      .then((user) => {
        console.log('OIDC callback success, user:', user.email);
        // Restore consent redirect if pending
        const pending = sessionStorage.getItem('bd_online_consent_redirect');
        if (pending) {
          try {
            const { consentId, redirectUri, state, clientId } = JSON.parse(pending);
            sessionStorage.removeItem('bd_online_consent_redirect');
            const p = new URLSearchParams();
            if (consentId) p.set('consent_id', consentId);
            if (redirectUri) p.set('redirect_uri', redirectUri);
            if (state) p.set('state', state);
            if (clientId) p.set('client_id', clientId);
            window.location.replace(`/consent/approve?${p.toString()}`);
            return;
          } catch { /* ignore */ }
        }
        window.location.replace('/dashboard');
      })
      .catch((err) => {
        console.error('OIDC callback failed:', err?.message || err);
        window.location.replace('/login');
      });
  } else {
    // No code — redirect to login
    window.location.replace('/login');
  }
} else {
  // Normal app mount
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
