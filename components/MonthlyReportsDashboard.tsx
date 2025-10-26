import React, { useState, useEffect } from "react"; // Importa useEffect
import { Project, Report, ReportScope, ReportStatus, User } from "../types"; // Importa tipos
import apiFetch from "../src/services/api"; // <-- Importa apiFetch
import Button from "./ui/Button";
import { PlusIcon, CalendarIcon } from "./icons/Icon"; // Icono Calendar para el EmptyState
import EmptyState from "./ui/EmptyState";
import ReportCard from "./ReportCard";
import ReportDetailModal from "./ReportDetailModal";
import ReportFormModal from "./ReportFormModal";
import { useAuth } from "../contexts/AuthContext"; // Importa useAuth

interface MonthlyReportsDashboardProps {
  project: Project; // Cambiado a Project genérico si ProjectDetails no es necesario aquí
  reportScope: ReportScope; // Necesitamos el scope
}

const MonthlyReportsDashboard: React.FC<MonthlyReportsDashboardProps> = ({
  project,
  reportScope,
}) => {
  const { user } = useAuth();

  // --- Estado local para datos reales ---
const [monthlyReports, setMonthlyReports] = useState<Report[]>([]); // Define 'monthlyReports' y 'setMonthlyReports'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ------------------------------------------------------------

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const title = `Informes Mensuales (${reportScope})`;

  // --- useEffect para cargar datos ---
  useEffect(() => {
    const fetchMonthlyReports = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Llama a /api/reports filtrando por tipo 'Monthly' y el scope recibido
        const data = await apiFetch(
          `/reports?type=Monthly&scope=${reportScope}`
        );
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
    };
    if (user) {
      fetchMonthlyReports();
    } else {
      setIsLoading(false); // No hay usuario, no cargamos nada
    }
  }, [reportScope, user]); // Depende del scope y del usuario
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
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
  };

  // --- Implementación de handleSaveReport con subida de archivos ---
  const handleSaveReport = async (
    reportData: Omit<
      Report,
      "id" | "author" | "status" | "attachments" | "signatures"
    >,
    files: File[]
  ) => {
    if (!user) return;
    // setIsLoading(true); // Feedback visual opcional
    setError(null);

    try {
      // 1. Subir archivos adjuntos
      const uploadPromises = files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        return fetch("http://localhost:4000/api/upload", {
          // Ajusta URL si es necesario
          method: "POST",
          body: formData,
        }).then(async (res) => {
          const result = await res.json();
          if (!res.ok || !result.id)
            throw new Error(
              result.error || `Error subiendo ${file.name} o falta ID`
            );
          return { id: result.id };
        });
      });
      const uploadResults = await Promise.all(uploadPromises);

      // 2. Preparar payload con IDs de adjuntos
      const attachmentDataForPayload = uploadResults.map((result) => ({
        id: result.id,
      }));

      // 3. Crear el informe llamando a POST /api/reports
      const reportPayload = {
        ...reportData,
        type: "Monthly", // Aseguramos el tipo
        reportScope: reportScope, // Usamos el scope de las props
        authorId: user.id,
        attachments: attachmentDataForPayload,
        requiredSignatories: reportData.requiredSignatories || [],
      };

      const createdReport = await apiFetch("/reports", {
        method: "POST",
        body: JSON.stringify(reportPayload),
      });

      // 4. Actualizar estado local y cerrar modal
      setMonthlyReports((prev) =>
        [createdReport, ...prev].sort(
          (a, b) =>
            new Date(b.submissionDate).getTime() -
            new Date(a.submissionDate).getTime()
        )
      );
      handleCloseForm();
    } catch (err) {
      console.error("Error detallado al guardar informe mensual:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar el informe mensual."
      );
    } finally {
      // setIsLoading(false); // Quitar feedback visual
    }
  };
  // -------------------------------------------------------------

  // --- Funciones para Actualización y Firma (Pendientes - Simulación) ---
  const handleUpdateReport = async (updatedReport: Report) => {
    try {
      // Llamamos al endpoint PUT con los datos a actualizar
      const updatedReportFromServer = await apiFetch(
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

      // Actualizamos el estado local (para el dashboard actual)
      setMonthlyReports((prev) =>
        prev.map((r) =>
          r.id === updatedReportFromServer.id ? updatedReportFromServer : r
        )
      );

      // Actualizamos el modal si está abierto
      if (selectedReport && selectedReport.id === updatedReportFromServer.id) {
        setSelectedReport(updatedReportFromServer);
      }
      handleCloseDetail(); // Cierra el modal después de guardar
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
    if (!password) {
      return { success: false, error: "Se requiere contraseña para firmar." };
    }
    try {
      const updatedReportFromServer = await apiFetch(
        `/reports/${documentId}/signatures`,
        {
          method: "POST",
          body: JSON.stringify({
            signerId: signer.id,
            password,
          }),
        }
      );

      setMonthlyReports((prev) =>
        prev.map((r) =>
          r.id === updatedReportFromServer.id ? updatedReportFromServer : r
        )
      );

      if (selectedReport && selectedReport.id === updatedReportFromServer.id) {
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

  if (!user) return null; // Necesario por si el usuario se desloguea

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">Proyecto: {project.name}</p>
        </div>
        <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
          Registrar Informe Mensual
        </Button>
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
                <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
                  Crear Primer Informe
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
        />
      )}

      {/* Modal de Formulario (Usamos el genérico) */}
      <ReportFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseForm}
        onSave={handleSaveReport} // Conectado al backend con subida
        reportType="Monthly" // Indicamos que es mensual
        reportScope={reportScope} // Pasamos el scope
      />
    </div>
  );
};

export default MonthlyReportsDashboard;
