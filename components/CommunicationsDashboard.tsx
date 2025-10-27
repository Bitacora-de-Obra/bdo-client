import React, { useState, useMemo } from 'react';
import { Project, Communication, CommunicationStatus } from '../types';
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

// Se elimina la interfaz de props, ya no recibe 'api'
interface CommunicationsDashboardProps {
  project: Project;
}

const CommunicationsDashboard: React.FC<CommunicationsDashboardProps> = ({ project }) => {
  const { user } = useAuth();

  const { data: communications, isLoading, error, retry: refetchCommunications } = useApi.communications();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const [filters, setFilters] = useState({
    searchTerm: '',
    sender: '',
    recipient: '',
    status: 'all',
    direction: 'all',
  });


  const filteredCommunications = useMemo(() => {
    if (!communications || !user) return [];
    
    return communications.filter(comm => {
        const searchTermMatch = comm.subject.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                              comm.radicado.toLowerCase().includes(filters.searchTerm.toLowerCase());
        const senderMatch = filters.sender === '' || comm.senderDetails.entity.toLowerCase().includes(filters.sender.toLowerCase());
        const recipientMatch = filters.recipient === '' || comm.recipientDetails.entity.toLowerCase().includes(filters.recipient.toLowerCase());
        const statusMatch = filters.status === 'all' || comm.status === filters.status;

        // Determine if the communication is sent or received based on user's role
        let isUserSender = false;
        let isUserRecipient = false;

        switch (user.projectRole) {
          case 'Residente de Obra':
          case 'Representante Contratista':
            isUserSender = comm.senderDetails.entity.toLowerCase().includes('contratista');
            isUserRecipient = comm.recipientDetails.entity.toLowerCase().includes('contratista');
            break;
          case 'Supervisor':
            isUserSender = comm.senderDetails.entity.toLowerCase().includes('interventoría');
            isUserRecipient = comm.recipientDetails.entity.toLowerCase().includes('interventoría');
            break;
          case 'Administrador IDU':
            isUserSender = comm.senderDetails.entity.toLowerCase().includes('idu');
            isUserRecipient = comm.recipientDetails.entity.toLowerCase().includes('idu');
            break;
        }

        const directionMatch = filters.direction === 'all' ||
                             (filters.direction === 'sent' && isUserSender) ||
                             (filters.direction === 'received' && isUserRecipient);

        return searchTermMatch && senderMatch && recipientMatch && statusMatch && directionMatch;
    });
  }, [communications, filters, user]);

  const handleOpenForm = () => setIsFormModalOpen(true);
  const handleCloseForm = () => setIsFormModalOpen(false);

  const handleOpenDetail = (comm: Communication) => {
    setSelectedComm(comm);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedComm(null);
  };

  const handleSaveCommunication = async (
    newCommData: Omit<Communication, 'id' | 'uploader' | 'attachments' | 'status' | 'statusHistory'>,
    files: File[]
  ) => {
    if (!user) {
      throw new Error('No estás autenticado.');
    }

    try {
      const uploadedAttachments = await Promise.all(
        files.map((file) => api.upload.uploadFile(file, "document"))
      );

      await api.communications.create({
        ...newCommData,
        uploaderId: user.id,
        attachments: uploadedAttachments,
      });
      refetchCommunications();
      handleCloseForm();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Error al guardar la comunicación.');
    }
  }

  const handleStatusChange = async (commId: string, newStatus: CommunicationStatus) => {
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
            <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
              Registrar Comunicación
            </Button>
        </div>
      </div>

      <CommunicationFilterBar filters={filters} setFilters={setFilters} userRole={user?.projectRole || ''} />

      {isLoading && <div className="text-center p-8">Cargando comunicaciones...</div>}
      {error && <div className="text-center p-8 text-red-500">{error.message}</div>}

      {!isLoading && !error && (
        <>
            {filteredCommunications.length === 0 ? (
                <EmptyState
                    icon={<ChatBubbleLeftRightIcon />}
                    title="No hay comunicaciones registradas"
                    message="Mantén un registro centralizado de todas las comunicaciones oficiales del proyecto, como oficios, solicitudes y respuestas."
                    actionButton={
                        <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
                        Registrar Comunicación
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

      <CommunicationFormModal 
        isOpen={isFormModalOpen}
        onClose={handleCloseForm}
        onSave={handleSaveCommunication}
        communications={communications || []}
      />

      {selectedComm && (
        <CommunicationDetailModal
            isOpen={isDetailModalOpen}
            onClose={handleCloseDetail}
            communication={selectedComm}
            onStatusChange={handleStatusChange}
            allCommunications={communications}
        />
      )}
    </div>
  );
};

export default CommunicationsDashboard;
