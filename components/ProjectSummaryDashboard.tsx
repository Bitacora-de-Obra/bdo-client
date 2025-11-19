import React, { useEffect, useMemo, useState } from 'react';
import { ProjectDetails, ContractModification, ModificationType } from '../types';
import Card from './ui/Card';
import TimelineVisual from './TimelineVisual';
import api from '../src/services/api';

interface ProjectSummaryDashboardProps {
  project: ProjectDetails;
  contractModifications: ContractModification[];
}

const KPICard: React.FC<{ title: string; value: string | number; subValue?: string; className?: string }> = ({ title, value, subValue, className }) => (
    <Card className={`p-5 h-full flex flex-col ${className}`}>
        <h3 className="text-sm font-medium text-gray-500 truncate mb-2">{title}</h3>
        <p className="text-lg lg:text-xl xl:text-2xl font-bold text-gray-900 break-words break-all flex-grow flex items-center overflow-wrap-anywhere">{value}</p>
        {subValue && <p className="text-sm text-gray-500 mt-2">{subValue}</p>}
    </Card>
);

const ProjectSummaryDashboard: React.FC<ProjectSummaryDashboardProps> = ({ project, contractModifications }) => {
  const [capSummary, setCapSummary] = useState<{
    baseValue: number;
    cap: number;
    additionsAffecting: number;
    additionsNonAffecting: number;
    usedPercent: number;
    remainingCap: number;
  } | null>(null);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    api.contractModifications.summary().then(setCapSummary).catch(() => setCapSummary(null));
  }, []);

  const {
    totalAdditionsValue,
    totalContractValue,
    initialDurationDays,
    totalExtensionDays,
    totalDurationDays,
    currentEndDate
  } = useMemo(() => {
    const totalAdditions = contractModifications
      .filter(mod => mod.type === ModificationType.ADDITION)
      .reduce((sum, mod) => sum + (mod.value || 0), 0);
    
    const totalExtensions = contractModifications
      .filter(mod => mod.type === ModificationType.TIME_EXTENSION)
      .reduce((sum, mod) => sum + (mod.days || 0), 0);

    const startDate = new Date(project.startDate);
    const initialEndDate = new Date(project.initialEndDate);

    const initialDuration = Math.ceil((initialEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const finalEndDate = new Date(initialEndDate);
    finalEndDate.setDate(finalEndDate.getDate() + totalExtensions);
    
    return {
      totalAdditionsValue: totalAdditions,
      totalContractValue: project.initialValue + totalAdditions,
      initialDurationDays: initialDuration,
      totalExtensionDays: totalExtensions,
      totalDurationDays: initialDuration + totalExtensions,
      currentEndDate: finalEndDate.toISOString()
    };
  }, [project, contractModifications]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '$ 0';
    }
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  // Filtrar personal por búsqueda
  const filteredPersonnel = useMemo(() => {
    if (!personnelSearch.trim()) {
      return project.keyPersonnel ?? [];
    }
    const searchLower = personnelSearch.toLowerCase().trim();
    return (project.keyPersonnel ?? []).filter(
      (person) =>
        person.name.toLowerCase().includes(searchLower) ||
        person.role.toLowerCase().includes(searchLower)
    );
  }, [project.keyPersonnel, personnelSearch]);

  // Paginación del personal
  const paginatedPersonnel = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPersonnel.slice(startIndex, endIndex);
  }, [filteredPersonnel, currentPage]);

  const totalPages = Math.ceil(filteredPersonnel.length / itemsPerPage);

  // Resetear a página 1 cuando cambia el filtro de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [personnelSearch]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">{project.name}</h2>
        <p className="text-md text-gray-500 mt-1">Contrato: {project.contractId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard title="Valor Inicial" value={formatCurrency(project.initialValue)} />
        <KPICard title="Valor Adiciones" value={formatCurrency(totalAdditionsValue)} />
        <KPICard title="Valor Total Contrato" value={formatCurrency(totalContractValue)} className="bg-idu-blue/5 border-idu-blue/50" />
        
        <KPICard title="Plazo Inicial" value={`${initialDurationDays}`} subValue="días" />
        <KPICard title="Prórrogas" value={`${totalExtensionDays}`} subValue="días" />
        <KPICard title="Plazo Total Vigente" value={`${totalDurationDays}`} subValue="días" className="bg-idu-cyan/5 border-idu-cyan/50" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Tope 50%" value={formatCurrency(capSummary?.cap)} />
        <KPICard title="Usado (afecta 50%)" value={formatCurrency(capSummary?.additionsAffecting ?? 0)} subValue={`${Number(capSummary?.usedPercent ?? 0).toFixed(1)}% del contrato`} />
        <KPICard title="Restante para 50%" value={formatCurrency(capSummary?.remainingCap)} className={capSummary && capSummary.remainingCap <= 0 ? 'bg-red-50' : ''} />
        <KPICard title="Incorporaciones (no afectan)" value={formatCurrency(capSummary?.additionsNonAffecting ?? 0)} />
      </div>

      <Card>
        <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800">Línea de Tiempo del Contrato</h3>
            <div className="mt-4">
                <TimelineVisual 
                    startDate={project.startDate}
                    originalEndDate={project.initialEndDate}
                    currentEndDate={currentEndDate}
                />
            </div>
        </div>
      </Card>
      
      <Card>
        <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800">Ubicación del Proyecto y Zona de Intervención</h3>
            <div className="mt-4 aspect-video bg-gray-200 rounded-lg overflow-hidden border">
                <iframe
                    src="https://www.google.com/maps?q=Avenida+José+Celestino+Mutis+AC+63+entre+Transversal+112B+Bis+A+y+Carrera+112+Bogotá+Colombia&output=embed&zoom=15&maptype=roadmap&markers=color:red%7Clabel:Proyecto%7C4.705,-74.12"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Mapa de Ubicación del Proyecto - Avenida José Celestino Mutis entre Transversal 112B Bis A y Carrera 112"
                ></iframe>
            </div>
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-gray-800">Objeto del Contrato</h3>
          <p className="mt-2 text-gray-700 leading-relaxed">{project.object}</p>
        </div>
        <div className="border-t bg-gray-50/70 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h4 className="font-semibold text-gray-800">Contratista</h4>
                <p className="text-gray-600">{project.contractorName}</p>
            </div>
            <div>
                <h4 className="font-semibold text-gray-800">Interventoría</h4>
                <p className="text-gray-600">{project.supervisorName}</p>
            </div>
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            CIVs que Conforman el Corredor Vial
          </h3>
          {project.corredorVialElements && project.corredorVialElements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3">CIV</th>
                    <th scope="col" className="px-4 py-3 min-w-[250px]">UBICACIÓN</th>
                    <th scope="col" className="px-4 py-3">PK_ID</th>
                    <th scope="col" className="px-4 py-3">TIPO DE ELEMENTO</th>
                    <th scope="col" className="px-4 py-3">COSTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {project.corredorVialElements.map((element) => (
                    <tr key={element.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-4 py-4 font-medium text-gray-900">{element.civ}</td>
                      <td className="px-4 py-4">{element.ubicacion}</td>
                      <td className="px-4 py-4">{element.pkId}</td>
                      <td className="px-4 py-4">{element.tipoElemento}</td>
                      <td className="px-4 py-4">{element.costado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic">
              No se han registrado elementos del corredor vial para este proyecto.
            </p>
          )}
        </div>
      </Card>

      <Card>
         <div className="p-5 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-800">Personal Clave</h3>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Buscar por nombre o cargo..."
                value={personnelSearch}
                onChange={(e) => setPersonnelSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
         </div>
         <div className="divide-y divide-gray-100">
            {/* Encabezados de la tabla */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-10 gap-4 items-center bg-gray-50 border-b-2 border-gray-200">
                <div className="md:col-span-4">
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cargo</p>
                </div>
                <div className="md:col-span-3">
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Nombre</p>
                </div>
                <div className="md:col-span-1">
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Entidad</p>
                </div>
                <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dedicación</p>
                </div>
            </div>
            {filteredPersonnel.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {personnelSearch.trim() ? 'No se encontraron resultados' : 'No hay personal registrado'}
              </div>
            ) : (
              paginatedPersonnel.map(person => {
              // Debug: verificar que dedication existe
              const dedication = person.dedication ?? null;
              return (
                <div key={person.id} className="p-4 grid grid-cols-1 md:grid-cols-10 gap-4 items-center hover:bg-gray-50">
                    <div className="md:col-span-4">
                        <p className="text-sm text-gray-700">{person.role}</p>
                    </div>
                    <div className="md:col-span-3">
                        <p className="font-semibold text-gray-900">{person.name}</p>
                    </div>
                    <div className="md:col-span-1">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${person.company === 'Contratista' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {person.company}
                        </span>
                    </div>
                    <div className="md:col-span-2">
                        <p className="text-sm text-gray-700 font-medium">{dedication || '-'}</p>
                    </div>
                </div>
              );
              })
            )}
         </div>
         {/* Paginación */}
         {filteredPersonnel.length > itemsPerPage && (
           <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
             <div className="text-sm text-gray-700">
               Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPersonnel.length)} de {filteredPersonnel.length} registros
             </div>
             <div className="flex items-center gap-2">
               <button
                 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                 disabled={currentPage === 1}
                 className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Anterior
               </button>
               <div className="flex items-center gap-1">
                 {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                   if (
                     page === 1 ||
                     page === totalPages ||
                     (page >= currentPage - 1 && page <= currentPage + 1)
                   ) {
                     return (
                       <button
                         key={page}
                         onClick={() => setCurrentPage(page)}
                         className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                           currentPage === page
                             ? 'bg-brand-primary text-white'
                             : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                         }`}
                       >
                         {page}
                       </button>
                     );
                   } else if (
                     page === currentPage - 2 ||
                     page === currentPage + 2
                   ) {
                     return <span key={page} className="px-2 text-gray-500">...</span>;
                   }
                   return null;
                 })}
               </div>
               <button
                 onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                 disabled={currentPage === totalPages}
                 className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Siguiente
               </button>
             </div>
           </div>
         )}
      </Card>

    </div>
  );
};

export default ProjectSummaryDashboard;