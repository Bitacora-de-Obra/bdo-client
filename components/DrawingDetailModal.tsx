import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drawing, User } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import DrawingDisciplineBadge from './DrawingDisciplineBadge';
import { MapIcon, UserCircleIcon, CalendarIcon, DocumentArrowDownIcon } from './icons/Icon';
import api from '../src/services/api';

interface DrawingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  drawing: Drawing;
  onAddVersion?: () => void;
  onAddComment?: (drawingId: string, commentText: string) => Promise<void>;
  currentUser: User;
  readOnly?: boolean;
}

const DrawingDetailModal: React.FC<DrawingDetailModalProps> = ({ isOpen, onClose, drawing, onAddVersion, onAddComment, currentUser, readOnly = false }) => {
  const [newComment, setNewComment] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionListRef = useRef<HTMLDivElement | null>(null);

  if (!drawing) return null;

  const latestVersion = drawing.versions[0];
  const ensurePreviewUrl = (url: string) =>
    typeof url === 'string' ? url.replace('/download', '/view') : url;
  const getDownloadUrl = (url: string) =>
    typeof url === 'string' ? url.replace('/view', '/download') : url;
  const isPdf = latestVersion.fileName.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(latestVersion.fileName);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Load users for mentions
  useEffect(() => {
    let mounted = true;
    api.users
      .getAll()
      .then((users) => {
        if (mounted && Array.isArray(users)) {
          setAllUsers(users as unknown as User[]);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return allUsers.slice(0, 6);
    return allUsers
      .filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [allUsers, mentionQuery]);

  const insertMention = (user: User) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? newComment.length;
    const end = ta.selectionEnd ?? newComment.length;
    // find the word starting with @ before caret
    const before = newComment.slice(0, start);
    const after = newComment.slice(end);
    const atIndex = before.lastIndexOf('@');
    if (atIndex === -1) return;
    const prefix = before.slice(0, atIndex);
    const display = `@${user.fullName}`;
    const next = `${prefix}${display} ${after}`;
    setNewComment(next);
    setMentionOpen(false);
    setMentionQuery('');
    // restore caret position after inserted mention
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = (prefix + display + ' ').length;
        textareaRef.current.selectionStart = pos;
        textareaRef.current.selectionEnd = pos;
        textareaRef.current.focus();
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const user = filteredUsers[mentionIndex];
      if (user) insertMention(user);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMentionOpen(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    // Detect @mention start
    const caret = e.target.selectionStart || value.length;
    const before = value.slice(0, caret);
    const atIndex = before.lastIndexOf('@');
    if (atIndex >= 0) {
      // ensure there's a boundary before @ (start or space/newline)
      const prevChar = atIndex > 0 ? before[atIndex - 1] : ' ';
      const validBoundary = /\s|^/.test(prevChar);
      if (validBoundary) {
        const query = before.slice(atIndex + 1).match(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_.-]*/)?.[0] || '';
        setMentionQuery(query);
        setMentionOpen(true);
        setMentionIndex(0);
        return;
      }
    }
    setMentionOpen(false);
    setMentionQuery('');
  };

  const renderCommentContent = (text: string) => {
    // Simple highlighter for @Display Name sequences
    const parts = text.split(/(\@[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ._-]*)/g);
    return (
      <span>
        {parts.map((p, i) =>
          p.startsWith('@') ? (
            <span key={i} className="text-brand-primary font-semibold">{p}</span>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </span>
    );
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !onAddComment) {
      return;
    }
    if (newComment.trim()) {
        await onAddComment(drawing.id, newComment.trim());
        setNewComment('');
    }
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del Plano" size="2xl">
      <div className="space-y-6">
        <div className="pb-4 border-b">
          <h3 className="text-xl font-bold text-gray-900">{drawing.title}</h3>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-sm font-mono text-gray-600">{drawing.code}</p>
            <DrawingDisciplineBadge discipline={drawing.discipline} />
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold text-gray-800">Vista Previa (Versión {latestVersion.versionNumber})</h4>
          <div className="mt-2 w-full h-[60vh] bg-white rounded-lg flex flex-col border overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
              <div className="text-sm text-gray-600 truncate">{latestVersion.fileName}</div>
              <div className="flex items-center gap-2">
                <a
                  href={ensurePreviewUrl(latestVersion.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand-primary hover:text-brand-secondary"
                >
                  Abrir en pestaña
                </a>
                <a
                  href={getDownloadUrl(latestVersion.url)}
                  download
                  className="text-xs font-semibold text-brand-primary hover:text-brand-secondary"
                >
                  Descargar
                </a>
              </div>
            </div>
            <div className="flex-1 bg-gray-50 flex items-center justify-center">
            {isImage ? (
              <img src={ensurePreviewUrl(latestVersion.url)} alt={`Vista previa de ${latestVersion.fileName}`} className="object-contain w-full h-full" />
            ) : isPdf ? (
              <iframe src={ensurePreviewUrl(latestVersion.url)} width="100%" height="100%" title={latestVersion.fileName} className="w-full h-full border-0">
                <p className="p-4 text-center text-sm text-gray-500">Tu navegador no soporta iframes. <a href={getDownloadUrl(latestVersion.url)} className="text-brand-primary font-semibold">Descarga el archivo</a>.</p>
              </iframe>
            ) : (
                <div className="text-center p-4">
                    <MapIcon className="h-16 w-16 text-gray-400 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Vista previa no disponible para este tipo de archivo.</p>
                    <a href={getDownloadUrl(latestVersion.url)} download={latestVersion.fileName} className="mt-2 inline-block text-brand-primary font-semibold text-sm">Descargar archivo</a>
                </div>
            )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-semibold text-gray-800">Historial de Versiones</h4>
          <div className="mt-2 border border-gray-200 rounded-lg">
            <ul className="divide-y divide-gray-200">
              {drawing.versions.map(version => (
                <li key={version.id} className={`p-3 ${version.id === latestVersion.id ? 'bg-idu-cyan/10' : ''}`}>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div className="flex-1">
                           <p className="font-bold text-gray-800">
                             Versión {version.versionNumber}
                             {version.id === latestVersion.id && <span className="ml-2 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Vigente</span>}
                           </p>
                           <p className="text-sm text-gray-600 truncate">{version.fileName}</p>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-4 text-xs text-gray-500">
                             <div className="flex items-center" title={`Subido por ${version.uploader.fullName}`}>
                                <UserCircleIcon className="h-4 w-4 mr-1"/>
                                <span>{version.uploader.fullName}</span>
                            </div>
                            <div className="flex items-center" title={`Fecha de carga: ${new Date(version.uploadDate).toLocaleString('es-CO')}`}>
                                <CalendarIcon className="h-4 w-4 mr-1"/>
                                <span>{new Date(version.uploadDate).toLocaleDateString('es-CO')}</span>
                            </div>
                            <a
                              href={getDownloadUrl(version.url)}
                              download
                              className="inline-flex items-center justify-center font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400 px-3 py-1.5 text-xs"
                            >
                              <span className="mr-2 -ml-1"><DocumentArrowDownIcon className="w-4 h-4" /></span>
                              {formatBytes(version.size)}
                            </a>
                        </div>
                    </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Comments Section */}
       <div>
    <h4 className="text-md font-semibold text-gray-800">Comentarios</h4>
    {drawing.comments && drawing.comments.length > 0 ? (
        <div className="mt-2 space-y-4 max-h-40 overflow-y-auto pr-2">
            {drawing.comments.map(comment => (
                <div key={comment.id} className="flex items-start space-x-3">
                    {/* --- CORRECCIÓN AQUÍ --- */}
                    <img src={comment.author.avatarUrl} alt={comment.author.fullName} className="h-8 w-8 rounded-full object-cover"/>
                    <div className="flex-1">
                        <div className="text-sm">
                            {/* --- Y CORRECCIÓN AQUÍ --- */}
                            <span className="font-semibold text-gray-900">{comment.author.fullName}</span>
                            <span className="text-gray-500 ml-2 text-xs">{new Date(comment.timestamp).toLocaleString('es-CO')}</span>
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md">
                          {renderCommentContent(comment.content)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    ) : (
        <p className="mt-2 text-sm text-gray-500">Aún no hay comentarios. ¡Sé el primero en añadir uno!</p>
    )}
</div>
        
        {/* Comment Form */}
        {!readOnly && onAddComment && (
          <div className="pt-4 border-t">
              <form onSubmit={handleCommentSubmit} className="flex items-start space-x-3">
              <img src={currentUser.avatarUrl} alt={currentUser.fullName} className="h-8 w-8 rounded-full object-cover"/>
              <div className="flex-1 relative">
                  <textarea
                  rows={2}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Escribe tu comentario aquí..."
                  value={newComment}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  ref={textareaRef}
                  ></textarea>
                  {mentionOpen && filteredUsers.length > 0 && (
                    <div
                      ref={mentionListRef}
                      className="absolute z-10 mt-1 w-64 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
                    >
                      {filteredUsers.map((u, idx) => (
                        <button
                          type="button"
                          key={u.id}
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            insertMention(u);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm ${
                            idx === mentionIndex ? 'bg-brand-primary/10' : ''
                          }`}
                        >
                          <span className="font-medium text-gray-800">{u.fullName}</span>
                          <span className="block text-xs text-gray-500">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex justify-end">
                  <Button type="submit" size="sm" disabled={!newComment.trim()}>
                      Publicar Comentario
                  </Button>
                  </div>
              </div>
              </form>
          </div>
        )}

      </div>
       <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
         {onAddVersion && !readOnly && (
           <Button variant="secondary" onClick={onAddVersion}>Cargar Nueva Versión</Button>
         )}
         <Button variant="primary" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
};

export default DrawingDetailModal;
