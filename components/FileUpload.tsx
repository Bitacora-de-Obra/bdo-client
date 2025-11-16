import React, { useState, useCallback } from 'react';
import Button from './ui/Button';
import { XMarkIcon } from './icons/Icon';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      // Validar que sea un archivo XML
      if (selectedFile.type === 'text/xml' || selectedFile.type === 'application/xml' || selectedFile.name.toLowerCase().endsWith('.xml')) {
        setFile(selectedFile);
        setErrorMessage(null);
      } else {
        setErrorMessage('Por favor, selecciona un archivo XML válido exportado desde MS Project.');
        setFile(null);
        // Limpiar el input
        e.target.value = '';
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      // Validar que sea un archivo XML
      if (droppedFile.type === 'text/xml' || droppedFile.type === 'application/xml' || droppedFile.name.toLowerCase().endsWith('.xml')) {
        setFile(droppedFile);
        setErrorMessage(null);
      } else {
        setErrorMessage('Por favor, arrastra un archivo XML válido exportado desde MS Project.');
        setFile(null);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo activar drag si no es el label/input
    if (!(e.target as HTMLElement).closest('label')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Solo desactivar drag si realmente salimos del área
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);


  const handleSubmit = async () => {
    if (!file || isProcessing) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      await onFileUpload(file);
      setFile(null);
    } catch (error: any) {
      setErrorMessage(error?.message || "No se pudo procesar el archivo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mt-4">
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
          isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-300'
        }`}
      >
        <div className="space-y-1 text-center w-full">
           <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 text-sm text-gray-600">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={isProcessing}
              className="cursor-pointer inline-block bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 px-3 py-1.5 border border-brand-primary/30 hover:border-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selecciona un archivo
            </button>
            <input 
              ref={fileInputRef}
              id="file-upload" 
              name="file-upload" 
              type="file" 
              className="hidden" 
              onChange={handleFileChange} 
              accept=".xml,text/xml,application/xml"
              disabled={isProcessing}
              aria-label="Seleccionar archivo XML del cronograma"
            />
            <span className="hidden sm:inline">o</span>
            <span className="sm:hidden">o</span>
            <span>arrástralo aquí</span>
          </div>
          <p className="text-xs text-gray-500">Archivos .xml exportados desde MS Project. Máximo 10MB.</p>
        </div>
      </div>
       {file && (
        <div className="mt-3">
          <div className="flex items-center justify-between p-2 bg-gray-50 border rounded-md">
            <span className="text-sm font-medium text-gray-800">{file.name}</span>
            <button onClick={() => setFile(null)} className="text-gray-500 hover:text-red-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <Button onClick={handleSubmit} className="w-full mt-2" disabled={isProcessing}>
            {isProcessing ? "Procesando..." : "Procesar Cronograma"}
          </Button>
          {errorMessage && (
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
