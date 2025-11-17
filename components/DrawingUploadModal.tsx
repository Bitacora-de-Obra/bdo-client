import React, { useState, useEffect } from 'react';
import { Drawing, DrawingDiscipline } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { XMarkIcon } from './icons/Icon';

interface DrawingUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDrawing: (data: Omit<Drawing, 'id' | 'status' | 'versions' | 'comments'>, file: File) => void;
  onSaveNewVersion: (drawingId: string, file: File) => void;
  existingDrawing: Drawing | null;
  allDrawings: Drawing[];
}

const DrawingUploadModal: React.FC<DrawingUploadModalProps> = ({ isOpen, onClose, onSaveDrawing, onSaveNewVersion, existingDrawing, allDrawings }) => {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState<DrawingDiscipline>(DrawingDiscipline.ARQUITECTONICO);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isNewVersionMode = !!existingDrawing;

  useEffect(() => {
    if (isOpen) {
        if (isNewVersionMode) {
            setCode(existingDrawing.code);
            setTitle(existingDrawing.title);
            setDiscipline(existingDrawing.discipline);
        }
    } else {
      // Delay reset to avoid flicker during closing animation
      setTimeout(() => {
        setCode('');
        setTitle('');
        setDiscipline(DrawingDiscipline.ARQUITECTONICO);
        setFile(null);
        setError(null);
      }, 300);
    }
  }, [isOpen, existingDrawing, isNewVersionMode]);
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase();
    setCode(newCode);
    if (allDrawings.some(d => d.code === newCode)) {
        setError(`El código '${newCode}' ya existe. Al guardar, se creará una nueva versión de ese plano.`);
    } else {
        setError(null);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Debes seleccionar un archivo.");
      return;
    }

    if (isNewVersionMode) {
        onSaveNewVersion(existingDrawing.id, file);
    } else {
        // Check again for existing code to decide action
        const matchedDrawing = allDrawings.find(d => d.code === code);
        if (matchedDrawing) {
            onSaveNewVersion(matchedDrawing.id, file);
        } else {
            // Fix: Removed the 'comments' property from the object passed to onSaveDrawing.
            // The API hook is responsible for initializing the 'comments' array.
            onSaveDrawing({ code, title, discipline }, file);
        }
    }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={isNewVersionMode ? `Cargar Nueva Versión para ${existingDrawing.code}` : "Cargar Nuevo Plano"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Código del Plano" value={code} onChange={handleCodeChange} required disabled={isNewVersionMode} placeholder="Ej: EST-001-A" />
        {error && <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded-md border border-yellow-200">{error}</p>}

        <Input label="Título del Plano" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isNewVersionMode} />
        <Select label="Disciplina" value={discipline} onChange={(e) => setDiscipline(e.target.value as DrawingDiscipline)} disabled={isNewVersionMode}>
            {Object.values(DrawingDiscipline).map(d => <option key={d} value={d}>{d}</option>)}
        </Select>

        <div>
            <label htmlFor="file-upload-drawing" className="block text-sm font-medium text-gray-700 mb-1">
                Archivo del Plano {isNewVersionMode && `(Versión ${existingDrawing.versions[0].versionNumber + 1})`}
            </label>
            {!file ? (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload-drawing-input" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                        <span>Carga un archivo</span>
                        <input id="file-upload-drawing-input" type="file" className="sr-only" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
                        </label>
                        <p className="pl-1">o arrastra y suelta</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DWG, JPG, etc. hasta 25MB</p>
                    </div>
                </div>
            ) : (
                <div className="mt-2 p-2 border rounded-md bg-gray-50 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                    <button type="button" onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">
                        <XMarkIcon className="h-5 w-5"/>
                    </button>
                </div>
            )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!file}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
};

export default DrawingUploadModal;
