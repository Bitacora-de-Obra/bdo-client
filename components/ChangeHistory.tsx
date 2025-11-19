import React from 'react';
import { Change, User } from '../types';
import { UserCircleIcon, ArrowLongRightIcon } from './icons/Icon';
import { getUserAvatarUrl } from '../src/utils/avatar';
import { renderCommentWithMentions } from '../src/utils/mentions';

interface ChangeHistoryProps {
  history?: Change[];
  availableUsers?: User[];
}

const ChangeDetail: React.FC<{ change: Change; availableUsers?: User[] }> = ({ change, availableUsers = [] }) => {
    const { fieldName, oldValue, newValue } = change;

    // Función auxiliar para parsear menciones si el valor es un string
    const parseValue = (value: string | null | undefined): React.ReactNode => {
        if (!value || typeof value !== 'string') return null;
        // Verificar si el valor contiene menciones @[UUID]
        if (value.includes('@[') && availableUsers.length > 0) {
            return renderCommentWithMentions(value, availableUsers);
        }
        return value;
    };

    if (fieldName === 'created') {
        const parsedValue = parseValue(newValue) || 'Anotación creada';
        return <span className="text-blue-600 font-medium truncate" title={typeof newValue === 'string' ? newValue : ''}>{parsedValue}</span>;
    }
    if (fieldName === 'Adjunto Añadido') {
        const parsedValue = parseValue(newValue);
        const displayValue = parsedValue !== null ? parsedValue : newValue;
        return <span className="text-green-600 font-medium truncate" title={typeof newValue === 'string' ? newValue : undefined}>Añadido: {displayValue}</span>;
    }
    if (fieldName === 'Adjunto Eliminado') {
        const parsedValue = parseValue(oldValue);
        const displayValue = parsedValue !== null ? parsedValue : oldValue;
        return <span className="text-red-500 line-through truncate" title={typeof oldValue === 'string' ? oldValue : undefined}>Eliminado: {displayValue}</span>;
    }
    if (fieldName === 'Asignado Añadido') {
        const parsedValue = parseValue(newValue);
        const displayValue = parsedValue !== null ? parsedValue : newValue;
        return <span className="text-green-600 font-medium truncate" title={typeof newValue === 'string' ? newValue : undefined}>Añadido: {displayValue}</span>;
    }
    if (fieldName === 'Asignado Eliminado') {
        const parsedValue = parseValue(oldValue);
        const displayValue = parsedValue !== null ? parsedValue : oldValue;
        return <span className="text-red-500 line-through truncate" title={typeof oldValue === 'string' ? oldValue : undefined}>Eliminado: {displayValue}</span>;
    }

    // Default case for regular field changes (especialmente "Comentario Añadido")
    const parsedOldValue = parseValue(oldValue);
    const parsedNewValue = parseValue(newValue);
    const displayOldValue = parsedOldValue !== null ? parsedOldValue : (oldValue || 'vacío');
    const displayNewValue = parsedNewValue !== null ? parsedNewValue : (newValue || 'vacío');
    
    return (
        <div className="flex items-center flex-wrap gap-2">
            <span className="text-red-500 line-through truncate" title={typeof oldValue === 'string' ? oldValue : undefined}>
                {displayOldValue}
            </span>
            <ArrowLongRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-green-600 font-medium truncate" title={typeof newValue === 'string' ? newValue : undefined}>
                {displayNewValue}
            </span>
        </div>
    );
};


const ChangeHistory: React.FC<ChangeHistoryProps> = ({ history, availableUsers = [] }) => {
  if (!history || history.length === 0) {
    return (
        <div>
            <h4 className="text-md font-semibold text-gray-800">Historial de Cambios</h4>
            <p className="mt-2 text-sm text-gray-500">No se han registrado modificaciones en esta anotación.</p>
        </div>
    );
  }

  return (
    <div>
      <h4 className="text-md font-semibold text-gray-800">Historial de Cambios</h4>
      <div className="mt-2 space-y-4 max-h-48 overflow-y-auto border p-3 rounded-lg bg-gray-50/70">
        {history.slice().reverse().map(change => (
          <div key={change.id} className="flex items-start space-x-3">
            <img src={getUserAvatarUrl(change.user)} alt={change.user.fullName} className="h-8 w-8 rounded-full object-cover"/>
            <div className="flex-1 text-sm">
                <p className="text-gray-800">
                    <span className="font-semibold">{change.user.fullName}</span>
                    {change.fieldName === 'created' ? (
                       <span className="text-gray-500"> creó esta anotación.</span>
                    ) : change.fieldName.startsWith('Adjunto') ? (
                       <span className="text-gray-500"> gestionó un archivo adjunto.</span>
                    ) : change.fieldName.startsWith('Asignado') ? (
                       <span className="text-gray-500"> actualizó las asignaciones.</span>
                    ) : (
                       <>
                         <span className="text-gray-500"> modificó el campo </span>
                         <span className="font-semibold">"{change.fieldName}"</span>.
                       </>
                    )}
                </p>
                <div className="mt-1 text-xs text-gray-600 bg-white border rounded-md p-1.5">
                  <ChangeDetail change={change} availableUsers={availableUsers} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{new Date(change.timestamp).toLocaleString('es-CO')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChangeHistory;