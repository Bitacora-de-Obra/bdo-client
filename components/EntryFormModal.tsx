import React, { useEffect, useState } from "react";
import { LogEntry, EntryStatus, EntryType } from "../types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { XMarkIcon } from "./icons/Icon";

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    entryData: Omit<
      LogEntry,
      | "id"
      | "folioNumber"
      | "createdAt"
      | "author"
      | "comments"
      | "history"
      | "updatedAt"
      | "attachments"
    >,
    files: File[]
  ) => void;
  initialDate?: string | null;
}

const EntryFormModal: React.FC<EntryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
}) => {
  const [entryDate, setEntryDate] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [activitiesPerformed, setActivitiesPerformed] = useState<string>("");
  const [materialsUsed, setMaterialsUsed] = useState<string>("");
  const [workforce, setWorkforce] = useState<string>("");
  const [weatherConditions, setWeatherConditions] = useState<string>("");
  const [additionalObservations, setAdditionalObservations] =
    useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resetForm = () => {
    setEntryDate("");
    setTitle("");
    setSummary("");
    setActivitiesPerformed("");
    setMaterialsUsed("");
    setWorkforce("");
    setWeatherConditions("");
    setAdditionalObservations("");
    setFiles([]);
    setValidationError(null);
  };

  useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        setEntryDate(initialDate);
      }
    } else {
      const timer = setTimeout(() => {
        resetForm();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialDate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!entryDate) {
      setValidationError("Debes seleccionar la fecha de la bitácora.");
      return;
    }

    if (!title.trim()) {
      setValidationError("El título es obligatorio.");
      return;
    }

    if (!summary.trim()) {
      setValidationError("El resumen general del día es obligatorio.");
      return;
    }

    const parsedDate = new Date(`${entryDate}T00:00:00`);
    if (isNaN(parsedDate.getTime())) {
      setValidationError("La fecha seleccionada no es válida.");
      return;
    }

    const normalizedDate = new Date(parsedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const entryDateIso = normalizedDate.toISOString();

    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      await onSave(
        {
          title: title.trim(),
          description: summary.trim(),
          entryDate: entryDateIso,
          activitiesPerformed: activitiesPerformed.trim(),
          materialsUsed: materialsUsed.trim(),
          workforce: workforce.trim(),
          weatherConditions: weatherConditions.trim(),
          additionalObservations: additionalObservations.trim(),
          activityStartDate: normalizedDate.toISOString(),
          activityEndDate: endOfDay.toISOString(),
          subject: "",
          location: "",
          type: EntryType.GENERAL,
          status: EntryStatus.SUBMITTED,
          isConfidential: false,
          assignees: [],
          requiredSignatories: [],
          signatures: [],
        },
        files
      );
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la bitácora. Intenta nuevamente."
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Bitácora Diaria"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha del Diario"
            id="entryDate"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
          <Input
            label="Título"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Resumen general del día
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actividades realizadas
            </label>
            <textarea
              value={activitiesPerformed}
              onChange={(e) => setActivitiesPerformed(e.target.value)}
              rows={4}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Describe las tareas ejecutadas en la jornada"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Materiales utilizados
            </label>
            <textarea
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              rows={4}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Registra cantidades, tipos de material, proveedores, etc."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal en obra
            </label>
            <textarea
              value={workforce}
              onChange={(e) => setWorkforce(e.target.value)}
              rows={3}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Cuadrillas presentes, subcontratistas, horas hombre..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condiciones climáticas
            </label>
            <textarea
              value={weatherConditions}
              onChange={(e) => setWeatherConditions(e.target.value)}
              rows={3}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Estado del clima, incidencia en las actividades, riesgos, etc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones adicionales
          </label>
          <textarea
            value={additionalObservations}
            onChange={(e) => setAdditionalObservations(e.target.value)}
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Notas relevantes, novedades, riesgos identificados u otros comentarios"
          />
        </div>

        <div>
          <label
            htmlFor="file-upload-entry"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Adjuntar archivos
          </label>
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
                  htmlFor="file-upload-entry"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none"
                >
                  <span>Selecciona archivos</span>
                  <input
                    id="file-upload-entry"
                    name="file-upload-entry"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    multiple
                  />
                </label>
                <p className="pl-1">o arrastra y suelta</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, imágenes u otros archivos — máximo 10MB
              </p>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-2 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between text-sm p-2 bg-gray-50 border rounded"
                >
                  <span className="truncate font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <XMarkIcon className="h-4 w-4" />
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
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Bitácora</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EntryFormModal;
