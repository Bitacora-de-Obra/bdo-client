import React from 'react';
import Input from './ui/Input';
import { 
  SocialTramoData, 
  PQRSD, 
  ActaCompromiso, 
  ArticulacionInterinstitucional, 
  VolanteEntrega, 
  PSIInstalacion 
} from '../types';

interface SocialTramoFormProps {
  data: SocialTramoData;
  onChange: (data: SocialTramoData) => void;
  onRemove?: () => void;
  index: number;
  total: number;
  isInterventoriaUser?: boolean;
}

const createEmptyPQRSD = (): PQRSD => ({
  origin: 'CAMPO',
  quantity: 1,
  subject: '',
  status: 'ABIERTA'
});

const createEmptyActa = (): ActaCompromiso => ({
  actaNumber: '',
  subject: ''
});

const createEmptyArticulacion = (): ArticulacionInterinstitucional => ({
  entity: '',
  subject: ''
});

const createEmptyVolante = (): VolanteEntrega => ({
  number: '',
  type: '',
  quantity: 0
});

const createEmptyPSI = (): PSIInstalacion => ({
  location: '',
  piece: '',
  isUpdate: false
});

const SocialTramoForm: React.FC<SocialTramoFormProps> = ({
  data,
  onChange,
  onRemove,
  index,
  total,
  isInterventoriaUser = false
}) => {

  const updateField = <K extends keyof SocialTramoData>(field: K, value: SocialTramoData[K]) => {
    onChange({ ...data, [field]: value });
  };

  // --- HELPERS FOR ARRAYS ---
  const addItem = <T,>(field: keyof SocialTramoData, item: T) => {
    const list = (data[field] as T[]) || [];
    updateField(field, [...list, item] as any);
  };

  const removeItem = <T,>(field: keyof SocialTramoData, idx: number) => {
    const list = (data[field] as T[]) || [];
    updateField(field, list.filter((_, i) => i !== idx) as any);
  };

  const updateItem = <T,>(field: keyof SocialTramoData, idx: number, key: keyof T, value: any) => {
    const list = (data[field] as T[]) || [];
    const updatedList = [...list];
    updatedList[idx] = { ...updatedList[idx], [key]: value };
    updateField(field, updatedList as any);
  };

  return (
    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-bold text-purple-800 flex items-center gap-2">
          <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-sm">
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

      <div className="space-y-6">
        {/* 0. Registro de Actividades por Tramo */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3">
             Registro diario de actividades
          </h5>
          <textarea
            value={data.activities || ''}
            onChange={(e) => updateField('activities', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded p-2 text-sm"
            placeholder="Describa las actividades realizadas en este tramo..."
          />
        </div>

        {/* 1. PQRSD */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">1</span>
            PQRSD Recibidas
          </h5>
          {(!data.pqrsds || data.pqrsds.length === 0) ? (
            <p className="text-gray-500 text-sm mb-2">No hay PQRSD registradas</p>
          ) : (
            data.pqrsds.map((pqrsd, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 p-3 bg-gray-50 rounded border items-end relative">
                <button
                    type="button"
                    onClick={() => removeItem('pqrsds', idx)}
                    className="absolute top-1 right-1 text-red-500 hover:text-red-700 font-bold"
                    title="Eliminar registro"
                  >
                    ✕
                </button>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Origen</label>
                  <select
                    value={pqrsd.origin}
                    onChange={(e) => updateItem('pqrsds', idx, 'origin', e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  >
                    <option value="CAMPO">Campo</option>
                    <option value="OFICINA">Oficina</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={pqrsd.quantity}
                    onChange={(e) => updateItem('pqrsds', idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Asunto</label>
                  <input
                    type="text"
                    value={pqrsd.subject}
                    onChange={(e) => updateItem('pqrsds', idx, 'subject', e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    placeholder="Describa el asunto"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={pqrsd.status}
                    onChange={(e) => updateItem('pqrsds', idx, 'status', e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  >
                    <option value="ABIERTA">Abierta</option>
                    <option value="CERRADA">Cerrada</option>
                  </select>
                </div>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() => addItem('pqrsds', createEmptyPQRSD())}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
          >
            + Agregar PQRSD
          </button>
        </div>

        {/* 2. Acta de Compromiso (MULTI) */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">2</span>
            Actas de Compromiso
          </h5>
          {(!data.actasCompromiso || data.actasCompromiso.length === 0) ? (
            <p className="text-gray-500 text-sm mb-2">No hay actas registradas</p>
          ) : (
            data.actasCompromiso.map((acta, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded border relative pt-6">
                <button
                    type="button"
                    onClick={() => removeItem('actasCompromiso', idx)}
                    className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold"
                    title="Eliminar registro"
                  >
                    ✕
                </button>
                <Input
                  label="No. de Acta"
                  value={acta.actaNumber}
                  onChange={(e) => updateItem('actasCompromiso', idx, 'actaNumber', e.target.value)}
                />
                <Input
                  label="Asunto"
                  value={acta.subject}
                  onChange={(e) => updateItem('actasCompromiso', idx, 'subject', e.target.value)}
                />
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() => addItem('actasCompromiso', createEmptyActa())}
            className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1"
          >
            + Agregar Acta
          </button>
        </div>

        {/* 3. Articulación Interinstitucional (MULTI) */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">3</span>
            Articulación Interinstitucional
          </h5>
          {(!data.articulaciones || data.articulaciones.length === 0) ? (
            <p className="text-gray-500 text-sm mb-2">No hay articulaciones registradas</p>
          ) : (
            data.articulaciones.map((art, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded border relative pt-6">
                 <button
                    type="button"
                    onClick={() => removeItem('articulaciones', idx)}
                    className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold"
                    title="Eliminar registro"
                  >
                    ✕
                </button>
                <Input
                  label="¿Cuál entidad?"
                  value={art.entity}
                  onChange={(e) => updateItem('articulaciones', idx, 'entity', e.target.value)}
                />
                <Input
                  label="Asunto"
                  value={art.subject}
                  onChange={(e) => updateItem('articulaciones', idx, 'subject', e.target.value)}
                />
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() => addItem('articulaciones', createEmptyArticulacion())}
            className="text-yellow-600 hover:text-yellow-800 text-sm font-medium flex items-center gap-1"
          >
            + Agregar Articulación
          </button>
        </div>

        {/* 4. Vallas Móviles (SINGLE - Boolean) */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">4</span>
            Se encuentran instaladas las dos (2) vallas móviles
          </h5>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!data.vallasMobiles}
                onChange={() => updateField('vallasMobiles', false)}
              />
              No
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!!data.vallasMobiles}
                onChange={() => updateField('vallasMobiles', true)}
              />
              Sí
            </label>
          </div>
        </div>

        {/* 5. Volantes (MULTI) */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded text-xs">5</span>
            Entrega de Volantes
          </h5>
          {(!data.volantes || data.volantes.length === 0) ? (
            <p className="text-gray-500 text-sm mb-2">No hay volantes registrados</p>
          ) : (
            data.volantes.map((vol, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-gray-50 rounded border relative pt-6">
                <button
                    type="button"
                    onClick={() => removeItem('volantes', idx)}
                    className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold"
                    title="Eliminar registro"
                  >
                    ✕
                </button>
                <Input
                  label="No. de Volante"
                  value={vol.number}
                  onChange={(e) => updateItem('volantes', idx, 'number', e.target.value)}
                />
                <Input
                  label="¿Cuál?"
                  value={vol.type}
                  onChange={(e) => updateItem('volantes', idx, 'type', e.target.value)}
                />
                <Input
                  label="¿Cuántos?"
                  type="number"
                  value={vol.quantity?.toString()}
                  onChange={(e) => updateItem('volantes', idx, 'quantity', parseInt(e.target.value) || 0)}
                />
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() => addItem('volantes', createEmptyVolante())}
            className="text-pink-600 hover:text-pink-800 text-sm font-medium flex items-center gap-1"
          >
            + Agregar Volante
          </button>
        </div>

        {/* 6. PSI (MULTI) */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">6</span>
            Instalación/Actualización de PSI
          </h5>
          {(!data.psis || data.psis.length === 0) ? (
            <p className="text-gray-500 text-sm mb-2">No hay PSI registrados</p>
          ) : (
            data.psis.map((psi, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 p-3 bg-gray-50 rounded border relative pt-6">
                 <button
                    type="button"
                    onClick={() => removeItem('psis', idx)}
                    className="absolute top-1 right-2 text-red-500 hover:text-red-700 font-bold"
                    title="Eliminar registro"
                  >
                    ✕
                </button>
                <div className="col-span-1 md:col-span-2 flex gap-4 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input 
                            type="checkbox" 
                            checked={psi.isUpdate} 
                            onChange={(e) => updateItem('psis', idx, 'isUpdate', e.target.checked)}
                        />
                        ¿Es actualización?
                    </label>
                </div>
                <Input
                  label="¿Dónde se instaló?"
                  value={psi.location}
                  onChange={(e) => updateItem('psis', idx, 'location', e.target.value)}
                />
                <Input
                  label={psi.isUpdate ? "Pieza actualizada" : "Pieza instalada"}
                  value={psi.piece}
                  onChange={(e) => updateItem('psis', idx, 'piece', e.target.value)}
                />
              </div>
            ))
          )}
          <button
            type="button"
            onClick={() => addItem('psis', createEmptyPSI())}
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
          >
            + Agregar PSI
          </button>
        </div>

        {/* 7. Observaciones del Contratista */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">7</span>
            Observaciones del contratista
          </h5>
          {isInterventoriaUser ? (
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 italic">
              {data.contractorObservations || 'Solo el contratista puede editar este campo.'}
            </div>
          ) : (
            <textarea
              value={data.contractorObservations || ''}
              onChange={(e) => updateField('contractorObservations', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded p-2 text-sm"
              placeholder="Observaciones del contratista para este tramo..."
            />
          )}
        </div>

        {/* 8. Observaciones de la Interventoría */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">8</span>
            Observaciones de la interventoría
          </h5>
          {!isInterventoriaUser ? (
             <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500 italic">
               {data.interventoriaObservations || 'Espacio reservado para la interventoría.'}
            </div>
          ) : (
            <textarea
              value={data.interventoriaObservations || ''}
              onChange={(e) => updateField('interventoriaObservations', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded p-2 text-sm"
              placeholder="Observaciones de la interventoría..."
            />
          )}
        </div>

        {/* 9. Observaciones Adicionales */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">9</span>
            Observaciones adicionales
          </h5>
          <textarea
            value={data.observations || ''}
            onChange={(e) => updateField('observations', e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded p-2 text-sm"
            placeholder="Observaciones adicionales..."
          />
        </div>
      </div>
    </div>
  );
};

export default SocialTramoForm;
