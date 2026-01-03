import { useLoadingState, LoadingState } from './useLoadingState';
import api from '../services/api';
import { useState, useEffect, useCallback } from 'react';

import { useState, useEffect, useCallback } from 'react';

// Custom hook for paginated log entries
export function useLogEntries(page?: number, limit?: number): LoadingState<any> {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.logEntries.getAll(page, limit);
      setData(result);
    } catch (err) {
      console.error('Error fetching log entries:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const retry = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, isLoading, error, retry };
}

export function useCommunications(): LoadingState<any[]> {
  return useLoadingState(api.communications.getAll);
}

export function useActas(): LoadingState<any[]> {
  return useLoadingState(api.actas.getAll);
}

export function useCostActas(): LoadingState<any[]> {
  return useLoadingState(api.costActas.getAll);
}

export function useWorkActas(): LoadingState<any[]> {
  return useLoadingState(api.workActas.getAll);
}

export function useContractItems(): LoadingState<any[]> {
  return useLoadingState(api.contractItems.getAll);
}

export function useControlPoints(): LoadingState<any[]> {
  return useLoadingState(api.controlPoints.getAll);
}

export function useProjectTasks(): LoadingState<any[]> {
  return useLoadingState(api.projectTasks.getAll);
}

export function useContractModifications(): LoadingState<any[]> {
  return useLoadingState(api.contractModifications.getAll);
}

export function useProjectDetails(): LoadingState<any> {
  return useLoadingState(api.projectDetails.get);
}

export function useContractorProgress(): LoadingState<any> {
  return useLoadingState(api.contractorProgress.getLatest);
}

export function useReports(): LoadingState<any[]> {
  return useLoadingState(api.reports.getAll);
}

export function useDrawings(): LoadingState<any[]> {
  return useLoadingState(api.drawings.getAll);
}

export function useWeeklyReports(): LoadingState<any[]> {
  return useLoadingState(api.weeklyReports.getAll);
}

export function useUsers(): LoadingState<any[]> {
  return useLoadingState(api.users.getAll);
}

// Hook genérico para obtener un elemento por ID
export function useById<T>(
  type: keyof typeof api,
  id: string | null,
  getById: (id: string) => Promise<T>
): LoadingState<T> {
  return useLoadingState(
    () => (id ? getById(id) : Promise.reject('No ID provided')),
    null
  );
}

// Hooks específicos para obtener elementos por ID
export function useLogEntryById(id: string | null): LoadingState<any> {
  return useById('logEntries', id, api.logEntries.getById);
}

export function useCommunicationById(id: string | null): LoadingState<any> {
  return useById('communications', id, api.communications.getById);
}

export function useActaById(id: string | null): LoadingState<any> {
  return useById('actas', id, api.actas.getById);
}

export function useCostActaById(id: string | null): LoadingState<any> {
  return useById('costActas', id, api.costActas.getById);
}

export function useWorkActaById(id: string | null): LoadingState<any> {
  return useById('workActas', id, api.workActas.getById);
}

export function useDrawingById(id: string | null): LoadingState<any> {
  return useById('drawings', id, api.drawings.getById);
}

export function useReportById(id: string | null): LoadingState<any> {
  return useById('reports', id, api.reports.getById);
}

// Exportar todos los hooks como un objeto
export const useApi = {
  users: useUsers,
  logEntries: useLogEntries,
  communications: useCommunications,
  actas: useActas,
  costActas: useCostActas,
  workActas: useWorkActas,
  contractItems: useContractItems,
  controlPoints: useControlPoints,
  projectTasks: useProjectTasks,
  contractModifications: useContractModifications,
  projectDetails: useProjectDetails,
  contractorProgress: useContractorProgress,
  reports: useReports,
  drawings: useDrawings,
  weeklyReports: useWeeklyReports,
  // Hooks por ID
  logEntryById: useLogEntryById,
  communicationById: useCommunicationById,
  actaById: useActaById,
  costActaById: useCostActaById,
  workActaById: useWorkActaById,
  drawingById: useDrawingById,
  reportById: useReportById,
};

export default useApi;
