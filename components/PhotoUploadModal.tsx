import React, { useState, useEffect, useRef } from 'react';
import { ControlPoint, PhotoEntry } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { CameraIcon } from './icons/Icon';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<PhotoEntry, 'id' | 'author' | 'date'>, file: File) => void;
  controlPoint: ControlPoint;
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({ isOpen, onClose, onSave, controlPoint }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [captureMode, setCaptureMode] = useState<'file' | 'camera'>('file');
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Detectar si hay cámara disponible
  useEffect(() => {
    const checkCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(device => device.kind === 'videoinput');
          setCameraAvailable(hasCamera);
        } catch (error) {
          console.warn('Error checking camera availability:', error);
          setCameraAvailable(false);
        }
      } else {
        setCameraAvailable(false);
      }
    };
    checkCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      
      // Primero intentar con cámara trasera (móviles)
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Cámara trasera en móviles
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (envError: any) {
        // Si falla con 'environment', intentar sin especificar (computadoras o cámara frontal)
        console.log('Intentando con cámara por defecto...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      }
      
      streamRef.current = stream;
      
      // Asignar el stream al video inmediatamente
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('[Camera] Stream asignado al video');
        
        // Marcar como activo inmediatamente para que el video se muestre
        setIsCameraActive(true);
        
        // Asegurar que el video se reproduzca
        videoRef.current.onloadedmetadata = () => {
          console.log('[Camera] Metadata cargada');
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('[Camera] Video reproduciéndose correctamente');
              })
              .catch((error) => {
                console.error('[Camera] Error playing video:', error);
              });
          }
        };
        
        // También intentar reproducir inmediatamente
        videoRef.current.play()
          .then(() => {
            console.log('[Camera] Video iniciado correctamente');
          })
          .catch((error) => {
            console.warn('[Camera] No se pudo reproducir inmediatamente, esperando metadata:', error);
          });
      } else {
        console.warn('[Camera] videoRef.current es null, esperando...');
        // Reintentar después de un breve delay
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setIsCameraActive(true);
            videoRef.current.play().catch(console.error);
          }
        }, 100);
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración del navegador.'
          : error.name === 'NotFoundError'
          ? 'No se encontró ninguna cámara en el dispositivo.'
          : 'Error al acceder a la cámara. Por favor, intenta de nuevo.'
      );
      setIsCameraActive(false);
      setCaptureMode('file'); // Cambiar a modo archivo si falla la cámara
    }
  };

  // Iniciar/detener cámara según el modo
  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      const timer = setTimeout(() => {
        setFile(null);
        setPreview(null);
        setNotes('');
        setCaptureMode('file');
        stopCamera();
      }, 300);
      return () => clearTimeout(timer);
    }

    if (isOpen && captureMode === 'camera' && cameraAvailable) {
      console.log('[Camera] Iniciando cámara desde useEffect...');
      startCamera();
    } else if (captureMode !== 'camera') {
      stopCamera();
    }

    return () => {
      if (captureMode !== 'camera') {
        stopCamera();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, captureMode, cameraAvailable]);


  const capturePhoto = () => {
    if (!videoRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `foto_${controlPoint.name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          setFile(file);
          setPreview(canvas.toDataURL('image/jpeg'));
          stopCamera();
          setCaptureMode('file'); // Cambiar a modo archivo después de capturar
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Por favor, selecciona una foto para subir.");
      return;
    }
    onSave({ notes, url: '' }, file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Añadir Foto a: ${controlPoint.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Foto del Avance
            </label>
            {cameraAvailable && !preview && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCaptureMode('file');
                    stopCamera();
                  }}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    captureMode === 'file'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Seleccionar archivo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCaptureMode('camera');
                    // El useEffect iniciará la cámara automáticamente
                  }}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    captureMode === 'camera'
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tomar foto
                </button>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-600">{cameraError}</p>
            </div>
          )}

          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            {preview ? (
              <div className="text-center w-full">
                <img src={preview} alt="Vista previa" className="max-h-60 mx-auto rounded-md" />
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    stopCamera();
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Cambiar foto
                </button>
              </div>
            ) : captureMode === 'camera' ? (
              <div className="w-full space-y-3">
                {!isCameraActive && !cameraError && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-600">Iniciando cámara...</p>
                    <p className="text-xs text-gray-500 mt-2">Por favor, permite el acceso a la cámara si se solicita</p>
                  </div>
                )}
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px', width: '100%' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                    style={{ 
                      minHeight: '300px',
                      width: '100%',
                      backgroundColor: '#000'
                    }}
                  />
                  {!isCameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                      <div className="text-center text-white">
                        <CameraIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p className="text-sm">Esperando cámara...</p>
                      </div>
                    </div>
                  )}
                </div>
                {isCameraActive && (
                  <div className="flex justify-center gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setCaptureMode('file');
                        stopCamera();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      className="flex items-center gap-2"
                    >
                      <CameraIcon className="h-5 w-5" />
                      Capturar Foto
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none"
                  >
                    <span>Selecciona una foto</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
                {cameraAvailable && (
                  <p className="text-xs text-blue-600 mt-2">
                    O usa el botón "Tomar foto" para capturar desde la cámara
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notas (Opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Añade una descripción breve del estado actual."
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!file}>
            Guardar Foto
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PhotoUploadModal;
