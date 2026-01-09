import React, { useMemo, useState, useEffect } from "react";
import Card from "../ui/Card";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Modal from "../ui/Modal";
import { AppRole, AppSettings, AuditLogEntry, User, UserRole } from "../../types";
import { useAdminApi } from "../../src/hooks/useAdminApi";
import { ShieldCheckIcon } from "../icons/Icon";
import { useToast } from "../ui/ToastProvider";
import CatalogManager from "./CatalogManager";

const APP_ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
];

const PROJECT_ROLE_OPTIONS: { value: string; label: string; entity: string }[] = [
  { value: "IDU", label: "IDU", entity: "IDU" },
  { value: "Interventoría", label: "Interventoría", entity: "INTERVENTORIA" },
  { value: "Contratista", label: "Contratista", entity: "CONTRATISTA" },
];

// Mapeo de roles para asegurar que siempre se muestre el nombre completo
// Ahora basado en la entidad: IDU, Interventoría, Contratista
const getFullRoleName = (role: string | UserRole, entity?: string): string => {
  // Si tenemos la entidad, usarla para determinar el rol
  if (entity) {
    if (entity === 'IDU') return 'IDU';
    if (entity === 'INTERVENTORIA') return 'Interventoría';
    if (entity === 'CONTRATISTA') return 'Contratista';
  }
  
  // Fallback al mapeo tradicional
  const roleMap: Record<string, string> = {
    'RESIDENT': 'Residente de Obra',
    'SUPERVISOR': 'Supervisor',
    'CONTRACTOR_REP': 'Contratista',
    'ADMIN': 'IDU',
    'Residente de Obra': 'Residente de Obra',
    'Supervisor': 'Supervisor',
    'Contratista': 'Contratista',
    'IDU': 'IDU',
    'Interventoría': 'Interventoría',
    'Representante Contratista': 'Contratista', // Compatibilidad
    'Administrador IDU': 'IDU', // Compatibilidad
    'Invitado': 'Contratista',
  };
  return roleMap[role] || String(role);
};

type UserAdminPatch = {
  fullName?: string;
  appRole?: AppRole;
  status?: "active" | "inactive";
  projectRole?: string;
  entity?: string | null;
  cargo?: string | null;
  canDownload?: boolean;
};

type UsersViewProps = {
  users: User[];
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
  onInvite: (
    payload: {
      fullName: string;
      email: string;
      appRole: AppRole;
      projectRole?: string;
      entity?: string | null;
    }
  ) => Promise<{ user: User; temporaryPassword: string }>;
  onRefresh: () => Promise<void>;
  onUpdate: (id: string, patch: UserAdminPatch) => Promise<User>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

type AuditLogViewProps = {
  auditLogs: AuditLogEntry[];
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
};

type SettingsViewProps = {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  onSave: (patch: Partial<AppSettings>) => Promise<AppSettings | undefined>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"users" | "audit" | "settings" | "catalogs">("users");

  const admin = useAdminApi();
  const { showToast } = useToast();

  const tabs = useMemo(
    () => [
      { id: "users", label: "Usuarios y Permisos" },
      { id: "catalogs", label: "Catálogos" },
      { id: "audit", label: "Registro de Auditoría" },
      { id: "settings", label: "Configuración" },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="bg-idu-blue/10 p-3 rounded-lg">
          <ShieldCheckIcon className="h-8 w-8 text-idu-blue" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Panel de Administración
          </h2>
          <p className="text-sm text-gray-500">
            Gestiona usuarios, permisos y configuraciones globales de la
            aplicación.
          </p>
        </div>
      </div>

      {admin.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {admin.error}
        </div>
      )}

      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(tab.id as "users" | "audit" | "settings" | "catalogs")
                }
                className={`${
                  activeTab === tab.id
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "users" && (
            <UsersView
              users={admin.users}
              isLoading={admin.isLoading}
              error={admin.error}
              isRefreshing={admin.isRefreshing}
              onInvite={admin.inviteUser}
              onRefresh={admin.reload}
              onUpdate={admin.updateUser}
              onSuccess={(message) =>
                showToast({
                  variant: "success",
                  title: "Usuarios",
                  message,
                })
              }
              onError={(message) =>
                showToast({
                  variant: "error",
                  title: "Usuarios",
                  message,
                })
              }
            />
          )}
          {activeTab === "audit" && (
            <AuditLogView
              auditLogs={admin.auditLogs}
              isLoading={admin.isLoading}
              error={admin.error}
              isRefreshing={admin.isRefreshing}
              onRefresh={admin.reload}
              onError={(message) =>
                showToast({
                  variant: "error",
                  title: "Auditoría",
                  message,
                })
              }
            />
          )}
          {activeTab === "settings" && (
            <SettingsView
              settings={admin.settings}
              isLoading={admin.isLoading}
              error={admin.error}
              onSave={admin.updateSettings}
              onSuccess={(message) =>
                showToast({
                  variant: "success",
                  title: "Configuración",
                  message,
                })
              }
              onError={(message) =>
                showToast({
                  variant: "error",
                  title: "Configuración",
                  message,
                })
              }
            />
          )}
          {activeTab === "catalogs" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CatalogManager category="STAFF_ROLE_CONTRACTOR" title="Cargos Personal Contratista" />
                <CatalogManager category="STAFF_ROLE_INTERVENTORIA" title="Cargos Personal Interventoría" />
                <CatalogManager category="EQUIPMENT_TYPE" title="Maquinaria y Equipos" />
              </div>
              </div>

          )}
        </div>
      </div>
    </div>
  );
};

const UsersView: React.FC<UsersViewProps> = ({
  users,
  isLoading,
  error,
  isRefreshing,
  onInvite,
  onRefresh,
  onUpdate,
  onSuccess,
  onError,
}) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [appRoleFilter, setAppRoleFilter] = useState<"all" | AppRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [entityFilter, setEntityFilter] = useState<"all" | "IDU" | "INTERVENTORIA" | "CONTRATISTA">("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.fullName.toLowerCase().includes(normalizedSearch) ||
        user.email?.toLowerCase().includes(normalizedSearch) ||
        user.projectRole.toLowerCase().includes(normalizedSearch) ||
        (user.entity && user.entity.toLowerCase().includes(normalizedSearch));

      const matchesAppRole =
        appRoleFilter === "all" || user.appRole === appRoleFilter;

      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      const matchesEntity =
        entityFilter === "all" || user.entity === entityFilter;

      return matchesSearch && matchesAppRole && matchesStatus && matchesEntity;
    });
  }, [users, search, appRoleFilter, statusFilter, entityFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, appRoleFilter, statusFilter, entityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const handleInvite = async (payload: {
    fullName: string;
    email: string;
    appRole: AppRole;
    projectRole?: string;
  }) => {
    setLocalError(null);
    try {
      const result = await onInvite(payload);
      onSuccess(`Se invitó a ${payload.fullName || payload.email}.`);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo invitar al usuario.";
      setLocalError(message);
      onError(message);
      throw err;
    }
  };

  useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  if (isLoading) {
    return <div>Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Usuarios registrados
          </h3>
          <p className="text-sm text-gray-500">
            Controla la membresía y permisos dentro de la plataforma.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por nombre, email o rol"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="min-w-[220px]"
          />
          <Select
            value={appRoleFilter}
            onChange={(e) => setAppRoleFilter(e.target.value as typeof appRoleFilter)}
            label="Rol"
          >
            <option value="all">Todos los roles</option>
            {APP_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            label="Estado"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </Select>
          <Select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value as typeof entityFilter)}
            label="Entidad"
          >
            <option value="all">Todas las entidades</option>
            <option value="IDU">IDU</option>
            <option value="INTERVENTORIA">INTERVENTORIA</option>
            <option value="CONTRATISTA">CONTRATISTA</option>
          </Select>
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refrescando..." : "Actualizar"}
          </Button>
          <Button onClick={() => setIsInviteModalOpen(true)}>
            Invitar Usuario
          </Button>
        </div>
      </div>

      {localError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {localError}
        </div>
      )}

      <Card>
        {filteredUsers.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No encontramos usuarios que coincidan con los filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600 min-w-[1000px]">
              <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Nombre Completo
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Entidad
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Cargo
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Rol de Aplicación
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Rol de Proyecto
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 whitespace-nowrap">
                    Último Acceso
                  </th>
                  <th scope="col" className="px-4 py-3 text-right sticky right-0 bg-gray-50 whitespace-nowrap">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="bg-white border-b last:border-b-0 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {user.fullName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.entity ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {user.entity}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.cargo ? (
                        <span className="text-sm text-gray-700">{user.cargo}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 capitalize whitespace-nowrap">{user.appRole}</td>
                    <td className="px-4 py-4 whitespace-nowrap">{getFullRoleName(user.projectRole, user.entity)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {user.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString("es-CO")
                        : "Nunca"}
                    </td>
                    <td className="px-4 py-4 text-right sticky right-0 bg-white whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditUser(user);
                          setIsEditModalOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {filteredUsers.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-end gap-3 text-sm text-gray-600">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInvite}
      />
      <EditUserModal
        isOpen={isEditModalOpen && !!editUser}
        user={editUser}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditUser(null);
        }}
        onSave={async (patch) => {
          if (!editUser) return;
          try {
            const updated = await onUpdate(editUser.id, patch);
            setEditUser(updated);
            setIsEditModalOpen(false);
            onSuccess(`Se actualizaron los permisos de ${updated.fullName}.`);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "No se pudo actualizar el usuario.";
            onError(message);
            throw error;
          }
        }}
      />
    </div>
  );
};

const AuditLogView: React.FC<AuditLogViewProps> = ({
  auditLogs,
  isLoading,
  error,
  isRefreshing,
  onRefresh,
  onError,
}) => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return auditLogs.filter((log) => {
      const matchesAction =
        actionFilter === "all" || log.action === actionFilter;
      const matchesSearch =
        !normalizedSearch ||
        log.actorEmail?.toLowerCase().includes(normalizedSearch) ||
        log.action.toLowerCase().includes(normalizedSearch) ||
        log.entityType.toLowerCase().includes(normalizedSearch);
      return matchesAction && matchesSearch;
    });
  }, [auditLogs, search, actionFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  if (isLoading) {
    return <div>Cargando registros de auditoría...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">
            Registro de Auditoría
          </h3>
          <p className="text-sm text-gray-500">
            Permite rastrear cambios y acciones relevantes dentro de la
            plataforma.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por actor, acción o entidad"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="min-w-[220px]"
          />
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            label="Acción"
          >
            <option value="all">Todas</option>
            {[...new Set(auditLogs.map((log) => log.action))].map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refrescando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      <Card>
        {filteredLogs.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No se encontraron eventos que coincidan con los filtros.
          </div>
        ) : (
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs uppercase bg-gray-50 text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Fecha
                </th>
                <th scope="col" className="px-6 py-3">
                  Actor
                </th>
                <th scope="col" className="px-6 py-3">
                  Acción
                </th>
                <th scope="col" className="px-6 py-3">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  className="bg-white border-b last:border-b-0 hover:bg-gray-50 transition"
                >
                  <td className="px-6 py-4">
                    {new Date(log.timestamp).toLocaleString("es-CO")}
                  </td>
                  <td className="px-6 py-4">{log.actorEmail ?? "—"}</td>
                  <td className="px-6 py-4">{log.action}</td>
                  <td className="px-6 py-4 text-xs font-mono break-all">
                    {log.diff ? JSON.stringify(log.diff) : `ID: ${log.entityId ?? "—"}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {filteredLogs.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-end gap-3 text-sm text-gray-600">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  isLoading,
  error,
  onSave,
  onSuccess,
  onError,
}) => {
  const [formState, setFormState] = useState<Partial<AppSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormState(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (error) {
      onError(error);
    }
  }, [error, onError]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (type === "checkbox") {
      setFormState((prev) => ({ ...prev, [name]: checked }));
    } else if (type === "number") {
      setFormState((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormState((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setFeedback(null);
    setLocalError(null);
    try {
      await onSave(formState);
      setFeedback("Configuración actualizada con éxito.");
      onSuccess("Configuración actualizada con éxito.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo guardar la configuración.";
      setLocalError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div>Cargando configuración...</div>;
  }

  if (!settings) {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
        No se encontró configuración inicial. Intenta recargar la página.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <div className="p-5 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Configuración General
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label="Nombre de la Compañía"
                name="companyName"
                value={formState.companyName || ""}
                onChange={handleChange}
                required
              />
              <Input
                label="Zona Horaria"
                name="timezone"
                value={formState.timezone || ""}
                onChange={handleChange}
                placeholder="America/Bogota"
              />
              <Select
                label="Idioma"
                name="locale"
                value={formState.locale || "es-ES"}
                onChange={handleChange}
              >
                <option value="es-ES">Español</option>
                <option value="en-US">English</option>
              </Select>
              <Select
                label="Visibilidad de Proyectos por Defecto"
                name="defaultProjectVisibility"
                value={formState.defaultProjectVisibility || "private"}
                onChange={handleChange}
              >
                <option value="private">Privado</option>
                <option value="organization">Organización</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">
                Seguridad y Sesiones
              </h4>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="requireStrongPassword"
                  checked={!!formState.requireStrongPassword}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                />
                Requerir contraseñas robustas
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="enable2FA"
                  checked={!!formState.enable2FA}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                />
                Habilitar verificación en dos pasos (2FA)
              </label>
              <Input
                label="Tiempo de cierre de sesión (minutos)"
                type="number"
                name="sessionTimeoutMinutes"
                min={5}
                value={formState.sessionTimeoutMinutes ?? 60}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">
                Flujos de Trabajo
              </h4>
              <Input
                label="Frecuencia de Reporte Fotográfico (días)"
                type="number"
                min={1}
                name="photoIntervalDays"
                value={formState.photoIntervalDays ?? 3}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1 text-sm">
            {feedback && (
              <span className="text-sm font-medium text-green-600">
                {feedback}
              </span>
            )}
            {localError && (
              <span className="text-sm font-medium text-red-600">
                {localError}
              </span>
            )}
            <span className="text-xs text-gray-500">
              Los cambios se registrarán en el historial de auditoría.
            </span>
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </Card>
    </form>
  );
};

type InviteUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (payload: {
    fullName: string;
    email: string;
    appRole: AppRole;
    projectRole?: string;
    entity?: string | null;
  }) => Promise<{ user: User; temporaryPassword: string }>;
};

type EditUserModalProps = {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (patch: UserAdminPatch) => Promise<void>;
};

const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
}) => {
  const [fullName, setFullName] = useState<string>("");
  const [appRole, setAppRole] = useState<AppRole>("viewer");
  const [projectRole, setProjectRole] = useState<string>(
    PROJECT_ROLE_OPTIONS[0].value
  );
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [entity, setEntity] = useState<string>("");
  const [cargo, setCargo] = useState<string>("");
  const [canDownload, setCanDownload] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setAppRole(user.appRole);
      setProjectRole(String(user.projectRole));
      setStatus(user.status as "active" | "inactive");
      setEntity(user.entity || "");
      setCargo(user.cargo || "");
      setCanDownload(user.canDownload ?? true);
      setError(null);
      setIsSubmitting(false);
    }
  }, [user, isOpen]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        fullName: fullName.trim(),
        appRole,
        projectRole,
        status,
        entity: entity || null,
        cargo: cargo || null,
        canDownload,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el usuario.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Usuario · ${user.fullName}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre completo"
        />
        <Input label="Email" value={user.email || ""} disabled readOnly />
        <Select
          label="Rol de Aplicación"
          value={appRole}
          onChange={(e) => setAppRole(e.target.value as AppRole)}
        >
          {APP_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          label="Rol de Proyecto"
          value={projectRole}
          onChange={(e) => {
            const selectedValue = e.target.value;
            setProjectRole(selectedValue);
            // Establecer automáticamente la entidad según el rol seleccionado
            const selectedOption = PROJECT_ROLE_OPTIONS.find(opt => opt.value === selectedValue);
            if (selectedOption) {
              setEntity(selectedOption.entity);
            }
          }}
        >
          {PROJECT_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          label="Entidad"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        >
          <option value="">Sin entidad</option>
          <option value="IDU">IDU</option>
          <option value="INTERVENTORIA">INTERVENTORIA</option>
          <option value="CONTRATISTA">CONTRATISTA</option>
        </Select>
        <Input
          label="Cargo"
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          placeholder="Ej: Supervisor Ambiental, Residente Técnico, etc."
        />
        <Select
          label="Estado"
          value={status}
          onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
        >
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </Select>
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              Permiso de Descarga
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Permite al usuario descargar archivos. Si está desactivado, solo podrá previsualizar.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={canDownload}
              onChange={(e) => setCanDownload(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
          </label>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  onInvite,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [appRole, setAppRole] = useState<AppRole>("viewer");
  const [projectRole, setProjectRole] = useState<string>(
    PROJECT_ROLE_OPTIONS[0].value
  );
  const [entity, setEntity] = useState<string>(
    PROJECT_ROLE_OPTIONS[0].entity
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    user: User;
    temporaryPassword: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFullName("");
      setEmail("");
      setAppRole("viewer");
      setProjectRole(PROJECT_ROLE_OPTIONS[0].value);
      setEntity(PROJECT_ROLE_OPTIONS[0].entity);
      setInviteResult(null);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await onInvite({
        fullName,
        email,
        appRole,
        projectRole,
        entity: entity || null,
      });
      setInviteResult(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo completar la invitación.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invitar Nuevo Usuario"
      size="md"
    >
      {inviteResult ? (
        <div className="space-y-4">
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Invitación creada con éxito. Comparte la contraseña temporal con el
            usuario para su primer ingreso.
          </div>
          <div className="grid gap-4">
            <Input
              label="Email"
              value={inviteResult.user.email}
              readOnly
              disabled
            />
            <Input
              label="Contraseña Temporal"
              value={inviteResult.temporaryPassword}
              readOnly
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre Completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Select
            label="Rol de Aplicación"
            value={appRole}
            onChange={(e) => setAppRole(e.target.value as AppRole)}
          >
            {APP_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Rol de Proyecto"
            value={projectRole}
            onChange={(e) => {
              const selectedValue = e.target.value;
              setProjectRole(selectedValue);
              // Establecer automáticamente la entidad según el rol seleccionado
              const selectedOption = PROJECT_ROLE_OPTIONS.find(opt => opt.value === selectedValue);
              if (selectedOption) {
                setEntity(selectedOption.entity);
              }
            }}
          >
            {PROJECT_ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar Invitación"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default AdminDashboard;
