import React, { useState, useMemo, useEffect } from 'react';
import { Project, Communication, CommunicationStatus, CommunicationDirection, User } from '../types';
import CommunicationFilterBar from './CommunicationFilterBar';
import CommunicationCard from './CommunicationCard';
import CommunicationFormModal from './CommunicationFormModal';
import CommunicationDetailModal from './CommunicationDetailModal';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { PlusIcon, ChatBubbleLeftRightIcon, ListBulletIcon, TableCellsIcon } from './icons/Icon';
import { useAuth } from '../contexts/AuthContext';
import CommunicationsTable from './CommunicationsTable';
import { useApi } from '../src/hooks/useApi';
import api from '../src/services/api';
import { usePermissions } from '../src/hooks/usePermissions';
import { useToast } from './ui/ToastProvider';

// Se elimina la interfaz de props, ya no recibe 'api'
interface CommunicationsDashboardProps {
  project: Project;
  initialCommunicationId?: string | null;
  onClearInitialCommunication?: () => void;
}

const CommunicationsDashboard: React.FC<CommunicationsDashboardProps> = ({
  project,
  initialCommunicationId = null,
  onClearInitialCommunication,
}) => {
  const { user } = useAuth();
  const { canEditContent } = usePermissions();
  const readOnly = !canEditContent;
  const { showToast } = useToast();

  const { data: communications, isLoading, error, retry: refetchCommunications } = useApi.communications();
  const { data: users } = useApi.users();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const [filters, setFilters] = useState<{
    searchTerm: string;
    sender: string;
    recipient: string;
    status: 'all' | CommunicationStatus;
    direction: 'all' | 'sent' | 'received';
  }>({
    searchTerm: '',
    sender: '',
    recipient: '',
    status: 'all',
    direction: 'all',
  });


  const normalizeStatus = (status: string): CommunicationStatus | string => {
    const s = (status || '').toString().trim().toLowerCase();
    if (!s) return status;
    if (s === 'pendiente' || s === 'pending' || s === 'pendiente ' || s === 'pend') {
      return CommunicationStatus.PENDIENTE;
    }
    if (
      s === 'en trámite' ||
      s === 'en tramite' ||
      s === 'en_trámite' ||
      s === 'en_tramite' ||
      s === 'in_review' ||
      s === 'tramite'
    ) {
      return CommunicationStatus.EN_TRAMITE;
    }
    if (s === 'resuelto' || s === 'resolved') {
      return CommunicationStatus.RESUELTO;
    }
    return status;
  };

  const filteredCommunications = useMemo(() => {
    if (!communications || !user) return [];
    
    return communications.filter(comm => {
        const subject = (comm.subject || '').toString();
        const radicado = (comm.radicado || '').toString();
        const senderEntity = (comm.senderDetails?.entity || '').toString();
        const recipientEntity = (comm.recipientDetails?.entity || '').toString();
        const search = (filters.searchTerm || '').toString();

        const searchTermMatch = subject.toLowerCase().includes(search.toLowerCase()) ||
                              radicado.toLowerCase().includes(search.toLowerCase());
        const senderMatch = !filters.sender || senderEntity.toLowerCase().includes(filters.sender.toLowerCase());
        const recipientMatch = !filters.recipient || recipientEntity.toLowerCase().includes(filters.recipient.toLowerCase());
        const statusMatch =
          filters.status === 'all' ||
          normalizeStatus(comm.status) === normalizeStatus(filters.status as any);

        const directionValue = comm.direction || CommunicationDirection.RECEIVED;
        const directionMatch =
          filters.direction === 'all' ||
          (filters.direction === 'sent' && directionValue === CommunicationDirection.SENT) ||
          (filters.direction === 'received' && directionValue === CommunicationDirection.RECEIVED);

        return searchTermMatch && senderMatch && recipientMatch && statusMatch && directionMatch;
    });
  }, [communications, filters, user]);

  const handleOpenForm = () => {
    if (readOnly) {
      showToast({
        title: 'Acceso restringido',
        message: 'El rol Viewer solo puede visualizar las comunicaciones.',
        variant: 'warning',
      });
      return;
    }
    setIsFormModalOpen(true);
  };
  const handleCloseForm = () => setIsFormModalOpen(false);

  const handleOpenDetail = (comm: Communication) => {
    setSelectedComm(comm);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedComm(null);
  };

  useEffect(() => {
    if (!initialCommunicationId || !communications) return;
    const commToOpen = communications.find((comm) => comm.id === initialCommunicationId);
    if (commToOpen) {
      handleOpenDetail(commToOpen);
    }
    onClearInitialCommunication?.();
  }, [initialCommunicationId, communications, onClearInitialCommunication]);

  const handleSaveCommunication = async (
    newCommData: Omit<Communication, 'id' | 'uploader' | 'attachments' | 'status' | 'statusHistory' | 'assignee' | 'assignedAt'>,
    files: File[],
    options?: { assigneeId?: string | null }
  ) => {
    if (!user) {
      throw new Error('No estás autenticado.');
    }
    if (readOnly) {
      showToast({
        title: 'Acción no permitida',
        message: 'El perfil Viewer no puede registrar comunicaciones.',
        variant: 'error',
      });
      throw new Error('El perfil Viewer no puede registrar comunicaciones.');
    }

    try {
      const uploadedAttachments = await Promise.all(
        files.map((file) => api.upload.uploadFile(file, "document"))
      );

      await api.communications.create({
        ...newCommData,
        uploaderId: user.id,
        attachments: uploadedAttachments,
        assigneeId: options?.assigneeId ?? undefined,
      });
      refetchCommunications();
      handleCloseForm();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error al guardar la comunicación.');
    }
  }

  const handleStatusChange = async (commId: string, newStatus: CommunicationStatus) => {
    if (readOnly) {
      showToast({
        title: 'Acción no permitida',
        message: 'El perfil Viewer no puede actualizar estados.',
        variant: 'error',
      });
      throw new Error('El perfil Viewer no puede actualizar estados.');
    }
    try {
      await api.communications.updateStatus(commId, newStatus);
      refetchCommunications();
      if (selectedComm?.id === commId) {
        const updatedComm = await api.communications.getById(commId);
        setSelectedComm(updatedComm);
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error al actualizar el estado de la comunicación.');
    }
  };

  const handleAssignmentChange = async (commId: string, assigneeId: string | null) => {
    if (readOnly) {
      showToast({
        title: 'Acción no permitida',
        message: 'El perfil Viewer no puede reasignar comunicaciones.',
        variant: 'error',
      });
      throw new Error('El perfil Viewer no puede reasignar comunicaciones.');
    }
    try {
      const updatedComm = await api.communications.assign(commId, assigneeId);
      refetchCommunications();
      if (selectedComm?.id === commId) {
        setSelectedComm(updatedComm);
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error al actualizar el responsable de la comunicación.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Comunicaciones Oficiales</h2>
            <p className="text-sm text-gray-500">Proyecto: {project.name}</p>
        </div>
        <div className="flex items-center flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="flex items-center bg-gray-200 rounded-lg p-1">
                <button 
                    onClick={() => setViewMode('card')}
                    title="Vista de Tarjetas"
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'card' ? 'bg-white text-brand-primary shadow' : 'text-gray-600 hover:bg-gray-300/50'}`}
                >
                    <ListBulletIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Tarjetas</span>
                </button>
                <button 
                    onClick={() => setViewMode('table')}
                    title="Vista de Tabla"
                    className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'table' ? 'bg-white text-brand-primary shadow' : 'text-gray-600 hover:bg-gray-300/50'}`}
                >
                    <TableCellsIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Tabla</span>
                </button>
            </div>
            {canEditContent && (
              <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
                Registrar Comunicación
              </Button>
            )}
        </div>
      </div>

      <CommunicationFilterBar filters={filters} setFilters={setFilters} userRole={user?.projectRole || ''} />

      {isLoading && <div className="text-center p-8">Cargando comunicaciones...</div>}
      {error && <div className="text-center p-8 text-red-500">{error.message}</div>}

      {!isLoading && !error && (
        <>
            {(!communications || communications.length === 0) ? (
              <EmptyState
                icon={<ChatBubbleLeftRightIcon />}
                title="No hay comunicaciones registradas"
                message="Mantén un registro centralizado de todas las comunicaciones oficiales del proyecto, como oficios, solicitudes y respuestas."
                actionButton={
                  canEditContent ? (
                    <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
                      Registrar Comunicación
                    </Button>
                  ) : undefined
                }
              />
            ) : filteredCommunications.length === 0 ? (
              <EmptyState
                icon={<ChatBubbleLeftRightIcon />}
                title="Sin resultados"
                message="No encontramos comunicaciones que coincidan con los filtros aplicados. Ajusta o limpia los filtros para ver resultados."
                actionButton={
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setFilters({
                        searchTerm: '',
                        sender: '',
                        recipient: '',
                        status: 'all',
                        direction: 'all',
                      })
                    }
                  >
                    Limpiar filtros
                  </Button>
                }
              />
            ) : viewMode === 'card' ? (
                <div className="space-y-4">
                {filteredCommunications.map(comm => (
                    <CommunicationCard 
                        key={comm.id} 
                        communication={comm} 
                        onSelect={handleOpenDetail}
                        allCommunications={communications}
                    />
                ))}
                </div>
            ) : (
                <CommunicationsTable 
                    communications={filteredCommunications}
                    onSelect={handleOpenDetail}
                />
            )}
        </>
      )}

      {canEditContent && (
        <CommunicationFormModal 
          isOpen={isFormModalOpen}
          onClose={handleCloseForm}
          onSave={handleSaveCommunication}
          communications={communications || []}
          users={users || []}
        />
      )}

      {selectedComm && (
        <CommunicationDetailModal
            isOpen={isDetailModalOpen}
            onClose={handleCloseDetail}
            communication={selectedComm}
            onStatusChange={handleStatusChange}
            allCommunications={communications}
            users={users || []}
            onAssign={handleAssignmentChange}
            readOnly={readOnly}
        />
      )}
    </div>
  );
};

export default CommunicationsDashboard;
