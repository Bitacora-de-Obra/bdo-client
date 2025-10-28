import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  entryCount: number;
  filters: {
    startDate: string;
    endDate: string;
  };
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onExport, entryCount, filters }) => {
  const hasDateFilters = filters.startDate || filters.endDate;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exportar Anotaciones de Bitácora"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onExport} disabled={entryCount === 0}>
            Descargar Extracto
          </Button>
        </>
      }
    >
      <div className="text-sm text-gray-700 space-y-4">
        <p>
          Se generará un archivo de texto (`.txt`) con el contenido de las 
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

        <p>
          El archivo incluirá detalles como el folio, título, descripción, autor, fechas, comentarios y lista de adjuntos para cada anotación.
        </p>
      </div>
    </Modal>
  );
};

export default ExportModal;
