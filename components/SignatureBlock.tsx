import React, { useMemo } from 'react';
import { getUserAvatarUrl } from '../src/utils/avatar';
import { User, Signature, SignatureTask, SignatureSummary } from '../types';
import Button from './ui/Button';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, PencilSquareIcon } from './icons/Icon';

interface SignatureBlockProps {
  requiredSignatories?: User[]; // Hacer opcional
  signatures?: Signature[];    // Hacer opcional
  signatureTasks?: SignatureTask[];
  signatureSummary?: SignatureSummary;
  currentUser: User;
  onSignRequest?: () => void;
  documentType: string;
  readOnly?: boolean;
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

const statusPriority: Record<SignatureTask['status'], number> = {
  CANCELLED: 0,
  PENDING: 1,
  DECLINED: 2,
  SIGNED: 3,
};

const SignatureBlock: React.FC<SignatureBlockProps> = ({
  requiredSignatories = [],
  signatures = [],
  signatureTasks = [],
  signatureSummary,
  currentUser,
  onSignRequest,
  documentType,
  readOnly = false,
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
      cargo?: string;
      status: SignatureTask['status'];
      signedAt?: string;
      avatarUrl?: string;
    };

    const participants = new Map<string, Participant>();
    const orderMap = new Map<string, number>();

    signatureTasks
      .filter((task): task is SignatureTask & { signer: User } => Boolean(task?.signer))
      .forEach((task, index) => {
        if (task.signer?.id && !orderMap.has(task.signer.id)) {
          orderMap.set(task.signer.id, index);
        }
      });

    if (orderMap.size === 0) {
      requiredSignatories.forEach((user, index) => {
        if (user.id && !orderMap.has(user.id)) {
          orderMap.set(user.id, index);
        }
      });
    }

    const upsertParticipant = (participant: Participant) => {
      if (!participant.id) {
        return;
      }
      const existing = participants.get(participant.id);
      if (!existing) {
        participants.set(participant.id, participant);
        return;
      }

      // Las tareas de firma tienen prioridad sobre las firmas existentes
      // Si el participante nuevo viene de una tarea de firma (tiene status PENDING o SIGNED de tarea),
      // y el existente viene de una firma antigua, usar el status de la tarea
      // Si ambos vienen de tareas, usar el de mayor prioridad
      const shouldReplaceStatus =
        statusPriority[participant.status] > statusPriority[existing.status];

      participants.set(participant.id, {
        ...existing,
        ...participant,
        status: shouldReplaceStatus ? participant.status : existing.status,
        // Si el nuevo tiene signedAt, usarlo; si no, mantener el existente solo si el status es SIGNED
        signedAt: participant.signedAt ?? (existing.status === 'SIGNED' ? existing.signedAt : undefined),
        avatarUrl: participant.avatarUrl ?? existing.avatarUrl,
        projectRole: participant.projectRole ?? existing.projectRole,
        cargo: participant.cargo ?? existing.cargo,
      });
    };

    // Procesar primero las tareas de firma (tienen prioridad)
    signatureTasks
      .filter((task): task is SignatureTask & { signer: User } => Boolean(task?.signer))
      .forEach((task) => {
        const signatureRecord = task.signer ? signaturesById.get(task.signer.id) : undefined;
        // Si la tarea está firmada, usar signedAt de la tarea o de la firma
        // Si la tarea está pendiente, no usar signedAt (debe ser null/undefined)
        const signedAt = task.status === 'SIGNED' 
          ? (task.signedAt || signatureRecord?.signedAt || undefined)
          : undefined;
        
        upsertParticipant({
          id: task.signer.id,
          fullName: task.signer.fullName,
          projectRole: task.signer.projectRole,
          cargo: task.signer.cargo,
          avatarUrl: task.signer.avatarUrl,
          status: task.status,
          signedAt: signedAt,
        });
      });

    // Procesar firmas existentes solo si no hay una tarea de firma para ese usuario
    signatures.forEach((signature) => {
      // Verificar si ya hay una tarea de firma para este usuario
      const hasTask = signatureTasks.some(
        (task) => task.signer?.id === signature.signer.id
      );
      
      // Si ya hay una tarea de firma, no procesar la firma (la tarea tiene prioridad)
      if (hasTask) {
        return;
      }
      
      // Usar signatureTaskStatus si está disponible, de lo contrario determinar basándose en signedAt
      // IMPORTANTE: Si signedAt es null o undefined, NO está firmado
      const hasSignedAt = signature.signedAt && signature.signedAt !== null && signature.signedAt !== undefined;
      const status = signature.signatureTaskStatus || (hasSignedAt ? 'SIGNED' : 'PENDING');
      
      upsertParticipant({
        id: signature.signer.id,
        fullName: signature.signer.fullName,
        projectRole: signature.signer.projectRole,
        cargo: signature.signer.cargo,
        avatarUrl: signature.signer.avatarUrl,
        status: status as SignatureTask['status'],
        signedAt: hasSignedAt ? signature.signedAt : undefined,
      });
      if (!orderMap.has(signature.signer.id)) {
        orderMap.set(signature.signer.id, orderMap.size + participants.size);
      }
    });

    requiredSignatories.forEach((user) => {
      // Verificar si ya hay una tarea de firma o una firma procesada para este usuario
      const hasTask = signatureTasks.some(
        (task) => task.signer?.id === user.id
      );
      const hasSignature = participants.has(user.id);
      
      // Si ya hay una tarea o firma procesada, no procesar requiredSignatories
      if (hasTask || hasSignature) {
        return;
      }
      
      const signatureRecord = signaturesById.get(user.id);
      const hasSignedAt = signatureRecord?.signedAt && signatureRecord.signedAt !== null && signatureRecord.signedAt !== undefined;
      const status = signatureRecord?.signatureTaskStatus || (hasSignedAt ? 'SIGNED' : 'PENDING');
      
      upsertParticipant({
        id: user.id,
        fullName: user.fullName,
        projectRole: user.projectRole,
        cargo: user.cargo,
        avatarUrl: user.avatarUrl,
        status: status as SignatureTask['status'],
        signedAt: hasSignedAt ? signatureRecord.signedAt : undefined,
      });
      if (!orderMap.has(user.id)) {
        orderMap.set(user.id, orderMap.size + participants.size);
      }
    });

    const finalParticipants = Array.from(participants.values()).sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : Number.MAX_SAFE_INTEGER;
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.fullName.localeCompare(b.fullName, 'es');
    });

    return finalParticipants;
  }, [requiredSignatories, signatureTasks, signatures, signaturesById]);

  const canCurrentUserSign = useMemo(() => {
    if (readOnly || !onSignRequest) {
      return false;
    }
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
  }, [currentUser.id, onSignRequest, readOnly, requiredSignatories, signatureTasks, signaturesById]);

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
                <img
                  src={getUserAvatarUrl(participant)}
                  alt={participant.fullName}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="ml-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {participant.fullName}
                  </p>
                  {participant.cargo ? (
                    <p className="text-xs text-gray-500">{participant.cargo}</p>
                  ) : participant.projectRole ? (
                    <p className="text-xs text-gray-500">{participant.projectRole}</p>
                  ) : null}
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
      {canCurrentUserSign && onSignRequest && (
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
