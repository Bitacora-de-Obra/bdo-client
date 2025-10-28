import React from "react";
import { ContractModification, ModificationType } from "../types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { DocumentArrowDownIcon } from "./icons/Icon";

interface ContractModificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  modification: ContractModification;
}

const formatValue = (mod: ContractModification) => {
  if (mod.type === ModificationType.ADDITION && mod.value !== undefined) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(mod.value);
  }

  if (mod.type === ModificationType.TIME_EXTENSION && mod.days !== undefined) {
    return `${mod.days} día${mod.days === 1 ? "" : "s"}`;
  }

  return "—";
};

const ContractModificationDetailModal: React.FC<ContractModificationDetailModalProps> = ({
  isOpen,
  onClose,
  modification,
}) => {
  const handleDownload = () => {
    const url = modification.attachment?.downloadUrl || modification.attachment?.url;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const attachmentAvailable = Boolean(modification.attachment?.url || modification.attachment?.downloadUrl);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle Modificatorio · ${modification.number}`}
      size="lg"
    >
      <div className="space-y-4 text-sm text-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="font-semibold text-gray-900">Tipo</p>
            <p>{modification.type}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Fecha</p>
            <p>{new Date(modification.date).toLocaleDateString("es-CO")}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Valor / Días</p>
            <p>{formatValue(modification)}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Identificador</p>
            <p className="font-mono text-xs text-gray-500">{modification.id}</p>
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-900 mb-1">Justificación</p>
          <p className="whitespace-pre-wrap leading-relaxed text-gray-800">
            {modification.justification}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Soporte</p>
            <p className="text-gray-600">
              {attachmentAvailable
                ? modification.attachment?.fileName || "Archivo adjunto"
                : "Sin soporte adjunto"}
            </p>
          </div>
          {attachmentAvailable && (
            <Button
              type="button"
              onClick={handleDownload}
              leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
            >
              Descargar
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ContractModificationDetailModal;
