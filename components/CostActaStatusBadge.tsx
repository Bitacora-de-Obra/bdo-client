import React from 'react';
import { CostActaStatus } from '../types';

interface BadgeProps {
  status: CostActaStatus;
}

const statusColorMap: Record<CostActaStatus, string> = {
  [CostActaStatus.SUBMITTED]: 'bg-gray-500/10 text-gray-600 border border-gray-500/20',
  [CostActaStatus.IN_REVIEW]: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  [CostActaStatus.OBSERVED]: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
  [CostActaStatus.APPROVED]: 'bg-teal-500/10 text-teal-600 border border-teal-500/20',
  [CostActaStatus.IN_PAYMENT]: 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
  [CostActaStatus.PAID]: 'bg-status-green/10 text-status-green border border-status-green/20',
};

const CostActaStatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const colorClasses = statusColorMap[status] || 'bg-gray-200 text-gray-800';
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}
    >
      {status}
    </span>
  );
};

export default CostActaStatusBadge;