import { useState, useEffect, useCallback } from "react";
import {
  AppRole,
  AppSettings,
  AuditLogEntry,
  User,
} from "../../types";
import api from "../services/api";

type InvitePayload = {
  fullName: string;
  email: string;
  appRole: AppRole;
  projectRole?: string;
  entity?: string | null;
};

type UpdateUserPayload = Partial<{
  fullName: string;
  appRole: AppRole;
  status: "active" | "inactive";
  projectRole: string;
  entity: string | null;
  cargo: string | null;
  canDownload: boolean;
}>;

export const useAdminApi = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const data = await api.admin.getUsers();
    setUsers(data);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    const data = await api.admin.getAuditLogs();
    setAuditLogs(data);
  }, []);

  const fetchSettings = useCallback(async () => {
    const data = await api.admin.getSettings();
    setSettings(data);
  }, []);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchUsers(), fetchAuditLogs(), fetchSettings()]);
    } catch (err) {
      console.error("Error cargando datos de administración:", err);
      const message =
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los datos de administración.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUsers, fetchAuditLogs, fetchSettings]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const inviteUser = useCallback(
    async (payload: InvitePayload) => {
      try {
        const response = await api.admin.inviteUser(payload);
        setUsers((prev) => [...prev, response.user]);
        await fetchAuditLogs();
        return response;
      } catch (err) {
        console.error("Error invitando usuario:", err);
        throw err;
      }
    },
    [fetchAuditLogs]
  );

  const updateUser = useCallback(
    async (id: string, patch: UpdateUserPayload) => {
      try {
        const updatedUser = await api.admin.updateUser(id, patch);
        setUsers((prev) =>
          prev.map((user) => (user.id === id ? updatedUser : user))
        );
        await fetchAuditLogs();
        return updatedUser;
      } catch (err) {
        console.error("Error actualizando usuario:", err);
        throw err;
      }
    },
    [fetchAuditLogs]
  );

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      try {
        const updatedSettings = await api.admin.updateSettings(patch);
        setSettings(updatedSettings);
        await fetchAuditLogs();
        return updatedSettings;
      } catch (err) {
        console.error("Error actualizando configuración:", err);
        throw err;
      }
    },
    [fetchAuditLogs]
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
    users,
    auditLogs,
    settings,
    isLoading,
    isRefreshing,
    error,
    inviteUser,
    updateUser,
    updateSettings,
    reload,
  };
};
