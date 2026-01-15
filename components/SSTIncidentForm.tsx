import React from 'react';
import Input from './ui/Input';
import { SSTAccidentData, SSTDiseaseData, AccidentDetails, DiseaseDetails } from '../types';

interface SSTIncidentFormProps {
  accidentData: SSTAccidentData;
  onChangeAccident: (data: SSTAccidentData) => void;
  diseaseData: SSTDiseaseData;
  onChangeDisease: (data: SSTDiseaseData) => void;
}

const createEmptyAccident = (): AccidentDetails => ({
  severity: '',
  injuredName: '',
  injuredRole: '',
  contractorCompany: '',
  location: '',
  time: '',
  description: '',
  firstAid: false,
  furat: false,
  witnesses: '',
  technicalResponsible: '',
  sstResponsible: '',
  reportedToBoss: false,
  reportedToInterventoria: false
});

const createEmptyDisease = (): DiseaseDetails => ({
  workerName: '',
  officialReport: false,
  notifiedResident: false
});

const AccidentForm: React.FC<{
  index: number;
  total: number;
  incident: AccidentDetails;
  onUpdate: (field: keyof AccidentDetails, value: any) => void;
  onUpdateNested: (parent: 'reportedToBossDetails' | 'reportedToInterventoriaDetails', field: string, value: string) => void;
}> = ({ index, total, incident, onUpdate, onUpdateNested }) => (
  <div className="p-4 bg-white rounded-lg border-2 border-red-200 shadow-sm">
    <h5 className="text-md font-bold text-red-700 mb-4 flex items-center gap-2">
      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
        Accidente {index + 1} de {total}
      </span>
    </h5>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de accidente</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" checked={incident.severity === 'LEVE'} onChange={() => onUpdate('severity', 'LEVE')} /> Leve
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={incident.severity === 'GRAVE'} onChange={() => onUpdate('severity', 'GRAVE')} /> Grave
          </label>
        </div>
      </div>

      <Input label="Nombre y apellido accidentado" value={incident.injuredName || ''} onChange={(e) => onUpdate('injuredName', e.target.value)} />
      <Input label="Cargo" value={incident.injuredRole || ''} onChange={(e) => onUpdate('injuredRole', e.target.value)} />
      <Input label="Empresa contratante" value={incident.contractorCompany || ''} onChange={(e) => onUpdate('contractorCompany', e.target.value)} />
      <Input label="Lugar (Dirección / Frente / CIV)" value={incident.location || ''} onChange={(e) => onUpdate('location', e.target.value)} />
      <Input label="Hora del accidente" type="time" value={incident.time || ''} onChange={(e) => onUpdate('time', e.target.value)} />
      
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del accidente</label>
        <textarea 
          className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
          rows={3}
          value={incident.description || ''}
          onChange={(e) => onUpdate('description', e.target.value)}
        />
      </div>
      
      <div className="flex items-center gap-2 md:col-span-2">
        <input type="checkbox" checked={incident.firstAid || false} onChange={(e) => onUpdate('firstAid', e.target.checked)} />
        <label className="text-sm text-gray-700 font-medium">Prestación de primeros auxilios</label>
      </div>
      <div className="flex items-center gap-2 md:col-span-2">
        <input type="checkbox" checked={incident.furat || false} onChange={(e) => onUpdate('furat', e.target.checked)} />
        <label className="text-sm text-gray-700 font-medium">FURAT Generado</label>
      </div>
      
      <div className="md:col-span-2">
        <Input label="Testigos (Nombres, Apellidos, Cargo, Empresa)" value={incident.witnesses || ''} onChange={(e) => onUpdate('witnesses', e.target.value)} placeholder="Ej: Juan Perez (Obrero - Empresa X), Maria..." />
      </div>

      <Input label="Responsable técnico frente de obra" value={incident.technicalResponsible || ''} onChange={(e) => onUpdate('technicalResponsible', e.target.value)} />
      <Input label="Responsable SST que reporta" value={incident.sstResponsible || ''} onChange={(e) => onUpdate('sstResponsible', e.target.value)} />

      <div className="md:col-span-2 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={incident.reportedToBoss || false} onChange={(e) => onUpdate('reportedToBoss', e.target.checked)} />
          <label className="font-medium text-sm">¿Reportó a Jefe Inmediato?</label>
        </div>
        {incident.reportedToBoss && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <Input label="Nombre" value={incident.reportedToBossDetails?.name || ''} onChange={(e) => onUpdateNested('reportedToBossDetails', 'name', e.target.value)} />
            <Input label="Fecha" type="date" value={incident.reportedToBossDetails?.date || ''} onChange={(e) => onUpdateNested('reportedToBossDetails', 'date', e.target.value)} />
            <Input label="Hora" type="time" value={incident.reportedToBossDetails?.time || ''} onChange={(e) => onUpdateNested('reportedToBossDetails', 'time', e.target.value)} />
          </div>
        )}
      </div>

      <div className="md:col-span-2 p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <input type="checkbox" checked={incident.reportedToInterventoria || false} onChange={(e) => onUpdate('reportedToInterventoria', e.target.checked)} />
          <label className="font-medium text-sm">¿Reportó a Interventoría?</label>
        </div>
        {incident.reportedToInterventoria && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
            <Input label="Nombre (Interventoría)" value={incident.reportedToInterventoriaDetails?.name || ''} onChange={(e) => onUpdateNested('reportedToInterventoriaDetails', 'name', e.target.value)} />
            <Input label="Fecha" type="date" value={incident.reportedToInterventoriaDetails?.date || ''} onChange={(e) => onUpdateNested('reportedToInterventoriaDetails', 'date', e.target.value)} />
            <Input label="Hora" type="time" value={incident.reportedToInterventoriaDetails?.time || ''} onChange={(e) => onUpdateNested('reportedToInterventoriaDetails', 'time', e.target.value)} />
          </div>
        )}
      </div>
    </div>
  </div>
);

const DiseaseForm: React.FC<{
  index: number;
  total: number;
  incident: DiseaseDetails;
  onUpdate: (field: keyof DiseaseDetails, value: any) => void;
  onUpdateNested: (parent: 'residentNotification' | 'noNotification', field: string, value: string) => void;
}> = ({ index, total, incident, onUpdate, onUpdateNested }) => (
  <div className="p-4 bg-white rounded-lg border-2 border-yellow-200 shadow-sm">
    <h5 className="text-md font-bold text-yellow-700 mb-4 flex items-center gap-2">
      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
        Enfermedad {index + 1} de {total}
      </span>
    </h5>
    
    <div className="space-y-4">
      <Input label="Nombre del trabajador" value={incident.workerName || ''} onChange={(e) => onUpdate('workerName', e.target.value)} />
      
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={incident.officialReport || false} onChange={(e) => onUpdate('officialReport', e.target.checked)} />
        <label className="text-sm font-medium text-gray-700">¿El reporte es oficial por ARL u otra entidad?</label>
      </div>
      
      <div className="p-3 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">¿Se notificó al Residente SST del Contrato?</p>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2">
            <input type="radio" checked={incident.notifiedResident} onChange={() => onUpdate('notifiedResident', true)} /> Sí
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={!incident.notifiedResident} onChange={() => onUpdate('notifiedResident', false)} /> No
          </label>
        </div>

        {incident.notifiedResident ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-green-50 p-2 rounded">
            <Input label="Nombre Residente SST" value={incident.residentNotification?.name || ''} onChange={(e) => onUpdateNested('residentNotification', 'name', e.target.value)} />
            <Input label="Fecha" type="date" value={incident.residentNotification?.date || ''} onChange={(e) => onUpdateNested('residentNotification', 'date', e.target.value)} />
            <Input label="Hora" type="time" value={incident.residentNotification?.time || ''} onChange={(e) => onUpdateNested('residentNotification', 'time', e.target.value)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-red-50 p-2 rounded">
            <Input label="Nombre (Quién reporta/no reportó)" value={incident.noNotification?.name || ''} onChange={(e) => onUpdateNested('noNotification', 'name', e.target.value)} />
            <Input label="Fecha" type="date" value={incident.noNotification?.date || ''} onChange={(e) => onUpdateNested('noNotification', 'date', e.target.value)} />
            <Input label="Hora" type="time" value={incident.noNotification?.time || ''} onChange={(e) => onUpdateNested('noNotification', 'time', e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="¿Por qué no?" value={incident.noNotification?.reason || ''} onChange={(e) => onUpdateNested('noNotification', 'reason', e.target.value)} />
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const SSTIncidentForm: React.FC<SSTIncidentFormProps> = ({
  accidentData,
  onChangeAccident,
  diseaseData,
  onChangeDisease
}) => {
  
  const handleAccidentToggle = (hasAccident: boolean) => {
    if (hasAccident) {
      onChangeAccident({
        hasAccident: true,
        count: 1,
        incidents: [createEmptyAccident()]
      });
    } else {
      onChangeAccident({ hasAccident: false });
    }
  };

  const handleAccidentCountChange = (count: number) => {
    const newCount = Math.max(1, Math.min(10, count));
    const currentIncidents = accidentData.incidents || [];
    
    let newIncidents: AccidentDetails[];
    if (newCount > currentIncidents.length) {
      newIncidents = [...currentIncidents];
      for (let i = currentIncidents.length; i < newCount; i++) {
        newIncidents.push(createEmptyAccident());
      }
    } else {
      newIncidents = currentIncidents.slice(0, newCount);
    }
    
    onChangeAccident({
      ...accidentData,
      count: newCount,
      incidents: newIncidents
    });
  };

  const updateAccidentIncident = (index: number, field: keyof AccidentDetails, value: any) => {
    const incidents = [...(accidentData.incidents || [])];
    incidents[index] = { ...incidents[index], [field]: value };
    onChangeAccident({ ...accidentData, incidents });
  };

  const updateAccidentNested = (index: number, parent: 'reportedToBossDetails' | 'reportedToInterventoriaDetails', field: string, value: string) => {
    const incidents = [...(accidentData.incidents || [])];
    const currentNested = incidents[index][parent] || { name: '', date: '', time: '' };
    incidents[index] = {
      ...incidents[index],
      [parent]: { ...currentNested, [field]: value }
    };
    onChangeAccident({ ...accidentData, incidents });
  };

  const handleDiseaseToggle = (hasDisease: boolean) => {
    if (hasDisease) {
      onChangeDisease({
        hasDisease: true,
        count: 1,
        incidents: [createEmptyDisease()]
      });
    } else {
      onChangeDisease({ hasDisease: false });
    }
  };

  const handleDiseaseCountChange = (count: number) => {
    const newCount = Math.max(1, Math.min(10, count));
    const currentIncidents = diseaseData.incidents || [];
    
    let newIncidents: DiseaseDetails[];
    if (newCount > currentIncidents.length) {
      newIncidents = [...currentIncidents];
      for (let i = currentIncidents.length; i < newCount; i++) {
        newIncidents.push(createEmptyDisease());
      }
    } else {
      newIncidents = currentIncidents.slice(0, newCount);
    }
    
    onChangeDisease({
      ...diseaseData,
      count: newCount,
      incidents: newIncidents
    });
  };

  const updateDiseaseIncident = (index: number, field: keyof DiseaseDetails, value: any) => {
    const incidents = [...(diseaseData.incidents || [])];
    incidents[index] = { ...incidents[index], [field]: value };
    onChangeDisease({ ...diseaseData, incidents });
  };

  const updateDiseaseNested = (index: number, parent: 'residentNotification' | 'noNotification', field: string, value: string) => {
    const incidents = [...(diseaseData.incidents || [])];
    const currentNested = incidents[index][parent] || (parent === 'residentNotification' ? { name: '', date: '', time: '' } : { name: '', date: '', time: '', reason: '' });
    incidents[index] = {
      ...incidents[index],
      [parent]: { ...currentNested, [field]: value }
    };
    onChangeDisease({ ...diseaseData, incidents });
  };

  const accidentIncidents = accidentData.incidents || [];
  const diseaseIncidents = diseaseData.incidents || [];

  return (
    <div className="space-y-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
      
      {/* 1. Accidentalidad Laboral */}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-2">1. Accidentalidad Laboral</h4>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="hasAccident" 
              checked={!accidentData.hasAccident} 
              onChange={() => handleAccidentToggle(false)}
              className="text-brand-primary focus:ring-brand-primary"
            />
            <span>No</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="hasAccident" 
              checked={accidentData.hasAccident} 
              onChange={() => handleAccidentToggle(true)}
              className="text-brand-primary focus:ring-brand-primary"
            />
            <span>Sí</span>
          </label>
        </div>

        {accidentData.hasAccident && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-red-50 rounded border border-red-200">
              <label className="text-sm font-medium text-gray-700">¿Cuántos accidentes?</label>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => handleAccidentCountChange((accidentData.count || 1) - 1)}
                  className="w-8 h-8 rounded-full bg-red-200 hover:bg-red-300 text-red-800 font-bold"
                >
                  −
                </button>
                <input 
                  type="number" 
                  min="1" 
                  max="10"
                  value={accidentData.count || 1}
                  onChange={(e) => handleAccidentCountChange(parseInt(e.target.value) || 1)}
                  className="w-16 text-center border border-gray-300 rounded p-1"
                />
                <button 
                  type="button"
                  onClick={() => handleAccidentCountChange((accidentData.count || 1) + 1)}
                  className="w-8 h-8 rounded-full bg-red-200 hover:bg-red-300 text-red-800 font-bold"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {accidentIncidents.map((incident, index) => (
                <AccidentForm
                  key={index}
                  index={index}
                  total={accidentIncidents.length}
                  incident={incident}
                  onUpdate={(field, value) => updateAccidentIncident(index, field, value)}
                  onUpdateNested={(parent, field, value) => updateAccidentNested(index, parent, field, value)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* 2. Enfermedad Laboral */}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-2">2. Enfermedad Laboral</h4>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="hasDisease" 
              checked={!diseaseData.hasDisease} 
              onChange={() => handleDiseaseToggle(false)}
              className="text-brand-primary focus:ring-brand-primary"
            />
            <span>No</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="radio" 
              name="hasDisease" 
              checked={diseaseData.hasDisease} 
              onChange={() => handleDiseaseToggle(true)}
              className="text-brand-primary focus:ring-brand-primary"
            />
            <span>Sí</span>
          </label>
        </div>
        
        {diseaseData.hasDisease && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded border border-yellow-200">
              <label className="text-sm font-medium text-gray-700">¿Cuántas enfermedades laborales?</label>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => handleDiseaseCountChange((diseaseData.count || 1) - 1)}
                  className="w-8 h-8 rounded-full bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold"
                >
                  −
                </button>
                <input 
                  type="number" 
                  min="1" 
                  max="10"
                  value={diseaseData.count || 1}
                  onChange={(e) => handleDiseaseCountChange(parseInt(e.target.value) || 1)}
                  className="w-16 text-center border border-gray-300 rounded p-1"
                />
                <button 
                  type="button"
                  onClick={() => handleDiseaseCountChange((diseaseData.count || 1) + 1)}
                  className="w-8 h-8 rounded-full bg-yellow-200 hover:bg-yellow-300 text-yellow-800 font-bold"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {diseaseIncidents.map((incident, index) => (
                <DiseaseForm
                  key={index}
                  index={index}
                  total={diseaseIncidents.length}
                  incident={incident}
                  onUpdate={(field, value) => updateDiseaseIncident(index, field, value)}
                  onUpdateNested={(parent, field, value) => updateDiseaseNested(index, parent, field, value)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SSTIncidentForm;
