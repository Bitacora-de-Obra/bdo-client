import React, { useMemo } from 'react';
import { User, Signature, SignatureTask, SignatureSummary } from '../types';
import Button from './ui/Button';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, PencilSquareIcon } from './icons/Icon';

interface SignatureBlockProps {
  requiredSignatories?: User[]; // Hacer opcional
  signatures?: Signature[];    // Hacer opcional
  signatureTasks?: SignatureTask[];
  signatureSummary?: SignatureSummary;
  currentUser: User;
  onSignRequest: () => void;
  documentType: string;
}

const statusLabels: Record<SignatureTask['status'], string> = {
  PENDING: 'Pendiente de firma',
  SIGNED: 'Firmado',
  DECLINED: 'Rechazado',
  CANCELLED: 'Cancelado',
};

const statusColors: Record<SignatureTask['status'], string> = {
  PENDING: 'text-amber-600',
  SIGNED: 'text-green-600',
  DECLINED: 'text-red-600',
  CANCELLED: 'text-gray-500',
};

const statusIcon = (status: SignatureTask['status']) => {
  if (status === 'SIGNED') {
    return <CheckCircleIcon className="h-5 w-5" />;
  }
  if (status === 'PENDING') {
    return <ClockIcon className="h-5 w-5" />;
  }
  return <ExclamationTriangleIcon className="h-5 w-5" />;
};

const SignatureBlock: React.FC<SignatureBlockProps> = ({
  requiredSignatories = [],
  signatures = [],
  signatureTasks = [],
  signatureSummary,
  currentUser,
  onSignRequest,
  documentType,
}) => {
  const signaturesById = useMemo(() => {
    const map = new Map<string, Signature>();
    signatures.forEach((signature) => {
      map.set(signature.signer.id, signature);
    });
    return map;
  }, [signatures]);

  const displayParticipants = useMemo(() => {
    type Participant = {
      id: string;
      fullName: string;
      projectRole?: string;
      status: SignatureTask['status'];
      signedAt?: string;
      avatarUrl?: string;
    };

    const participants = new Map<string, Participant>();

    const registerParticipant = (participant: Participant) => {
      if (!participant.id) {
        return;
      }
      const existing = participants.get(participant.id);
      if (existing) {
        if (participant.status === 'SIGNED' && existing.status !== 'SIGNED') {
          participants.set(participant.id, { ...existing, ...participant });
        }
        return;
      }
      participants.set(participant.id, participant);
    };

    signatureTasks
      .filter((task): task is SignatureTask & { signer: User } => Boolean(task?.signer))
      .forEach((task) => {
        const signatureRecord = task.signer ? signaturesById.get(task.signer.id) : undefined;
        registerParticipant({
          id: task.signer.id,
          fullName: task.signer.fullName,
          projectRole: task.signer.projectRole,
          avatarUrl: task.signer.avatarUrl,
          status: task.status,
          signedAt: task.signedAt || signatureRecord?.signedAt,
        });
      });

    if (participants.size === 0) {
      requiredSignatories.forEach((user) => {
        const signatureRecord = signaturesById.get(user.id);
        registerParticipant({
          id: user.id,
          fullName: user.fullName,
          projectRole: user.projectRole,
          avatarUrl: user.avatarUrl,
          status: signatureRecord ? 'SIGNED' : 'PENDING',
          signedAt: signatureRecord?.signedAt,
        });
      });
    }

    signatures.forEach((signature) => {
      registerParticipant({
        id: signature.signer.id,
        fullName: signature.signer.fullName,
        projectRole: signature.signer.projectRole,
        avatarUrl: signature.signer.avatarUrl,
        status: 'SIGNED',
        signedAt: signature.signedAt,
      });
    });

    return Array.from(participants.values());
  }, [requiredSignatories, signatureTasks, signatures, signaturesById]);

  const canCurrentUserSign = useMemo(() => {
    const hasPendingTask = signatureTasks.some(
      (task) =>
        task.signer?.id === currentUser.id &&
        task.status === 'PENDING'
    );
    if (hasPendingTask) {
      return true;
    }

    if (signatureTasks.length > 0) {
      return false;
    }

    const isRequired = requiredSignatories.some(
      (signer) => signer.id === currentUser.id
    );
    const alreadySigned = signaturesById.has(currentUser.id);
    return isRequired && !alreadySigned;
  }, [currentUser.id, requiredSignatories, signatureTasks, signaturesById]);

  if (displayParticipants.length === 0) {
    return null;
  }

  return (
    <div className="pt-4">
      <h4 className="text-md font-semibold text-gray-800">Firmas del Documento</h4>
      {signatureSummary && signatureSummary.total > 0 && (
        <p className="mt-1 text-sm text-gray-600">
          {signatureSummary.completed
            ? 'Todas las firmas se registraron correctamente.'
            : `Firmas completadas: ${signatureSummary.signed} de ${signatureSummary.total}.`}
        </p>
      )}
      <div className="mt-3 space-y-3 p-4 border rounded-lg bg-gray-50/70">
        {displayParticipants.map((participant) => {
          const statusLabel = statusLabels[participant.status] || participant.status;
          const statusClass = statusColors[participant.status] || 'text-gray-500';
          return (
            <div key={participant.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center">
                {participant.avatarUrl ? (
                  <img
                    src={participant.avatarUrl}
                    alt={participant.fullName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {participant.fullName
                      .split(' ')
                      .map((chunk) => chunk[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div className="ml-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {participant.fullName}
                  </p>
                  {participant.projectRole && (
                    <p className="text-xs text-gray-500">{participant.projectRole}</p>
                  )}
                </div>
              </div>
              <div className={`flex items-center gap-1.5 ${statusClass}`}>
                {statusIcon(participant.status)}
                <div className="text-right">
                  <p className="text-sm font-semibold">{statusLabel}</p>
                  {participant.signedAt && (
                    <p className="text-xs text-gray-500">
                      {new Date(participant.signedAt).toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {canCurrentUserSign && (
        <div className="mt-4 flex justify-end">
          <Button onClick={onSignRequest} leftIcon={<PencilSquareIcon />}>
            Firmar {documentType}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SignatureBlock;
