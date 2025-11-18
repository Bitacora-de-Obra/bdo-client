import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export type SecurityEventType =
  | "LOGIN_FAILED"
  | "LOGIN_SUCCESS"
  | "LOGIN_BLOCKED"
  | "ACCESS_DENIED"
  | "RATE_LIMIT_EXCEEDED"
  | "CSRF_TOKEN_INVALID"
  | "FILE_UPLOAD_REJECTED"
  | "UNAUTHORIZED_ACCESS_ATTEMPT"
  | "SUSPICIOUS_ACTIVITY"
  | "PASSWORD_CHANGE"
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED";

export type SecurityEventSeverity = "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  path?: string;
  method?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SecurityStats {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecurityEventSeverity, number>;
  topIPs: Array<{ ip: string; count: number }>;
  recentCriticalEvents: number;
}

export interface SecurityEventFilters {
  type?: SecurityEventType;
  severity?: SecurityEventSeverity;
  ipAddress?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export const useSecurityMonitoring = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SecurityEventFilters>({
    limit: 100,
  });

  const fetchEvents = useCallback(async (currentFilters?: SecurityEventFilters) => {
    try {
      const activeFilters = currentFilters || filters;
      const response = await api.admin.getSecurityEvents(activeFilters);
      setEvents(response.events || []);
      setError(null);
    } catch (err) {
      console.error("Error obteniendo eventos de seguridad:", err);
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron obtener los eventos de seguridad.";
      setError(message);
      setEvents([]);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.admin.getSecurityStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error("Error obteniendo estadísticas de seguridad:", err);
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron obtener las estadísticas de seguridad.";
      setError(message);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchEvents(), fetchStats()]);
    } catch (err) {
      console.error("Error cargando datos de seguridad:", err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchEvents, fetchStats]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const applyFilters = useCallback(
    async (newFilters: SecurityEventFilters) => {
      setFilters(newFilters);
      setIsRefreshing(true);
      try {
        await fetchEvents(newFilters);
      } finally {
        setIsRefreshing(false);
      }
    },
    [fetchEvents]
  );

  const reload = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAll();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAll]);

  return {
    events,
    stats,
    isLoading,
    isRefreshing,
    error,
    filters,
    applyFilters,
    reload,
  };
};



