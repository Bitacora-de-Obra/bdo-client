import React, { useState, useEffect } from 'react';
import { Project, ControlPoint, PhotoEntry, Attachment, User } from '../types'; // Importa Attachment y User
import api from '../src/services/api'; // Cliente API centralizado
import Button from './ui/Button';
import { PlusIcon, CameraIcon } from './icons/Icon';
import EmptyState from './ui/EmptyState';
import ControlPointCard from './ControlPointCard';
import ControlPointFormModal from './ControlPointFormModal';
import PhotoUploadModal from './PhotoUploadModal';
import ProgressViewerModal from './ProgressViewerModal';
import { useAuth } from '../contexts/AuthContext'; // Importa useAuth
import { usePermissions } from '../src/hooks/usePermissions';
import { useToast } from './ui/ToastProvider';

interface PhotographicProgressDashboardProps {
  project: Project;
  // Se elimina la prop 'api'
}

const PhotographicProgressDashboard: React.FC<PhotographicProgressDashboardProps> = ({ project }) => {
  const { user } = useAuth(); // Obtenemos el usuario actual
  const { canEditContent } = usePermissions();
  const readOnly = !canEditContent;
  const { showToast } = useToast();

  // --- Estado local para datos reales ---
  const [controlPoints, setControlPoints] = useState<ControlPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ------------------------------------

  const [selectedControlPoint, setSelectedControlPoint] = useState<ControlPoint | null>(null);
  const [isControlPointFormOpen, setIsControlPointFormOpen] = useState(false);
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
  const [isProgressViewerOpen, setIsProgressViewerOpen] = useState(false);

  // --- useEffect para cargar datos ---
  useEffect(() => {
    const fetchControlPoints = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api('/control-points');
        // Asegurarse de que 'photos' sea siempre un array y tengan 'attachment' si es necesario
        const formattedData = data.map((point: any) => ({
            ...point,
            photos: (point.photos || []).map((photo: any) => ({
                ...photo,
                // Si el backend no incluye 'attachment' directamente en 'photo',
                // podríamos necesitar hacer otra llamada o ajustar el backend.
                // Por ahora, asumimos que la 'url' viene en la foto o en el attachment.
                // Lo importante es que ControlPointCard pueda mostrar la imagen.
                // Si usamos attachment.url, PhotoEntry necesita attachment.
                url: photo.attachment?.url || photo.url || '' // Prioriza URL del attachment si existe
            }))
        }));
        setControlPoints(formattedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar los puntos de control.");
      } finally {
        setIsLoading(false);
      }
    };
    if (user) {
        fetchControlPoints();
    } else {
        setIsLoading(false);
    }
  }, [user]); // Depende del usuario
  // ---------------------------------

  // Efecto para mantener sincronizado el selectedControlPoint si cambia en la lista principal
  useEffect(() => {
    if (selectedControlPoint) {
      const freshData = controlPoints.find(p => p.id === selectedControlPoint.id);
      if (freshData) {
        // Compara si el número de fotos cambió para actualizar
        if ((freshData.photos?.length ?? 0) !== (selectedControlPoint.photos?.length ?? 0)) {
           setSelectedControlPoint(freshData);
        }
      } else {
        setSelectedControlPoint(null); // El punto fue eliminado
      }
    }
  }, [controlPoints, selectedControlPoint]);


  const handleOpenControlPointForm = () => {
    if (readOnly) {
      showToast({
        title: 'Acceso restringido',
        message: 'El rol Viewer no puede crear puntos de control.',
        variant: 'warning',
      });
      setIsControlPointFormOpen(false);
      return;
    }
    setIsControlPointFormOpen(true);
  };

  const handleOpenPhotoUpload = (point: ControlPoint) => {
    if (readOnly) {
      showToast({
        title: 'Acción no permitida',
        message: 'El perfil Viewer no puede cargar fotografías.',
        variant: 'error',
      });
      setIsPhotoUploadOpen(false);
      return;
    }
    setSelectedControlPoint(point);
    setIsPhotoUploadOpen(true);
  };

  const handleOpenProgressViewer = (point: ControlPoint) => {
    setSelectedControlPoint(point);
    setIsProgressViewerOpen(true);
  };

  // --- Conecta handleSaveControlPoint ---
  const handleSaveControlPoint = async (data: Omit<ControlPoint, 'id' | 'photos'>) => {
    if (readOnly) {
      showToast({
        title: 'Acción no permitida',
        message: 'El perfil Viewer no puede registrar puntos de control.',
        variant: 'error',
      });
      throw new Error('El perfil Viewer no puede registrar puntos de control.');
    }
    try {
        setError(null);
        const newPoint = await api('/control-points', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        setControlPoints(prev => [...prev, newPoint]); // Añade el nuevo punto al estado
        setIsControlPointFormOpen(false);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar el punto de control.');
    }
  };
  // -----------------------------------

  // --- Implementa handleSavePhoto con subida ---
  const handleSavePhoto = async (
    // Quitamos 'url' porque ahora vendrá del attachment
    data: Omit<PhotoEntry, 'id' | 'author' | 'date' | 'attachmentId' | 'attachment' | 'url'>,
    file: File
    ) => {
      if (!selectedControlPoint || !user) return;
      if (readOnly) {
        showToast({
          title: 'Acción no permitida',
          message: 'El perfil Viewer no puede cargar fotos.',
          variant: 'error',
        });
        return;
      }
      setError(null);
      // setIsLoading(true); // Opcional: Feedback visual

      try {
          // 1. Subir el archivo de la foto a /api/upload con el ID del punto fijo
          const uploadResult: Attachment = await api.upload.uploadFile(file, "photo", selectedControlPoint.id);

          // 2. Crear la PhotoEntry llamando a /api/control-points/:id/photos
          // Pasar la fecha de modificación del archivo si está disponible (para mantener orden cronológico)
          const photoPayload: any = {
              notes: data.notes,
              authorId: user.id,
              attachmentId: uploadResult.id // ID del Attachment creado
          };
          
          // Si data tiene fileDate (fecha de modificación del archivo), incluirla
          if ((data as any).fileDate) {
              photoPayload.fileDate = (data as any).fileDate;
          } else if (file.lastModified) {
              // Si no viene en data pero el archivo tiene lastModified, usarlo
              photoPayload.fileDate = new Date(file.lastModified).toISOString();
          }

          const newPhotoEntry: PhotoEntry = await api(`/control-points/${selectedControlPoint.id}/photos`, {
              method: 'POST',
              body: JSON.stringify(photoPayload)
          });

          // 3. Actualizar el estado local para reflejar la nueva foto
          setControlPoints(prevPoints =>
              prevPoints.map(point =>
                  point.id === selectedControlPoint.id
                  ? {
                      ...point,
                      // Añade la nueva foto a la lista existente (asegúrate que sea un array)
                      photos: [...(point.photos || []), { ...newPhotoEntry, url: uploadResult.url }] // Añade la URL del attachment para mostrarla
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Reordena por fecha
                    }
                  : point
              )
          );

          setIsPhotoUploadOpen(false); // Cierra el modal de subida

      } catch (err) {
          console.error("Error detallado al guardar foto:", err);
          setError(err instanceof Error ? err.message : 'Error al guardar la foto. Revisa la consola.');
      } finally {
          // setIsLoading(false); // Quitar feedback visual
      }
  };
  // ------------------------------------------

  if (!user) return null; // Necesario

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Avance Fotográfico</h2>
          <p className="text-sm text-gray-500">Proyecto: {project.name}</p>
        </div>
        {canEditContent && (
          <Button onClick={handleOpenControlPointForm} leftIcon={<PlusIcon />}>
            Crear Nuevo Punto de Control
          </Button>
        )}
      </div>

       {isLoading && <div className="text-center p-8">Cargando puntos de control...</div>}
       {error && <div className="text-center p-8 text-red-500">{error}</div>}

       {!isLoading && !error && (
            controlPoints.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {controlPoints.map(point => (
                    <ControlPointCard
                        key={point.id}
                        point={point}
                        onAddPhoto={() => handleOpenPhotoUpload(point)}
                        onViewProgress={() => handleOpenProgressViewer(point)}
                        canAddPhoto={canEditContent}
                    />
                    ))}
                </div>
                ) : (
                <EmptyState
                    icon={<CameraIcon />}
                    title="Aún no hay Puntos de Control"
                    message="Crea puntos de control para zonas clave de la obra y sube fotos periódicamente para visualizar el avance en el tiempo."
                    actionButton={
                        canEditContent ? (
                          <Button onClick={handleOpenControlPointForm} leftIcon={<PlusIcon />}>
                            Crear Primer Punto
                          </Button>
                        ) : undefined
                    }
                    />
                )
        )}

      {canEditContent && (
        <ControlPointFormModal
          isOpen={isControlPointFormOpen}
          onClose={() => setIsControlPointFormOpen(false)}
          onSave={handleSaveControlPoint}
        />
      )}

      {/* Los modales PhotoUpload y ProgressViewer necesitan el selectedControlPoint */}
      {selectedControlPoint && user && (
          <>
            {canEditContent && (
              <PhotoUploadModal
                isOpen={isPhotoUploadOpen}
                onClose={() => setIsPhotoUploadOpen(false)}
                onSave={handleSavePhoto}
                controlPoint={selectedControlPoint}
              />
            )}
            <ProgressViewerModal
              isOpen={isProgressViewerOpen}
              onClose={() => setIsProgressViewerOpen(false)}
              controlPoint={selectedControlPoint} // Muestra las fotos del estado local
            />
          </>
      )}

    </div>
  );
};

export default PhotographicProgressDashboard;
