


import React from 'react';
// Fix: Corrected import path for types
import { Communication, CommunicationStatus, CommunicationDirection } from '../types';
import Card from './ui/Card';
import AttachmentItem from './AttachmentItem';
import CommunicationStatusBadge from './CommunicationStatusBadge';
// Fix: Corrected import path for icons
import { CalendarIcon, UserCircleIcon, ShareIcon, ClockIcon } from './icons/Icon';

interface CommunicationCardProps {
  communication: Communication;
  allCommunications: Communication[];
  onSelect: (communication: Communication) => void;
}

const getAlertLevel = (dueDateStr?: string, status?: CommunicationStatus): 'green' | 'yellow' | 'red' | null => {
    if (!dueDateStr || status === CommunicationStatus.RESUELTO) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    const localDueDate = new Date(dueDate.valueOf() + dueDate.getTimezoneOffset() * 60 * 1000);
    localDueDate.setHours(0,0,0,0);

    const timeLeft = localDueDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

    if (daysLeft > 7) return 'green';
    if (daysLeft >= 3) return 'yellow';
    return 'red';
};

const CommunicationCard: React.FC<CommunicationCardProps> = ({ communication, allCommunications, onSelect }) => {
  const sentDate = new Date(communication.sentDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
  const responseDueDate = communication.responseDueDate
    ? new Date(communication.responseDueDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;
  const uploaderName = communication.uploader?.fullName ?? 'Sin registrar';
  const assigneeName = communication.assignee?.fullName ?? 'Sin asignar';
  
  const parentCommunication = communication.parentId 
    ? allCommunications.find(c => c.id === communication.parentId) 
    : null;
  
  const alertLevel = communication.requiresResponse
    ? getAlertLevel(communication.responseDueDate, communication.status)
    : null;

  const alertIconColorMap = {
      green: 'text-green-500',
      yellow: 'text-yellow-500',
      red: 'text-red-500',
  };

  return (
    <Card className="hover:shadow-lg hover:border-brand-primary/50 transition-shadow duration-200 cursor-pointer">
      <div onClick={() => onSelect(communication)} className="p-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
            <div className="flex-1">
                <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-brand-primary">Radicado #{communication.radicado}</p>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {communication.direction === CommunicationDirection.SENT ? 'Enviada' : 'Recibida'}
                    </span>
                    {alertLevel && (
                       <span title="Alerta de cumplimiento">
                         <ClockIcon className={`h-4 w-4 ${alertIconColorMap[alertLevel]}`} />
                       </span>
                    )}
                    {parentCommunication && (
                        <div className="flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                           <ShareIcon className="mr-1.5 text-gray-400 transform -scale-x-100" />
                           <span>Responde a: #{parentCommunication.radicado}</span>
                        </div>
                    )}
                </div>
                <h3 className="text-lg font-bold text-gray-800 mt-1">{communication.subject}</h3>
                 <div className="mt-2 text-sm text-gray-600 font-medium">
                    <span >{communication.senderDetails.entity}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span >{communication.recipientDetails.entity}</span>
                </div>
            </div>
            <div className="flex-shrink-0 pt-1">
                <CommunicationStatusBadge status={communication.status} />
            </div>
        </div>

        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{communication.description}</p>
        
        {communication.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Archivos Adjuntos</h4>
                <ul className="space-y-2">
                    {communication.attachments.map(att => <AttachmentItem key={att.id} attachment={att} />)}
                </ul>
            </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
            <div className="flex items-center">
                <UserCircleIcon className="mr-1.5 text-gray-400" />
                {/* Fix: Replaced `uploader.name` with `uploader.fullName`. */}
                <span>Registrado por: {uploaderName}</span>
            </div>
            <div className="flex items-center">
                <UserCircleIcon className="mr-1.5 text-gray-400" />
                <span>Responsable: {assigneeName}</span>
            </div>
            <div className="flex items-center">
                <UserCircleIcon className="mr-1.5 text-gray-400" />
                <span>
                  {communication.requiresResponse ? 'Requiere respuesta' : 'Sin respuesta requerida'}
                  {responseDueDate ? ` · Vence: ${responseDueDate}` : ''}
                </span>
            </div>
             <div className="flex items-center">
                <CalendarIcon className="mr-1.5 text-gray-400" />
                <span>Enviado: {sentDate}</span>
            </div>
        </div>
      </div>
    </Card>
  );
};

export default CommunicationCard;
