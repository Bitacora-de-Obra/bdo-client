// Inicialización del modo offline
import { offlineDB } from './db';
import { syncManager } from './sync';

export async function initOfflineMode(): Promise<void> {
  try {
    // Inicializar IndexedDB
    await offlineDB.init();
    console.log('[Offline] IndexedDB initialized');

    // Limpiar cache expirado al iniciar
    await offlineDB.clearExpiredCache();

    // Si hay conexión, intentar sincronizar operaciones pendientes
    if (navigator.onLine) {
      // Esperar un poco antes de sincronizar para dar tiempo a que la app cargue
      setTimeout(() => {
        syncManager.sync().catch((error) => {
          console.warn('[Offline] Error during initial sync:', error);
        });
      }, 2000);
    }

    // Escuchar eventos de conexión para sincronizar automáticamente
    window.addEventListener('online', () => {
      console.log('[Offline] Connection restored, syncing...');
      syncManager.sync().catch((error) => {
        console.warn('[Offline] Error syncing after connection restored:', error);
      });
    });

    // Sincronizar periódicamente cuando hay conexión (cada 30 segundos)
    setInterval(() => {
      if (navigator.onLine) {
        syncManager.sync().catch((error) => {
          console.warn('[Offline] Error during periodic sync:', error);
        });
      }
    }, 30000);
  } catch (error) {
    console.error('[Offline] Error initializing offline mode:', error);
  }
}

// Registrar Service Worker
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Service Worker registered:', registration.scope);

      // Verificar actualizaciones periódicamente
      setInterval(() => {
        registration.update();
      }, 60000); // Cada minuto

      // Escuchar actualizaciones del Service Worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay una nueva versión disponible
              console.log('[SW] New service worker available');
              // Opcional: mostrar notificación al usuario
            }
          });
        }
      });
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
    }
  } else {
    console.warn('[SW] Service Workers are not supported');
  }
}

