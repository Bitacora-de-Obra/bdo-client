import React from 'react';
import { WorkActaStatus } from '../types';

interface BadgeProps {
  status: WorkActaStatus;
}

const statusColorMap: Record<WorkActaStatus, string> = {
  [WorkActaStatus.APPROVED]: 'bg-status-green/10 text-status-green border border-status-green/20',
  [WorkActaStatus.IN_REVIEW]: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  [WorkActaStatus.DRAFT]: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
  [WorkActaStatus.REJECTED]: 'bg-red-500/10 text-red-600 border border-red-500/20',
};

const WorkActaStatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const colorClasses = statusColorMap[status] || 'bg-gray-200 text-gray-800';
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}
    >
      {status}
    </span>
  );
};

export default WorkActaStatusBadge;
