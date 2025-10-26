import React, { useState } from "react";
import { Report, ReportScope, User, ReportStatus } from "../types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { XMarkIcon } from "./icons/Icon";

interface ReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    reportData: Omit<Report, "id" | "author" | "status" | "attachments" | "version" | "previousReportId" | "versions">,
    files: File[],
    options?: { previousReportId?: string }
  ) => Promise<void>;
  reportType: "Weekly" | "Monthly";
  reportScope: ReportScope;
  baseReport?: Report | null;
  mode?: "create" | "newVersion";
}

const ReportFormModal: React.FC<ReportFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  reportType,
  reportScope,
  baseReport,
  mode = "create",
}) => {
  const [number, setNumber] = useState("");
  const [period, setPeriod] = useState("");
  const [submissionDate, setSubmissionDate] = useState("");
  const [summary, setSummary] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    number?: string;
    period?: string;
    submissionDate?: string;
    summary?: string;
  }>({});

  const reportTypeName = reportType === "Weekly" ? "Semanal" : "Mensual";

  const resetForm = () => {
    setNumber("");
    setPeriod("");
    setSubmissionDate("");
    setSummary("");
    setFiles([]);
    setValidationError(null);
    setIsSubmitting(false);
    setFieldErrors({});
  };

  React.useEffect(() => {
    if (isOpen) {
      if (baseReport) {
        setNumber(baseReport.number);
        setPeriod(baseReport.period);
        setSubmissionDate(
          baseReport.submissionDate
            ? new Date(baseReport.submissionDate).toISOString().split("T")[0]
            : ""
        );
        setSummary(baseReport.summary || "");
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, baseReport?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const errors: typeof fieldErrors = {};
    const trimmedNumber = number.trim();
    const trimmedPeriod = period.trim();
    const trimmedSummary = summary.trim();

    if (!trimmedNumber) {
      errors.number = "Ingresa el número del informe.";
    }
    if (!trimmedPeriod) {
      errors.period = "Describe el periodo cubierto.";
    }

    if (!submissionDate) {
      errors.submissionDate = "Selecciona la fecha de presentación.";
    } else {
      const parsedDate = new Date(submissionDate);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.submissionDate = "La fecha no es válida.";
      } else if (parsedDate > new Date()) {
        errors.submissionDate = "La fecha no puede ser futura.";
      }
    }

    if (!trimmedSummary) {
      errors.summary = "Incluye un resumen ejecutivo.";
    } else if (trimmedSummary.length < 20) {
      errors.summary = "Amplía el resumen con al menos 20 caracteres.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(
        {
          number: trimmedNumber,
          period: trimmedPeriod,
          submissionDate: new Date(submissionDate).toISOString(),
          summary: trimmedSummary,
          type: reportType,
          reportScope,
          requiredSignatories: [],
          signatures: [],
        },
        files,
        { previousReportId: baseReport?.id }
      );

      resetForm();
      onClose();
    } catch (saveError: any) {
      setValidationError(
        saveError?.message || "No se pudo guardar el informe. Intenta nuevamente."
      );
      if (saveError?.fieldErrors) {
        setFieldErrors(saveError.fieldErrors);
      }
      setIsSubmitting(false);
    }
  };

  const titlePrefix =
    mode === "newVersion" && baseReport
      ? `Registrar Nueva Versión (v${baseReport.version + 1}) de ${baseReport.number}`
      : `Registrar Nuevo Informe ${reportTypeName} de ${reportScope}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titlePrefix}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "newVersion" && baseReport && (
          <div className="p-3 border border-brand-primary/30 bg-brand-primary/5 rounded text-sm text-brand-primary">
            <p>
              Estás registrando la versión <strong>v{baseReport.version + 1}</strong> del
              informe <strong>{baseReport.number}</strong>.
            </p>
            <p className="mt-1 text-brand-primary/80">
              El número y el tipo de informe se mantienen; ajusta el periodo, el
              resumen y adjunta la documentación que respalda esta nueva versión.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={`Número de Informe ${reportTypeName}`}
            id="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
            placeholder={`Ej: Informe ${reportTypeName} No. 15`}
            disabled={mode === "newVersion" || isSubmitting}
            error={fieldErrors.number}
          />
          <Input
            label="Fecha de Presentación"
            id="submissionDate"
            type="date"
            value={submissionDate}
            onChange={(e) => setSubmissionDate(e.target.value)}
            required
            disabled={isSubmitting}
            error={fieldErrors.submissionDate}
          />
        </div>
        <Input
          label="Periodo que Cubre"
          id="period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          required
          placeholder={
            reportType === "Weekly"
              ? "Ej: Semana del 15 al 21 de Julio, 2024"
              : "Ej: Julio 2024"
          }
          disabled={isSubmitting}
          error={fieldErrors.period}
        />
        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Resumen Ejecutivo
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className={`block w-full border ${
              fieldErrors.summary ? "border-red-400" : "border-gray-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-2 ${
              fieldErrors.summary
                ? "focus:ring-red-200 focus:border-red-400"
                : "focus:ring-brand-primary/50 focus:border-brand-primary"
            } sm:text-sm p-2`}
            required
            disabled={isSubmitting}
          ></textarea>
          {fieldErrors.summary && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.summary}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="attachments"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Adjuntar Archivos
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
                  htmlFor="file-upload-report"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary"
                >
                  <span>Carga uno o más archivos</span>
                  <input
                    id="file-upload-report"
                    name="file-upload-report"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    multiple
                    disabled={isSubmitting}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">
                Archivos PDF, Office, imágenes o comprimidos. Máximo 10&nbsp;MB por archivo.
              </p>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="p-2 border rounded-md bg-gray-50 flex items-center justify-between text-sm"
                >
                  <p className="font-medium text-gray-700 truncate">
                    {file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className="text-red-500 hover:text-red-700 ml-4 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    <XMarkIcon className="h-5 w-5" />
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
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Informe"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportFormModal;
