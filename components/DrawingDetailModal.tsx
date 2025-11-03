import React, { useState } from 'react';
import { Drawing, User } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import DrawingDisciplineBadge from './DrawingDisciplineBadge';
import { MapIcon, UserCircleIcon, CalendarIcon, DocumentArrowDownIcon } from './icons/Icon';

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

  if (!drawing) return null;

  const latestVersion = drawing.versions[0];
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
          <div className="mt-2 w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center border">
            {isImage ? (
              <img src={latestVersion.url} alt={`Vista previa de ${latestVersion.fileName}`} className="object-contain w-full h-full" />
            ) : isPdf ? (
              <iframe src={latestVersion.url} width="100%" height="100%" title={latestVersion.fileName} className="border-0">
                <p className="p-4 text-center text-sm text-gray-500">Tu navegador no soporta iframes. <a href={latestVersion.url} className="text-brand-primary font-semibold">Descarga el archivo</a>.</p>
              </iframe>
            ) : (
                <div className="text-center p-4">
                    <MapIcon className="h-16 w-16 text-gray-400 mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Vista previa no disponible para este tipo de archivo.</p>
                    <a href={latestVersion.url} download={latestVersion.fileName} className="mt-2 inline-block text-brand-primary font-semibold text-sm">Descargar archivo</a>
                </div>
            )}
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
                              href={version.url}
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
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md">{comment.content}</p>
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
              <div className="flex-1">
                  <textarea
                  rows={2}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Escribe tu comentario aquí..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  ></textarea>
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
