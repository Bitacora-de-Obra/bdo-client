// Cola de operaciones offline
import { offlineDB, OfflineOperation } from './db';

export interface QueuedRequest {
  endpoint: string;
  method: string;
  data?: any;
  entityType?: 'logEntry' | 'communication' | 'acta' | 'report' | 'comment' | 'attachment';
  entityId?: string;
}

class OfflineQueue {
  async queueRequest(request: QueuedRequest): Promise<OfflineOperation> {
    const operation: OfflineOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.getOperationType(request.method),
      entityType: request.entityType || 'logEntry',
      entityId: request.entityId,
      data: request.data,
      endpoint: request.endpoint,
      method: request.method,
      timestamp: Date.now(),
      retries: 0,
      status: 'PENDING',
    };

    await offlineDB.addOperation(operation);
    console.log('[Offline Queue] Queued operation:', operation.id, operation.endpoint);
    return operation;
  }

  private getOperationType(method: string): 'CREATE' | 'UPDATE' | 'DELETE' {
    if (method === 'POST') return 'CREATE';
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';
    return 'CREATE';
  }

  async getQueuedOperation(id: string): Promise<OfflineOperation | null> {
    try {
      const operations = await offlineDB.getPendingOperations();
      return operations.find((op) => op.id === id) || null;
    } catch (error) {
      console.error('[Offline Queue] Error getting operation:', error);
      return null;
    }
  }
}

export const offlineQueue = new OfflineQueue();

