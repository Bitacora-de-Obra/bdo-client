import React from 'react';
import Input from './ui/Input';
import { SocialTramoData, PQRSD } from '../types';

interface SocialTramoFormProps {
  data: SocialTramoData;
  onChange: (data: SocialTramoData) => void;
  onRemove?: () => void;
  index: number;
  total: number;
}

const createEmptyPQRSD = (): PQRSD => ({
  origin: 'CAMPO',
  quantity: 1,
  subject: '',
  status: 'ABIERTA'
});

const SocialTramoForm: React.FC<SocialTramoFormProps> = ({
  data,
  onChange,
  onRemove,
  index,
  total
}) => {

  const updateField = <K extends keyof SocialTramoData>(field: K, value: SocialTramoData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const addPQRSD = () => {
    updateField('pqrsds', [...data.pqrsds, createEmptyPQRSD()]);
  };

  const updatePQRSD = (idx: number, field: keyof PQRSD, value: any) => {
    const updated = [...data.pqrsds];
    updated[idx] = { ...updated[idx], [field]: value };
    updateField('pqrsds', updated);
  };

  const removePQRSD = (idx: number) => {
    updateField('pqrsds', data.pqrsds.filter((_, i) => i !== idx));
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
        {/* 1. PQRSD */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">1</span>
            PQRSD Recibidas
          </h5>
          
          {data.pqrsds.length === 0 ? (
            <p className="text-gray-500 text-sm mb-2">No hay PQRSD registradas</p>
          ) : (
            data.pqrsds.map((pqrsd, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 p-3 bg-gray-50 rounded border items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Origen</label>
                  <select
                    value={pqrsd.origin}
                    onChange={(e) => updatePQRSD(idx, 'origin', e.target.value)}
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
                    onChange={(e) => updatePQRSD(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Asunto</label>
                  <input
                    type="text"
                    value={pqrsd.subject}
                    onChange={(e) => updatePQRSD(idx, 'subject', e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm"
                    placeholder="Describa el asunto"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                    <select
                      value={pqrsd.status}
                      onChange={(e) => updatePQRSD(idx, 'status', e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm"
                    >
                      <option value="ABIERTA">Abierta</option>
                      <option value="CERRADA">Cerrada</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePQRSD(idx)}
                    className="text-red-500 hover:text-red-700 p-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addPQRSD}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
          >
            + Agregar PQRSD
          </button>
        </div>

        {/* 2. Acta de Compromiso */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">2</span>
            ¿Se requirió el diligenciamiento de Acta de Compromiso?
          </h5>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!data.actaCompromiso.required}
                onChange={() => updateField('actaCompromiso', { ...data.actaCompromiso, required: false })}
              />
              No
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={data.actaCompromiso.required}
                onChange={() => updateField('actaCompromiso', { ...data.actaCompromiso, required: true })}
              />
              Sí
            </label>
          </div>
          {data.actaCompromiso.required && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <Input
                label="No. de Acta"
                value={data.actaCompromiso.actaNumber || ''}
                onChange={(e) => updateField('actaCompromiso', { ...data.actaCompromiso, actaNumber: e.target.value })}
              />
              <Input
                label="Asunto"
                value={data.actaCompromiso.subject || ''}
                onChange={(e) => updateField('actaCompromiso', { ...data.actaCompromiso, subject: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* 3. Articulación Interinstitucional */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">3</span>
            ¿Se realizó alguna Articulación Interinstitucional?
          </h5>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!data.articulacion.performed}
                onChange={() => updateField('articulacion', { ...data.articulacion, performed: false })}
              />
              No
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={data.articulacion.performed}
                onChange={() => updateField('articulacion', { ...data.articulacion, performed: true })}
              />
              Sí
            </label>
          </div>
          {data.articulacion.performed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <Input
                label="¿Cuál entidad?"
                value={data.articulacion.entity || ''}
                onChange={(e) => updateField('articulacion', { ...data.articulacion, entity: e.target.value })}
              />
              <Input
                label="Asunto"
                value={data.articulacion.subject || ''}
                onChange={(e) => updateField('articulacion', { ...data.articulacion, subject: e.target.value })}
              />
            </div>
          )}
        </div>

        {/* 4. Vallas Móviles */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">4</span>
            ¿Hay presencia de Vallas Móviles?
          </h5>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!data.vallasMobiles}
                onChange={() => updateField('vallasMobiles', false)}
              />
              No
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={data.vallasMobiles}
                onChange={() => updateField('vallasMobiles', true)}
              />
              Sí
            </label>
          </div>
        </div>

        {/* 5. Volantes */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-pink-100 text-pink-800 px-2 py-0.5 rounded text-xs">5</span>
            ¿Se entregaron Volantes?
          </h5>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!data.volantes.delivered}
                onChange={() => updateField('volantes', { ...data.volantes, delivered: false })}
              />
              No
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={data.volantes.delivered}
                onChange={() => updateField('volantes', { ...data.volantes, delivered: true })}
              />
              Sí
            </label>
          </div>
          {data.volantes.delivered && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <Input
                label="No. de Volante"
                value={data.volantes.number || ''}
                onChange={(e) => updateField('volantes', { ...data.volantes, number: e.target.value })}
              />
              <Input
                label="¿Cuál?"
                value={data.volantes.type || ''}
                onChange={(e) => updateField('volantes', { ...data.volantes, type: e.target.value })}
              />
              <Input
                label="¿Cuántos?"
                type="number"
                value={data.volantes.quantity?.toString() || ''}
                onChange={(e) => updateField('volantes', { ...data.volantes, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
          )}
        </div>

        {/* 6. PSI */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">6</span>
            ¿Se instalaron y/o actualizaron PSI?
          </h5>
          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!data.psi.installed}
                onChange={() => updateField('psi', { ...data.psi, installed: false })}
              />
              No
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={data.psi.installed}
                onChange={() => updateField('psi', { ...data.psi, installed: true })}
              />
              Sí
            </label>
          </div>
          {data.psi.installed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <Input
                label="¿Dónde se instaló?"
                value={data.psi.location || ''}
                onChange={(e) => updateField('psi', { ...data.psi, location: e.target.value })}
              />
              <Input
                label="Si se actualizó, ¿cuál y con qué pieza?"
                value={data.psi.piece || ''}
                onChange={(e) => updateField('psi', { ...data.psi, piece: e.target.value })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialTramoForm;
