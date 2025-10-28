import React, { useState, useMemo, useEffect } from "react";
import { ProjectDetails, LogEntry, User } from "../types";
import api from "../src/services/api";
import FilterBar from "./FilterBar";
import EntryCard from "./EntryCard";
import EntryDetailModal from "./EntryDetailModal";
import EntryFormModal from "./EntryFormModal";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import {
  PlusIcon,
  Squares2X2Icon,
  DocumentArrowDownIcon,
  ListBulletIcon,
  CalendarIcon,
} from "./icons/Icon";
import ExportModal from "./ExportModal";
import CalendarView from "./CalendarView";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "../src/hooks/useApi";

interface ProjectDashboardProps {
  initialItemToOpen: { type: string; id: string } | null;
  clearInitialItem: () => void;
}

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  initialItemToOpen,
  clearInitialItem,
}) => {
  const { user } = useAuth();
  const { data: project, isLoading: isProjectLoading } = useApi.projectDetails();
  const { data: logEntries, isLoading: isLogEntriesLoading, error, retry: refetchLogEntries } = useApi.logEntries();
  const { data: users, isLoading: isUsersLoading } = useApi.users();

  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [newEntryDefaultDate, setNewEntryDefaultDate] = useState<string | null>(
    null
  );
  const [filters, setFilters] = useState({
    searchTerm: "",
    status: "all",
    type: "all",
    user: "all",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (initialItemToOpen && initialItemToOpen.type === "logEntry" && logEntries) {
      const entryToOpen = logEntries.find((e) => e.id === initialItemToOpen.id);
      if (entryToOpen) {
        handleOpenDetail(entryToOpen);
      }
      clearInitialItem();
    }
  }, [initialItemToOpen, logEntries, clearInitialItem]);

  const handleOpenDetail = (entry: LogEntry) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  const filteredEntries = useMemo(() => {
    if (!logEntries) return [];

    return logEntries.filter((entry) => {
      const searchTermMatch =
        entry.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        entry.description
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        entry.activitiesPerformed
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        entry.materialsUsed
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        entry.workforce
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        entry.weatherConditions
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        entry.additionalObservations
          .toLowerCase()
          .includes(filters.searchTerm.toLowerCase()) ||
        String(entry.folioNumber).includes(filters.searchTerm);
      const statusMatch =
        filters.status === "all" || entry.status === filters.status;
      const typeMatch = filters.type === "all" || entry.type === filters.type;
      const userMatch =
        filters.user === "all" ||
        (entry.author && entry.author.id === filters.user);

      const entryDateOnly = entry.entryDate.substring(0, 10);
      const startDateMatch =
        !filters.startDate || entryDateOnly >= filters.startDate;
      const endDateMatch =
        !filters.endDate || entryDateOnly <= filters.endDate;

      return (
        searchTermMatch &&
        statusMatch &&
        typeMatch &&
        userMatch &&
        startDateMatch &&
        endDateMatch
      );
    });
  }, [logEntries, filters]);

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedEntry(null);
  };

  const handleOpenForm = () => {
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setNewEntryDefaultDate(null);
  };

  const handleDateClickOnCalendar = (dateStr: string) => {
    setNewEntryDefaultDate(dateStr);
    setIsFormModalOpen(true);
  };

  const handleSaveEntry = async (
    newEntryData: Omit<
      LogEntry,
      | "id"
      | "folioNumber"
      | "createdAt"
      | "author"
      | "comments"
      | "history"
      | "updatedAt"
      | "attachments"
    >,
    files: File[]
  ) => {
    if (!user) {
      throw new Error("No estás autenticado.");
    }

    if (!project) {
      throw new Error("No se ha cargado la información del proyecto.");
    }

    try {
      await api.logEntries.create(
        {
          ...newEntryData,
          authorId: user.id,
          projectId: project.id,
        },
        files
      );

      // Refrescar la lista de entradas
      refetchLogEntries();
      handleCloseForm();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Ocurrió un error al guardar la anotación.");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await api.logEntries.delete(entryId);
      refetchLogEntries();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Ocurrió un error al eliminar la anotación.");
    }
  };

  const handleAddComment = async (
    entryId: string,
    commentText: string,
    files: File[]
  ) => {
    if (!user) {
      throw new Error("No estás autenticado para comentar.");
    }

    try {
      if (files.length > 0) {
        throw new Error("La carga de archivos en comentarios estará disponible próximamente.");
      }

      // Crear el comentario
      await api.logEntries.addComment(entryId, {
        content: commentText,
        authorId: user.id,
      });

      // Refrescar la entrada
      const updatedEntry = await api.logEntries.getById(entryId);
      setSelectedEntry(updatedEntry);
      refetchLogEntries();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Ocurrió un error al añadir el comentario.");
    }
  };

  const handleUpdateEntry = async (updatedEntryData: LogEntry) => {
    try {
      const updatedEntry = await api.logEntries.update(updatedEntryData.id, updatedEntryData);
      setSelectedEntry(updatedEntry);
      refetchLogEntries();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Ocurrió un error al actualizar la anotación.");
    }
  };

  const addSignature = async (
    documentId: string,
    documentType: "logEntry",
    signer: User,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const updatedEntry = await api.logEntries.addSignature(documentId, {
        signerId: signer.id,
        password,
      });

      setSelectedEntry(updatedEntry);
      refetchLogEntries();

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      return { success: false, error: errorMessage };
    }
  };

  const handleExportEntries = () => {
    if (!project || !logEntries) return;

    const header = `Extracto de Bitácora Digital de Obra\nProyecto: ${
      project.name
    }\nContrato: ${
      project.contractId
    }\nFecha de Exportación: ${new Date().toLocaleString(
      "es-CO"
    )}\n\nFiltros Aplicados:\n- Término de Búsqueda: ${
      filters.searchTerm || "Ninguno"
    }\n- Estado: ${filters.status}\n- Tipo: ${filters.type}\n- Usuario: ${
      filters.user === "all"
        ? "Todos"
        : logEntries.find(entry => entry.author.id === filters.user)?.author.fullName || "N/A"
    }\n- Fecha Desde: ${filters.startDate || "N/A"}\n- Fecha Hasta: ${
      filters.endDate || "N/A"
    }\n\nTotal de Anotaciones: ${
      filteredEntries.length
    }\n\n========================================\n\n`;

    const content = filteredEntries
      .map((entry) => {
        const comments = (entry.comments || [])
          .map(
            (c) =>
              `\t- [${new Date(c.timestamp).toLocaleString("es-CO")}] ${
                c.author.fullName
              }: ${c.content}`
          )
          .join("\n");
        const attachments = (entry.attachments || [])
          .map((a) => `\t- ${a.fileName} (${(a.size / 1024).toFixed(2)} KB)`)
          .join("\n");

        return `
    Folio: #${entry.folioNumber}
    Título: ${entry.title}
    Estado: ${entry.status}
    Tipo: ${entry.type}
    Autor: ${entry.author.fullName}
    Fecha del Diario: ${new Date(entry.entryDate).toLocaleDateString("es-CO")}
    Fecha de Registro: ${new Date(entry.createdAt).toLocaleString("es-CO")}
    Confidencial: ${entry.isConfidential ? "Sí" : "No"}
    
    Resumen general:
    ${entry.description}

    Actividades realizadas:
    ${entry.activitiesPerformed || "Sin registro."}

    Materiales utilizados:
    ${entry.materialsUsed || "Sin registro."}

    Personal en obra:
    ${entry.workforce || "Sin registro."}

    Condiciones climáticas:
    ${entry.weatherConditions || "Sin registro."}

    Observaciones adicionales:
    ${entry.additionalObservations || "Sin observaciones."}
    
    Comentarios (${(entry.comments || []).length}):
    ${comments || "\t(Sin comentarios)"}
    
    Adjuntos (${(entry.attachments || []).length}):
    ${attachments || "\t(Sin adjuntos)"}
    
    ----------------------------------------
            `;
      })
      .join("");

    const fullContent = header + content;

    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `Bitacora_Export_${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  if (!user) return null;

  const isLoading = isProjectLoading || isLogEntriesLoading || isUsersLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {project ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
              <p className="text-sm text-gray-500">
                Contrato: {project.contractId}
              </p>
            </>
          ) : (
            <div className="animate-pulse">
              <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          )}
        </div>
        <div className="flex items-center flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              title="Vista de Lista"
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${
                viewMode === "list"
                  ? "bg-white text-brand-primary shadow"
                  : "text-gray-600 hover:bg-gray-300/50"
              }`}
            >
              <ListBulletIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              title="Vista de Calendario"
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${
                viewMode === "calendar"
                  ? "bg-white text-brand-primary shadow"
                  : "text-gray-600 hover:bg-gray-300/50"
              }`}
            >
              <CalendarIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
          </div>
          <Button
            onClick={() => setIsExportModalOpen(true)}
            leftIcon={<DocumentArrowDownIcon />}
            variant="secondary"
            className="w-full sm:w-auto"
            disabled={!project || !logEntries || filteredEntries.length === 0}
          >
            Exportar
          </Button>
          <Button
            onClick={handleOpenForm}
            leftIcon={<PlusIcon />}
            className="w-full sm:w-auto"
            disabled={!project}
          >
            Nueva Anotación
          </Button>
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} users={users || []} />

      {isLoading && (
        <div className="text-center p-8">Cargando anotaciones...</div>
      )}
      {error && <div className="text-center p-8 text-red-500">{error.message}</div>}

      {!isLoading && !error && (
        <>
          {viewMode === "list" && (
            <div className="space-y-4">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onSelect={handleOpenDetail}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<Squares2X2Icon />}
                  title="Aún no hay anotaciones"
                  message="Crea la primera anotación para iniciar el registro en la bitácora de obra. Puedes adjuntar archivos, fotos y más."
                  actionButton={
                    <Button onClick={handleOpenForm} leftIcon={<PlusIcon />} disabled={!project}>
                      Crear Primera Anotación
                    </Button>
                  }
                />
              )}
            </div>
          )}
          {viewMode === "calendar" && (
            <CalendarView
              entries={filteredEntries}
              onEventClick={handleOpenDetail}
              onDateClick={handleDateClickOnCalendar}
            />
          )}
        </>
      )}

      {selectedEntry && logEntries && (
        <EntryDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          entry={selectedEntry}
          onUpdate={handleUpdateEntry}
          onAddComment={handleAddComment}
          onSign={(docId, docType, signer, pass) =>
            addSignature(docId, docType, signer, pass)
          }
          onDelete={handleDeleteEntry}
          currentUser={user}
          availableUsers={users || []}
          onRefresh={refetchLogEntries}
        />
      )}
      {logEntries && (
        <EntryFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseForm}
          onSave={handleSaveEntry}
          initialDate={newEntryDefaultDate}
          availableUsers={users || []}
          currentUser={user}
        />
      )}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExportEntries}
        entryCount={filteredEntries.length}
        filters={filters}
      />
    </div>
  );
};

export default ProjectDashboard;
