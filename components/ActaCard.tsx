import React from 'react';
import { Acta, CommitmentStatus } from '../types';
import Card from './ui/Card';
import ActaStatusBadge from './ActaStatusBadge';
import { CalendarIcon, ClipboardDocumentListIcon } from './icons/Icon';
import ActaAreaBadge from './ActaAreaBadge';

interface ActaCardProps {
  acta: Acta;
  onSelect: (acta: Acta) => void;
}

const ActaCard: React.FC<ActaCardProps> = ({ acta, onSelect }) => {
  const meetingDate = new Date(acta.date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const pendingCommitments = acta.commitments.filter(
    (c) => c.status === CommitmentStatus.PENDING
  ).length;

  return (
    <Card
      onClick={() => onSelect(acta)}
      className="flex flex-col cursor-pointer hover:shadow-xl hover:border-brand-primary/50 transition-all duration-200"
    >
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm font-semibold text-brand-primary">{acta.number}</p>
          <ActaStatusBadge status={acta.status} />
        </div>
        <div className="mt-2">
          <ActaAreaBadge area={acta.area} />
        </div>
        <h3 className="mt-2 text-lg font-bold text-gray-800 leading-tight">{acta.title}</h3>
        <p className="mt-2 text-sm text-gray-600 line-clamp-3 flex-grow">{acta.summary}</p>
      </div>
      <div className="border-t border-gray-100 bg-gray-50/50 p-4 text-xs text-gray-500 flex justify-between items-center">
        <div className="flex items-center">
          <CalendarIcon className="mr-1.5 h-4 w-4 text-gray-400" />
          <span>{meetingDate}</span>
        </div>
        {pendingCommitments > 0 && (
          <div className="flex items-center font-semibold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
            <ClipboardDocumentListIcon className="mr-1.5 h-4 w-4" />
            <span>{pendingCommitments} Compromiso(s) Pendiente(s)</span>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ActaCard;
