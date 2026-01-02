import React, { useState, useEffect } from 'react';
import { SignatureConsentPayload, User } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import ProgressIndicator from './ui/ProgressIndicator';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    payload: SignatureConsentPayload
  ) => Promise<{ success: boolean; error?: string }>;
  userToSign: User;
  consentStatement?: string;
}
export const DEFAULT_SIGNATURE_CONSENT_STATEMENT =
  'El usuario consiente el uso de su firma manuscrita digital para este documento.';

const SIGNATURE_STEPS = [
  { message: 'Iniciando proceso de firma...', percentage: 10 },
  { message: 'Validando credenciales...', percentage: 25 },
  { message: 'Cargando PDF base...', percentage: 40 },
  { message: 'Aplicando firma manuscrita...', percentage: 65 },
  { message: 'Guardando documento firmado...', percentage: 85 },
  { message: '¡Firma completada!', percentage: 100 },
];

const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userToSign,
  consentStatement,
}) => {
  const [password, setPassword] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const effectiveConsentStatement =
    (consentStatement && consentStatement.trim()) ||
    DEFAULT_SIGNATURE_CONSENT_STATEMENT;

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setPassword('');
        setIsAgreed(false);
        setError(null);
        setIsSigning(false);
        setCurrentStep(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const simulateProgress = async (callback: () => Promise<any>) => {
    const delays = [200, 300, 400, 500, 300]; 
    
    for (let i = 0; i < SIGNATURE_STEPS.length - 1; i++) {
      setCurrentStep(i);
      
      // Execute actual signing on step 3 (applying signature)
      if (i === 3) {
        await callback();
      } else {
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
    
    // Final step
    setCurrentStep(SIGNATURE_STEPS.length - 1);
    await new Promise(resolve => setTimeout(resolve, 400));
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSigning(true);
    setCurrentStep(0);

    try {
      await simulateProgress(async () => {
        const result = await onConfirm({
          password,
          consent: isAgreed,
          consentStatement: effectiveConsentStatement,
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Ocurrió un error inesperado.');
        }
      });
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
      setIsSigning(false);
      setCurrentStep(0);
    }
  };

  const canSign = password.trim() !== '' && isAgreed;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmación de Firma Electrónica" size="md">
      <div className="space-y-4">
        {!isSigning ? (
          <>
            <p className="text-sm text-gray-600">
              Yo, <strong className="font-semibold text-gray-800">{userToSign.fullName}</strong>, confirmo que he revisado este documento y estoy de acuerdo con su contenido. Entiendo que esta acción es legalmente vinculante y equivale a mi firma manuscrita.
            </p>
            <p className="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded p-2">
              {effectiveConsentStatement}
            </p>

            <Input
              label="Confirma tu contraseña para firmar"
              id="signature-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="agreement"
                  name="agreement"
                  type="checkbox"
                  className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="agreement" className="font-medium text-gray-700 cursor-pointer">
                  Acepto y firmo electrónicamente este documento.
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="py-8">
            <ProgressIndicator
              currentStep={currentStep}
              steps={SIGNATURE_STEPS}
              className="mb-4"
            />
            <p className="text-center text-sm text-gray-500 mt-4">
              Por favor espera mientras procesamos tu firma...
            </p>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={isSigning}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} disabled={!canSign || isSigning}>
          {isSigning ? 'Firmando...' : 'Firmar y Aceptar'}
        </Button>
      </div>
    </Modal>
  );
};

export default SignatureModal;
