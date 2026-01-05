import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import Card from './ui/Card';
import Button from './ui/Button';
import { XMarkIcon } from './icons/Icon';

interface User {
  id: string;
  fullName: string;
}

interface ContractDocument {
  id: string;
  name: string;
  description?: string;
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
  visibility: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  category?: string;
  uploader: User;
  uploaderId: string;
  allowedUsers: User[];
  createdAt: string;
}

const CATEGORIES = [
  'Legal',
  'Técnico',
  'Financiero',
  'HSE',
  'Ambiental',
  'Social',
  'Administrativo',
  'Otro',
];

const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: 'Público',
  INTERNAL: 'Interno',
  CONFIDENTIAL: 'Confidencial',
};

const VISIBILITY_COLORS: Record<string, string> = {
  PUBLIC: 'bg-green-100 text-green-800',
  INTERNAL: 'bg-yellow-100 text-yellow-800',
  CONFIDENTIAL: 'bg-red-100 text-red-800',
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType: string): string => {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
  return '📎';
};

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File;
  users: User[];
  onSubmit: (data: {
    name: string;
    description: string;
    visibility: string;
    category: string;
    allowedUserIds: string[];
  }) => Promise<void>;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, file, users, onSubmit }) => {
  const [name, setName] = useState(file.name.replace(/\.[^/.]+$/, ''));
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('PUBLIC');
  const [category, setCategory] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ name, description, visibility, category, allowedUserIds: selectedUsers });
      onClose();
    } catch (err) {
      console.error('Error uploading:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Subir Documento</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md flex items-center gap-3">
              <span className="text-2xl">{getFileIcon(file.type)}</span>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Seleccionar...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibilidad</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="PUBLIC">🌐 Público</option>
                  <option value="INTERNAL">🏢 Interno (mi rol)</option>
                  <option value="CONFIDENTIAL">🔒 Confidencial</option>
                </select>
              </div>
            </div>

            {visibility === 'CONFIDENTIAL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuarios con acceso
                </label>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                          }
                        }}
                        className="rounded text-brand-primary focus:ring-brand-primary"
                      />
                      <span className="text-sm">{user.fullName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Subiendo...' : 'Subir Documento'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ContractDocumentsDashboard: React.FC = () => {
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('/api/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (data: {
    name: string;
    description: string;
    visibility: string;
    category: string;
    allowedUserIds: string[];
  }) => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('visibility', data.visibility);
    formData.append('category', data.category);
    formData.append('allowedUserIds', JSON.stringify(data.allowedUserIds));

    await axios.post('/api/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    setSelectedFile(null);
    fetchDocuments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;
    try {
      await axios.delete(`/api/documents/${id}`);
      setDocuments(documents.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
  };

  const handleDownload = (doc: ContractDocument) => {
    window.open(`/api/documents/${doc.id}/download`, '_blank');
  };

  const filteredDocuments = documents.filter((doc) => {
    if (filterCategory && doc.category !== filterCategory) return false;
    if (filterVisibility && doc.visibility !== filterVisibility) return false;
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos del Contrato</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sube y gestiona documentación relevante del proyecto
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <Card className="mb-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
            isDragging ? 'border-brand-primary bg-brand-primary/10' : 'border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-4xl mb-2">📁</div>
          <p className="text-gray-600 text-center">
            Arrastra archivos aquí o <span className="text-brand-primary font-medium">haz click para seleccionar</span>
          </p>
          <p className="text-gray-400 text-sm mt-1">PDF, Word, Excel, imágenes hasta 50MB</p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
          />
        </div>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary"
        >
          <option value="">Toda visibilidad</option>
          <option value="PUBLIC">🌐 Público</option>
          <option value="INTERNAL">🏢 Interno</option>
          <option value="CONFIDENTIAL">🔒 Confidencial</option>
        </select>

        <span className="text-sm text-gray-500 self-center">
          {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Cargando documentos...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-2">📂</div>
          <p>No hay documentos aún</p>
          <p className="text-sm">Arrastra archivos arriba para comenzar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{getFileIcon(doc.mimeType)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{doc.name}</h3>
                    {doc.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VISIBILITY_COLORS[doc.visibility]}`}>
                        {doc.visibility === 'PUBLIC' && '🌐'}
                        {doc.visibility === 'INTERNAL' && '🏢'}
                        {doc.visibility === 'CONFIDENTIAL' && '🔒'}
                        {' '}{VISIBILITY_LABELS[doc.visibility]}
                      </span>
                      {doc.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {doc.category}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {formatFileSize(doc.size)} • Subido por {doc.uploader.fullName}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button size="sm" variant="secondary" onClick={() => handleDownload(doc)} className="flex-1">
                    Descargar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(doc.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {selectedFile && (
        <UploadModal
          isOpen={!!selectedFile}
          onClose={() => setSelectedFile(null)}
          file={selectedFile}
          users={users}
          onSubmit={handleUpload}
        />
      )}
    </div>
  );
};

export default ContractDocumentsDashboard;
