import React, { useEffect, useMemo, useState } from 'react';
import { ModificationType } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { XMarkIcon } from './icons/Icon';
import api from '../src/services/api';

interface ContractModificationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: {
      number: string;
      type: ModificationType;
      date: string;
      value?: number;
      days?: number;
      justification: string;
    },
    file: File | null
  ) => Promise<void>;
}

const ContractModificationFormModal: React.FC<ContractModificationFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [number, setNumber] = useState('');
  const [type, setType] = useState<ModificationType>(ModificationType.ADDITION);
  const [date, setDate] = useState('');
  const [value, setValue] = useState('');
  const [days, setDays] = useState('');
  const [justification, setJustification] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [affectsFiftyPercent, setAffectsFiftyPercent] = useState(true);
  const [summary, setSummary] = useState<{
    baseValue: number;
    cap: number;
    additionsAffecting: number;
    additionsNonAffecting: number;
    usedPercent: number;
    remainingCap: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.contractModifications.summary().then(setSummary).catch(() => setSummary(null));
    }
  }, [isOpen]);

  const willExceedCap = useMemo(() => {
    if (!summary) return false;
    if (type !== ModificationType.ADDITION) return false;
    const addVal = parseFloat(value || '0') || 0;
    if (!affectsFiftyPercent || addVal <= 0) return false;
    return summary.additionsAffecting + addVal > summary.cap;
  }, [summary, type, value, affectsFiftyPercent]);

  const resetForm = () => {
    setNumber('');
    setType(ModificationType.ADDITION);
    setDate('');
    setValue('');
    setDays('');
    setJustification('');
    setFile(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setAffectsFiftyPercent(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);

    if (!number || !date || !justification) {
      alert('Número, fecha y justificación son obligatorios.');
      return;
    }

    if (type === ModificationType.ADDITION && (!value || parseFloat(value) <= 0)) {
      alert('Para una adición, el valor debe ser un número positivo.');
      return;
    }
    if (type === ModificationType.ADDITION && affectsFiftyPercent && willExceedCap) {
      alert('Esta adición superaría el tope del 50% del contrato. Activa "Incorporación por mayores cantidades" o ajusta el valor.');
      return;
    }

    if (type === ModificationType.TIME_EXTENSION && (!days || parseInt(days, 10) <= 0)) {
      alert('Para una prórroga, los días deben ser un número positivo.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(
        {
          number,
          type,
          date: new Date(date).toISOString(),
          value:
            type === ModificationType.ADDITION && value
              ? parseFloat(value)
              : undefined,
          days:
            type === ModificationType.TIME_EXTENSION && days
              ? parseInt(days, 10)
              : undefined,
          justification,
          // passthrough for API
          ...(type === ModificationType.ADDITION ? { affectsFiftyPercent } : {}),
        },
        file
      );
      resetForm();
    } catch (error: any) {
      console.error('Error al guardar la modificación:', error);
      setSubmitError(
        error?.message || 'No se pudo guardar la modificación. Intenta nuevamente.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Registrar Modificación al Contrato"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Número Modificatorio"
            id="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            placeholder="Ej: Otrosí No. 2"
          />
          <Input
            label="Fecha del Documento"
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        {type === ModificationType.ADDITION && (
          <div className="p-3 bg-gray-50 border rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="affects50" className="text-sm font-medium text-gray-800">
                Afecta tope del 50% (Adición “normal”)
              </label>
              <input
                id="affects50"
                type="checkbox"
                className="h-4 w-4"
                checked={affectsFiftyPercent}
                onChange={(e) => setAffectsFiftyPercent(e.target.checked)}
              />
            </div>
            <p className="text-xs text-gray-600">
              Si desactivas, se registrará como “Incorporación por mayores cantidades” y NO contará dentro del 50%.
            </p>
            {summary && (
              <div className={`text-sm ${willExceedCap ? 'text-red-600' : 'text-gray-700'}`}>
                Tope 50%: <strong>${summary.cap.toLocaleString('es-CO')}</strong> ·
                Usado: <strong>${summary.additionsAffecting.toLocaleString('es-CO')}</strong> ·
                Restante: <strong>${Math.max(summary.cap - summary.additionsAffecting, 0).toLocaleString('es-CO')}</strong>
                {type === ModificationType.ADDITION && affectsFiftyPercent && value && parseFloat(value) > 0 && (
                  <>
                    {' '}· Con esta adición: <strong>${(summary.additionsAffecting + (parseFloat(value)||0)).toLocaleString('es-CO')}</strong>
                  </>
                )}
                {willExceedCap && <div className="mt-1">Esta adición superaría el tope permitido.</div>}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de Modificación"
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as ModificationType)}
          >
            {Object.values(ModificationType).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          {type === ModificationType.ADDITION && (
            <Input
              label="Valor de la Adición (COP)"
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              placeholder="Ej: 500000000"
              min={0}
            />
          )}
          {type === ModificationType.TIME_EXTENSION && (
            <Input
              label="Días de Prórroga"
              id="days"
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
              placeholder="Ej: 30"
              min={0}
            />
          )}
        </div>
        <div>
          <label
            htmlFor="justification"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Justificación
          </label>
          <textarea
            id="justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            required
          ></textarea>
        </div>
        <div>
          <label
            htmlFor="file-upload-mod"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Adjuntar Soporte
          </label>
          {!file ? (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload-mod"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary"
                  >
                    <span>Carga un archivo</span>
                    <input
                      id="file-upload-mod"
                      name="file-upload-mod"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 p-2 border rounded-md bg-gray-50 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 truncate">
                {file.name}
              </p>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        {submitError && (
          <div className="text-sm text-red-500">{submitError}</div>
        )}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              resetForm();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Guardar Modificación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ContractModificationFormModal;
