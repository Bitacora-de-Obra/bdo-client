
import React, { useState, useEffect } from 'react';
import { ControlPoint } from '../types';
import Modal from './ui/Modal';
import { UserCircleIcon, CalendarIcon } from './icons/Icon';

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
}

const ProgressViewerModal: React.FC<ProgressViewerModalProps> = ({ isOpen, onClose, controlPoint }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(controlPoint.photos.length - 1);
    } else {
        setIsPlaying(false);
    }
  }, [isOpen, controlPoint]);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isPlaying) {
      intervalId = window.setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % controlPoint.photos.length);
      }, 1500);
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, controlPoint.photos.length]);

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev === 0 ? controlPoint.photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev + 1) % controlPoint.photos.length);
  };
  
  if (!controlPoint || controlPoint.photos.length === 0) {
      return null;
  }
  
  const currentPhoto = controlPoint.photos[currentIndex];

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
                {currentIndex + 1} / {controlPoint.photos.length}
            </div>
        </div>
        {currentPhoto.notes && <p className="mt-2 text-sm text-gray-800">{currentPhoto.notes}</p>}
      </div>

       <div className="mt-4 flex items-center justify-center gap-4">
        <div className="flex-1 h-20 overflow-x-auto flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
          {controlPoint.photos.map((photo, index) => (
            <button key={photo.id} onClick={() => setCurrentIndex(index)} className={`flex-shrink-0 w-20 h-16 rounded-md overflow-hidden transition-all duration-200 ${index === currentIndex ? 'ring-2 ring-brand-primary ring-offset-2' : 'opacity-60 hover:opacity-100'}`}>
              <img src={photo.url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
            </button>
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
