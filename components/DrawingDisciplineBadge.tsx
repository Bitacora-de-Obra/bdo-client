import React from 'react';
import { DrawingDiscipline } from '../types';

interface BadgeProps {
  discipline: DrawingDiscipline;
}

const disciplineColorMap: Record<DrawingDiscipline, string> = {
  [DrawingDiscipline.ARQUITECTONICO]: 'bg-green-100 text-green-800 border-green-200',
  [DrawingDiscipline.ESTRUCTURAL]: 'bg-blue-100 text-blue-800 border-blue-200',
  [DrawingDiscipline.ELECTRICO]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [DrawingDiscipline.HIDROSANITARIO]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [DrawingDiscipline.MECANICO]: 'bg-red-100 text-red-800 border-red-200',
  [DrawingDiscipline.URBANISMO]: 'bg-lime-100 text-lime-800 border-lime-200',
  [DrawingDiscipline.SEÑALIZACION]: 'bg-orange-100 text-orange-800 border-orange-200',
  [DrawingDiscipline.GEOTECNIA]: 'bg-amber-100 text-amber-800 border-amber-200',
  [DrawingDiscipline.OTHER]: 'bg-gray-100 text-gray-800 border-gray-200',
};

const DrawingDisciplineBadge: React.FC<BadgeProps> = ({ discipline }) => {
  // Fix: Use bracket notation to access the fallback color from the map.
  const colorClasses = disciplineColorMap[discipline] || disciplineColorMap[DrawingDiscipline.OTHER];
  
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colorClasses}`}
    >
      {discipline}
    </span>
  );
};

export default DrawingDisciplineBadge;