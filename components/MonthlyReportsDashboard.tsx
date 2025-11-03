import React, { useState, useEffect, useCallback } from "react"; // Importa useEffect
import { Project, Report, ReportScope, ReportStatus, User } from "../types"; // Importa tipos
import api from "../src/services/api"; // Cliente API centralizado
import Button from "./ui/Button";
import { PlusIcon, CalendarIcon } from "./icons/Icon"; // Icono Calendar para el EmptyState
import EmptyState from "./ui/EmptyState";
import ReportCard from "./ReportCard";
import ReportDetailModal from "./ReportDetailModal";
import ReportFormModal from "./ReportFormModal";
import { useAuth } from "../contexts/AuthContext"; // Importa useAuth
import { usePermissions } from "../src/hooks/usePermissions";
import { useToast } from "./ui/ToastProvider";

interface MonthlyReportsDashboardProps {
  project: Project; // Cambiado a Project genérico si ProjectDetails no es necesario aquí
  reportScope: ReportScope; // Necesitamos el scope
}

const MonthlyReportsDashboard: React.FC<MonthlyReportsDashboardProps> = ({
  project,
  reportScope,
}) => {
  const { user } = useAuth();
  const { canEditContent } = usePermissions();
  const readOnly = !canEditContent;
  const { showToast } = useToast();

  // --- Estado local para datos reales ---
  const [monthlyReports, setMonthlyReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ------------------------------------------------------------

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "newVersion">("create");
  const [baseReportForForm, setBaseReportForForm] = useState<Report | null>(null);

  const title = `Informes Mensuales (${reportScope})`;

  // --- useEffect para cargar datos ---
  const loadReports = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api(`/reports?type=Monthly&scope=${reportScope}`);
      setMonthlyReports(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los informes mensuales."
      );
    } finally {
      setIsLoading(false);
    }
  }, [reportScope, user]);

  useEffect(() => {
    if (user) {
      loadReports();
    } else {
      setIsLoading(false);
    }
  }, [user, loadReports]);
  // ---------------------------------

  const handleOpenDetail = (report: Report) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedReport(null);
  };

  const handleOpenForm = () => {
    if (readOnly) {
      showToast({
        title: "Acceso restringido",
        message: "El rol Viewer no puede registrar informes mensuales.",
        variant: "warning",
      });
      setIsFormModalOpen(false);
      return;
    }
    setFormMode("create");
    setBaseReportForForm(null);
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setBaseReportForForm(null);
    setFormMode("create");
  };

  const handleCreateVersion = (report: Report) => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede generar nuevas versiones de informes.",
        variant: "error",
      });
      return;
    }
    setBaseReportForForm(report);
    setFormMode("newVersion");
    setIsFormModalOpen(true);
  };

  // --- Implementación de handleSaveReport con subida de archivos ---
  const handleSaveReport = async (
    reportData: Omit<
      Report,
      "id" | "author" | "status" | "attachments" | "signatures" | "version" | "previousReportId" | "versions"
    >,
    files: File[],
    options: { previousReportId?: string } = {}
  ) => {
    if (!user) return;
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede registrar informes mensuales.",
        variant: "error",
      });
      throw new Error("El perfil Viewer no puede registrar informes mensuales.");
    }
    setError(null);

    try {
      // 1. Subir archivos adjuntos
      const uploadResults = await Promise.all(
        files.map((file) => api.upload.uploadFile(file, "document"))
      );

      // 2. Preparar payload con IDs de adjuntos
      const attachmentDataForPayload = uploadResults.map((attachment) => ({
        id: attachment.id,
      }));

      // 3. Crear el informe llamando a POST /api/reports
      const reportPayload = {
        ...reportData,
        type: "Monthly", // Aseguramos el tipo
        reportScope: reportScope, // Usamos el scope de las props
        authorId: user.id,
        attachments: attachmentDataForPayload,
        requiredSignatories: reportData.requiredSignatories || [],
        previousReportId: options.previousReportId,
      };

      const createdReport = await api("/reports", {
        method: "POST",
        body: JSON.stringify(reportPayload),
      });

      await loadReports();

      if (options.previousReportId) {
        setSelectedReport(createdReport);
        setIsDetailModalOpen(true);
      }

      handleCloseForm();
    } catch (err) {
      console.error("Error detallado al guardar informe mensual:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar el informe mensual."
      );
    }
  };
  // -------------------------------------------------------------

  // --- Funciones para Actualización y Firma (Pendientes - Simulación) ---
  const handleUpdateReport = async (updatedReport: Report) => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede actualizar informes.",
        variant: "error",
      });
      return;
    }
    try {
      // Llamamos al endpoint PUT con los datos a actualizar
      const updatedReportFromServer = await api(
        `/reports/${updatedReport.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: updatedReport.status, // Enviamos el estado en formato frontend
            summary: updatedReport.summary, // Permite actualizar resumen
            // Podríamos enviar requiredSignatories si lo permitimos editar
          }),
        }
      );

      await loadReports();

      if (isDetailModalOpen) {
        setSelectedReport(updatedReportFromServer);
      }
      handleCloseDetail();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar el informe."
      );
    }
  };

  const addSignature = async (
    documentId: string,
    documentType: "report",
    signer: User,
    password?: string
  ): Promise<{ success: boolean; error?: string; updated?: Report }> => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede firmar informes.",
        variant: "error",
      });
      return { success: false, error: "No autorizado" };
    }
    if (!password) {
      return { success: false, error: "Se requiere contraseña para firmar." };
    }
    try {
      const updatedReportFromServer = await api(
        `/reports/${documentId}/signatures`,
        {
          method: "POST",
          body: JSON.stringify({
            signerId: signer.id,
            password,
          }),
        }
      );

      await loadReports();

      if (isDetailModalOpen) {
        setSelectedReport(updatedReportFromServer);
      }
      return { success: true, updated: updatedReportFromServer };
    } catch (err: any) {
      console.error("Error al firmar:", err);
      return {
        success: false,
        error: err?.message || "Error al procesar la firma.",
      };
    }
  };
  // -------------------------------------------------------------

  const handleSelectVersion = async (reportId: string) => {
    try {
      const data = await api(`/reports/${reportId}`);
      setSelectedReport(data);
      setIsDetailModalOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la versión seleccionada."
      );
    }
  };

  if (!user) return null; // Necesario por si el usuario se desloguea

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">Proyecto: {project.name}</p>
        </div>
        {canEditContent && (
          <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
            Registrar Informe Mensual
          </Button>
        )}
      </div>

      {isLoading && <div className="text-center p-8">Cargando informes...</div>}
      {error && <div className="text-center p-8 text-red-500">{error}</div>}

      {!isLoading && !error && (
        <div>
          {monthlyReports.length > 0 ? (
            <div className="space-y-4">
              {monthlyReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onSelect={handleOpenDetail}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarIcon />}
              title="No hay informes mensuales"
              message="Registra el informe mensual para consolidar el avance, la ejecución presupuestal y los hitos clave del periodo."
              actionButton={
                canEditContent ? (
                  <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
                    Crear Primer Informe
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      )}

      {/* Modal de Detalle (Usamos el genérico) */}
      {selectedReport && user && (
        <ReportDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          report={selectedReport}
          onUpdate={handleUpdateReport} // Conectado (simulado por ahora)
          onSign={addSignature} // Conectado (simulado por ahora)
          currentUser={user}
          onSelectVersion={handleSelectVersion}
          onCreateVersion={canEditContent ? handleCreateVersion : undefined}
          readOnly={readOnly}
        />
      )}

      {/* Modal de Formulario (Usamos el genérico) */}
      {canEditContent && (
        <ReportFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseForm}
          onSave={handleSaveReport}
          reportType="Monthly"
          reportScope={reportScope}
          baseReport={baseReportForForm}
          mode={formMode}
        />
      )}
    </div>
  );
};

export default MonthlyReportsDashboard;
