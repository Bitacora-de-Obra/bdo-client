import React, { useState, useEffect } from "react";
import {
  LogEntry,
  EntryStatus,
  User,
  UserRole,
  Attachment,
} from "../types";
import Modal from "./ui/Modal";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import AttachmentItem from "./AttachmentItem";
import Input from "./ui/Input";
import Select from "./ui/Select";
import ChangeHistory from "./ChangeHistory";
import {
  LockClosedIcon,
  XMarkIcon,
  PaperClipIcon,
  DocumentArrowDownIcon,
} from "./icons/Icon";
import SignatureBlock from "./SignatureBlock";
import SignatureModal from "./SignatureModal";
import { useToast } from "./ui/ToastProvider";
import api from "../src/services/api";

interface EntryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LogEntry;
  onUpdate: (updatedEntry: LogEntry) => void;
  onAddComment: (
    entryId: string,
    commentText: string,
    files: File[]
  ) => Promise<void>;
  onSign: (
    documentId: string,
    documentType: "logEntry",
    signer: User,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (entryId: string) => Promise<void>;
  currentUser: User;
  onRefresh?: () => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
  </div>
);

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  isOpen,
  onClose,
  entry,
  onUpdate,
  onAddComment,
  onSign,
  onDelete,
  currentUser,
  onRefresh = () => {},
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState<LogEntry>(entry);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [formEntryDate, setFormEntryDate] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setEditedEntry({
        ...entry,
        assignees: entry.assignees || [],
        attachments: entry.attachments || [],
        comments: entry.comments || [],
        history: entry.history || [],
        requiredSignatories: entry.requiredSignatories || [],
        signatures: entry.signatures || [],
      });
      setFormEntryDate(entry.entryDate.substring(0, 10));
      setValidationError(null);
    } else {
      const timer = setTimeout(() => {
        setIsEditing(false);
        setNewFiles([]);
        setNewComment("");
        setCommentFiles([]);
        setValidationError(null);
        setFormEntryDate("");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [entry, isOpen]);

  const handleDelete = async () => {
    if (
      window.confirm(
        "¿Estás seguro de que quieres eliminar esta anotación? Esta acción no se puede deshacer."
      )
    ) {
      await onDelete(entry.id);
      onClose();
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setEditedEntry((prev) => ({ ...prev, [name]: checked }));
    } else {
      setEditedEntry((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCommentFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveExistingAttachment = (attachmentId: string) => {
    setEditedEntry((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter(
        (att) => att.id !== attachmentId
      ),
    }));
  };

  const handleRemoveNewFile = (fileToRemove: File) => {
    setNewFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleRemoveCommentFile = (fileToRemove: File) => {
    setCommentFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() || commentFiles.length > 0) {
      await onAddComment(entry.id, newComment.trim(), commentFiles);
      setNewComment("");
      setCommentFiles([]);
    }
  };

  const handleSave = async () => {
    setValidationError(null);

    if (!formEntryDate) {
      setValidationError("Debes indicar la fecha de la bitácora.");
      return;
    }

    if (!editedEntry.title.trim()) {
      setValidationError("El título no puede estar vacío.");
      return;
    }

    if (!editedEntry.description.trim()) {
      setValidationError("El resumen general es obligatorio.");
      return;
    }

    const parsedDate = new Date(`${formEntryDate}T00:00:00`);
    if (isNaN(parsedDate.getTime())) {
      setValidationError("La fecha del diario no es válida.");
      return;
    }

    const normalizedDate = new Date(parsedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const newAttachments = newFiles.map((file) => ({
      id: `att-${Date.now()}-${file.name}`,
      fileName: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
    }));

    const finalEntry = {
      ...editedEntry,
      title: editedEntry.title.trim(),
      description: editedEntry.description.trim(),
      activitiesPerformed: (editedEntry.activitiesPerformed || "").trim(),
      materialsUsed: (editedEntry.materialsUsed || "").trim(),
      workforce: (editedEntry.workforce || "").trim(),
      weatherConditions: (editedEntry.weatherConditions || "").trim(),
      additionalObservations: (editedEntry.additionalObservations || "").trim(),
      entryDate: normalizedDate.toISOString(),
      activityStartDate: normalizedDate.toISOString(),
      activityEndDate: endOfDay.toISOString(),
      attachments: [...(editedEntry.attachments || []), ...newAttachments],
    } as LogEntry;

    try {
      await onUpdate(finalEntry);
      setIsEditing(false);
      setNewFiles([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la bitácora.";
      setValidationError(message);
    }
  };

const handleConfirmSignature = async (password: string): Promise<{ success: boolean, error?: string }> => {
    // Ya no verificamos la contraseña aquí, se la pasamos al backend
    const result = await onSign(entry.id, 'logEntry', currentUser, password);
    if (result.success) {
        setIsSignatureModalOpen(false);
    }
    return result; // Devolvemos el resultado al modal para que muestre el error si es necesario
};

  const handleCancel = () => {
    setEditedEntry(entry);
    setIsEditing(false);
    setNewFiles([]);
    setValidationError(null);
    setFormEntryDate(entry.entryDate.substring(0, 10));
  };

  const handleExportPdf = async () => {
    setValidationError(null);
    setIsGeneratingPdf(true);
    try {
      const response = await api.logEntries.exportPdf(entry.id);
      const updatedEntry =
        response?.entry && (response.entry as LogEntry);

      if (updatedEntry) {
        setEditedEntry({
          ...updatedEntry,
          assignees: updatedEntry.assignees || [],
          attachments: updatedEntry.attachments || [],
          comments: updatedEntry.comments || [],
          history: updatedEntry.history || [],
          requiredSignatories: updatedEntry.requiredSignatories || [],
          signatures: updatedEntry.signatures || [],
        });
        if (updatedEntry.entryDate) {
          setFormEntryDate(updatedEntry.entryDate.substring(0, 10));
        }
      }

      await onRefresh();

      const downloadUrl =
        response?.attachment?.downloadUrl || response?.attachment?.url;
      if (downloadUrl) {
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      }

      showToast({
        variant: "success",
        title: "PDF generado",
        message: "La bitácora diaria se exportó correctamente.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el PDF.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al exportar",
        message,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const { folioNumber, author, comments = [] } = entry;
  const {
    title,
    description,
    entryDate: entryDateIso,
    activitiesPerformed = "",
    materialsUsed = "",
    workforce = "",
    weatherConditions = "",
    additionalObservations = "",
    type,
    status,
    isConfidential,
    history = [],
    createdAt,
    attachments = [],
    requiredSignatories = [],
    signatures = [],
  } = editedEntry;

  const toDatetimeLocal = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset)
      .toISOString()
      .slice(0, -1);
    return localISOTime.substring(0, 16);
  };

  const canEdit =
    currentUser.id === author?.id || currentUser.projectRole === UserRole.ADMIN;

  const entryDateDisplay = entryDateIso
    ? new Date(entryDateIso).toLocaleDateString("es-CO", { dateStyle: "long" })
    : "N/A";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Detalle Anotación - Folio #${folioNumber}`}
        size="2xl"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="pb-4 border-b">
            <div className="flex justify-between items-start">
              {isEditing ? (
                <Input
                  name="title"
                  value={title}
                  onChange={handleInputChange}
                  wrapperClassName="w-full"
                />
              ) : (
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {title}{" "}
                  {isConfidential && (
                    <LockClosedIcon className="text-gray-500 h-5 w-5" />
                  )}
                </h3>
              )}
            </div>
            <div className="mt-2 flex justify-between items-center">
              <p className="text-sm text-gray-500 mt-1">{type}</p>
              {isEditing ? (
                <Select
                  name="status"
                  value={status}
                  onChange={handleInputChange}
                >
                  {Object.values(EntryStatus).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge status={status} />
              )}
            </div>
          </div>
          {/* Details Grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
            <DetailRow label="Autor" value={author?.fullName || "N/A"} />
            {isEditing ? (
              <Input
                label="Fecha del diario"
                name="entryDate"
                type="date"
                value={formEntryDate}
                onChange={(e) => setFormEntryDate(e.target.value)}
              />
            ) : (
              <DetailRow label="Fecha del diario" value={entryDateDisplay} />
            )}
            <DetailRow
              label="Fecha de creación"
              value={new Date(createdAt).toLocaleString("es-CO")}
            />
            <DetailRow
              label="Última actualización"
              value={
                entry.updatedAt
                  ? new Date(entry.updatedAt).toLocaleString("es-CO")
                  : "N/A"
              }
            />
          </dl>

          {/* Summary */}
          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Resumen general del día
            </h4>
            {isEditing ? (
              <textarea
                name="description"
                value={description}
                onChange={handleInputChange}
                rows={4}
                className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              />
            ) : (
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {description || "Sin resumen registrado."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Actividades realizadas
              </h4>
              {isEditing ? (
                <textarea
                  name="activitiesPerformed"
                  value={activitiesPerformed}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {activitiesPerformed || "Sin registro."}
                </p>
              )}
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Materiales utilizados
              </h4>
              {isEditing ? (
                <textarea
                  name="materialsUsed"
                  value={materialsUsed}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {materialsUsed || "Sin registro."}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Personal en obra
              </h4>
              {isEditing ? (
                <textarea
                  name="workforce"
                  value={workforce}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {workforce || "Sin registro."}
                </p>
              )}
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Condiciones climáticas
              </h4>
              {isEditing ? (
                <textarea
                  name="weatherConditions"
                  value={weatherConditions}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {weatherConditions || "Sin registro."}
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Observaciones adicionales
            </h4>
            {isEditing ? (
              <textarea
                name="additionalObservations"
                value={additionalObservations}
                onChange={handleInputChange}
                rows={3}
                className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              />
            ) : (
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {additionalObservations || "Sin observaciones."}
              </p>
            )}
          </div>
          {/* Confidential Checkbox */}
          {isEditing && (
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="isConfidential"
                  name="isConfidential"
                  type="checkbox"
                  checked={isConfidential}
                  onChange={handleInputChange}
                  className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="isConfidential"
                  className="font-medium text-gray-700"
                >
                  Marcar como confidencial
                </label>
                <p className="text-gray-500">
                  Solo usuarios autorizados podrán ver esta anotación.
                </p>
              </div>
            </div>
          )}
          {/* Attachments */}
          {isEditing ? (
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Gestión de Archivos Adjuntos
              </h4>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between py-2 pl-3 pr-2 text-sm bg-gray-50 rounded-md border"
                    >
                      <span className="truncate font-medium flex-1 w-0">
                        {att.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingAttachment(att.id)}
                        className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {newFiles.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-gray-600">
                    Nuevos archivos para adjuntar:
                  </h5>
                  <ul className="mt-1 space-y-2">
                    {newFiles.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between py-2 pl-3 pr-2 text-sm bg-blue-50 rounded-md border border-blue-200"
                      >
                        <span className="truncate font-medium flex-1 w-0">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewFile(file)}
                          className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3">
                <label
                  htmlFor="file-upload-edit"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <PaperClipIcon className="h-5 w-5 mr-2 text-gray-500" />
                  <span>Añadir Archivos</span>
                  <input
                    id="file-upload-edit"
                    name="file-upload-edit"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    multiple
                  />
                </label>
              </div>
            </div>
          ) : (
            attachments.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-800">
                  Archivos Adjuntos
                </h4>
                <div className="mt-2 space-y-3">
                  {attachments.map((att) => {
                    const isImage = att.type?.startsWith("image/");
                    if (isImage) {
                      return (
                        <div key={att.id} className="p-2 border rounded-lg">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={att.url}
                              alt={att.fileName}
                              className="max-h-80 w-auto rounded-md border cursor-pointer hover:opacity-90"
                            />
                          </a>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <p className="font-medium text-gray-700 truncate">
                              {att.fileName}
                            </p>
                            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                              <span className="text-gray-500">
                                {formatBytes(att.size)}
                              </span>
                              <a
                                href={att.url}
                                download={att.fileName}
                                className="font-medium text-brand-primary hover:text-brand-secondary"
                              >
                                Descargar
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return <AttachmentItem key={att.id} attachment={att} />;
                  })}
                </div>
              </div>
            )
          )}
          {/* Signature Block */}
          {!isEditing && (
            <SignatureBlock
              requiredSignatories={requiredSignatories}
              signatures={signatures}
              currentUser={currentUser}
              onSignRequest={() => setIsSignatureModalOpen(true)}
              documentType="Anotación"
            />
          )}
          {/* Comments */}
          <div>
            <h4 className="text-md font-semibold text-gray-800">Comentarios</h4>
            {comments.length > 0 ? (
              <div className="mt-2 space-y-4 max-h-40 overflow-y-auto pr-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    {/* Cambia "user" por "author" en las siguientes 2 líneas */}
                    <img
                      src={comment.author.avatarUrl}
                      alt={comment.author.fullName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">
                          {comment.author.fullName}
                        </span>

                        <span className="text-gray-500 ml-2 text-xs">
                          {new Date(comment.timestamp).toLocaleString("es-CO")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      {(comment.attachments || []).length > 0 && (
                        <div className="mt-2 space-y-3">
                          {(comment.attachments || []).map((att) => {
                            const isImage = att.type?.startsWith("image/");
                            if (isImage) {
                              return (
                                <div key={att.id}>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.fileName}
                                      className="max-h-40 rounded border cursor-pointer hover:opacity-90"
                                    />
                                  </a>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {att.fileName} -
                                    <a
                                      href={att.url}
                                      download={att.fileName}
                                      className="ml-1 font-medium text-brand-primary hover:text-brand-secondary"
                                    >
                                      Descargar
                                    </a>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <AttachmentItem key={att.id} attachment={att} />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Aún no hay comentarios. ¡Sé el primero en añadir uno!
              </p>
            )}
          </div>
          {/* New Comment Form */}
          <div className="pt-4 border-t">
            <form
              onSubmit={handleCommentSubmit}
              className="flex items-start space-x-3"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="flex-1">
                <textarea
                  rows={2}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Escribe tu comentario aquí..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                ></textarea>
                {commentFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {commentFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1 pl-2 pr-1 text-sm bg-blue-50 rounded-md border border-blue-200"
                      >
                        <span className="truncate font-medium flex-1 w-0 text-gray-700">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCommentFile(file)}
                          className="ml-2 flex-shrink-0 text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex justify-between items-center">
                  <label
                    htmlFor="comment-file-upload"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 cursor-pointer"
                  >
                    <PaperClipIcon className="h-4 w-4 mr-2" />
                    <span>Adjuntar</span>
                    <input
                      id="comment-file-upload"
                      type="file"
                      multiple
                      onChange={handleCommentFileChange}
                      className="sr-only"
                    />
                  </label>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newComment.trim() && commentFiles.length === 0}
                  >
                    Publicar Comentario
                  </Button>
                </div>
              </div>
            </form>
          </div>
          {/* Change History */}
          <ChangeHistory history={history} />
        </div>

        {isEditing && validationError && (
          <div className="p-3 my-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {validationError}
          </div>
        )}
        {/* Modal Footer */}
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
          {isEditing ? (
            <div>
              <Button variant="danger" onClick={handleDelete}>
                Eliminar Anotación
              </Button>
            </div>
          ) : (
            <div></div>
          )}

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  Guardar Cambios
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Cerrar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExportPdf}
                  leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? "Generando..." : "Exportar PDF"}
                </Button>
                {canEdit && (
                  <Button variant="primary" onClick={() => setIsEditing(true)}>
                    Modificar Anotación
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onConfirm={handleConfirmSignature}
        userToSign={currentUser}
      />
    </>
  );
};

export default EntryDetailModal;
