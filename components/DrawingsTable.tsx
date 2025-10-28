import React from 'react';
import { Drawing } from '../types';
import Card from './ui/Card';
import DrawingDisciplineBadge from './DrawingDisciplineBadge';

interface DrawingsTableProps {
  drawings: Drawing[];
  onSelect: (drawing: Drawing) => void;
}

const DrawingsTable: React.FC<DrawingsTableProps> = ({ drawings, onSelect }) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-500">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3">Código</th>
            <th scope="col" className="px-4 py-3">Título</th>
            <th scope="col" className="px-4 py-3">Disciplina</th>
            <th scope="col" className="px-4 py-3 text-center">Última Versión</th>
            <th scope="col" className="px-4 py-3">Fecha de Actualización</th>
          </tr>
        </thead>
        <tbody>
          {drawings.map(drawing => {
            const latestVersion = drawing.versions[0];
            return (
              <tr key={drawing.id} className="bg-white border-b hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(drawing)}>
                <td className="px-4 py-4 font-mono font-medium text-gray-900 whitespace-nowrap">{drawing.code}</td>
                <td className="px-4 py-4 max-w-sm truncate" title={drawing.title}>{drawing.title}</td>
                <td className="px-4 py-4"><DrawingDisciplineBadge discipline={drawing.discipline} /></td>
                <td className="px-4 py-4 text-center">{latestVersion.versionNumber}</td>
                <td className="px-4 py-4">{formatDate(latestVersion.uploadDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

export default DrawingsTable;
