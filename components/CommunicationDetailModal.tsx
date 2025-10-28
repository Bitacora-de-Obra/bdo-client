


import React, { useState, useMemo, useEffect } from 'react';
// Fix: Corrected import path for types
import { Communication, CommunicationStatus, CommunicationDirection, User } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import AttachmentItem from './AttachmentItem';
import CommunicationStatusBadge from './CommunicationStatusBadge';
import Select from './ui/Select';
import ComplianceAlert from './ComplianceAlert';

interface CommunicationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  communication: Communication;
  allCommunications: Communication[];
  onStatusChange: (commId: string, newStatus: CommunicationStatus) => Promise<void> | void;
  onAssign: (commId: string, assigneeId: string | null) => Promise<void>;
  users: User[];
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
);


const findRootAndThread = (
  currentComm: Communication,
  allComms: Communication[]
): Communication[] => {
  if (!allComms || allComms.length === 0) return [currentComm];

  // Find the root
  let root = currentComm;
  const commMap = new Map(allComms.map(c => [c.id, c]));

  while (root.parentId && commMap.has(root.parentId)) {
    root = commMap.get(root.parentId)!;
  }

  // Find all communications in the same thread
  const thread: Communication[] = [];
  const processedIds = new Set<string>();

  const findChildren = (parentId: string) => {
    allComms.forEach(c => {
      if (c.parentId === parentId && !processedIds.has(c.id)) {
        thread.push(c);
        processedIds.add(c.id);
        findChildren(c.id);
      }
    });
  };
  
  // A bit more robust way to gather all thread members
  const rootId = root.id;
  const threadMembers = allComms.filter(c => {
      let temp = c;
      if (temp.id === rootId) return true;
      while (temp.parentId) {
          if (temp.parentId === rootId) return true;
          const parent = commMap.get(temp.parentId);
          if (!parent) return false;
          temp = parent;
      }
      return false;
  });

  return threadMembers.sort((a, b) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime());
};


const CommunicationDetailModal: React.FC<CommunicationDetailModalProps> = ({
  isOpen,
  onClose,
  communication,
  allCommunications,
  onStatusChange,
  onAssign,
  users,
}) => {
  const [currentStatus, setCurrentStatus] = useState<CommunicationStatus>(communication.status);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(communication.assignee?.id ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const conversationThread = useMemo(
    () => findRootAndThread(communication, allCommunications),
    [communication, allCommunications]
  );

  useEffect(() => {
    if (isOpen) {
      setCurrentStatus(communication.status);
      setSelectedAssigneeId(communication.assignee?.id ?? '');
      setSaveError(null);
      setIsSaving(false);
    }
  }, [communication, isOpen]);

  const handleSave = async () => {
    const updates: Promise<void | unknown>[] = [];
    setSaveError(null);

    if (currentStatus !== communication.status) {
      updates.push(Promise.resolve(onStatusChange(communication.id, currentStatus)));
    }

    if (selectedAssigneeId !== (communication.assignee?.id ?? '')) {
      updates.push(onAssign(communication.id, selectedAssigneeId || null));
    }

    if (updates.length === 0) {
      onClose();
      return;
    }

    try {
      setIsSaving(true);
      await Promise.all(updates);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios. Intenta nuevamente.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalle Comunicación - Radicado #${communication.radicado}`} size="2xl">
        <div className="space-y-6">
            <div className="pb-4 border-b">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-gray-900">{communication.subject}</h3>
                    <CommunicationStatusBadge status={communication.status} />
                </div>
                 <div className="mt-2 text-sm text-gray-600 font-medium">
                    <span>{communication.senderDetails.entity}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span>{communication.recipientDetails.entity}</span>
                </div>
            </div>

            <ComplianceAlert communication={communication} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold">Remitente</h4>
                    <DetailRow label="Entidad" value={communication.senderDetails.entity} />
                    <DetailRow label="Nombre" value={communication.senderDetails.personName} />
                    <DetailRow label="Cargo" value={communication.senderDetails.personTitle} />
                </div>
                 <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold">Destinatario</h4>
                    <DetailRow label="Entidad" value={communication.recipientDetails.entity} />
                    <DetailRow label="Nombre" value={communication.recipientDetails.personName} />
                    <DetailRow label="Cargo" value={communication.recipientDetails.personTitle} />
                </div>
            </div>
            
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-6">
                <DetailRow label="Fecha de Envío" value={new Date(communication.sentDate).toLocaleDateString('es-CO', {dateStyle: 'long'})} />
                <DetailRow label="Medio de Envío" value={communication.deliveryMethod} />
                <DetailRow label="Firmado por" value={communication.signerName} />
                <DetailRow label="Dirección" value={communication.direction === CommunicationDirection.SENT ? 'Enviada' : 'Recibida'} />
                <DetailRow
                  label="Requiere Respuesta"
                  value={communication.requiresResponse ? (
                    <span>
                      Sí
                      {communication.responseDueDate && (
                        <span className="block text-xs text-gray-500">
                          Vence: {new Date(communication.responseDueDate).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                        </span>
                      )}
                    </span>
                  ) : 'No'}
                />
            </dl>

             <div>
                <h4 className="text-md font-semibold text-gray-800">Descripción (Asunto Tratado)</h4>
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{communication.description || 'No hay descripción disponible.'}</p>
            </div>
            
             {communication.notes && (
                <div>
                    <h4 className="text-md font-semibold text-gray-800">Observaciones</h4>
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{communication.notes}</p>
                </div>
            )}

             {communication.attachments.length > 0 && (
                <div>
                    <h4 className="text-md font-semibold text-gray-800">Archivos Adjuntos</h4>
                    <ul className="mt-2 space-y-2">
                        {communication.attachments.map(att => <AttachmentItem key={att.id} attachment={att} />)}
                    </ul>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Responsable Asignado</h4>
                    <div className="p-3 rounded-lg border bg-gray-50">
                      {communication.assignee ? (
                        <>
                          <p className="text-sm font-medium text-gray-800">{communication.assignee.fullName}</p>
                          <p className="text-xs text-gray-500">{communication.assignee.projectRole}</p>
                          {communication.assignedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              Asignado el {new Date(communication.assignedAt).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-600">Sin responsable asignado.</p>
                      )}
                    </div>
                </div>
                <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Actualizar Estado</h4>
                    <Select
                      id="status"
                      value={currentStatus}
                      onChange={(e) => setCurrentStatus(e.target.value as CommunicationStatus)}
                      disabled={isSaving}
                    >
                      {Object.values(CommunicationStatus).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                </div>
                 <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Reasignar Responsable</h4>
                    <Select
                      id="assignee"
                      value={selectedAssigneeId}
                      onChange={(e) => setSelectedAssigneeId(e.target.value)}
                      disabled={isSaving || users.length === 0}
                    >
                      <option value="">Sin asignar</option>
                      {users
                        .slice()
                        .sort((a, b) => a.fullName.localeCompare(b.fullName))
                        .map((userOption) => (
                          <option key={userOption.id} value={userOption.id}>
                            {userOption.fullName} · {userOption.projectRole}
                          </option>
                        ))}
                    </Select>
                    {users.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Aún no hay usuarios disponibles para asignar.
                      </p>
                    )}
                </div>
                 <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Historial de Estados</h4>
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                        {communication.statusHistory.slice().reverse().map((change, index) => (
                            <div key={index} className="flex items-start space-x-3">
                                {/* Fix: Replaced `change.user.name` with `change.user.fullName`. */}
                                <img src={change.user.avatarUrl} alt={change.user.fullName} className="h-8 w-8 rounded-full object-cover mt-1"/>
                                <div>
                                    <p className="text-sm text-gray-800">
                                        {/* Fix: Replaced `change.user.name` with `change.user.fullName`. */}
                                        <span className="font-semibold">{change.user.fullName}</span>
                                        <span> cambió a </span>
                                        <span className="font-semibold">{change.status}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">{new Date(change.timestamp).toLocaleString('es-CO')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {saveError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
                {saveError}
              </div>
            )}

            {conversationThread.length > 1 && (
                <div>
                    <h4 className="text-md font-semibold text-gray-800">Historial de la Conversación</h4>
                    <div className="mt-3 space-y-2 border-l-2 border-gray-200 ml-4">
                        {conversationThread.map((comm) => (
                            <div key={comm.id} className={`relative pl-8 pr-2 py-2 rounded-r-lg ${comm.id === communication.id ? 'bg-idu-cyan/10 border-l-4 border-idu-cyan -ml-[4px]' : 'ml-0'}`}>
                               <div className={`absolute -left-[9px] top-4 h-4 w-4 rounded-full ${comm.id === communication.id ? 'bg-idu-cyan' : 'bg-gray-300'}`}></div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-sm text-gray-800">{comm.radicado}</p>
                                        <p className="text-sm text-gray-600">{comm.subject}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {comm.senderDetails.entity} → {comm.recipientDetails.entity}
                                        </p>
                                    </div>
                                    <CommunicationStatusBadge status={comm.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
             <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
             <Button variant="primary" onClick={handleSave} disabled={isSaving}>
               {isSaving ? 'Guardando...' : 'Guardar Cambios'}
             </Button>
        </div>
    </Modal>
  );
};

export default CommunicationDetailModal;
