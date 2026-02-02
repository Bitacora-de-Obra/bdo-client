import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useAuth } from '../contexts/AuthContext';

type ExportFormat = 'zip' | 'pdf';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportZip: () => void;
  onExportPdf: () => void;
  entryCount: number;
  filters: {
    startDate: string;
    endDate: string;
    type: string;
  };
}

const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose, 
  onExportZip, 
  onExportPdf, 
  entryCount, 
  filters 
}) => {
  const { user } = useAuth();
  const canDownload = user?.canDownload ?? true;
  const hasDateFilters = filters.startDate || filters.endDate;
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'pdf') {
        await onExportPdf();
      } else {
        await onExportZip();
      }
    } finally {
      setIsExporting(false);
    }
  };

  const typeLabels: Record<string, string> = {
    all: 'Todas',
    General: 'General',
    Calidad: 'Calidad',
    Seguridad: 'Seguridad',
    Administrativo: 'Administrativo',
    Técnico: 'Técnico',
    Ambiental: 'Ambiental',
    Social: 'Social',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Anotaciones"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={entryCount === 0 || !canDownload || isExporting}
          >
            {isExporting 
              ? 'Generando...' 
              : canDownload 
                ? exportFormat === 'pdf' 
                  ? 'Descargar PDF Único' 
                  : 'Descargar ZIP' 
                : 'Solo previsualización'
            }
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700 space-y-4">
        <p>
          Se exportarán <strong>{entryCount} anotaciones</strong> que coinciden con los filtros actuales.
        </p>

        {/* Format selection */}
        <div className="space-y-2">
          <label className="block font-semibold text-gray-800">Formato de exportación</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportFormat"
                value="pdf"
                checked={exportFormat === 'pdf'}
                onChange={() => setExportFormat('pdf')}
                className="w-4 h-4 text-brand-primary focus:ring-brand-primary"
              />
              <span className="flex flex-col">
                <span className="font-medium">PDF Único</span>
                <span className="text-xs text-gray-500">Todas las anotaciones en un solo archivo PDF</span>
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exportFormat"
                value="zip"
                checked={exportFormat === 'zip'}
                onChange={() => setExportFormat('zip')}
                className="w-4 h-4 text-brand-primary focus:ring-brand-primary"
              />
              <span className="flex flex-col">
                <span className="font-medium">ZIP</span>
                <span className="text-xs text-gray-500">Cada anotación como PDF individual</span>
              </span>
            </label>
          </div>
        </div>
        
        {entryCount === 0 ? (
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800">
            <p className="font-bold">No hay anotaciones</p>
            <p>No hay anotaciones que coincidan con los filtros seleccionados. Ajusta los filtros para exportar datos.</p>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 border rounded-md">
            <h4 className="font-semibold text-gray-800">Filtros Activos</h4>
            <ul className="list-disc list-inside mt-2 text-gray-600">
              {filters.startDate && <li>Desde: <strong>{new Date(filters.startDate).toLocaleDateString('es-CO', {timeZone: 'UTC'})}</strong></li>}
              {filters.endDate && <li>Hasta: <strong>{new Date(filters.endDate).toLocaleDateString('es-CO', {timeZone: 'UTC'})}</strong></li>}
              {filters.type && filters.type !== 'all' && (
                <li>Área: <strong>{typeLabels[filters.type] || filters.type}</strong></li>
              )}
              {!hasDateFilters && filters.type === 'all' && <li>Se exportarán todas las anotaciones visibles.</li>}
            </ul>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Si alguna anotación no tiene PDF, se generará automáticamente. 
          {exportFormat === 'pdf' && ' Las anotaciones se unirán en el orden de fecha de diario.'}
        </p>
      </div>
    </Modal>
  );
};

export default ExportModal;
