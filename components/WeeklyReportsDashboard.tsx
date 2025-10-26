import React, { useState, useEffect } from "react"; // Importa useEffect
import {
  ProjectDetails,
  Report,
  ReportScope,
  ReportStatus,
  User,
} from "../types"; // Importa tipos necesarios
import apiFetch from "../src/services/api"; // <-- Importa apiFetch
import Button from "./ui/Button";
import { PlusIcon, DocumentChartBarIcon, CalendarIcon } from "./icons/Icon"; // Importa CalendarIcon
import EmptyState from "./ui/EmptyState";
// import WeeklyReportGenerator from './reports/WeeklyReportGenerator'; // Comentamos esto por ahora
import Card from "./ui/Card"; // Para mostrar los informes existentes
import ReportCard from "./ReportCard"; // Reutilizamos ReportCard
import ReportFormModal from "./ReportFormModal"; // Usamos el modal genérico
import ReportDetailModal from "./ReportDetailModal"; // Importa el modal de detalle
import { useAuth } from "../contexts/AuthContext"; // Importa useAuth

interface WeeklyReportsDashboardProps {
  project: ProjectDetails;
  reportScope: ReportScope; // Necesitamos saber el scope (Obra o Interv.)
}

const WeeklyReportsDashboard: React.FC<WeeklyReportsDashboardProps> = ({
  project,
  reportScope,
}) => {
  const { user } = useAuth(); // Obtenemos el usuario

  // --- Estado local para datos reales ---
  const [weeklyReports, setWeeklyReports] = useState<Report[]>([]); // Usamos el tipo genérico Report
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ------------------------------------

  const [isFormModalOpen, setIsFormModalOpen] = useState(false); // Usamos el modal genérico
  const [selectedReport, setSelectedReport] = useState<Report | null>(null); // Para el detalle
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // Para el detalle

  // --- useEffect para cargar datos ---
  useEffect(() => {
    const fetchWeeklyReports = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Llamamos al endpoint GET /api/reports filtrando por tipo y scope
        const data = await apiFetch(
          `/reports?type=Weekly&scope=${reportScope}`
        );
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
    };
    // Solo carga si hay un usuario logueado
    if (user) {
      fetchWeeklyReports();
    } else {
      setIsLoading(false); // No hay usuario, no cargamos nada
    }
  }, [reportScope, user]); // Se ejecuta al montar y si cambia el scope o el usuario
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
    >, // Quitamos signatures también
    files: File[]
  ) => {
    if (!user) return;
    // setIsLoading(true); // Puedes añadir feedback visual
    setError(null);

    try {
      // 1. Subir archivos adjuntos
      // **IMPORTANTE**: Asegúrate que el backend /api/upload devuelva el ID del Attachment creado.
      const uploadPromises = files.map((file) => {
        const formData = new FormData();
        formData.append("file", file);
        return fetch("http://localhost:4000/api/upload", {
          // Ajusta la URL si es necesario
          method: "POST",
          body: formData,
          // No añadir 'Authorization' header aquí si /upload no lo requiere
        }).then(async (res) => {
          const result = await res.json();
          // Verifica que la respuesta sea OK y que contenga un ID
          if (!res.ok || !result.id) {
            console.error("Error en respuesta de /api/upload:", result); // Log para depurar
            throw new Error(
              result.error ||
                `Error subiendo ${file.name} o falta ID en la respuesta.`
            );
          }
          return { id: result.id }; // Solo necesitamos el ID para conectar
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
        type: "Weekly", // Aseguramos el tipo
        reportScope: reportScope, // Usamos el scope definido
        authorId: user.id,
        attachments: attachmentDataForPayload, // Enviamos IDs de adjuntos
        requiredSignatories: reportData.requiredSignatories || [], // Asegura que sea un array
      };

      console.log(
        "Enviando payload a /api/reports:",
        JSON.stringify(reportPayload, null, 2)
      ); // Log para depurar payload

      const createdReport = await apiFetch("/reports", {
        method: "POST",
        body: JSON.stringify(reportPayload),
      });

      // 4. Actualizar estado local y cerrar modal
      setWeeklyReports((prev) =>
        [createdReport, ...prev].sort(
          (a, b) =>
            new Date(b.submissionDate).getTime() -
            new Date(a.submissionDate).getTime()
        )
      );
      handleCloseForm();
    } catch (err) {
      console.error("Error detallado al guardar:", err); // Log más detallado
      setError(
        err instanceof Error
          ? err.message
          : "Error al guardar el informe semanal. Revisa la consola para más detalles."
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

      setWeeklyReports((prev) =>
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

      setWeeklyReports((prev) =>
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
        />
      )}

      {/* Modal de Formulario (Usamos el genérico) */}
      <ReportFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseForm}
        onSave={handleSaveReport} // Conectado al backend con subida
        reportType="Weekly"
        reportScope={reportScope} // Pasamos el scope
      />
    </div>
  );
};

export default WeeklyReportsDashboard;
