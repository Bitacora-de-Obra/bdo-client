// Hook para manejar estado offline
import { useState, useEffect, useCallback } from 'react';
import { offlineDB, OfflineOperation } from '../services/offline/db';
import { syncManager } from '../services/offline/sync';

export interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
  lastSyncTime: Date | null;
}

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Detectar cambios en el estado de conexión
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Offline] Connection restored');
      setIsOnline(true);
      // Intentar sincronizar cuando vuelva la conexión
      syncManager.sync().catch(console.error);
    };

    const handleOffline = () => {
      console.log('[Offline] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Escuchar cambios en el estado de sincronización
  useEffect(() => {
    const unsubscribe = syncManager.addSyncListener((syncing) => {
      setIsSyncing(syncing);
      if (!syncing) {
        setLastSyncTime(new Date());
      }
    });

    return unsubscribe;
  }, []);

  // Actualizar contador de operaciones pendientes
  const updatePendingCount = useCallback(async () => {
    try {
      const operations = await offlineDB.getPendingOperations();
      setPendingOperations(operations.length);
    } catch (error) {
      console.error('[Offline] Error getting pending operations:', error);
    }
  }, []);

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000); // Actualizar cada 5 segundos
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  // Sincronizar manualmente
  const sync = useCallback(async () => {
    if (!isOnline) {
      throw new Error('Cannot sync while offline');
    }
    await syncManager.sync();
    await updatePendingCount();
  }, [isOnline, updatePendingCount]);

  return {
    isOnline,
    isSyncing,
    pendingOperations,
    lastSyncTime,
    sync,
    updatePendingCount,
  };
}



