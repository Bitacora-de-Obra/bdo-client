
import React from 'react';
// Fix: Corrected import path for types
import { Project } from '../types';
// Fix: Corrected import path for icon
import { ChartPieIcon } from './icons/Icon';

interface ReportsDashboardProps {
  project: Project;
}

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ project }) => {
  return (
    <div className="space-y-6">
       <div>
            <h2 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h2>
            <p className="text-sm text-gray-500">Proyecto: {project.name}</p>
        </div>
      <div className="text-center p-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-brand-primary/10">
            <ChartPieIcon className="h-6 w-6 text-brand-primary" />
        </div>
        <h3 className="mt-5 text-lg font-medium text-gray-900">Sección en Construcción</h3>
        <p className="mt-2 text-sm text-gray-500">
          Estamos trabajando para traerte poderosas herramientas de visualización y reportería. ¡Vuelve pronto!
        </p>
      </div>
    </div>
  );
};

export default ReportsDashboard;
