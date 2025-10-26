import { useState, useEffect } from "react";
import { AppSettings, AuditLogEntry, User, UserRole } from "../../types";
import {
  MOCK_APP_SETTINGS,
  MOCK_AUDIT_LOGS,
  MOCK_USERS,
} from "../services/mockData";

// This custom hook will simulate a backend for the admin panel.
export const useAdminApi = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = () => {
      setIsLoading(true);
      setError(null);
      setTimeout(() => {
        try {
          setUsers(MOCK_USERS);
          setAuditLogs(MOCK_AUDIT_LOGS);
          setSettings(MOCK_APP_SETTINGS);
        } catch (e) {
          setError("Failed to load admin data.");
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      }, 500); // Simulate network delay
    };
    fetchData();
  }, []);

  const inviteUser = async (data: {
    fullName: string;
    email: string;
    appRole: "admin" | "editor" | "viewer";
  }): Promise<User | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (users.some((u) => u.email === data.email)) {
          alert("Error: El email ya existe.");
          resolve(undefined);
          return;
        }
        const newUser: User = {
          id: `user-${Date.now()}`,
          fullName: data.fullName,
          email: data.email,
          appRole: data.appRole,
          projectRole: UserRole.RESIDENT, // Default project role
          status: "active",
          avatarUrl: `https://i.pravatar.cc/150?u=${data.email}`,
          lastLoginAt: undefined,
        };
        setUsers((prev) => [...prev, newUser]);
        resolve(newUser);
      }, 300);
    });
  };

  const updateUser = async (
    id: string,
    patch: Partial<User>
  ): Promise<User | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let updatedUser: User | undefined;
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === id) {
              updatedUser = { ...u, ...patch };
              return updatedUser;
            }
            return u;
          })
        );
        resolve(updatedUser);
      }, 300);
    });
  };

  const updateSettings = async (
    patch: Partial<AppSettings>
  ): Promise<AppSettings | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setSettings((prev) => {
          if (!prev) return null;
          const newSettings = { ...prev, ...patch };

          // Add to audit log
          const newLog: AuditLogEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorEmail: "jorge.hernandez@idu.gov.co", // Assuming current admin user
            action: "APP_SETTING_CHANGED",
            entityType: "setting",
            diff: createDiff(prev, newSettings),
          };
          setAuditLogs((logs) => [newLog, ...logs]);

          return newSettings;
        });
        resolve(settings ?? undefined);
      }, 300);
    });
  };

  const createDiff = (original: any, updated: any) => {
    const diff: Record<string, { from: any; to: any }> = {};
    for (const key in updated) {
      if (original[key] !== updated[key]) {
        diff[key] = { from: original[key], to: updated[key] };
      }
    }
    return diff;
  };

  return {
    users,
    auditLogs,
    settings,
    isLoading,
    error,
    inviteUser,
    updateUser,
    updateSettings,
  };
};

