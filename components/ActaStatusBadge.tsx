import React from 'react';
import { ActaStatus } from '../types';

interface BadgeProps {
  status: ActaStatus;
}

const statusColorMap: Record<ActaStatus, string> = {
  [ActaStatus.SIGNED]: 'bg-status-green/10 text-status-green border border-status-green/20',
  [ActaStatus.FOR_SIGNATURES]: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  [ActaStatus.CLOSED]: 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
  [ActaStatus.DRAFT]: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
};

const ActaStatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const colorClasses = statusColorMap[status] || 'bg-gray-200 text-gray-800';
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}
    >
      {status}
    </span>
  );
};

export default ActaStatusBadge;