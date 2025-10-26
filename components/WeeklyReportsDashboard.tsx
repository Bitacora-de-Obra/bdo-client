import React, { useState, useEffect, useCallback } from "react"; // Importa useEffect
import {
  ProjectDetails,
  Report,
  ReportScope,
  ReportStatus,
  User,
} from "../types"; // Importa tipos necesarios
import api from "../src/services/api"; // Cliente API centralizado
import Button from "./ui/Button";
import { PlusIcon, CalendarIcon } from "./icons/Icon"; // Importa CalendarIcon
import EmptyState from "./ui/EmptyState";
// import WeeklyReportGenerator from './reports/WeeklyReportGenerator'; // Comentamos esto por ahora
import Card from "./ui/Card"; // Para mostrar los informes existentes
import ReportCard from "./ReportCard"; // Reutilizamos ReportCard
import ReportFormModal from "./ReportFormModal"; // Usamos el modal genérico
import ReportDetailModal from "./ReportDetailModal"; // Importa el modal de detalle
import { useAuth } from "../contexts/AuthContext"; // Importa useAuth
import { useToast } from "./ui/ToastProvider";

interface WeeklyReportsDashboardProps {
  project: ProjectDetails;
  reportScope: ReportScope; // Necesitamos saber el scope (Obra o Interv.)
}

const WeeklyReportsDashboard: React.FC<WeeklyReportsDashboardProps> = ({
  project,
  reportScope,
}) => {
  const { user } = useAuth(); // Obtenemos el usuario
  const { showToast } = useToast();

  // --- Estado local para datos reales ---
  const [weeklyReports, setWeeklyReports] = useState<Report[]>([]); // Usamos el tipo genérico Report
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ------------------------------------

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "newVersion">("create");
  const [baseReportForForm, setBaseReportForForm] = useState<Report | null>(null);

  // --- useEffect para cargar datos ---
  const loadReports = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await api(`/reports?type=Weekly&scope=${reportScope}`);
      setWeeklyReports(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al cargar los informes semanales."
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
    setError(null);

    try {
      // 1. Subir archivos adjuntos
      // **IMPORTANTE**: Asegúrate que el backend /api/upload devuelva el ID del Attachment creado.
      const uploadResults = await Promise.all(
        files.map((file) => api.upload.uploadFile(file, "document"))
      );

      // 2. Preparar payload con IDs de adjuntos
      const attachmentDataForPayload = uploadResults.map((result) => ({
        id: result.id,
      }));

      // 3. Crear el informe llamando a POST /api/reports
      const reportPayload = {
        ...reportData,
        type: "Weekly", // Aseguramos el tipo
        reportScope: reportScope, // Usamos el scope definido
        authorId: user.id,
        attachments: attachmentDataForPayload, // Enviamos IDs de adjuntos
        requiredSignatories: reportData.requiredSignatories || [], // Asegura que sea un array
        previousReportId: options.previousReportId,
      };

      console.log(
        "Enviando payload a /api/reports:",
        JSON.stringify(reportPayload, null, 2)
      ); // Log para depurar payload

      const createdReport = await api("/reports", {
        method: "POST",
        body: JSON.stringify(reportPayload),
      });

      await loadReports();

      if (options.previousReportId) {
        setSelectedReport(createdReport);
        setIsDetailModalOpen(true);
      }

      showToast({
        variant: "success",
        title: "Informe creado",
        message: "El informe semanal se registró correctamente.",
      });

      handleCloseForm();
    } catch (err) {
      console.error("Error detallado al guardar:", err); // Log más detallado
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar el informe semanal. Revisa la consola para más detalles."
      );
      showToast({
        variant: "error",
        title: "Error al guardar",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo registrar el informe semanal.",
      });
    } finally {
      // setIsLoading(false); // Quitar feedback visual
    }
  };
  // -------------------------------------------------------------

  // --- Funciones para Actualización y Firma (Pendientes - Simulación) ---
  const handleUpdateReport = async (updatedReport: Report) => {
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
      showToast({
        variant: "success",
        title: "Informe actualizado",
        message: "Los cambios se guardaron correctamente.",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar el informe."
      );
      showToast({
        variant: "error",
        title: "Error al actualizar",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo actualizar el informe.",
      });
    }
  };

const addSignature = async (
    documentId: string,
    documentType: "report",
    signer: User,
    password?: string
  ): Promise<{ success: boolean; error?: string; updated?: Report }> => {
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

  const handleGenerateWeeklyExcel = async (reportId: string) => {
    try {
      const { report: updatedReport, attachment } =
        await api.reports.generateWeeklyExcel(reportId);

      if (updatedReport) {
        setWeeklyReports((prev) => {
          const index = prev.findIndex((item) => item.id === updatedReport.id);
          if (index === -1) {
            return prev;
          }
          const next = [...prev];
          next[index] = updatedReport;
          return next;
        });

        if (isDetailModalOpen && selectedReport?.id === updatedReport.id) {
          setSelectedReport(updatedReport);
        }
      }

      if (
        attachment?.downloadUrl &&
        typeof window !== "undefined" &&
        typeof document !== "undefined"
      ) {
        const link = document.createElement("a");
        link.href = attachment.downloadUrl;
        link.target = "_blank";
        link.rel = "noopener";
        link.download = attachment.fileName || "informe-semanal.xlsx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      if (!attachment?.downloadUrl) {
        throw new Error(
          "El servidor no entregó un enlace de descarga para el Excel."
        );
      }

      showToast({
        variant: "success",
        title: "Excel generado",
        message: attachment.fileName
          ? `Se descargó ${attachment.fileName}.`
          : "El archivo Excel se generó correctamente.",
      });

      return { attachment, report: updatedReport };
    } catch (err: any) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al generar el Excel del informe semanal.";
      showToast({
        variant: "error",
        title: "Error al generar Excel",
        message,
      });
      throw new Error(message);
    }
  };

  if (!user) return null; // Necesario por si el usuario se desloguea

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Informes Semanales ({reportScope})
          </h2>
          <p className="text-sm text-gray-500">Proyecto: {project.name}</p>
        </div>
        <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
          Registrar Informe Semanal
        </Button>
      </div>

      {isLoading && <div className="text-center p-8">Cargando informes...</div>}
      {error && <div className="text-center p-8 text-red-500">{error}</div>}

      {!isLoading && !error && (
        <div>
          {weeklyReports.length > 0 ? (
            <div className="space-y-4">
              {weeklyReports.map((report) => (
                // Asegúrate que ReportCard pueda manejar el tipo Report genérico
                <ReportCard
                  key={report.id}
                  report={report}
                  onSelect={handleOpenDetail}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarIcon />} // Cambiado icono
              title="No hay informes semanales"
              message="Genera el primer informe para consolidar el avance, personal, actividades y estado general del proyecto durante la semana."
              actionButton={
                <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
                  Registrar Primer Informe
                </Button>
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
          onCreateVersion={handleCreateVersion}
          onGenerateExcel={handleGenerateWeeklyExcel}
        />
      )}

      {/* Modal de Formulario (Usamos el genérico) */}
      <ReportFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseForm}
        onSave={handleSaveReport} // Conectado al backend con subida
        reportType="Weekly"
        reportScope={reportScope} // Pasamos el scope
        baseReport={baseReportForForm}
        mode={formMode}
      />
    </div>
  );
};

export default WeeklyReportsDashboard;
