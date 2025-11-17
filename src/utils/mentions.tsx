import React from 'react';
import { User } from '../../types';

/**
 * Renderiza el contenido de un comentario reemplazando menciones @[userId] 
 * con badges destacados que muestran el nombre del usuario
 */
export const renderCommentWithMentions = (
  content: string,
  availableUsers: User[]
): React.ReactNode => {
  // Patrón para encontrar menciones: @[userId]
  const mentionPattern = /@\[([a-f0-9-]+)\]/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyCounter = 0;

  while ((match = mentionPattern.exec(content)) !== null) {
    // Agregar texto antes de la mención
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(textBefore);
      }
    }

    // Buscar el usuario mencionado
    const userId = match[1];
    const mentionedUser = availableUsers.find((u) => u.id === userId);

    if (mentionedUser) {
      // Renderizar mención como badge destacado
      parts.push(
        <span
          key={`mention-${keyCounter++}`}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
          title={`Mencionado: ${mentionedUser.fullName}`}
        >
          @{mentionedUser.fullName}
        </span>
      );
    } else {
      // Si no se encuentra el usuario, mostrar el ID original
      parts.push(
        <span
          key={`mention-${keyCounter++}`}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600"
        >
          @[Usuario no encontrado]
        </span>
      );
    }

    lastIndex = mentionPattern.lastIndex;
  }

  // Agregar texto restante después de la última mención
  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      parts.push(remainingText);
    }
  }

  // Si no hay menciones, retornar el contenido original
  return parts.length > 0 ? parts : content;
};


