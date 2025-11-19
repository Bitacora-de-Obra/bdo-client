import React from 'react';
import { Change, User } from '../types';
import { ArrowLongRightIcon } from './icons/Icon';
import { getUserAvatarUrl } from '../src/utils/avatar';
import { renderCommentWithMentions } from '../src/utils/mentions';

interface ChangeHistoryProps {
  history?: Change[];
  users?: User[];
}

const ChangeDetail: React.FC<{ change: Change; users: User[] }> = ({ change, users }) => {
    const { fieldName, oldValue, newValue } = change;
    const normalizedField = fieldName?.toLowerCase() ?? '';
    const isCommentChange = normalizedField.includes('comentario');

    if (isCommentChange) {
        return (
            <div className="space-y-1 text-sm">
                {oldValue && oldValue.trim() && oldValue !== 'vacío' && (
                    <div className="text-red-500 line-through whitespace-pre-wrap break-words">
                        {renderCommentWithMentions(oldValue, users)}
                    </div>
                )}
                {newValue && (
                    <div className="text-green-600 font-medium whitespace-pre-wrap break-words">
                        {renderCommentWithMentions(newValue, users)}
                    </div>
                )}
            </div>
        );
    }

    if (fieldName === 'created') {
        return <span className="text-blue-600 font-medium truncate" title={newValue || ''}>{newValue || 'Anotación creada'}</span>;
    }
    if (fieldName === 'Adjunto Añadido') {
        return <span className="text-green-600 font-medium truncate" title={newValue}>Añadido: {newValue}</span>;
    }
    if (fieldName === 'Adjunto Eliminado') {
        return <span className="text-red-500 line-through truncate" title={oldValue}>Eliminado: {oldValue}</span>;
    }
    if (fieldName === 'Asignado Añadido') {
        return <span className="text-green-600 font-medium truncate" title={newValue}>Añadido: {newValue}</span>;
    }
    if (fieldName === 'Asignado Eliminado') {
        return <span className="text-red-500 line-through truncate" title={oldValue}>Eliminado: {oldValue}</span>;
    }

    // Default case for regular field changes
    return (
        <div className="flex items-center">
            <span className="text-red-500 line-through truncate" title={oldValue}>
                {oldValue ? renderCommentWithMentions(oldValue, users) : 'vacío'}
            </span>
            <ArrowLongRightIcon className="h-4 w-4 mx-2 text-gray-400 flex-shrink-0" />
            <span className="text-green-600 font-medium truncate" title={newValue}>
                {newValue ? renderCommentWithMentions(newValue, users) : 'vacío'}
            </span>
        </div>
    );
};


const ChangeHistory: React.FC<ChangeHistoryProps> = ({ history, users = [] }) => {
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
                <div className="mt-1 flex items-center text-xs text-gray-600 bg-white border rounded-md p-1.5">
                  <ChangeDetail change={change} users={users} />
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
