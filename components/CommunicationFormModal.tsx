

import React, { useState } from 'react';
// Fix: Corrected import path for types
import { Communication, DeliveryMethod } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

interface CommunicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    commData: Omit<Communication, 'id' | 'uploader' | 'attachments' | 'status' | 'statusHistory'>,
    files: File[]
  ) => Promise<void>;
  communications: Communication[];
}

const CommunicationFormModal: React.FC<CommunicationFormModalProps> = ({ isOpen, onClose, onSave, communications }) => {
  const [radicado, setRadicado] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [senderDetails, setSenderDetails] = useState({ entity: '', personName: '', personTitle: '' });
  const [recipientDetails, setRecipientDetails] = useState({ entity: '', personName: '', personTitle: '' });
  const [signerName, setSignerName] = useState('');
  const [sentDate, setSentDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(DeliveryMethod.SYSTEM);
  const [notes, setNotes] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const resetForm = () => {
      setRadicado('');
      setSubject('');
      setDescription('');
      setSenderDetails({ entity: '', personName: '', personTitle: '' });
      setRecipientDetails({ entity: '', personName: '', personTitle: '' });
      setSignerName('');
      setSentDate('');
      setDueDate('');
      setDeliveryMethod(DeliveryMethod.SYSTEM);
      setNotes('');
      setParentId('');
      setFiles([]);
      setFormError(null);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!radicado || !subject || !sentDate) {
      setFormError("Radicado, asunto y fecha de envío son obligatorios.");
      return;
    }

    const saveData: Omit<Communication, 'id' | 'uploader' | 'attachments' | 'status' | 'statusHistory'> = {
      radicado,
      subject,
      description,
      senderDetails,
      recipientDetails,
      signerName: signerName || senderDetails.personName, // Default to sender if not specified
      sentDate: new Date(sentDate).toISOString(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      deliveryMethod,
      notes,
    };

    if (parentId) {
      saveData.parentId = parentId;
    }

    try {
      setIsSubmitting(true);
      await onSave(saveData, files);
      resetForm();
    } catch (err: any) {
      setFormError(err?.message || "No se pudo guardar la comunicación.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const sortedCommunications = [...communications].sort((a,b) => a.radicado.localeCompare(b.radicado));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Nueva Comunicación" size="2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input wrapperClassName="sm:col-span-1" label="Número de Radicado" id="radicado" value={radicado} onChange={(e) => setRadicado(e.target.value)} required />
            <Input wrapperClassName="sm:col-span-1" label="Fecha de Envío" id="sentDate" type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} required/>
            <Input wrapperClassName="sm:col-span-1" label="Fecha Límite (Opcional)" id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        
        <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium text-gray-700 px-2">Información del Remitente</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <Input label="Entidad" value={senderDetails.entity} onChange={(e) => setSenderDetails(p => ({...p, entity: e.target.value}))} required/>
                <Input label="Nombre de la Persona" value={senderDetails.personName} onChange={(e) => setSenderDetails(p => ({...p, personName: e.target.value}))} required/>
                <Input label="Cargo" value={senderDetails.personTitle} onChange={(e) => setSenderDetails(p => ({...p, personTitle: e.target.value}))} required/>
            </div>
        </fieldset>
        
        <fieldset className="border p-4 rounded-md">
            <legend className="text-sm font-medium text-gray-700 px-2">Información del Destinatario</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <Input label="Entidad" value={recipientDetails.entity} onChange={(e) => setRecipientDetails(p => ({...p, entity: e.target.value}))} required/>
                <Input label="Nombre de la Persona" value={recipientDetails.personName} onChange={(e) => setRecipientDetails(p => ({...p, personName: e.target.value}))} required/>
                <Input label="Cargo" value={recipientDetails.personTitle} onChange={(e) => setRecipientDetails(p => ({...p, personTitle: e.target.value}))} required/>
            </div>
        </fieldset>

        <Input label="Asunto del Documento" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
         <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripción (Asunto Tratado)</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"></textarea>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Input label="Persona que Firma el Documento" id="signerName" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Por defecto, el remitente"/>
             <Select label="Medio de Envío" id="deliveryMethod" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}>
                {Object.values(DeliveryMethod).map(m => <option key={m} value={m}>{m}</option>)}
             </Select>
        </div>
        
        <Select label="Responde a (Opcional)" id="parentId" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Ninguno (Comunicación inicial)</option>
          {sortedCommunications.map(c => (
            <option key={c.id} value={c.id}>
              {c.radicado} - {c.subject}
            </option>
          ))}
        </Select>

        <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Observaciones (Opcional)</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"></textarea>
        </div>
        
        <div>
          <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-1">Adjuntar Archivos</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="communication-attachments" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none">
                  <span>Selecciona archivos</span>
                  <input
                    id="communication-attachments"
                    name="communication-attachments"
                    type="file"
                    className="sr-only"
                    multiple
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">o arrastra y suelta</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF hasta 10MB</p>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="p-2 border rounded-md bg-gray-50 flex items-center justify-between text-sm"
                >
                  <p className="font-medium text-gray-700 truncate">{file.name}</p>
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className="text-red-500 hover:text-red-700 ml-4"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {formError}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar Comunicación"}
            </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CommunicationFormModal;
