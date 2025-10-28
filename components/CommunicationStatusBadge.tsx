
import React from 'react';
// Fix: Corrected import path for types
import { CommunicationStatus } from '../types';

interface BadgeProps {
  status: CommunicationStatus;
}

const statusColorMap: Record<CommunicationStatus, string> = {
  [CommunicationStatus.RESUELTO]: 'bg-status-green/10 text-status-green border border-status-green/20',
  [CommunicationStatus.EN_TRAMITE]: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  [CommunicationStatus.PENDIENTE]: 'bg-status-yellow/10 text-status-yellow border border-status-yellow/20',
};

const CommunicationStatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const colorClasses = statusColorMap[status] || 'bg-gray-200 text-gray-800';
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}
    >
      {status}
    </span>
  );
};

export default CommunicationStatusBadge;
