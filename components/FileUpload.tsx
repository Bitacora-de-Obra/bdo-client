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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
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
        <div className="space-y-1 text-center">
           <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="flex text-sm text-gray-600">
            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
              <span>Selecciona un archivo</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xml" />
            </label>
            <p className="pl-1">o arrástralo aquí</p>
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
