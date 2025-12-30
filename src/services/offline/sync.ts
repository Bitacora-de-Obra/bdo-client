// Sistema de sincronización offline
import { offlineDB, OfflineOperation } from './db';
import { API_URL } from '../api';

class SyncManager {
  private isSyncing = false;
  private syncListeners: Set<(isSyncing: boolean) => void> = new Set();

  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[Sync] Already syncing, skipping...');
      return;
    }

    if (!navigator.onLine) {
      console.log('[Sync] Offline, cannot sync');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners(true);

    try {
      const operations = await offlineDB.getPendingOperations();
      console.log(`[Sync] Found ${operations.length} pending operations`);

      // Process in chunks of 3
      const CHUNK_SIZE = 3;
      for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
        const chunk = operations.slice(i, i + CHUNK_SIZE);

        // Execute chunk in parallel
        await Promise.all(chunk.map(async (operation) => {
          try {
            await this.syncOperation(operation);
          } catch (error) {
            console.error(`[Sync] Failed to sync operation ${operation.id}:`, error);
            // Si falla después de varios intentos, marcar como fallido
            if (operation.retries >= 3) {
              await offlineDB.updateOperationStatus(operation.id, 'FAILED');
            }
          }
        }));
      }

      // Limpiar cache expirado
      await offlineDB.clearExpiredCache();
    } finally {
      this.isSyncing = false;
      this.notifyListeners(false);
    }
  }

  private async syncOperation(operation: OfflineOperation): Promise<void> {
    await offlineDB.updateOperationStatus(operation.id, 'SYNCING');

    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Obtener token CSRF si está disponible
      if (typeof document !== 'undefined') {
        const csrfToken = document.cookie
          .split('; ')
          .find((row) => row.startsWith('XSRF-TOKEN='))
          ?.split('=')[1];

        if (csrfToken) {
          headers['X-XSRF-TOKEN'] = decodeURIComponent(csrfToken);
        }
      }

      const options: RequestInit = {
        method: operation.method,
        headers,
        credentials: 'include',
      };

      if (operation.method !== 'GET' && operation.data) {
        if (operation.data instanceof FormData) {
          delete headers['Content-Type'];
          options.body = operation.data;
        } else {
          options.body = JSON.stringify(operation.data);
        }
      }

      const response = await fetch(`${API_URL}${operation.endpoint}`, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Actualizar entidad local con la respuesta del servidor
      if (operation.entityType && result.id) {
        await offlineDB.saveEntity(operation.entityType, result.id, result);
      }

      // Marcar operación como completada y eliminarla
      await offlineDB.updateOperationStatus(operation.id, 'COMPLETED');
      await offlineDB.deleteOperation(operation.id);

      console.log(`[Sync] Successfully synced operation ${operation.id}`);
    } catch (error) {
      console.error(`[Sync] Error syncing operation ${operation.id}:`, error);
      // Revertir a PENDING para reintentar más tarde
      await offlineDB.updateOperationStatus(operation.id, 'PENDING');
      throw error;
    }
  }

  addSyncListener(listener: (isSyncing: boolean) => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private notifyListeners(isSyncing: boolean): void {
    this.syncListeners.forEach((listener) => listener(isSyncing));
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const syncManager = new SyncManager();
