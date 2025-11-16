import React, { useState, useEffect } from "react";
import { CostActa, CostActaStatus, Observation, User } from "../types"; // Ajusta la ruta si es necesario
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Select from "./ui/Select";
import CostActaStatusBadge from "./CostActaStatusBadge";
import PaymentComplianceAlert from "./PaymentComplianceAlert";
import AttachmentItem from "./AttachmentItem";
import api from '../src/services/api';
import { useAuth } from '../contexts/AuthContext';

interface CostActaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  acta: CostActa;
  onUpdate: (updatedActa: CostActa) => void; // Esta prop ya existe y se usa
}

const DetailRow: React.FC<{
  label: string;
  value: React.ReactNode;
  className?: string;
}> = ({ label, value, className }) => (
  <div className={className}>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
  </div>
);

const CostActaDetailModal: React.FC<CostActaDetailModalProps> = ({
  isOpen,
  onClose,
  acta,
  onUpdate,
}) => {
  const { user } = useAuth(); // Obtén el usuario actual
  const [editedActa, setEditedActa] = useState<CostActa>(acta);
  const [newObservation, setNewObservation] = useState(''); // <-- Estado para nueva observación
  const [isSubmittingObservation, setIsSubmittingObservation] = useState(false); // <-- Estado para feedback
  const [observationError, setObservationError] = useState<string | null>(null); // <-- Estado para errores
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Estado para archivos seleccionados
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false); // Estado para carga de adjuntos
  const [uploadError, setUploadError] = useState<string | null>(null); // Estado para errores de subida

  useEffect(() => {
    // Actualiza el estado local cuando el acta de entrada cambie o se abra el modal
    // Asegúrate de que observations y attachments sean arrays
    setEditedActa({
        ...acta,
        observations: acta.observations || [],
        attachments: acta.attachments || []
    });
    setNewObservation(''); // Resetea el campo al abrir/cambiar acta
    setObservationError(null);
    console.log("Acta received by Modal:", acta); // Log para depuración
  }, [acta, isOpen]);

  const handleStatusChange = (newStatus: CostActaStatus) => {
    setEditedActa((prev) => ({ ...prev, status: newStatus }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedActa((prev) => ({ ...prev, [name]: value }));
  };

  // Esta función llama a la prop onUpdate que viene del CostDashboard
  const handleSaveChanges = () => {
    onUpdate(editedActa);
    // onClose(); // CostDashboard ahora cierra el modal en handleUpdateActa
  };

  // --- FUNCIÓN PARA ENVIAR OBSERVACIÓN ---
  const handleAddObservation = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newObservation.trim() || !user) return;

      setIsSubmittingObservation(true);
      setObservationError(null);
      try {
          // Llama al endpoint POST para crear la observación
          const createdObservation = await api.costActas.addObservation(acta.id, {
            text: newObservation,
            authorId: user.id,
          });

          // Refrescar el acta completo desde el servidor para asegurar que tenemos todos los datos actualizados
          const updatedActa = await api.costActas.getById(acta.id);
          
          setEditedActa(updatedActa); // Actualiza el estado del modal con datos frescos
          onUpdate(updatedActa); // Notifica al dashboard padre del cambio completo
          setNewObservation(''); // Limpia el campo

      } catch (err) {
           setObservationError(err instanceof Error ? err.message : "Error al añadir observación.");
      } finally {
          setIsSubmittingObservation(false);
      }
  };
  // ---------------------------------------------

  // --- FUNCIÓN PARA SUBIR ADJUNTOS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadError(null); // Limpiar errores previos
    }
  };

  const handleUploadAttachments = async () => {
    if (selectedFiles.length === 0 || !user) return;

    setIsUploadingAttachments(true);
    setUploadError(null);
    
    try {
      // Subir archivos uno por uno para mejor manejo de errores
      const uploadedAttachments = [];
      for (const file of selectedFiles) {
        try {
          const attachment = await api.upload.uploadFile(file, "document");
          uploadedAttachments.push(attachment);
        } catch (fileError) {
          console.error(`Error al subir ${file.name}:`, fileError);
          setUploadError(`Error al subir ${file.name}. Intenta nuevamente.`);
          // Continuar con los demás archivos
        }
      }

      if (uploadedAttachments.length === 0) {
        setUploadError("No se pudo subir ningún archivo. Intenta nuevamente.");
        setIsUploadingAttachments(false);
        return;
      }

      // Vincular los archivos subidos al acta
      for (const attachment of uploadedAttachments) {
        try {
          await api.costActas.addAttachment(acta.id, attachment.id);
        } catch (linkError) {
          console.error(`Error al vincular ${attachment.fileName}:`, linkError);
          // Continuar con los demás archivos
        }
      }

      // Refrescar el acta completo desde el servidor
      const updatedActa = await api.costActas.getById(acta.id);
      
      setEditedActa(updatedActa);
      onUpdate(updatedActa);
      setSelectedFiles([]); // Limpiar archivos seleccionados
      setUploadError(null);
      
      // Resetear el input de archivo
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Error al subir adjuntos:', err);
      setUploadError(err instanceof Error ? err.message : "Error al subir los archivos. Intenta nuevamente.");
    } finally {
      setIsUploadingAttachments(false);
    }
  };
  // ---------------------------------------------

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle Acta de Cobro - ${acta.number}`}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-4 border-b">
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-gray-900">{acta.number}</h3>
            {/* Usa el estado local 'editedActa' para reflejar cambios antes de guardar */}
            <CostActaStatusBadge status={editedActa.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">Periodo: {acta.period}</p>
        </div>

        {/* Alerta de Cumplimiento */}
        <PaymentComplianceAlert acta={acta} />

        {/* Detalles */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
          <DetailRow
            label="Fecha de Radicación"
            value={new Date(acta.submissionDate).toLocaleDateString("es-CO")}
          />
          <DetailRow
            label="Fecha de Aprobación"
            value={
              acta.approvalDate
                ? new Date(acta.approvalDate).toLocaleDateString("es-CO")
                : "N/A"
            }
          />
          <DetailRow
            label="Fecha Límite de Pago"
            value={
              acta.paymentDueDate
                ? new Date(acta.paymentDueDate).toLocaleDateString("es-CO")
                : "N/A"
            }
          />
          <DetailRow
            label="Valor Facturado"
            value={
              <span className="font-semibold">
                {formatCurrency(acta.billedAmount)}
              </span>
            }
          />
          <DetailRow
            label="% del Contrato"
            value={`${(
              (acta.billedAmount / acta.totalContractValue) *
              100
            ).toFixed(2)}%`}
          />
        </dl>

        {/* Relación con Avance Físico (Editable) */}
        <div>
          <label
            htmlFor="relatedProgress"
            className="block text-md font-semibold text-gray-800"
          >
            Relación con Avance Físico
          </label>
          <textarea
            id="relatedProgress"
            name="relatedProgress" // Necesario para handleInputChange
            rows={3}
            className="mt-2 block w-full text-sm text-gray-700 whitespace-pre-wrap border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary p-2"
            value={editedActa.relatedProgress || ""} // Usa el estado local
            onChange={handleInputChange} // Permite edición
          />
        </div>

        {/* Archivos Adjuntos */}
        <div>
          <h4 className="text-md font-semibold text-gray-800">
            Archivos Adjuntos
          </h4>
          {(editedActa.attachments || []).length > 0 ? (
            <ul className="mt-2 space-y-2">
              {(editedActa.attachments || []).map((att) => (
                <AttachmentItem key={att.id} attachment={att} />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-gray-500">No hay archivos adjuntos.</p>
          )}
          
          {/* Formulario para agregar adjuntos */}
          <div className="mt-4 pt-4 border-t">
            <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
              Adjuntar Documentos
            </label>
            <input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
              disabled={isUploadingAttachments}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-primary file:text-white hover:file:bg-brand-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {uploadError && (
              <p className="mt-2 text-xs text-red-600">{uploadError}</p>
            )}
            {selectedFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  {selectedFiles.length} archivo(s) seleccionado(s):
                </p>
                <ul className="mt-1 space-y-1 text-xs text-gray-500">
                  {selectedFiles.map((file, index) => (
                    <li key={index}>• {file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                  ))}
                </ul>
                <Button
                  type="button"
                  onClick={handleUploadAttachments}
                  disabled={isUploadingAttachments || selectedFiles.length === 0}
                  size="sm"
                  className="mt-2"
                >
                  {isUploadingAttachments ? "Subiendo..." : "Subir Archivos"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Observaciones (Muestra las del estado local 'editedActa') */}
        <div>
            <h4 className="text-md font-semibold text-gray-800">Observaciones</h4>
            {/* Asegúrate que observations sea un array antes de mapear */}
            {(editedActa.observations || []).length > 0 ? (
                <div className="mt-2 space-y-4 max-h-40 overflow-y-auto pr-2">
                    {/* Mapea sobre editedActa.observations OR [] */}
                    {(editedActa.observations || []).map((obs) => (
                        <div key={obs.id} className="flex items-start space-x-3 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                            {/* --- COMPROBACIÓN AQUÍ --- */}
                            {obs.author ? (
                                <img
                                    src={obs.author.avatarUrl}
                                    alt={obs.author.fullName}
                                    className="h-8 w-8 rounded-full object-cover"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">?</div>
                            )}
                            <div className="flex-1">
                                <div className="text-sm">
                                    {/* --- Y AQUÍ --- */}
                                    <span className="font-semibold text-gray-900">
                                        {obs.author ? obs.author.fullName : 'Usuario Desconocido'}
                                    </span>
                                    <span className="text-gray-500 ml-2 text-xs">
                                        {new Date(obs.timestamp).toLocaleString("es-CO")}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700">{obs.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="mt-2 text-sm text-gray-500">No hay observaciones registradas.</p>
            )}

            {/* Formulario para Nueva Observación */}
            <form onSubmit={handleAddObservation} className="mt-4 pt-4 border-t">
                <label htmlFor="newObservation" className="block text-sm font-medium text-gray-700 mb-1">Añadir Observación</label>
                <textarea
                    id="newObservation"
                    rows={2}
                    className="block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    placeholder="Escribe tu observación aquí..."
                    value={newObservation}
                    onChange={(e) => setNewObservation(e.target.value)}
                    required
                />
                {observationError && <p className="text-xs text-red-600 mt-1">{observationError}</p>}
                <div className="mt-2 flex justify-end">
                    <Button type="submit" size="sm" disabled={!newObservation.trim() || isSubmittingObservation}>
                        {isSubmittingObservation ? "Guardando..." : "Añadir Observación"}
                    </Button>
                </div>
            </form>
        </div>

        {/* Actualizar Estado */}
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-2">
            Actualizar Estado
          </h4>
          <Select
            id="status"
            value={editedActa.status} // Usa el estado local
            onChange={(e) =>
              // Actualiza el estado local directamente
              handleStatusChange(e.target.value as CostActaStatus)
            }
          >
            {/* Muestra las opciones directamente del enum/strings */}
            {Object.values(CostActaStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {/* Footer del Modal */}
      <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSaveChanges}>
          Guardar Cambios
        </Button>
      </div>
    </Modal>
  );
};

export default CostActaDetailModal;
