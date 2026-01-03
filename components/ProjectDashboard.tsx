import React, { useState, useMemo, useEffect } from "react";
import { ProjectDetails, LogEntry, User, SignatureConsentPayload, UserRole, Comment, EntryStatus } from "../types";
import api from "../src/services/api";
import FilterBar from "./FilterBar";
import EntryCard from "./EntryCard";
import EntryDetailModal from "./EntryDetailModal";
import EntryFormModal from "./EntryFormModal";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";
import Pagination from "./ui/Pagination";
import EntryCardSkeleton from "./ui/EntryCardSkeleton";
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
import { usePermissions } from "../src/hooks/usePermissions";
import { useToast } from "./ui/ToastProvider";

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
  const [currentPage, setCurrentPage] = useState(1);
  const ENTRIES_PER_PAGE = 20;
  const [prefetchedPage, setPrefetchedPage] = useState<number | null>(null);
  const [prefetchedData, setPrefetchedData] = useState<any>(null);
  const { data: logEntriesResponse, isLoading: isLogEntriesLoading, error, retry: refetchLogEntries } = useApi.logEntries(currentPage, ENTRIES_PER_PAGE, sortBy);
  const { data: users, isLoading: isUsersLoading } = useApi.users();

  // Use prefetched data if available, otherwise use fresh data
  const actualLogEntriesResponse = prefetchedPage === currentPage && prefetchedData
    ? prefetchedData
    : logEntriesResponse;

  // Extraer entries y pagination del response (backward compatible)
  const logEntries = Array.isArray(actualLogEntriesResponse) 
    ? actualLogEntriesResponse 
    : actualLogEntriesResponse?.entries || [];
  const pagination = !Array.isArray(actualLogEntriesResponse) 
    ? actualLogEntriesResponse?.pagination 
    : null;

  const [selectedEntry, setSelectedEntry] = useState<LogEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [newEntryDefaultDate, setNewEntryDefaultDate] = useState<string | null>(
    null
  );
  const [sortBy, setSortBy] = useState<"entryDate" | "folioNumber" | "folioNumberDesc" | "createdAt">("entryDate");
  const [filters, setFilters] = useState({
    searchTerm: "",
    status: "all",
    type: "all",
    user: "all",
    startDate: "",
    endDate: "",
  });
  const { canEditContent } = usePermissions();
  const isContractorRep = user?.projectRole === UserRole.CONTRACTOR_REP;
  const readOnly = !canEditContent && !isContractorRep;
  const { showToast } = useToast();

  useEffect(() => {
    if (initialItemToOpen && initialItemToOpen.type === "logEntry" && logEntries) {
      const entryToOpen = logEntries.find((e) => e.id === initialItemToOpen.id);
      if (entryToOpen) {
        handleOpenDetail(entryToOpen);
      }
      clearInitialItem();
    }
  }, [initialItemToOpen, logEntries, clearInitialItem]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortBy]);

  // Prefetch next page in background
  useEffect(() => {
    // Only prefetch if there's a next page and we haven't already prefetched it
    if (pagination?.hasNext && pagination.currentPage !== prefetchedPage) {
      const nextPage = pagination.currentPage + 1;
      
      // Prefetch in background
      api.logEntries.getAll(nextPage, ENTRIES_PER_PAGE)
        .then(data => {
          setPrefetchedData(data);
          setPrefetchedPage(nextPage);
        })
        .catch(err => {
          // Silent fail - prefetch is a nice-to-have
          console.log('Prefetch failed (this is OK):', err);
        });
    }
  }, [pagination?.currentPage, pagination?.hasNext, prefetchedPage]);

  const handleOpenDetail = (entry: LogEntry) => {
    setSelectedEntry(entry);
    setIsDetailModalOpen(true);
  };

  const filteredEntries = useMemo(() => {
    if (!logEntries) return [];

    const filtered = logEntries.filter((entry) => {
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
      
      // Normalize entry status for comparison (handle English API keys vs Spanish filter values)
      const normalizedStatus = EntryStatus[entry.status as keyof typeof EntryStatus] || entry.status;
      const statusMatch =
        filters.status === "all" || normalizedStatus === filters.status;
      
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

    // Ordenar según la selección del usuario
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "folioNumber") {
        return (a.folioNumber || 0) - (b.folioNumber || 0);
      }
      if (sortBy === "folioNumberDesc") {
        return (b.folioNumber || 0) - (a.folioNumber || 0);
      }
      if (sortBy === "createdAt") {
        // Más recientes primero
        return (
          new Date(b.createdAt || b.entryDate).getTime() -
          new Date(a.createdAt || a.entryDate).getTime()
        );
      }
      // entryDate por defecto (más antiguos primero)
      return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
    });

    return sorted;
  }, [logEntries, filters, sortBy]);

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedEntry(null);
  };

  const handleOpenForm = () => {
    if (readOnly) {
      showToast({
        title: "Acceso restringido",
        message: "El rol Viewer solo puede consultar información.",
        variant: "warning",
      });
      return;
    }
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setNewEntryDefaultDate(null);
  };

  const handleDateClickOnCalendar = (dateStr: string) => {
    if (readOnly) {
      showToast({
        title: "Acceso restringido",
        message: "El rol Viewer no puede crear nuevas anotaciones.",
        variant: "warning",
      });
      return;
    }
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
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede crear ni editar anotaciones.",
        variant: "error",
      });
      throw new Error("El perfil Viewer no puede crear anotaciones.");
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
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede eliminar anotaciones.",
        variant: "error",
      });
      throw new Error("El perfil Viewer no puede eliminar anotaciones.");
    }
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
  ): Promise<Comment> => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede agregar comentarios.",
        variant: "error",
      });
      throw new Error("El perfil Viewer no puede agregar comentarios.");
    }
    if (!user) {
      throw new Error("No estás autenticado para comentar.");
    }

    try {
      // Crear el comentario
      const createdComment = await api.logEntries.addComment(entryId, {
        content: commentText,
        authorId: user.id,
      }, files);

      // Refrescar la entrada
      const updatedEntry = await api.logEntries.getById(entryId);
      setSelectedEntry(updatedEntry);
      refetchLogEntries();
      return createdComment;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Ocurrió un error al añadir el comentario.");
    }
  };

  const handleUpdateEntry = async (updatedEntryData: LogEntry) => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede editar anotaciones.",
        variant: "error",
      });
      throw new Error("El perfil Viewer no puede editar anotaciones.");
    }
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
    payload: SignatureConsentPayload
  ): Promise<{ success: boolean; error?: string }> => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede firmar documentos.",
        variant: "error",
      });
      return {
        success: false,
        error: "El perfil Viewer no puede firmar documentos.",
      };
    }
    try {
      const updatedEntry = await api.logEntries.addSignature(documentId, {
        signerId: signer.id,
        password: payload.password,
        consent: payload.consent,
        consentStatement: payload.consentStatement,
      });

      setSelectedEntry(updatedEntry);
      refetchLogEntries();

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado.";
      return { success: false, error: errorMessage };
    }
  };

  const handleExportEntries = async () => {
    try {
      const blob = await api.logEntries.exportZip({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        type: filters.type !== "all" ? filters.type : undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        authorId: filters.user !== "all" ? filters.user : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bitacoras_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (e: any) {
      showToast({
        variant: "error",
        title: "Error al exportar",
        message: e?.message || "No fue posible generar el ZIP.",
      });
    }
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
        <div className="flex items-center flex-col lg:flex-row gap-2 w-full lg:w-auto">
          <div className="w-full lg:w-52">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Ordenar por
            </label>
            <div className="relative">
              <select
              value={sortBy}
              onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "entryDate"
                      | "folioNumber"
                      | "folioNumberDesc"
                      | "createdAt"
                  )
                }
                className="w-full appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30"
              >
                <option value="entryDate">Fecha del diario (ascendente)</option>
                <option value="folioNumber">No. de folio (ascendente)</option>
                <option value="folioNumberDesc">No. de folio (descendente)</option>
                <option value="createdAt">Fecha de creación (recientes primero)</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
                ▾
              </span>
            </div>
          </div>
          <div className="flex items-center bg-gray-200 rounded-lg p-1 w-full sm:w-auto justify-center">
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
          {canEditContent && (
            <Button
              onClick={handleOpenForm}
              leftIcon={<PlusIcon />}
              className="w-full sm:w-auto"
              disabled={!project}
            >
              Nueva Anotación
            </Button>
          )}
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
              {isLogEntriesLoading && filteredEntries.length === 0 ? (
                // Show skeletons during initial load
                <>
                  {[...Array(ENTRIES_PER_PAGE)].map((_, index) => (
                    <EntryCardSkeleton key={`skeleton-${index}`} />
                  ))}
                </>
              ) : filteredEntries.length > 0 ? (
                <>
                  {filteredEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onSelect={handleOpenDetail}
                    />
                  ))}
                  {/* Paginación */}
                  {pagination && (
                    <Pagination
                      currentPage={pagination.currentPage}
                      totalPages={pagination.pages}
                      total={pagination.total}
                      limit={pagination.limit}
                      onPageChange={setCurrentPage}
                      isLoading={isLogEntriesLoading}
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  icon={<Squares2X2Icon />}
                  title="Aún no hay anotaciones"
                  message="Crea la primera anotación para iniciar el registro en la bitácora de obra. Puedes adjuntar archivos, fotos y más."
                  actionButton={
                    canEditContent ? (
                      <Button onClick={handleOpenForm} leftIcon={<PlusIcon />} disabled={!project}>
                        Crear Primera Anotación
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}
          {viewMode === "calendar" && (
            <CalendarView
              entries={filteredEntries}
              onEventClick={handleOpenDetail}
              onDateClick={canEditContent ? handleDateClickOnCalendar : undefined}
            />
          )}
        </>
      )}

      {selectedEntry && logEntries && (
        <EntryDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          entry={selectedEntry}
          projectStartDate={project?.startDate}
          onUpdate={handleUpdateEntry}
          onAddComment={handleAddComment}
          onSign={(docId, docType, signer, payload) =>
            addSignature(docId, docType, signer, payload)
          }
          onDelete={handleDeleteEntry}
          currentUser={user}
          availableUsers={users || []}
          onRefresh={refetchLogEntries}
          readOnly={readOnly}
        />
      )}
      {logEntries && canEditContent && (
        <EntryFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseForm}
          onSave={handleSaveEntry}
          initialDate={newEntryDefaultDate}
          availableUsers={users || []}
          currentUser={user}
          projectStartDate={project?.startDate}
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
