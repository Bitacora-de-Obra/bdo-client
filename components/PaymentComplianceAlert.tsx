import React from 'react';
import { CostActa, CostActaStatus } from '../types';
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from './icons/Icon';

interface PaymentComplianceAlertProps {
  acta: CostActa;
}

const getAlertInfo = (paymentDueDateStr?: string | null, status?: CostActaStatus) => {
  if (!paymentDueDateStr || status === CostActaStatus.PAID) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const dueDate = new Date(paymentDueDateStr);
  
  const localDueDate = new Date(dueDate.valueOf() + dueDate.getTimezoneOffset() * 60 * 1000);
  localDueDate.setHours(0,0,0,0);

  const timeLeft = localDueDate.getTime() - today.getTime();
  const daysLeft = Math.round(timeLeft / (1000 * 60 * 60 * 24));

  let level: 'green' | 'yellow' | 'red';
  let message: string;

  if (daysLeft > 10) {
    level = 'green';
    message = `Pago vence en ${daysLeft} días`;
  } else if (daysLeft >= 0) {
    level = 'yellow';
    message = `Pago vence ${daysLeft === 0 ? 'hoy' : `en ${daysLeft} día(s)`}`;
  } else {
    level = 'red';
    message = `Pago vencido hace ${Math.abs(daysLeft)} día(s)`;
  }

  return { level, message };
};


const PaymentComplianceAlert: React.FC<PaymentComplianceAlertProps> = ({ acta }) => {
  const alertInfo = getAlertInfo(acta.paymentDueDate, acta.status);

  if (!alertInfo) {
    return null;
  }

  const { level, message } = alertInfo;

  const styleMap = {
    green: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: <ClockIcon className="h-6 w-6 text-green-500" />
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
          <h3 className="text-md font-bold">Alerta de Plazo de Pago: {message}</h3>
          <div className="mt-1 text-sm">
            <p>La entidad contratante tiene un plazo contractual para realizar el pago a partir de la fecha de aprobación del acta.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentComplianceAlert;