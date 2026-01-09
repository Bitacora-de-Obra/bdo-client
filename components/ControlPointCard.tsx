import React, { useState, useRef, useEffect } from 'react';
import { ControlPoint } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { PlusIcon, CalendarIcon, CameraIcon, DotsVerticalIcon, PencilIcon, TrashIcon } from './icons/Icon';

interface ControlPointCardProps {
  point: ControlPoint;
  onAddPhoto: () => void;
  onViewProgress: () => void;
  canAddPhoto?: boolean;
  /** Si true, muestra opciones de editar/eliminar */
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ControlPointCard: React.FC<ControlPointCardProps> = ({ 
  point, 
  onAddPhoto, 
  onViewProgress, 
  canAddPhoto = true,
  isAdmin = false,
  onEdit,
  onDelete
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const lastPhotoDate = point.photos.length > 0
    ? new Date(point.photos[point.photos.length - 1].date).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEdit = () => {
    setMenuOpen(false);
    onEdit?.();
  };

  const handleDelete = () => {
    setMenuOpen(false);
    onDelete?.();
  };

  return (
    <Card className="flex flex-col relative">
      {/* Menú de opciones para admin */}
      {isAdmin && (
        <div className="absolute top-2 right-2" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            title="Opciones"
          >
            <DotsVerticalIcon className="w-5 h-5 text-gray-500" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={handleEdit}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="p-5 flex-grow">
        <h4 className="text-lg font-bold text-gray-800 truncate pr-8">{point.name}</h4>
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
        <Button
          onClick={onAddPhoto}
          leftIcon={<PlusIcon />}
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={!canAddPhoto}
        >
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
