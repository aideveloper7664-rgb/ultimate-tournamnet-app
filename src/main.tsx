import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const isDatabaseClosingError = (err: any) => {
    if (!err) return false;
    const msg = String(err?.message || err?.toString() || err || '').toLowerCase();
    const name = String(err?.name || '').toLowerCase();
    return (
      msg.includes('database is closing') ||
      msg.includes('connection is closing') ||
      msg.includes('indexeddb') ||
      msg.includes('hidden') ||
      msg.includes('internal error') ||
      name === 'invalidstateerror' ||
      name === 'unknownerror'
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isDatabaseClosingError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Suppressed benign database closing/hidden rejection:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    if (isDatabaseClosingError(event.error) || isDatabaseClosingError(event.message)) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Suppressed benign database closing/hidden error:', event.message || event.error);
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

