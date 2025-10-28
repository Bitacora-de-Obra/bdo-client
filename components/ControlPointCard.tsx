import React from 'react';
import { ControlPoint } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { PlusIcon, CalendarIcon, CameraIcon } from './icons/Icon';

interface ControlPointCardProps {
  point: ControlPoint;
  onAddPhoto: () => void;
  onViewProgress: () => void;
}

const ControlPointCard: React.FC<ControlPointCardProps> = ({ point, onAddPhoto, onViewProgress }) => {
  const lastPhotoDate = point.photos.length > 0
    ? new Date(point.photos[point.photos.length - 1].date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <Card className="flex flex-col">
      <div className="p-5 flex-grow">
        <h4 className="text-lg font-bold text-gray-800 truncate">{point.name}</h4>
        <p className="text-sm text-gray-500 mt-1">{point.location}</p>
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{point.description}</p>
        
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-600">
            <div className="flex items-center">
                <CameraIcon className="w-4 h-4 mr-2 text-gray-400" />
                <span>{point.photos.length} foto(s)</span>
            </div>
             <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2 text-gray-400" />
                <span>Última: {lastPhotoDate}</span>
            </div>
        </div>
      </div>
      <div className="bg-gray-50/70 p-3 flex gap-2">
        <Button onClick={onAddPhoto} leftIcon={<PlusIcon />} variant="secondary" size="sm" className="w-full">
          Añadir Foto
        </Button>
        <Button onClick={onViewProgress} variant="primary" size="sm" className="w-full" disabled={point.photos.length === 0}>
          Ver Progreso
        </Button>
      </div>
    </Card>
  );
};

export default ControlPointCard;
