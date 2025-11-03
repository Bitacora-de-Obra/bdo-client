import { useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { AppRole } from "../../types";

type PermissionFlags = {
  isViewer: boolean;
  isEditor: boolean;
  isAdmin: boolean;
  canEditContent: boolean;
  canManageUsers: boolean;
};

const computeFlags = (role: AppRole | undefined | null): PermissionFlags => {
  const normalizedRole = (role ?? "viewer") as AppRole;
  const isViewer = normalizedRole === "viewer";
  const isEditor = normalizedRole === "editor";
  const isAdmin = normalizedRole === "admin";

  return {
    isViewer,
    isEditor,
    isAdmin,
    canEditContent: isAdmin || isEditor,
    canManageUsers: isAdmin,
  };
};

export const usePermissions = () => {
  const { user } = useAuth();

  return useMemo(() => computeFlags(user?.appRole), [user?.appRole]);
};

export type { PermissionFlags };

