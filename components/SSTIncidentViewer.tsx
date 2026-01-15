import React from 'react';
import { SSTAccidentData, SSTDiseaseData } from '../types';

interface SSTIncidentViewerProps {
  type: 'ACCIDENT' | 'DISEASE';
  data: SSTAccidentData | SSTDiseaseData;
}

const SSTIncidentViewer: React.FC<SSTIncidentViewerProps> = ({ type, data }) => {
  
  if (type === 'ACCIDENT') {
    const accident = data as SSTAccidentData;
    if (!accident.hasAccident || !accident.details) return null;

    const { details } = accident;
    const isSevere = details.severity === 'GRAVE';

    return (
      <div className={`p-4 rounded-lg border-l-4 mb-4 ${isSevere ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-400'}`}>
        <h5 className={`font-bold text-sm mb-2 uppercase ${isSevere ? 'text-red-800' : 'text-orange-800'}`}>
           🚨 Reporte de Accidente Laboral ({details.severity})
        </h5>
        <div className="text-sm text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
            <p><strong>Accidentado:</strong> {details.injuredName} ({details.injuredRole})</p>
            <p><strong>Empresa:</strong> {details.contractorCompany}</p>
            <p><strong>Lugar:</strong> {details.location}</p>
            <p><strong>Hora:</strong> {details.time}</p>
            <p className="md:col-span-2"><strong>Descripción:</strong> {details.description}</p>
            <div className="flex gap-4 md:col-span-2 text-xs">
                <span className={details.firstAid ? 'text-green-700 font-bold' : 'text-gray-500'}>{details.firstAid ? '✅ Primeros Auxilios' : '❌ Sin Primeros Auxilios'}</span>
                <span className={details.furat ? 'text-green-700 font-bold' : 'text-gray-500'}>{details.furat ? '✅ FURAT Generado' : '❌ Sin FURAT'}</span>
            </div>
            <p className="md:col-span-2"><strong>Testigos:</strong> {details.witnesses}</p>
            <p><strong>Resp. Técnico:</strong> {details.technicalResponsible}</p>
            <p><strong>Resp. SST:</strong> {details.sstResponsible}</p>
            
            {(details.reportedToBoss || details.reportedToInterventoria) && (
                <div className="md:col-span-2 mt-2 pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {details.reportedToBoss && details.reportedToBossDetails && (
                        <div>
                            <strong>Reportado a Jefe:</strong><br/>
                            {details.reportedToBossDetails.name} <br/>
                            {details.reportedToBossDetails.date} {details.reportedToBossDetails.time}
                        </div>
                    )}
                    {details.reportedToInterventoria && details.reportedToInterventoriaDetails && (
                        <div>
                            <strong>Reportado a Interventoría:</strong><br/>
                            {details.reportedToInterventoriaDetails.name} <br/>
                            {details.reportedToInterventoriaDetails.date} {details.reportedToInterventoriaDetails.time}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    );
  }

  if (type === 'DISEASE') {
      const disease = data as SSTDiseaseData;
      if (!disease.hasDisease || !disease.details) return null;
      const { details } = disease;
      
      return (
        <div className="p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50 mb-4">
             <h5 className="font-bold text-sm mb-2 text-blue-800 uppercase">
                ⚕️ Reporte de Enfermedad Laboral
             </h5>
             <div className="text-sm text-gray-800 space-y-1">
                 <p><strong>¿Reporte Oficial (ARL)?:</strong> {details.officialReport ? 'Sí' : 'No'}</p>
                 
                 {details.notifiedResident && details.residentNotification ? (
                     <div className="mt-2 bg-white bg-opacity-60 p-2 rounded">
                         <p className="font-semibold text-blue-900">Notificado a Residente SST:</p>
                         <p>{details.residentNotification.name}</p>
                         <p className="text-xs">{details.residentNotification.date} - {details.residentNotification.time}</p>
                     </div>
                 ) : details.noNotification ? (
                     <div className="mt-2 bg-red-100 bg-opacity-60 p-2 rounded text-red-900">
                         <p className="font-semibold">NO Notificado a Residente SST:</p>
                         <p><strong>Reporta:</strong> {details.noNotification.name}</p>
                         <p className="text-xs">{details.noNotification.date} - {details.noNotification.time}</p>
                         <p><strong>Razón:</strong> {details.noNotification.reason}</p>
                     </div>
                 ) : null}
             </div>
        </div>
      );
  }

  return null;
};

export default SSTIncidentViewer;
