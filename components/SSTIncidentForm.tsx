import React, { useEffect } from 'react';
import Input from './ui/Input';
import { SSTAccidentData, SSTDiseaseData } from '../types';

interface SSTIncidentFormProps {
  accidentData: SSTAccidentData;
  onChangeAccident: (data: SSTAccidentData) => void;
  diseaseData: SSTDiseaseData;
  onChangeDisease: (data: SSTDiseaseData) => void;
}

const SSTIncidentForm: React.FC<SSTIncidentFormProps> = ({
  accidentData,
  onChangeAccident,
  diseaseData,
  onChangeDisease
}) => {
  
  // Handlers for Accident Data
  const handleAccidentToggle = (hasAccident: boolean) => {
    onChangeAccident({
      ...accidentData,
      hasAccident,
      details: hasAccident ? (accidentData.details || {
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
      }) : undefined
    });
  };

  const updateAccidentDetail = (field: keyof NonNullable<SSTAccidentData['details']>, value: any) => {
    if (!accidentData.details) return;
    onChangeAccident({
      ...accidentData,
      details: { ...accidentData.details, [field]: value }
    });
  };
  
  const updateAccidentNested = (parent: 'reportedToBossDetails' | 'reportedToInterventoriaDetails', field: string, value: string) => {
     if (!accidentData.details) return;
     const currentNested = accidentData.details[parent] || { name: '', date: '', time: '' };
     onChangeAccident({
        ...accidentData,
        details: {
           ...accidentData.details,
           [parent]: { ...currentNested, [field]: value }
        }
     });
  };

  // Handlers for Disease Data
  const handleDiseaseToggle = (hasDisease: boolean) => {
    onChangeDisease({
      ...diseaseData,
      hasDisease,
      details: hasDisease ? (diseaseData.details || {
        officialReport: false,
        notifiedResident: false
      }) : undefined
    });
  };

  const updateDiseaseDetail = (field: keyof NonNullable<SSTDiseaseData['details']>, value: any) => {
    if (!diseaseData.details) return;
    onChangeDisease({
      ...diseaseData,
      details: { ...diseaseData.details, [field]: value }
    });
  };
  
  const updateDiseaseNested = (parent: 'residentNotification' | 'noNotification', field: string, value: string) => {
      if (!diseaseData.details) return;
      const currentNested = diseaseData.details[parent] || (parent === 'residentNotification' ? { name: '', date: '', time: '' } : { name: '', date: '', time: '', reason: '' });
      onChangeDisease({
          ...diseaseData,
          details: {
              ...diseaseData.details,
              [parent]: { ...currentNested, [field]: value }
          }
      });
  };

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

        {accidentData.hasAccident && accidentData.details && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-brand-primary">
            {/* Severity */}
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de accidente</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                        <input type="radio" checked={accidentData.details.severity === 'LEVE'} onChange={() => updateAccidentDetail('severity', 'LEVE')} /> Leve
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" checked={accidentData.details.severity === 'GRAVE'} onChange={() => updateAccidentDetail('severity', 'GRAVE')} /> Grave
                    </label>
                </div>
            </div>

            <Input label="Nombre y apellido accidentado" value={accidentData.details.injuredName || ''} onChange={(e) => updateAccidentDetail('injuredName', e.target.value)} />
            <Input label="Cargo" value={accidentData.details.injuredRole || ''} onChange={(e) => updateAccidentDetail('injuredRole', e.target.value)} />
            <Input label="Empresa contratante" value={accidentData.details.contractorCompany || ''} onChange={(e) => updateAccidentDetail('contractorCompany', e.target.value)} />
            <Input label="Lugar (Dirección / Frente / CIV)" value={accidentData.details.location || ''} onChange={(e) => updateAccidentDetail('location', e.target.value)} />
            
            <Input label="Hora del accidente" type="time" value={accidentData.details.time || ''} onChange={(e) => updateAccidentDetail('time', e.target.value)} />
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del accidente</label>
                <textarea 
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  rows={3}
                  value={accidentData.details.description || ''}
                  onChange={(e) => updateAccidentDetail('description', e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" checked={accidentData.details.firstAid || false} onChange={(e) => updateAccidentDetail('firstAid', e.target.checked)} />
                <label className="text-sm text-gray-700 font-medium">Prestación de primeros auxilios</label>
            </div>
             <div className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" checked={accidentData.details.furat || false} onChange={(e) => updateAccidentDetail('furat', e.target.checked)} />
                <label className="text-sm text-gray-700 font-medium">FURAT Generado</label>
            </div>
            
            <div className="md:col-span-2">
                <Input label="Testigos (Nombres, Apellidos, Cargo, Empresa)" value={accidentData.details.witnesses || ''} onChange={(e) => updateAccidentDetail('witnesses', e.target.value)} placeholder="Ej: Juan Perez (Obrero - Empresa X), Maria..." />
            </div>

            <Input label="Responsable técnico frente de obra" value={accidentData.details.technicalResponsible || ''} onChange={(e) => updateAccidentDetail('technicalResponsible', e.target.value)} />
            <Input label="Responsable SST que reporta" value={accidentData.details.sstResponsible || ''} onChange={(e) => updateAccidentDetail('sstResponsible', e.target.value)} />

            {/* Reported to Boss */}
            <div className="md:col-span-2 p-3 bg-white rounded border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" checked={accidentData.details.reportedToBoss || false} onChange={(e) => updateAccidentDetail('reportedToBoss', e.target.checked)} />
                    <label className="font-medium text-sm">¿Reportó a Jefe Inmediato?</label>
                </div>
                {accidentData.details.reportedToBoss && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                        <Input label="Nombre" value={accidentData.details.reportedToBossDetails?.name || ''} onChange={(e) => updateAccidentNested('reportedToBossDetails', 'name', e.target.value)} />
                        <Input label="Fecha" type="date" value={accidentData.details.reportedToBossDetails?.date || ''} onChange={(e) => updateAccidentNested('reportedToBossDetails', 'date', e.target.value)} />
                        <Input label="Hora" type="time" value={accidentData.details.reportedToBossDetails?.time || ''} onChange={(e) => updateAccidentNested('reportedToBossDetails', 'time', e.target.value)} />
                    </div>
                )}
            </div>

            {/* Reported to Interventoría */}
            <div className="md:col-span-2 p-3 bg-white rounded border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" checked={accidentData.details.reportedToInterventoria || false} onChange={(e) => updateAccidentDetail('reportedToInterventoria', e.target.checked)} />
                    <label className="font-medium text-sm">¿Reportó a Interventoría?</label>
                </div>
                {accidentData.details.reportedToInterventoria && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                        <Input label="Nombre (Interventoría)" value={accidentData.details.reportedToInterventoriaDetails?.name || ''} onChange={(e) => updateAccidentNested('reportedToInterventoriaDetails', 'name', e.target.value)} />
                        <Input label="Fecha" type="date" value={accidentData.details.reportedToInterventoriaDetails?.date || ''} onChange={(e) => updateAccidentNested('reportedToInterventoriaDetails', 'date', e.target.value)} />
                        <Input label="Hora" type="time" value={accidentData.details.reportedToInterventoriaDetails?.time || ''} onChange={(e) => updateAccidentNested('reportedToInterventoriaDetails', 'time', e.target.value)} />
                    </div>
                )}
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
        
        {diseaseData.hasDisease && diseaseData.details && (
            <div className="space-y-4 pl-4 border-l-2 border-brand-primary">
                <div className="flex items-center gap-2">
                    <input type="checkbox" checked={diseaseData.details.officialReport || false} onChange={(e) => updateDiseaseDetail('officialReport', e.target.checked)} />
                    <label className="text-sm font-medium text-gray-700">¿El reporte es oficial por ARL u otra entidad?</label>
                </div>
                
                {/* Notified Resident Logic */}
                <div className="p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">¿Se notificó al Residente SST del Contrato?</p>
                    <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2">
                            <input type="radio" 
                                checked={diseaseData.details.notifiedResident} 
                                onChange={() => updateDiseaseDetail('notifiedResident', true)} 
                            /> Sí
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" 
                                checked={!diseaseData.details.notifiedResident} 
                                onChange={() => updateDiseaseDetail('notifiedResident', false)} 
                            /> No
                        </label>
                    </div>

                    {diseaseData.details.notifiedResident ? (
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-green-50 p-2 rounded">
                            <Input label="Nombre Residente SST" value={diseaseData.details.residentNotification?.name || ''} onChange={(e) => updateDiseaseNested('residentNotification', 'name', e.target.value)} />
                            <Input label="Fecha" type="date" value={diseaseData.details.residentNotification?.date || ''} onChange={(e) => updateDiseaseNested('residentNotification', 'date', e.target.value)} />
                            <Input label="Hora" type="time" value={diseaseData.details.residentNotification?.time || ''} onChange={(e) => updateDiseaseNested('residentNotification', 'time', e.target.value)} />
                        </div>
                    ) : (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-red-50 p-2 rounded">
                            <Input label="Nombre (Quién reporta/no reportó)" value={diseaseData.details.noNotification?.name || ''} onChange={(e) => updateDiseaseNested('noNotification', 'name', e.target.value)} />
                            <Input label="Fecha" type="date" value={diseaseData.details.noNotification?.date || ''} onChange={(e) => updateDiseaseNested('noNotification', 'date', e.target.value)} />
                            <Input label="Hora" type="time" value={diseaseData.details.noNotification?.time || ''} onChange={(e) => updateDiseaseNested('noNotification', 'time', e.target.value)} />
                             <div className="sm:col-span-2">
                                <Input label="¿Por qué no?" value={diseaseData.details.noNotification?.reason || ''} onChange={(e) => updateDiseaseNested('noNotification', 'reason', e.target.value)} />
                             </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default SSTIncidentForm;
