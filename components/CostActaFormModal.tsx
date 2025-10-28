import React, { useState } from 'react';
import { CostActa, CostActaStatus } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { XMarkIcon } from './icons/Icon';

interface CostActaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (costActaData: Omit<CostActa, 'id' | 'observations' | 'attachments'>, files: File[]) => void;
  totalContractValue: number;
}

const CostActaFormModal: React.FC<CostActaFormModalProps> = ({ isOpen, onClose, onSave, totalContractValue }) => {
  const [number, setNumber] = useState('');
  const [period, setPeriod] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [billedAmount, setBilledAmount] = useState('');
  const [relatedProgress, setRelatedProgress] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  const resetForm = () => {
    setNumber('');
    setPeriod('');
    setSubmissionDate('');
    setBilledAmount('');
    setRelatedProgress('');
    setFiles([]);
    setValidationError(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!number || !period || !submissionDate || !billedAmount) {
        setValidationError("Todos los campos principales son obligatorios.");
        return;
    }

    const todayString = new Date().toISOString().split('T')[0];
    if (submissionDate > todayString) {
        setValidationError("La fecha de radicación no puede ser una fecha futura.");
        return;
    }

    onSave({
      number,
      period,
      submissionDate: new Date(submissionDate).toISOString(),
      billedAmount: parseFloat(billedAmount),
      relatedProgress,
      totalContractValue,
      status: CostActaStatus.SUBMITTED,
      approvalDate: null,
      paymentDueDate: null,
    }, files);

    resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Acta de Cobro de Interventoría" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Número de Acta" id="number" value={number} onChange={(e) => setNumber(e.target.value)} required 
                   placeholder="Ej: Acta Cobro No. 05 – Octubre 2025" />
            <Input label="Periodo Correspondiente" id="period" value={period} onChange={(e) => setPeriod(e.target.value)} required 
                   placeholder="Ej: Octubre 2025" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Fecha de Radicación" id="submissionDate" type="date" value={submissionDate} onChange={(e) => setSubmissionDate(e.target.value)} required />
            <Input label="Valor Facturado (COP)" id="billedAmount" type="number" value={billedAmount} onChange={(e) => setBilledAmount(e.target.value)} required 
                   placeholder="Ej: 150000000" />
        </div>
        <div>
            <label htmlFor="relatedProgress" className="block text-sm font-medium text-gray-700 mb-1">Relación con Avance Físico (Opcional)</label>
            <textarea id="relatedProgress" value={relatedProgress} onChange={(e) => setRelatedProgress(e.target.value)} rows={3} className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"></textarea>
        </div>

        <div>
          <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-1">Adjuntar Archivos (Acta, Factura, etc.)</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload-cost" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                  <span>Carga uno o más archivos</span>
                  <input id="file-upload-cost" name="file-upload-cost" type="file" className="sr-only" onChange={handleFileChange} multiple />
                </label>
              </div>
              <p className="text-xs text-gray-500">PDF, JPG, DOCX hasta 10MB</p>
            </div>
          </div>
           {files.length > 0 && (
                <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                         <div key={index} className="p-2 border rounded-md bg-gray-50 flex items-center justify-between text-sm">
                            <p className="font-medium text-gray-700 truncate">{file.name}</p>
                            <button type="button" onClick={() => removeFile(file)} className="text-red-500 hover:text-red-700 ml-4">
                                <XMarkIcon className="h-5 w-5"/>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {validationError}
            </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar Acta</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CostActaFormModal;