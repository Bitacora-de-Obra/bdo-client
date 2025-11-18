import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
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
  const [password, setPassword] = useState("");
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedSignatureUrl, setDecryptedSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPassword("");
      setShowPasswordInput(false);
      setDecryptedSignatureUrl(null);
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
    
    if (!password || password.trim() === "") {
      showToast({
        variant: "warning",
        title: "Contraseña requerida",
        message: "Debes ingresar tu contraseña para proteger tu firma.",
      });
      return;
    }

    setIsUploading(true);
    try {
      const response = await api.userSignature.upload(selectedFile, password);
      setSignature(response.signature);
      setSelectedFile(null);
      setPassword("");
      setShowPasswordInput(false);
      setDecryptedSignatureUrl(null);
      showToast({
        variant: "success",
        title: "Firma actualizada",
        message: response.message || "Tu firma manuscrita se guardó y encriptó correctamente. Solo tú puedes acceder a ella con tu contraseña.",
      });
    } catch (error: any) {
      console.error("Error subiendo la firma", error);
      const errorMessage = error?.message || "No se pudo guardar tu firma. Intenta nuevamente.";
      showToast({
        variant: "error",
        title: "Error",
        message: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDecryptSignature = async () => {
    if (!password || password.trim() === "") {
      showToast({
        variant: "warning",
        title: "Contraseña requerida",
        message: "Debes ingresar tu contraseña para ver tu firma.",
      });
      return;
    }

    setIsDecrypting(true);
    try {
      const response = await api.userSignature.decrypt(password);
      setDecryptedSignatureUrl(response.signature.dataUrl);
      showToast({
        variant: "success",
        title: "Firma desencriptada",
        message: "Tu firma se cargó correctamente.",
      });
    } catch (error: any) {
      console.error("Error desencriptando la firma", error);
      const errorMessage = error?.message || "Contraseña incorrecta o no se pudo desencriptar la firma.";
      showToast({
        variant: "error",
        title: "Error",
        message: errorMessage,
      });
      setDecryptedSignatureUrl(null);
    } finally {
      setIsDecrypting(false);
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

    // Si hay una firma desencriptada, mostrarla
    if (decryptedSignatureUrl) {
      if (signature.mimeType === "application/pdf") {
        return (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-600 mb-2">
              Vista previa de tu firma (desencriptada):
            </p>
            <iframe
              src={decryptedSignatureUrl}
              className="max-h-32 border rounded-md shadow-sm bg-white"
              title="Vista previa de firma PDF"
            />
          </div>
        );
      }

      return (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Vista previa de tu firma (desencriptada):
          </p>
          <img
            src={decryptedSignatureUrl}
            alt="Firma manuscrita"
            className="max-h-32 border rounded-md shadow-sm bg-white p-2"
          />
        </div>
      );
    }

    // Si no está desencriptada, mostrar opción para desencriptar
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Tienes una firma guardada y protegida con encriptación. Para verla, ingresa tu contraseña.
        </p>
        {!showPasswordInput ? (
          <Button
            variant="secondary"
            onClick={() => setShowPasswordInput(true)}
          >
            Ver mi firma
          </Button>
        ) : (
          <div className="space-y-2">
            <Input
              label="Contraseña para desencriptar tu firma"
              id="decrypt-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleDecryptSignature}
                disabled={!password || isDecrypting}
              >
                {isDecrypting ? "Desencriptando..." : "Ver firma"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPasswordInput(false);
                  setPassword("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
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
            <>
              <p className="text-xs text-gray-500">
                Archivo seleccionado: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
              <div className="mt-2">
                <Input
                  label="Contraseña para proteger tu firma"
                  id="upload-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tu firma se encriptará con esta contraseña. Solo tú podrás acceder a ella.
                </p>
              </div>
            </>
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
