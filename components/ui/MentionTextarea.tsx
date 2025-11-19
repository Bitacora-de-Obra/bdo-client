import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { getUserAvatarUrl } from '../../src/utils/avatar';
import { getFullRoleName } from '../../src/utils/roleDisplay';
import { convertInputMentionsToPayload, MENTION_ID_MARKER, renderCommentWithMentions } from '../../src/utils/mentions';

interface MentionTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  users: User[];
  placeholder?: string;
}

const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  users,
  placeholder = "Escribe tu comentario aquí...",
  className,
  style,
  ...props
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    // Buscar @ antes del cursor
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Verificar que no haya espacio entre @ y el cursor
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('[')) {
        const searchTerm = textAfterAt.toLowerCase();
        const filtered = users.filter(
          (user) =>
            user.fullName.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm)
        );

        if (filtered.length > 0) {
          setMentionStart(lastAtIndex);
          setSuggestions(filtered);
          setShowSuggestions(true);
          setSelectedIndex(0);
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }

    onChange(e);
  };

  const insertMention = (user: User) => {
    if (mentionStart === null || !textareaRef.current) return;

    const text = value;
    const beforeMention = text.substring(0, mentionStart);
    const afterMention = text.substring(textareaRef.current.selectionStart || text.length);
    const mentionText = `@${user.fullName}${MENTION_ID_MARKER}${user.id}${MENTION_ID_MARKER}`;
    const newText = beforeMention + mentionText + ' ' + afterMention;

    // Crear un evento sintético para actualizar el valor
    const syntheticEvent = {
      target: {
        value: newText,
        selectionStart: mentionStart + mentionText.length + 1,
        selectionEnd: mentionStart + mentionText.length + 1,
      },
    } as React.ChangeEvent<HTMLTextAreaElement>;

    onChange(syntheticEvent);

    // Actualizar la posición del cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = mentionStart + mentionText.length + 1;
        textareaRef.current.selectionEnd = mentionStart + mentionText.length + 1;
        textareaRef.current.focus();
      }
    }, 0);

    setShowSuggestions(false);
    setMentionStart(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };


  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-md p-2 text-sm text-gray-900 whitespace-pre-wrap break-words"
        aria-hidden="true"
      >
        {value ? (
          renderCommentWithMentions(convertInputMentionsToPayload(value), users)
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>
      <textarea
        {...props}
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`relative z-10 block w-full rounded-md border border-gray-300 bg-transparent p-2 text-transparent caret-brand-primary focus:border-brand-primary focus:ring-brand-primary focus:ring-1 sm:text-sm ${className || ""}`}
        style={{
          ...(style || {}),
          resize: style?.resize ?? ("vertical" as React.CSSProperties["resize"]),
        }}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{
            position: 'absolute',
            top: textareaRef.current ? `${textareaRef.current.offsetHeight + 4}px` : '100%',
            left: '0',
          }}
        >
          {suggestions.map((user, index) => (
            <div
              key={user.id}
              onClick={() => insertMention(user)}
              className={`flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <img
                src={getUserAvatarUrl(user)}
                alt={user.fullName}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.cargo || getFullRoleName(user.projectRole, user.entity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionTextarea;
