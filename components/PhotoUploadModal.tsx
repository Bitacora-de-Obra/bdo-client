import React, { useState, useEffect, useRef } from 'react';
import { ControlPoint, PhotoEntry } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { CameraIcon } from './icons/Icon';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<PhotoEntry, 'id' | 'author' | 'date'>, file: File) => Promise<void>;
  controlPoint: ControlPoint;
}

interface FileWithPreview {
  file: File;
  preview: string;
  notes: string;
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({ isOpen, onClose, onSave, controlPoint }) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [notes, setNotes] = useState('');
  const [captureMode, setCaptureMode] = useState<'file' | 'camera'>('file');
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
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
        setFiles([]);
        setNotes('');
        setCaptureMode('file');
        setIsUploading(false);
        setUploadProgress('');
        setUploadedCount(0);
        setUploadErrors([]);
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
          const preview = canvas.toDataURL('image/jpeg');
          setFiles(prev => [...prev, { file, preview, notes: '' }]);
          stopCamera();
          setCaptureMode('file'); // Cambiar a modo archivo después de capturar
        }
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      const newFiles: FileWithPreview[] = [];
      
      selectedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newFiles.push({
            file,
            preview: reader.result as string,
            notes: ''
          });
          
          // Cuando todos los archivos se hayan leído, actualizar el estado
          if (newFiles.length === selectedFiles.length) {
            setFiles(prev => [...prev, ...newFiles]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileNotes = (index: number, notes: string) => {
    setFiles(prev => prev.map((item, i) => 
      i === index ? { ...item, notes } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      alert("Por favor, selecciona al menos una foto para subir.");
      return;
    }
    
    setIsUploading(true);
    setUploadedCount(0);
    setUploadErrors([]);
    setUploadProgress(`Subiendo 0 de ${files.length} fotos...`);
    
    try {
      // Subir todas las fotos en secuencia
      for (let i = 0; i < files.length; i++) {
        const fileWithPreview = files[i];
        setUploadProgress(`Subiendo ${i + 1} de ${files.length}: ${fileWithPreview.file.name}...`);
        
        try {
          // Usar las notas específicas de la foto, o las notas generales si no hay
          const photoNotes = fileWithPreview.notes || notes;
          await onSave({ notes: photoNotes, url: '' }, fileWithPreview.file);
          setUploadedCount(i + 1);
        } catch (error: any) {
          const errorMessage = error?.message || `Error al subir ${fileWithPreview.file.name}`;
          setUploadErrors(prev => [...prev, errorMessage]);
          console.error(`Error al guardar foto ${i + 1}:`, error);
          // Continuar con las siguientes fotos aunque una falle
        }
      }
      
      if (uploadErrors.length === 0) {
        setUploadProgress(`¡Todas las fotos se subieron exitosamente!`);
        // Cerrar el modal después de un breve delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (uploadedCount > 0) {
        setUploadProgress(`${uploadedCount} de ${files.length} fotos subidas. ${uploadErrors.length} error(es).`);
      } else {
        setUploadProgress('Error al subir las fotos.');
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error general al guardar fotos:', error);
      setUploadProgress('');
      setIsUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Añadir Foto a: ${controlPoint.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Foto del Avance
            </label>
            {cameraAvailable && files.length === 0 && (
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

          <div className="mt-1 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            {files.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-2">
                  {files.length} foto{files.length > 1 ? 's' : ''} seleccionada{files.length > 1 ? 's' : ''}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {files.map((fileWithPreview, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={fileWithPreview.preview} 
                        alt={`Vista previa ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-md border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar foto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="mt-1">
                        <input
                          type="text"
                          placeholder="Notas (opcional)"
                          value={fileWithPreview.notes}
                          onChange={(e) => updateFileNotes(index, e.target.value)}
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Limpiar todas las fotos
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
                    <span>Selecciona una o más fotos</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB cada una</p>
                <p className="text-xs text-blue-600 mt-1">
                  Puedes seleccionar múltiples fotos a la vez (mantén presionado Ctrl/Cmd para seleccionar varias)
                </p>
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
            Notas generales (Opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas que se aplicarán a todas las fotos (puedes agregar notas individuales a cada foto arriba)."
          />
          <p className="text-xs text-gray-500 mt-1">
            Estas notas se aplicarán a todas las fotos que no tengan notas individuales.
          </p>
        </div>

        {isUploading && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">{uploadProgress}</p>
                {files.length > 1 && (
                  <div className="mt-2">
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(uploadedCount / files.length) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {uploadedCount} de {files.length} fotos subidas
                    </p>
                  </div>
                )}
                <p className="text-xs text-blue-600 mt-1">Por favor, no cierres esta ventana...</p>
              </div>
            </div>
          </div>
        )}

        {uploadErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm font-medium text-red-800 mb-2">Errores al subir algunas fotos:</p>
            <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
              {uploadErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={files.length === 0 || isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Subiendo...</span>
              </>
            ) : (
              `Guardar ${files.length > 0 ? `${files.length} ` : ''}Foto${files.length > 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PhotoUploadModal;
