import React, { useState, useEffect } from "react";
import {
  Acta,
  ActaStatus,
  Commitment,
  CommitmentStatus,
  User,
  Attachment,
  ActaArea,
} from "../types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";
import { PlusIcon, XMarkIcon } from "./icons/Icon";

const AUTOSAVE_KEY = "actaFormDraft";

interface ActaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actaData: Omit<Acta, "id">) => void;
  users: User[];
}

const ActaFormModal: React.FC<ActaFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  users,
}) => {
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const [area, setArea] = useState<ActaArea>(ActaArea.COMITE_OBRA);
  const [status, setStatus] = useState<ActaStatus>(ActaStatus.DRAFT);
  const [commitments, setCommitments] = useState<Omit<Commitment, "id">[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Restaurar borrador si existe
    const draft = localStorage.getItem(AUTOSAVE_KEY);
    if (draft) {
      try {
        const data = JSON.parse(draft);
        setNumber(data.number || "");
        setTitle(data.title || "");
        setDate(data.date || "");
        setSummary(data.summary || "");
        setArea(data.area || ActaArea.COMITE_OBRA);
        setStatus(data.status || ActaStatus.DRAFT);
        setCommitments(data.commitments || []);
        // No restaurar archivos adjuntos por seguridad
      } catch {}
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Guardar borrador cada vez que cambie el formulario
    const draft = {
      number,
      title,
      date,
      summary,
      area,
      status,
      commitments,
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
  }, [number, title, date, summary, area, status, commitments, isOpen]);

  const handleCommitmentChange = (
    index: number,
    field: keyof Omit<Commitment, "id" | "responsible">,
    value: string
  ) => {
    const newCommitments = [...commitments];
    (newCommitments[index] as any)[field] = value;
    setCommitments(newCommitments);
  };

  const handleResponsibleChange = (index: number, userId: string) => {
    const newCommitments = [...commitments];
    const user = users.find((u) => u.id === userId);
    if (user) {
      newCommitments[index].responsible = user;
      setCommitments(newCommitments);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachmentFile(e.target.files[0]);
    }
  };

  const addCommitment = () => {
    if (users.length === 0) {
      alert("No hay usuarios disponibles para asignar compromisos.");
      return;
    }
    setCommitments([
      ...commitments,
      {
        description: "",
        responsible: users[0],
        dueDate: "",
        status: CommitmentStatus.PENDING,
      },
    ]);
  };

  const removeCommitment = (index: number) => {
    setCommitments(commitments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !title || !date) {
      alert("Número, título y fecha del acta son obligatorios.");
      return;
    }

    const finalCommitments = commitments.map((c, index) => ({
      ...c,
      id: `comp-${Date.now()}-${index}`,
    }));

    const newAttachments: Attachment[] = [];
    if (attachmentFile) {
      newAttachments.push({
        id: `att-${Date.now()}`,
        fileName: attachmentFile.name,
        size: attachmentFile.size,
        type: attachmentFile.type,
        url: "#", // In a real app, this would be the URL from the server
      });
    }

    onSave({
      number,
      title,
      date: new Date(date).toISOString(),
      summary,
      area,
      status,
      commitments: finalCommitments,
      attachments: newAttachments,
      // Fix: Add missing properties to satisfy the Acta type
      requiredSignatories: [],
      signatures: [],
    });

    localStorage.removeItem(AUTOSAVE_KEY);

    // Reset form
    setNumber("");
    setTitle("");
    setDate("");
    setSummary("");
    setArea(ActaArea.COMITE_OBRA);
    setStatus(ActaStatus.DRAFT);
    setCommitments([]);
    setAttachmentFile(null);
  };

  const handleCancel = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Nueva Acta de Comité"
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            wrapperClassName="sm:col-span-1"
            label="Número de Acta"
            id="number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            required
          />
          <Input
            wrapperClassName="sm:col-span-1"
            label="Fecha de Reunión"
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            wrapperClassName="sm:col-span-1"
            label="Área Temática"
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value as ActaArea)}
          >
            {Object.values(ActaArea).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select
            wrapperClassName="sm:col-span-1"
            label="Estado del Acta"
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ActaStatus)}
          >
            {Object.values(ActaStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Título de la Reunión"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Resumen / Temas Tratados
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
          ></textarea>
        </div>

        {/* Commitments Section */}
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-2">
            Compromisos
          </h4>
          <div className="space-y-4">
            {commitments.map((commitment, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg border relative"
              >
                <button
                  type="button"
                  onClick={() => removeCommitment(index)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
                <Input
                  label={`Descripción del Compromiso #${index + 1}`}
                  id={`desc-${index}`}
                  value={commitment.description}
                  onChange={(e) =>
                    handleCommitmentChange(index, "description", e.target.value)
                  }
                />
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Select
                    label="Responsable"
                    id={`resp-${index}`}
                    value={commitment.responsible.id}
                    onChange={(e) =>
                      handleResponsibleChange(index, e.target.value)
                    }
                  >
                    {/* Fix: Replaced `u.name` with `u.fullName`. */}
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="Fecha Límite"
                    id={`due-${index}`}
                    type="date"
                    value={commitment.dueDate}
                    onChange={(e) =>
                      handleCommitmentChange(index, "dueDate", e.target.value)
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addCommitment}
            leftIcon={<PlusIcon />}
            className="mt-3"
          >
            Añadir Compromiso
          </Button>
        </div>

        {/* Attachments Section */}
        <div>
          <label
            htmlFor="attachments"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Adjuntar Archivo del Acta
          </label>
          {!attachmentFile ? (
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
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-primary"
                  >
                    <span>Carga un archivo</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">o arrastra y suelta</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, DOCX, etc. hasta 10MB
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-2 p-2 border rounded-md bg-gray-50 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700 truncate">
                {attachmentFile.name}
              </p>
              <button
                type="button"
                onClick={() => setAttachmentFile(null)}
                className="text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Acta</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ActaFormModal;
