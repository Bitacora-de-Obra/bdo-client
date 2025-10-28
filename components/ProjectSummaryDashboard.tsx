import React, { useMemo } from 'react';
import { ProjectDetails, ContractModification, ModificationType } from '../types';
import Card from './ui/Card';
import TimelineVisual from './TimelineVisual';

interface ProjectSummaryDashboardProps {
  project: ProjectDetails;
  contractModifications: ContractModification[];
}

const KPICard: React.FC<{ title: string; value: string | number; subValue?: string; className?: string }> = ({ title, value, subValue, className }) => (
    <Card className={`p-5 ${className}`}>
        <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
        <p className="mt-1 text-2xl lg:text-3xl font-bold text-gray-900 break-words">{value}</p>
        {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
    </Card>
);

const ProjectSummaryDashboard: React.FC<ProjectSummaryDashboardProps> = ({ project, contractModifications }) => {

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

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">{project.name}</h2>
        <p className="text-md text-gray-500 mt-1">Contrato: {project.contractId}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Valor Inicial" value={formatCurrency(project.initialValue)} />
        <KPICard title="Valor Adiciones" value={formatCurrency(totalAdditionsValue)} />
        <KPICard title="Valor Total Contrato" value={formatCurrency(totalContractValue)} className="lg:col-span-2 bg-idu-blue/5 border-idu-blue/50" />
        
        <KPICard title="Plazo Inicial" value={`${initialDurationDays}`} subValue="días" />
        <KPICard title="Prórrogas" value={`${totalExtensionDays}`} subValue="días" />
        <KPICard title="Plazo Total Vigente" value={`${totalDurationDays}`} subValue="días" className="lg:col-span-2 bg-idu-cyan/5 border-idu-cyan/50" />
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
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31815.1878679887!2d-74.16110996885376!3d4.63351932375544!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9c19395297e3%3A0x2502b21b0213136a!2sAv.%20Ciudad%20de%20Cali%2C%20Bogot%C3%A1!5e0!3m2!1ses-419!2sco!4v1716312573215!5m2!1ses-419!2sco"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Mapa de Ubicación del Proyecto"
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
         <div className="p-5 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Personal Clave</h3>
         </div>
         <div className="divide-y divide-gray-100">
            {project.keyPersonnel.map(person => (
                <div key={person.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-gray-50">
                    <div className="md:col-span-4">
                        <p className="font-semibold text-gray-900">{person.name}</p>
                        <p className="text-sm text-gray-500">{person.role}</p>
                    </div>
                    <div className="md:col-span-2">
                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${person.company === 'Contratista' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {person.company}
                        </span>
                    </div>
                    <div className="md:col-span-3 text-sm text-gray-700">
                        <a href={`mailto:${person.email}`} className="hover:text-brand-primary">{person.email}</a>
                    </div>
                     <div className="md:col-span-3 text-sm text-gray-700">
                        <a href={`tel:${person.phone}`} className="hover:text-brand-primary">{person.phone}</a>
                    </div>
                </div>
            ))}
         </div>
      </Card>

    </div>
  );
};

export default ProjectSummaryDashboard;