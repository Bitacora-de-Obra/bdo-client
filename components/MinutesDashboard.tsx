import React, { useState, useMemo, useEffect } from "react";
import { Project, Acta, User } from "../types";
import Button from "./ui/Button";
import { PlusIcon, ClipboardDocumentListIcon } from "./icons/Icon";
import ActaCard from "./ActaCard";
import ActaDetailModal from "./ActaDetailModal";
import ActaFormModal from "./ActaFormModal";
import EmptyState from "./ui/EmptyState";
import ActaFilterBar from "./ActaFilterBar";
import { useAuth } from "../contexts/AuthContext";
import { useApi } from "../src/hooks/useApi";
import api from "../src/services/api";
import { usePermissions } from "../src/hooks/usePermissions";
import { useToast } from "./ui/ToastProvider";

interface MinutesDashboardProps {
  // project: Project; // Ya no se recibe por props
  initialItemToOpen: { type: string; id: string } | null;
  clearInitialItem: () => void;
}

const MinutesDashboard: React.FC<MinutesDashboardProps> = ({
  initialItemToOpen,
  clearInitialItem,
}) => {
  const { user } = useAuth();
  const { data: project, isLoading: isProjectLoading } = useApi.projectDetails();
  const { data: actas, isLoading: isActasLoading, error, retry: refetchActas } = useApi.actas();
  const { data: users, isLoading: isUsersLoading } = useApi.users();
  const { canEditContent } = usePermissions();
  const readOnly = !canEditContent;
  const { showToast } = useToast();

  const [selectedActa, setSelectedActa] = useState<Acta | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: "",
    status: "all",
    area: "all",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (initialItemToOpen && initialItemToOpen.type === "acta" && actas) {
      const actaToOpen = actas.find((a) => a.id === initialItemToOpen.id);
      if (actaToOpen) {
        handleOpenDetail(actaToOpen);
      }
      clearInitialItem();
    }
  }, [initialItemToOpen, actas, clearInitialItem]);

  const handleOpenDetail = (acta: Acta) => {
    setSelectedActa(acta);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    if (initialItemToOpen && initialItemToOpen.type === "acta") {
      const actaToOpen = actas.find((a) => a.id === initialItemToOpen.id);
      if (actaToOpen) {
        handleOpenDetail(actaToOpen);
      }
      clearInitialItem();
    }
  }, [initialItemToOpen, actas, clearInitialItem]);

  const filteredActas = useMemo(() => {
    if (!actas) return [];
    return actas.filter((acta) => {
      const searchTermMatch =
        acta.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        acta.number.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const statusMatch =
        filters.status === "all" || acta.status === filters.status;
      const areaMatch = filters.area === "all" || acta.area === filters.area;
      const actaDate = new Date(acta.date);
      actaDate.setHours(0, 0, 0, 0);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      if (endDate) endDate.setHours(0, 0, 0, 0);
      const startDateMatch = !startDate || actaDate >= startDate;
      const endDateMatch = !endDate || actaDate <= endDate;
      return (
        searchTermMatch &&
        statusMatch &&
        areaMatch &&
        startDateMatch &&
        endDateMatch
      );
    });
  }, [actas, filters]);

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedActa(null);
  };

  const handleOpenForm = () => {
    if (readOnly) {
      showToast({
        title: "Acceso restringido",
        message: "El rol Viewer solo puede consultar actas existentes.",
        variant: "warning",
      });
      setIsFormModalOpen(false);
      return;
    }
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
  };

  const handleSaveActa = async (newActaData: Omit<Acta, "id">) => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede registrar actas de comité.",
        variant: "error",
      });
      throw new Error("El perfil Viewer no puede registrar actas.");
    }
    try {
      await api.actas.create(newActaData);
      refetchActas();
      handleCloseForm();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Error al guardar el acta.");
    }
  };

  const handleUpdateActa = async (updatedActa: Acta) => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede modificar actas de comité.",
        variant: "error",
      });
      return;
    }
    try {
      // Actualizar el acta
      await api.actas.update(updatedActa.id, updatedActa);

      // Actualizar los compromisos que hayan cambiado
      if (actas) {
        const originalActa = actas.find((a) => a.id === updatedActa.id);
        if (originalActa) {
          for (const updatedCommitment of updatedActa.commitments) {
            const originalCommitment = originalActa.commitments.find(
              (c) => c.id === updatedCommitment.id
            );
            if (
              originalCommitment &&
              originalCommitment.status !== updatedCommitment.status
            ) {
      await api.actas.updateCommitment(updatedActa.id, updatedCommitment.id, {
                status: updatedCommitment.status,
              });
            }
          }
        }
      }

      // Refrescar los datos
      refetchActas();
      const updatedActaData = await api.actas.getById(updatedActa.id);
      setSelectedActa(updatedActaData);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Error al actualizar el acta.");
    }
  };

  const sendCommitmentReminderEmail = async (commitment: any, acta: Acta) => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede enviar recordatorios de compromisos.",
        variant: "error",
      });
      return;
    }
    try {
      await api.actas.sendCommitmentReminder(acta.id, commitment.id);
    } catch (err) {
      throw err instanceof Error ? err : new Error("Error al enviar el recordatorio.");
    }
  };

  const addSignature = async (
    documentId: string,
    documentType: "acta",
    signer: User,
    password: string
  ) => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "El perfil Viewer no puede firmar actas.",
        variant: "error",
      });
      return { success: false, error: "No autorizado" };
    }
    try {
      const updatedActa = await api.actas.addSignature(documentId, {
        signerId: signer.id,
        password,
      });
      setSelectedActa(updatedActa);
      refetchActas();
      return { success: true, updated: updatedActa };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al firmar el acta.";
      return { success: false, error: errorMessage };
    }
  };

  if (!user) return null;

  const isLoading = isProjectLoading || isActasLoading || isUsersLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Actas de Comité</h2>
          <p className="text-sm text-gray-500">
            Proyecto: {project ? project.name : "Cargando..."}
          </p>
        </div>
        {canEditContent && (
          <Button
            onClick={handleOpenForm}
            leftIcon={<PlusIcon />}
            disabled={!users || users.length === 0}
          >
            Registrar Acta
          </Button>
        )}
      </div>

      <ActaFilterBar filters={filters} setFilters={setFilters} />

      {isLoading && <div className="text-center p-8">Cargando información...</div>}
      {error && <div className="text-center p-8 text-red-500">{error.message}</div>}

      {!isLoading && !error && (
        <div>
          {filteredActas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActas.map((acta) => (
                <ActaCard
                  key={acta.id}
                  acta={acta}
                  onSelect={handleOpenDetail}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ClipboardDocumentListIcon />}
              title="No se encontraron actas"
              message="No hay actas que coincidan con los filtros seleccionados o aún no se ha registrado ninguna. ¡Crea la primera!"
              actionButton={
                canEditContent ? (
                  <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
                    Registrar Primera Acta
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      )}

      {selectedActa && (
        <ActaDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          acta={selectedActa}
          onUpdate={handleUpdateActa}
          onSendReminder={sendCommitmentReminderEmail}
          onSign={addSignature}
          currentUser={user}
          readOnly={readOnly}
        />
      )}
      {canEditContent && (
        <ActaFormModal
          isOpen={isFormModalOpen}
          onClose={handleCloseForm}
          onSave={handleSaveActa}
          users={users || []}
        />
      )}
    </div>
  );
};

export default MinutesDashboard;
