import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const PROXY_URL = import.meta.env.VITE_CLERK_PROXY_URL;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key — add VITE_CLERK_PUBLISHABLE_KEY to .env');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      {...(PROXY_URL ? { proxyUrl: PROXY_URL } : {})}
      afterSignOutUrl="/"
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
);
