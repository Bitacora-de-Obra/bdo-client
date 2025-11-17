// Componente para mostrar el estado offline
import React from 'react';
import { useOffline } from '../../hooks/useOffline';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing, pendingOperations, lastSyncTime, sync } = useOffline();

  if (isOnline && pendingOperations === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg shadow-lg p-4 max-w-sm ${
        isOnline
          ? 'bg-yellow-50 border border-yellow-200'
          : 'bg-red-50 border border-red-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {isOnline ? (
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              isOnline ? 'text-yellow-800' : 'text-red-800'
            }`}
          >
            {isOnline
              ? 'Operaciones pendientes de sincronización'
              : 'Sin conexión a internet'}
          </p>
          {pendingOperations > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              {pendingOperations} operación{pendingOperations !== 1 ? 'es' : ''}{' '}
              pendiente{pendingOperations !== 1 ? 's' : ''}
            </p>
          )}
          {isSyncing && (
            <p className="text-xs text-blue-600 mt-1">Sincronizando...</p>
          )}
          {lastSyncTime && isOnline && !isSyncing && (
            <p className="text-xs text-gray-500 mt-1">
              Última sincronización:{' '}
              {lastSyncTime.toLocaleTimeString('es-CO', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {isOnline && pendingOperations > 0 && !isSyncing && (
            <button
              onClick={() => sync()}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Sincronizar ahora
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


