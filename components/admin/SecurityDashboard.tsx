import React, { useState, useMemo } from "react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Input from "../ui/Input";
import {
  useSecurityMonitoring,
  SecurityEvent,
  SecurityEventType,
  SecurityEventSeverity,
} from "../../src/hooks/useSecurityMonitoring";
import { ShieldCheckIcon, AlertTriangleIcon, RefreshCwIcon } from "../icons/Icon";
import { useToast } from "../ui/ToastProvider";

const EVENT_TYPE_OPTIONS: { value: SecurityEventType | ""; label: string }[] = [
  { value: "", label: "Todos los tipos" },
  { value: "LOGIN_FAILED", label: "Login Fallido" },
  { value: "LOGIN_SUCCESS", label: "Login Exitoso" },
  { value: "LOGIN_BLOCKED", label: "Login Bloqueado" },
  { value: "ACCESS_DENIED", label: "Acceso Denegado" },
  { value: "RATE_LIMIT_EXCEEDED", label: "Rate Limit Excedido" },
  { value: "CSRF_TOKEN_INVALID", label: "Token CSRF Inválido" },
  { value: "FILE_UPLOAD_REJECTED", label: "Archivo Rechazado" },
  { value: "UNAUTHORIZED_ACCESS_ATTEMPT", label: "Intento No Autorizado" },
  { value: "SUSPICIOUS_ACTIVITY", label: "Actividad Sospechosa" },
  { value: "PASSWORD_CHANGE", label: "Cambio de Contraseña" },
  { value: "TOKEN_INVALID", label: "Token Inválido" },
  { value: "TOKEN_EXPIRED", label: "Token Expirado" },
];

const SEVERITY_OPTIONS: { value: SecurityEventSeverity | ""; label: string }[] = [
  { value: "", label: "Todas las severidades" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "critical", label: "Crítica" },
];

const getSeverityColor = (severity: SecurityEventSeverity): string => {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getEventTypeLabel = (type: SecurityEventType): string => {
  const option = EVENT_TYPE_OPTIONS.find((opt) => opt.value === type);
  return option?.label || type;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const SecurityDashboard: React.FC = () => {
  const {
    events,
    stats,
    isLoading,
    isRefreshing,
    error,
    filters,
    applyFilters,
    reload,
  } = useSecurityMonitoring();

  const { showToast } = useToast();

  const [localFilters, setLocalFilters] = useState({
    type: filters?.type || "",
    severity: filters?.severity || "",
    ipAddress: filters?.ipAddress || "",
    limit: filters?.limit || 100,
  });

  const handleFilterChange = (key: string, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    const newFilters: any = {};
    if (localFilters.type) newFilters.type = localFilters.type;
    if (localFilters.severity) newFilters.severity = localFilters.severity;
    if (localFilters.ipAddress) newFilters.ipAddress = localFilters.ipAddress;
    if (localFilters.limit) newFilters.limit = localFilters.limit;

    applyFilters(newFilters);
  };

  const handleResetFilters = () => {
    setLocalFilters({
      type: "",
      severity: "",
      ipAddress: "",
      limit: 100,
    });
    applyFilters({ limit: 100 });
  };

  const handleRefresh = async () => {
    await reload();
    showToast({ message: "Eventos de seguridad actualizados", variant: "success" });
  };

  const statsCards = useMemo(() => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Eventos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eventos Críticos (24h)</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.recentCriticalEvents}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Alta Severidad</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.eventsBySeverity.high || 0}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <AlertTriangleIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">IPs Monitoreadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.topIPs.length}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </Card>
      </div>
    );
  }, [stats]);

  const eventsByTypeChart = useMemo(() => {
    if (!stats) return null;

    const sortedTypes = Object.entries(stats.eventsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Eventos por Tipo (Top 5)
        </h3>
        <div className="space-y-3">
          {sortedTypes.map(([type, count]) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-700">
                  {getEventTypeLabel(type as SecurityEventType)}
                </span>
                <span className="text-sm font-semibold text-gray-900">{count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-idu-blue h-2 rounded-full"
                  style={{
                    width: `${(count / stats.totalEvents) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }, [stats]);

  const eventsBySeverityChart = useMemo(() => {
    if (!stats) return null;

    const severities: SecurityEventSeverity[] = ["critical", "high", "medium", "low"];
    const colors = {
      critical: "bg-red-500",
      high: "bg-orange-500",
      medium: "bg-yellow-500",
      low: "bg-blue-500",
    };

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Eventos por Severidad
        </h3>
        <div className="space-y-3">
          {severities.map((severity) => {
            const count = stats.eventsBySeverity[severity] || 0;
            return (
              <div key={severity}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {severity}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${colors[severity]} h-2 rounded-full`}
                    style={{
                      width: `${stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }, [stats]);

  const topIPsList = useMemo(() => {
    if (!stats || stats.topIPs.length === 0) return null;

    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top IPs por Actividad
        </h3>
        <div className="space-y-2">
          {stats.topIPs.slice(0, 10).map(({ ip, count }) => (
            <div
              key={ip}
              className="flex items-center justify-between p-2 bg-gray-50 rounded"
            >
              <span className="text-sm font-mono text-gray-700">{ip}</span>
              <span className="text-sm font-semibold text-gray-900">{count} eventos</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }, [stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Cargando eventos de seguridad...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="bg-red-100 p-3 rounded-lg">
            <ShieldCheckIcon className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Monitoreo de Seguridad
            </h2>
            <p className="text-sm text-gray-500">
              Eventos y estadísticas de seguridad del sistema
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCwIcon
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {statsCards}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {eventsByTypeChart}
        {eventsBySeverityChart}
      </div>

      {topIPsList && <div className="mb-6">{topIPsList}</div>}

      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Filtros de Eventos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Evento
              </label>
              <Select
                value={localFilters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severidad
              </label>
              <Select
                value={localFilters.severity}
                onChange={(e) => handleFilterChange("severity", e.target.value)}
              >
                {SEVERITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección IP
              </label>
              <Input
                type="text"
                value={localFilters.ipAddress}
                onChange={(e) => handleFilterChange("ipAddress", e.target.value)}
                placeholder="192.168.1.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Límite
              </label>
              <Input
                type="number"
                value={localFilters.limit}
                onChange={(e) =>
                  handleFilterChange("limit", parseInt(e.target.value) || 100)
                }
                min={1}
                max={1000}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters}>Aplicar Filtros</Button>
            <Button variant="secondary" onClick={handleResetFilters}>
              Limpiar
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Eventos Recientes ({events.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron eventos
                    </td>
                  </tr>
                ) : (
                  events.map((event, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(event.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {getEventTypeLabel(event.type)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(
                            event.severity
                          )}`}
                        >
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                        {event.ipAddress || "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {event.path || "N/A"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {event.email || event.userId || "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SecurityDashboard;

