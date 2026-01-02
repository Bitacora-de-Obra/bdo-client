
import React from 'react';
// Fix: Corrected import path for types
import { EntryStatus } from '../../types';

interface BadgeProps {
  status: EntryStatus;
}

const statusColorMap: Record<string, string> = {
  // Spanish Enum Values
  [EntryStatus.APPROVED]: 'bg-status-green/10 text-status-green border border-status-green/20',
  [EntryStatus.NEEDS_REVIEW]: 'bg-status-yellow/10 text-status-yellow border border-status-yellow/20',
  [EntryStatus.SUBMITTED]: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  [EntryStatus.REJECTED]: 'bg-status-red/10 text-status-red border border-status-red/20',
  [EntryStatus.DRAFT]: 'bg-gray-400/10 text-gray-500 border border-gray-400/20',
  [EntryStatus.SIGNED]: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  
  // English Keys (API/DB)
  'APPROVED': 'bg-status-green/10 text-status-green border border-status-green/20',
  'NEEDS_REVIEW': 'bg-status-yellow/10 text-status-yellow border border-status-yellow/20',
  'SUBMITTED': 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  'REJECTED': 'bg-status-red/10 text-status-red border border-status-red/20',
  'DRAFT': 'bg-gray-400/10 text-gray-500 border border-gray-400/20',
  'SIGNED': 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',

  // Legacy/Alternate Spanish
  'Aprobado': 'bg-status-green/10 text-status-green border border-status-green/20',
  'Radicado': 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  'Firmada': 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
};

const statusLabelMap: Record<string, string> = {
  // Spanish Enum Values
  [EntryStatus.APPROVED]: 'Listo para firmas',
  [EntryStatus.NEEDS_REVIEW]: 'Revisión final',
  [EntryStatus.SUBMITTED]: 'Revisión contratista',
  [EntryStatus.REJECTED]: 'Rechazado',
  [EntryStatus.DRAFT]: 'Borrador',
  [EntryStatus.SIGNED]: 'Firmado',

  // English Keys (API/DB)
  'APPROVED': 'Listo para firmas',
  'NEEDS_REVIEW': 'Revisión final',
  'SUBMITTED': 'Revisión contratista',
  'REJECTED': 'Rechazado',
  'DRAFT': 'Borrador',
  'SIGNED': 'Firmado',

  // Legacy/Alternate Spanish
  'Aprobado': 'Listo para firmas',
  'Radicado': 'Revisión contratista',
  'Firmada': 'Firmado',
};


const Badge: React.FC<BadgeProps> = ({ status }) => {
  // Normalize status to ensure we catch string variations if needed, though the map covers most
  const lookupStatus = (typeof status === 'string' ? status : status) as string;
  
  const colorClasses = statusColorMap[lookupStatus] || 'bg-gray-200 text-gray-800';
  const label = statusLabelMap[lookupStatus] || status;
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses}`}
    >
      {label}
    </span>
  );
};

export default Badge;
