import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  entryCount: number;
  isExporting?: boolean;
  progressMessage?: string;
  filters: {
    startDate: string;
    endDate: string;
  };
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, entryCount, filters, isExporting = false, progressMessage }) => {
  const hasDateFilters = filters.startDate || filters.endDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Anotaciones (ZIP de PDFs)"
      footer={
        <>
          {isExporting ? (
            <div className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-brand-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span className="text-sm text-gray-700">{progressMessage || "Generando ZIP..."}</span>
            </div>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={onExport} disabled={entryCount === 0}>
                Descargar ZIP
              </Button>
            </>
          )}
        </>
      }
    >
      <div className="text-sm text-gray-700 space-y-4">
        <p>
          Se descargará un <strong>ZIP</strong> que contiene los PDFs de 
          <strong> {entryCount} anotaciones</strong> que coinciden con los filtros actuales.
        </p>
        
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
              {/* Note: This only shows date filters, but all filters are applied */}
              {!hasDateFilters && <li>Se exportarán todas las anotaciones visibles (sin filtro de fecha).</li>}
            </ul>
          </div>
        )}

        <p>Si alguna anotación no tiene PDF, se generará automáticamente.</p>
      </div>
    </Modal>
  );
};

export default ExportModal;
