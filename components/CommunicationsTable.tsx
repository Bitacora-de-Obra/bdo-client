import React from 'react';
import { Communication, CommunicationStatus, CommunicationDirection } from '../types';
import Card from './ui/Card';
import CommunicationStatusBadge from './CommunicationStatusBadge';

interface CommunicationsTableProps {
  communications: Communication[];
  onSelect: (comm: Communication) => void;
}

const CommunicationsTable: React.FC<CommunicationsTableProps> = ({ communications, onSelect }) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3">Radicado</th>
            <th scope="col" className="px-4 py-3">Fecha</th>
            <th scope="col" className="px-4 py-3">Remitente</th>
            <th scope="col" className="px-4 py-3">Destinatario</th>
            <th scope="col" className="px-4 py-3">Dirección</th>
            <th scope="col" className="px-4 py-3">Asunto</th>
            <th scope="col" className="px-4 py-3">Responsable</th>
            <th scope="col" className="px-4 py-3 text-center">Requiere Rta.</th>
            <th scope="col" className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {communications.map(comm => {
            const requiresResponse = comm.requiresResponse && comm.status !== CommunicationStatus.RESUELTO;
            const responseDue = comm.responseDueDate ? formatDate(comm.responseDueDate) : comm.dueDate ? formatDate(comm.dueDate) : null;
            return (
              <tr key={comm.id} className="bg-white border-b hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(comm)}>
                <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">{comm.radicado}</td>
                <td className="px-4 py-4">{formatDate(comm.sentDate)}</td>
                <td className="px-4 py-4">{comm.senderDetails.entity}</td>
                <td className="px-4 py-4">{comm.recipientDetails.entity}</td>
                <td className="px-4 py-4">{comm.direction === CommunicationDirection.SENT ? 'Enviada' : 'Recibida'}</td>
                <td className="px-4 py-4 max-w-xs truncate" title={comm.subject}>{comm.subject}</td>
                <td className="px-4 py-4">{comm.assignee ? comm.assignee.fullName : 'Sin asignar'}</td>
                <td className="px-4 py-4 text-center">
                  {requiresResponse ? (
                    <span className="inline-flex items-center text-yellow-600 font-semibold" title={responseDue ? `Sí, vence el ${responseDue}` : 'Sí'}>
                       Sí{responseDue ? ` · ${responseDue}` : ''}
                    </span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
                <td className="px-4 py-4"><CommunicationStatusBadge status={comm.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

export default CommunicationsTable;
