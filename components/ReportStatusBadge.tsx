import React from 'react';
import { ReportStatus } from '../types';

interface BadgeProps {
  status: ReportStatus;
}

const statusColorMap: Record<ReportStatus, string> = {
  [ReportStatus.APPROVED]: 'bg-status-green/10 text-status-green border border-status-green/20',
  [ReportStatus.SUBMITTED]: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  [ReportStatus.OBSERVED]: 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20',
  [ReportStatus.DRAFT]: 'bg-gray-400/10 text-gray-500 border border-gray-400/20',
};

const ReportStatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const colorClasses = statusColorMap[status] || 'bg-gray-200 text-gray-800';
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}
    >
      {status}
    </span>
  );
};

export default ReportStatusBadge;
