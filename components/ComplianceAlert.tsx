
import React from 'react';
// Fix: Corrected import path for types
import { Communication, CommunicationStatus } from '../types';
// Fix: Corrected import path for icons
import { ExclamationTriangleIcon, CheckCircleIcon } from './icons/Icon';

interface ComplianceAlertProps {
  communication: Communication;
}

const getAlertInfo = (dueDateStr?: string | null, status?: CommunicationStatus, requiresResponse?: boolean) => {
  if (!requiresResponse) {
    return null;
  }

  if (!dueDateStr || status === CommunicationStatus.RESUELTO) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
  const dueDate = new Date(dueDateStr);
  
  // The dueDate from a date input is at midnight UTC. Adjust for timezone to avoid off-by-one errors.
  const localDueDate = new Date(dueDate.valueOf() + dueDate.getTimezoneOffset() * 60 * 1000);
  localDueDate.setHours(0,0,0,0);

  const timeLeft = localDueDate.getTime() - today.getTime();
  const daysLeft = Math.round(timeLeft / (1000 * 60 * 60 * 24));

  let level: 'green' | 'yellow' | 'red';
  let recommendation: string;
  let message: string;

  if (daysLeft > 7) {
    level = 'green';
    recommendation = 'No se requiere acción inmediata.';
    message = `Vence en ${daysLeft} días`;
  } else if (daysLeft >= 3) {
    level = 'yellow';
    recommendation = 'Enviar recordatorio al responsable.';
    message = `Vence en ${daysLeft} días`;
  } else if (daysLeft >= 0) {
    level = 'red';
    recommendation = 'Escalar al superior / marcar como urgente.';
    message = `Vence ${daysLeft === 0 ? 'hoy' : `en ${daysLeft} día(s)`}`;
  } else {
    level = 'red';
    recommendation = 'Escalar al superior / marcar como urgente.';
    message = `Vencido hace ${Math.abs(daysLeft)} día(s)`;
  }

  return { level, recommendation, message };
};


const ComplianceAlert: React.FC<ComplianceAlertProps> = ({ communication }) => {
  const alertInfo = getAlertInfo(communication.responseDueDate, communication.status, communication.requiresResponse);

  if (!alertInfo) {
    return null;
  }

  const { level, recommendation, message } = alertInfo;

  const styleMap = {
    green: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />
    },
    yellow: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
    },
    red: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
    },
  };
  
  const styles = styleMap[level];

  return (
    <div className={`p-4 rounded-lg border ${styles.bg} ${styles.text}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {styles.icon}
        </div>
        <div className="ml-3">
          <h3 className="text-md font-bold">Alerta de Cumplimiento: {message}</h3>
          <div className="mt-1 text-sm">
            <p><span className="font-semibold">Acción Sugerida:</span> {recommendation}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceAlert;
