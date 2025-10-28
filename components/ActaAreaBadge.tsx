import React from 'react';
import { ActaArea } from '../types';

interface BadgeProps {
  area: ActaArea;
}

const areaColorMap: Record<ActaArea, string> = {
  [ActaArea.COMITE_OBRA]: 'bg-purple-100 text-purple-800 border-purple-200',
  [ActaArea.AMBIENTAL]: 'bg-green-100 text-green-800 border-green-200',
  [ActaArea.SOCIAL]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ActaArea.JURIDICO]: 'bg-gray-100 text-gray-800 border-gray-200',
  [ActaArea.TECNICO]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ActaArea.HSE]: 'bg-red-100 text-red-800 border-red-200',
  [ActaArea.OTHER]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const ActaAreaBadge: React.FC<BadgeProps> = ({ area }) => {
  const colorClasses = areaColorMap[area] || 'bg-gray-200 text-gray-800';
  
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colorClasses}`}
    >
      {area}
    </span>
  );
};

export default ActaAreaBadge;
