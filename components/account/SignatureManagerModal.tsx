import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useToast } from "../ui/ToastProvider";
import api from "../../src/services/api";
import { UserSignature } from "../../types";

interface SignatureManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SignatureManagerModal: React.FC<SignatureManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [signature, setSignature] = useState<UserSignature | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      return;
    }
    const fetchSignature = async () => {
      setIsLoading(true);
      try {
        const response = await api.userSignature.get();
        setSignature(response.signature);
      } catch (error) {
        console.error("No se pudo cargar la firma del usuario", error);
        showToast({
          variant: "error",
          title: "Error",
          message: "No se pudo cargar tu firma guardada.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSignature();
  }, [isOpen, showToast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showToast({
        variant: "warning",
        title: "Selecciona un archivo",
        message: "Debes seleccionar un archivo PNG, JPG o PDF para continuar.",
      });
      return;
    }
    setIsUploading(true);
    try {
      const response = await api.userSignature.upload(selectedFile);
      setSignature(response.signature);
      setSelectedFile(null);
      showToast({
        variant: "success",
        title: "Firma actualizada",
        message: "Tu firma manuscrita se guardó correctamente.",
      });
    } catch (error) {
      console.error("Error subiendo la firma", error);
      showToast({
        variant: "error",
        title: "Error",
        message: "No se pudo guardar tu firma. Intenta nuevamente.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!signature) return;
    if (!window.confirm("¿Seguro que deseas eliminar tu firma registrada?")) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.userSignature.remove();
      setSignature(null);
      showToast({
        variant: "success",
        title: "Firma eliminada",
        message: "Tu firma se eliminó correctamente.",
      });
    } catch (error) {
      console.error("Error eliminando la firma", error);
      showToast({
        variant: "error",
        title: "Error",
        message: "No se pudo eliminar tu firma. Intenta nuevamente.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderPreview = () => {
    if (!signature) {
      return (
        <p className="text-sm text-gray-600">
          Aún no has guardado una firma. Sube un archivo PNG/JPG con fondo
          transparente o un PDF que contenga únicamente tu rúbrica.
        </p>
      );
    }

    if (signature.mimeType === "application/pdf") {
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">
            Tienes registrada una firma en PDF. Puedes descargarla para
            verificarla:
          </p>
          <a
            href={signature.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:text-brand-secondary text-sm font-medium"
          >
            Ver firma PDF
          </a>
        </div>
      );
    }

    return (
      <div>
        <p className="text-sm text-gray-600 mb-2">
          Vista previa de tu firma actual:
        </p>
        <img
          src={signature.url}
          alt="Firma manuscrita"
          className="max-h-32 border rounded-md shadow-sm bg-white p-2"
        />
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mi firma manuscrita">
      <div className="space-y-4 text-sm text-gray-700">
        <p>
          Utiliza esta sección para registrar la imagen de tu firma manuscrita.
          Se utilizará cuando firmes documentos PDF dentro de la Bitácora
          Digital.
        </p>

        {isLoading ? (
          <p>Cargando...</p>
        ) : (
          <div className="space-y-3">{renderPreview()}</div>
        )}

        <div className="space-y-2">
          <label className="block font-medium text-gray-700">
            Subir nueva firma
          </label>
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"
          />
          {selectedFile && (
            <p className="text-xs text-gray-500">
              Archivo seleccionado: {selectedFile.name} (
              {(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? "Guardando..." : "Guardar firma"}
            </Button>
          </div>
          {signature && (
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar firma"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SignatureManagerModal;
