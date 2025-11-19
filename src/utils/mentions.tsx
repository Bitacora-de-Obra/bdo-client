import React from 'react';
import { User } from '../../types';

export const MENTION_ID_MARKER = '\u2063'; // Invisible separator to keep IDs hidden while typing

const ZERO_WIDTH_BASE_CHARS = ['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF'];
const ZERO_WIDTH_CHAR_SET = new Set(ZERO_WIDTH_BASE_CHARS);
const ZERO_WIDTH_COMBINATIONS = ZERO_WIDTH_BASE_CHARS.flatMap((first) =>
  ZERO_WIDTH_BASE_CHARS.map((second) => first + second)
);
const SUPPORTED_ID_CHARS = '0123456789abcdef-';

const ZERO_WIDTH_ENCODE_MAP: Record<string, string> = {};
const ZERO_WIDTH_DECODE_MAP: Record<string, string> = {};

SUPPORTED_ID_CHARS.split('').forEach((char, index) => {
  const combo = ZERO_WIDTH_COMBINATIONS[index];
  ZERO_WIDTH_ENCODE_MAP[char] = combo;
  ZERO_WIDTH_DECODE_MAP[combo] = char;
});

const escapeRegex = (value: string) => value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

const isZeroWidthEncoded = (value: string) =>
  value.length > 0 && [...value].every((char) => ZERO_WIDTH_CHAR_SET.has(char));

const decodeZeroWidthIdentifier = (value: string): string | null => {
  if (!value) return null;
  if (!isZeroWidthEncoded(value)) {
    return value;
  }

  if (value.length % 2 !== 0) {
    return value;
  }

  let decoded = '';
  for (let i = 0; i < value.length; i += 2) {
    const chunk = value.slice(i, i + 2);
    const mapped = ZERO_WIDTH_DECODE_MAP[chunk];
    if (!mapped) {
      return value;
    }
    decoded += mapped;
  }

  return decoded;
};

export const encodeMentionIdentifier = (userId: string): string => {
  if (!userId) return '';
  return userId
    .split('')
    .map((char) => ZERO_WIDTH_ENCODE_MAP[char] ?? char)
    .join('');
};

/**
 * Convierte el contenido que usa marcadores invisibles (para la caja de texto)
 * al formato persistido @[userId] antes de enviarlo al backend.
 */
export const convertInputMentionsToPayload = (content: string): string => {
  if (!content) return '';

  const marker = escapeRegex(MENTION_ID_MARKER);
  const pattern = new RegExp(`@([^${marker}]*)${marker}([^${marker}]+)${marker}`, 'gi');
  return content
    .replace(pattern, (_match, _displayName, encodedId) => {
      const userId = decodeZeroWidthIdentifier(encodedId) ?? encodedId;
      return `@[${userId}]`;
    })
    .replace(new RegExp(marker, 'g'), '');
};

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


