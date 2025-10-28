import React, { useState } from 'react';
import { ControlPoint } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';

interface ControlPointFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<ControlPoint, 'id' | 'photos'>) => void;
}

const ControlPointFormModal: React.FC<ControlPointFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }
    onSave({ name, description, location });
    onClose();
    setName('');
    setDescription('');
    setLocation('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Punto de Control Fotográfico">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del Punto de Control"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Fachada Norte - Edificio de Control"
          required
        />
        <Input
          label="Ubicación o Abscisa"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ej: K1+250, Costado Oriental"
        />
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe qué se debe observar en este punto de control."
          />
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Guardar Punto
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ControlPointFormModal;
