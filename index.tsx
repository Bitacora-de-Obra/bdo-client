
import React from 'react';
import ReactDOM from 'react-dom/client';
// Fix: Corrected import path for App component
import App from './App';
import './src/index.css';
import { initOfflineMode, registerServiceWorker } from './src/services/offline/init';

// Inicializar modo offline
if (typeof window !== 'undefined') {
  registerServiceWorker()
    .then(() => {
      console.log('[App] Service Worker registered');
      return initOfflineMode();
    })
    .then(() => {
      console.log('[App] Offline mode initialized');
    })
    .catch((error) => {
      console.error('[App] Error initializing offline mode:', error);
    });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);