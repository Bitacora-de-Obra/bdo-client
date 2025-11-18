
import React, { useState, useEffect, useRef } from 'react';
import { ControlPoint, PhotoEntry } from '../types';
import Modal from './ui/Modal';
import { UserCircleIcon, CalendarIcon } from './icons/Icon';
import api from '../src/services/api';
import { useToast } from './ui/ToastProvider';

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
  </svg>
);

const PauseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm9 0a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" clipRule="evenodd" />
  </svg>
);


interface ProgressViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  controlPoint: ControlPoint;
  onPhotosReordered?: (updatedPhotos: PhotoEntry[]) => void; // Callback para actualizar el estado en el padre
}

const ProgressViewerModal: React.FC<ProgressViewerModalProps> = ({ isOpen, onClose, controlPoint, onPhotosReordered }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [photos, setPhotos] = useState<PhotoEntry[]>(controlPoint.photos);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const { showToast } = useToast();

  // Sincronizar fotos cuando cambia el controlPoint
  useEffect(() => {
    setPhotos(controlPoint.photos);
  }, [controlPoint.photos]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(photos.length - 1);
    } else {
      setIsPlaying(false);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }, [isOpen, photos.length]);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isPlaying) {
      intervalId = window.setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % photos.length);
      }, 1500);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, photos.length]);

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % photos.length);
  };

  // Funciones para drag-and-drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', ''); // Necesario para algunos navegadores
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Reordenar localmente
    const newPhotos = [...photos];
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(dropIndex, 0, draggedPhoto);
    setPhotos(newPhotos);

    // Actualizar índice actual si es necesario
    if (currentIndex === draggedIndex) {
      setCurrentIndex(dropIndex);
    } else if (currentIndex === dropIndex) {
      setCurrentIndex(draggedIndex);
    } else if (draggedIndex < currentIndex && dropIndex >= currentIndex) {
      setCurrentIndex(currentIndex - 1);
    } else if (draggedIndex > currentIndex && dropIndex <= currentIndex) {
      setCurrentIndex(currentIndex + 1);
    }

    setDraggedIndex(null);

    // Guardar el nuevo orden en el backend
    try {
      setIsReordering(true);
      const photoIds = newPhotos.map(photo => photo.id);
      const response = await api.controlPoints.reorderPhotos(controlPoint.id, photoIds);
      
      // Actualizar con las fotos del servidor (que incluyen el orden actualizado)
      setPhotos(response.photos);
      
      // Notificar al componente padre
      if (onPhotosReordered) {
        onPhotosReordered(response.photos);
      }

      showToast({
        variant: 'success',
        title: 'Orden actualizado',
        message: 'Las fotos se han reorganizado correctamente.',
      });
    } catch (error: any) {
      console.error('Error al reordenar fotos:', error);
      // Revertir cambios locales
      setPhotos(controlPoint.photos);
      showToast({
        variant: 'error',
        title: 'Error',
        message: error?.message || 'No se pudo actualizar el orden de las fotos.',
      });
    } finally {
      setIsReordering(false);
    }
  };
  
  if (!controlPoint || photos.length === 0) {
      return null;
  }
  
  const currentPhoto = photos[currentIndex];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Progreso: ${controlPoint.name}`} size="2xl">
      <div className="relative">
        <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
          <img src={currentPhoto.url} alt={`Avance ${currentPhoto.date}`} className="object-contain w-full h-full" />
        </div>
        
        <button onClick={goToPrevious} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <button onClick={goToNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-md border">
        <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center text-sm text-gray-700 font-semibold">
                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                    {new Date(currentPhoto.date).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}
                </div>
                 <div className="flex items-center text-xs text-gray-500 mt-1">
                    <UserCircleIcon className="w-4 h-4 mr-2" />
                    {/* Fix: Replaced `author.name` with `author.fullName`. */}
                    Tomada por: {currentPhoto.author.fullName}
                </div>
            </div>
             <div className="text-sm font-semibold text-gray-600">
                {currentIndex + 1} / {photos.length}
            </div>
        </div>
        {currentPhoto.notes && <p className="mt-2 text-sm text-gray-800">{currentPhoto.notes}</p>}
      </div>

       <div className="mt-4 flex items-center justify-center gap-4">
        <div className="flex-1 h-20 overflow-x-auto flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              draggable={!isReordering}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex-shrink-0 w-20 h-16 rounded-md overflow-hidden transition-all duration-200 cursor-move ${
                index === currentIndex ? 'ring-2 ring-brand-primary ring-offset-2' : 'opacity-60 hover:opacity-100'
              } ${
                draggedIndex === index ? 'opacity-30 scale-95' : ''
              } ${
                dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-400 ring-offset-1 scale-105' : ''
              } ${isReordering ? 'cursor-wait' : ''}`}
            >
              <button
                onClick={() => setCurrentIndex(index)}
                className="w-full h-full"
                disabled={isReordering}
              >
                <img src={photo.url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover pointer-events-none" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-brand-primary text-white rounded-full hover:bg-brand-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary">
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
      </div>

    </Modal>
  );
};

export default ProgressViewerModal;
