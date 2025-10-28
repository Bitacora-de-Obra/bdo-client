import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!isOpen) {
      // Reset form on close
      const timer = setTimeout(() => {
        setFile(null);
        setPreview(null);
        setNotes('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foto del Avance
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            {preview ? (
              <div className="text-center">
                <img src={preview} alt="Vista previa" className="max-h-60 mx-auto rounded-md" />
                <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="mt-2 text-sm text-red-600 hover:text-red-800">
                  Cambiar foto
                </button>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                    <span>Selecciona una foto</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 10MB</p>
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
