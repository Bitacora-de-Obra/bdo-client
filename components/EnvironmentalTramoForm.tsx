import React from 'react';
import { EnvironmentalTramoData } from '../types';

interface EnvironmentalTramoFormProps {
  data: EnvironmentalTramoData;
  onChange: (data: EnvironmentalTramoData) => void;
  onRemove?: () => void;
  index: number;
  total: number;
  isInterventor: boolean;
}

const CHECKLIST_ITEMS = [
  { key: 'sewerProtection', label: 'Protección a sistema alcantarillado y sumideros' },
  { key: 'materialStorage', label: 'Adecuado manejo de acopios de materiales y RCD' },
  { key: 'cleanliness', label: 'Orden y aseo en campamentos y frentes de obra' },
  { key: 'coveredTrucks', label: 'Carpado de volquetas y llantas limpias' },
  { key: 'greenZones', label: 'Zonas verdes libres de materiales y equipos' },
  { key: 'treeProtection', label: 'Protección de arboles' },
  { key: 'enclosure', label: 'Cerramiento de obra' },
];

const EnvironmentalTramoForm: React.FC<EnvironmentalTramoFormProps> = ({
  data,
  onChange,
  onRemove,
  index,
  total,
  isInterventor
}) => {

  const updateField = <K extends keyof EnvironmentalTramoData>(field: K, value: EnvironmentalTramoData[K]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-green-800 flex items-center gap-2">
          <span className="bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm">
            Tramo {index + 1} de {total}
          </span>
          <span className="text-base font-medium text-gray-700">{data.tramoName}</span>
        </h4>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 text-sm font-medium"
          >
            ✕ Quitar tramo
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Summary Section - Per Tramo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resumen general del día (para este tramo)
          </label>
          <textarea 
            value={data.summary || ''}
            onChange={e => updateField('summary', e.target.value)}
            rows={3}
            className="block w-full border border-gray-300 rounded sm:text-sm p-2"
            placeholder="Describe las actividades y hallazgos del día en este tramo..."
          />
        </div>

        {/* Observations Section - TWO observation fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones ambientales (Interventoría)
            </label>
            <textarea 
              value={data.interventorObservations || ''}
              onChange={e => updateField('interventorObservations', e.target.value)}
              rows={3}
              className="block w-full border border-gray-300 rounded sm:text-sm p-2"
              disabled={!isInterventor}
              placeholder={isInterventor ? 'Registre las observaciones...' : 'Sin observaciones registradas'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones del contratista
            </label>
            <textarea 
              value={data.contractorObservations || ''}
              onChange={e => updateField('contractorObservations', e.target.value)}
              rows={3}
              className="block w-full border border-gray-300 rounded sm:text-sm p-2"
              disabled={isInterventor}
              placeholder={isInterventor ? 'Sin observaciones registradas' : 'Registre las observaciones...'}
            />
          </div>
        </div>

        {/* Checklist Section - Contractor only */}
        {!isInterventor && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">3</span>
              ESTADO DE COMPONENTES (Control interno Contratista)
            </h5>
            
            <div className="space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.key} className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <select
                    className="w-36 border border-gray-300 rounded-md p-1 text-sm"
                    value={(data as any)[item.key]}
                    onChange={(e) => updateField(item.key as keyof EnvironmentalTramoData, e.target.value)}
                  >
                    <option value="CUMPLE">Cumple</option>
                    <option value="NO_CUMPLE">No Cumple</option>
                    <option value="NA">No Aplica</option>
                  </select>
                </div>
              ))}

              <div className="flex items-center justify-between border-b border-gray-100 pb-2 pt-2">
                <span className="text-sm text-gray-700">Cantidad de UPS</span>
                <input
                  type="number"
                  value={data.upsCount}
                  onChange={(e) => updateField('upsCount', e.target.value)}
                  className="w-36 border border-gray-300 rounded-md p-1 text-sm"
                  placeholder="#"
                />
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">¿Se presentaron emergencias ambientales?</span>
                  <select
                    className="w-36 border border-gray-300 rounded-md p-1 text-sm"
                    value={data.emergency ? 'SI' : 'NO'}
                    onChange={(e) => updateField('emergency', e.target.value === 'SI')}
                  >
                    <option value="NO">No</option>
                    <option value="SI">Sí</option>
                  </select>
                </div>
                {data.emergency && (
                  <textarea
                    value={data.emergencyDescription}
                    onChange={(e) => updateField('emergencyDescription', e.target.value)}
                    rows={2}
                    className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                    placeholder="Descripción de la emergencia..."
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnvironmentalTramoForm;
