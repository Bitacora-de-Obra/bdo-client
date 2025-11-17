// IndexedDB para almacenamiento offline
const DB_NAME = 'bdo-offline-db';
const DB_VERSION = 1;

export interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'logEntry' | 'communication' | 'acta' | 'report' | 'comment' | 'attachment';
  entityId?: string;
  data: any;
  endpoint: string;
  method: string;
  timestamp: number;
  retries: number;
  status: 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED';
}

export interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para operaciones pendientes
        if (!db.objectStoreNames.contains('operations')) {
          const operationsStore = db.createObjectStore('operations', {
            keyPath: 'id',
          });
          operationsStore.createIndex('status', 'status', { unique: false });
          operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          operationsStore.createIndex('entityType', 'entityType', { unique: false });
        }

        // Store para datos cacheados
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', {
            keyPath: 'key',
          });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para datos de entidades (log entries, communications, etc.)
        if (!db.objectStoreNames.contains('entities')) {
          const entitiesStore = db.createObjectStore('entities', {
            keyPath: 'id',
          });
          entitiesStore.createIndex('type', 'type', { unique: false });
          entitiesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Operaciones pendientes
  async addOperation(operation: OfflineOperation): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.add(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingOperations(): Promise<OfflineOperation[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readonly');
      const store = transaction.objectStore('operations');
      const index = store.index('status');
      const request = index.getAll('PENDING');

      request.onsuccess = () => {
        const operations = request.result.sort(
          (a, b) => a.timestamp - b.timestamp
        );
        resolve(operations);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateOperationStatus(
    id: string,
    status: OfflineOperation['status']
  ): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.status = status;
          if (status === 'SYNCING') {
            operation.retries += 1;
          }
          const putRequest = store.put(operation);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Operation not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteOperation(id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cache de datos
  async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const cached: CachedData = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: ttl ? Date.now() + ttl : undefined,
      };
      const request = store.put(cached);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const cached = request.result;
        if (!cached) {
          resolve(null);
          return;
        }
        // Verificar expiración
        if (cached.expiresAt && Date.now() > cached.expiresAt) {
          // Eliminar cache expirado
          const deleteTransaction = this.db!.transaction(['cache'], 'readwrite');
          deleteTransaction.objectStore('cache').delete(key);
          resolve(null);
          return;
        }
        resolve(cached.data);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Almacenamiento de entidades
  async saveEntity(type: string, id: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entities'], 'readwrite');
      const store = transaction.objectStore('entities');
      const entity = {
        id: `${type}_${id}`,
        type,
        entityId: id,
        data,
        timestamp: Date.now(),
      };
      const request = store.put(entity);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getEntity(type: string, id: string): Promise<any | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entities'], 'readonly');
      const store = transaction.objectStore('entities');
      const request = store.get(`${type}_${id}`);

      request.onsuccess = () => {
        resolve(request.result?.data || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllEntities(type: string): Promise<any[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entities'], 'readonly');
      const store = transaction.objectStore('entities');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        const entities = request.result.map((item) => item.data);
        resolve(entities);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('timestamp');
      const request = index.openCursor();
      const now = Date.now();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const cached = cursor.value;
          if (cached.expiresAt && now > cached.expiresAt) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineDB = new OfflineDB();


