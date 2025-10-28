import React, { useState } from 'react';
import { ProjectDetails, WeeklyReport, EmpleoPersonal, AvanceContrato, FrenteResumen, MetasFisicas } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { PlusIcon, XMarkIcon } from '../icons/Icon';

interface WeeklyReportGeneratorProps {
  project: ProjectDetails;
  onSave: (reportData: Omit<WeeklyReport, 'id'>) => void;
  onCancel: () => void;
}

const initialEmpleos: EmpleoPersonal = {
  adminContratista: 49,
  operativoDiurnoContratista: 23,
  operativoNocturnoContratista: 0,
  adminInterventoria: 22,
  operativoDiurnoInterventoria: 6,
  operativoNocturnoInterventoria: 0,
};

const initialAvance: AvanceContrato = {
  trabajoProgramadoSemanal: 0,
  valorProgramadoSemanal: 0,
  trabajoEjecutadoSemanal: 0,
  valorEjecutadoSemanal: 0,
  trabajoProgramadoAcumulado: 0,
  valorProgramadoAcumulado: 0,
  trabajoEjecutadoAcumulado: 0,
  valorEjecutadoAcumulado: 0,
};

const initialReportData = (): Omit<WeeklyReport, 'id'> => ({
    semana: 35,
    del: new Date().toISOString().split('T')[0],
    al: new Date().toISOString().split('T')[0],
    empleos: initialEmpleos,
    avanceTotalContrato: { ...initialAvance },
    avancePreliminar: { ...initialAvance },
    avanceConstruccion: { ...initialAvance },
    resumenCronograma: [],
    resumenGeneral: '',
    resumenRiesgos: '',
    resumenBIM: '',
    metasFisicas: [],
    componenteTecnico: '',
    correspondencia: '',
    componenteSST: '',
    componenteAmbiental: '',
    componenteSocial: '',
    registroFotograficoIds: [],
});


const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card>
        <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            {children}
        </div>
    </Card>
);


const WeeklyReportGenerator: React.FC<WeeklyReportGeneratorProps> = ({ project, onSave, onCancel }) => {
  const [reportData, setReportData] = useState(initialReportData);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setReportData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };
  
  const handleNestedInputChange = (section: keyof WeeklyReport, name: string, value: string | number) => {
    setReportData(prev => ({
        ...prev,
        [section]: {
            ...(prev[section] as any),
            [name]: value
        }
    }));
  };

  // --- Resumen Cronograma Handlers ---
  const handleAddFrente = () => {
    const newFrente: FrenteResumen = { id: `frente-${Date.now()}`, nombre: '', programado: 0, ejecutado: 0, variacion: 0, actividades: '' };
    setReportData(prev => ({ ...prev, resumenCronograma: [...prev.resumenCronograma, newFrente] }));
  };

  const handleFrenteChange = (index: number, field: keyof FrenteResumen, value: string | number) => {
    setReportData(prev => {
        const newResumen = [...prev.resumenCronograma];
        const frente = { ...newResumen[index], [field]: value };
        
        if (field === 'programado' || field === 'ejecutado') {
            frente.variacion = (Number(frente.ejecutado) - Number(frente.programado));
        }

        newResumen[index] = frente;
        return { ...prev, resumenCronograma: newResumen };
    });
  };

  const handleRemoveFrente = (index: number) => {
    setReportData(prev => ({ ...prev, resumenCronograma: prev.resumenCronograma.filter((_, i) => i !== index) }));
  };
  
  // --- Metas Físicas Handlers ---
  const handleAddMeta = () => {
    const newMeta: MetasFisicas = { id: `meta-${Date.now()}`, descripcion: '', unidad: '', totalProyecto: 0, progSemanal: 0, progAcumulado: 0, ejecSemanal: 0, ejecAcumulado: 0 };
    setReportData(prev => ({ ...prev, metasFisicas: [...prev.metasFisicas, newMeta] }));
  };

  const handleMetaChange = (index: number, field: keyof MetasFisicas, value: string | number) => {
    setReportData(prev => {
        const newMetas = [...prev.metasFisicas];
        newMetas[index] = { ...newMetas[index], [field]: value };
        return { ...prev, metasFisicas: newMetas };
    });
  };

  const handleRemoveMeta = (index: number) => {
    setReportData(prev => ({ ...prev, metasFisicas: prev.metasFisicas.filter((_, i) => i !== index) }));
  };


  const handleSave = () => {
    onSave(reportData);
  };
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);


  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 bg-gray-100/80 backdrop-blur-sm py-4 z-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Generador de Informe Semanal</h2>
          <p className="text-sm text-gray-500">{project.name}</p>
        </div>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Informe</Button>
        </div>
      </div>
      
      {/* --- SECCIÓN 1: ANTECEDENTES --- */}
      <SectionCard title="1. Antecedentes">
        <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-md border">
                <p className="text-sm font-semibold text-gray-600">Objeto del Contrato</p>
                <p className="text-sm text-gray-800">{project.object}</p>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Número de Semana" type="number" name="semana" value={reportData.semana} onChange={handleInputChange} />
                <Input label="Fecha de Inicio (Del)" type="date" name="del" value={reportData.del} onChange={handleInputChange} required />
                <Input label="Fecha de Fin (Al)" type="date" name="al" value={reportData.al} onChange={handleInputChange} required />
            </div>
            {/* Contrato de Obra */}
            <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Contrato de Obra</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <Input label="Contratista" value={project.contractorName} readOnly />
                    <Input label="Valor Inicial" value={formatCurrency(project.initialValue)} readOnly />
                    <Input label="No. empleos adm." type="number" value={reportData.empleos.adminContratista} onChange={(e) => handleNestedInputChange('empleos', 'adminContratista', Number(e.target.value))} />
                    <Input label="No. empleos op. diurno" type="number" value={reportData.empleos.operativoDiurnoContratista} onChange={(e) => handleNestedInputChange('empleos', 'operativoDiurnoContratista', Number(e.target.value))} />
                </div>
            </fieldset>
             {/* Contrato de Interventoría */}
            <fieldset className="border p-4 rounded-md">
                <legend className="text-sm font-medium text-gray-700 px-2">Contrato de Interventoría</legend>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <Input label="Interventor" value={project.supervisorName} readOnly />
                    <Input label="Valor Inicial" value={formatCurrency(project.interventoriaInitialValue)} readOnly />
                    <Input label="No. empleos adm." type="number" value={reportData.empleos.adminInterventoria} onChange={(e) => handleNestedInputChange('empleos', 'adminInterventoria', Number(e.target.value))} />
                    <Input label="No. empleos op. diurno" type="number" value={reportData.empleos.operativoDiurnoInterventoria} onChange={(e) => handleNestedInputChange('empleos', 'operativoDiurnoInterventoria', Number(e.target.value))} />
                </div>
            </fieldset>
        </div>
      </SectionCard>
      
      {/* --- SECCIÓN 2: AVANCES --- */}
      <SectionCard title="2. Avances del Proyecto">
          <p className="text-xs text-gray-500 mb-4">Ingrese los valores monetarios para cada categoría de avance.</p>
           {/* Tablas de avance */}
          <div className="space-y-4">
              {/* Total Contrato, Preliminar, Construcción */}
          </div>
      </SectionCard>

       {/* --- Resumen Cronograma --- */}
      <SectionCard title="Resumen Cronograma">
        <div className="space-y-4">
          {reportData.resumenCronograma.map((frente, index) => (
            <div key={frente.id} className="p-4 border rounded-md relative bg-gray-50/50">
                <button type="button" onClick={() => handleRemoveFrente(index)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100"><XMarkIcon className="w-4 h-4" /></button>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input label="Frente o Componente" value={frente.nombre} onChange={e => handleFrenteChange(index, 'nombre', e.target.value)} wrapperClassName="md:col-span-4" />
                    <Input label="% Programado" type="number" value={frente.programado} onChange={e => handleFrenteChange(index, 'programado', Number(e.target.value))} />
                    <Input label="% Ejecutado" type="number" value={frente.ejecutado} onChange={e => handleFrenteChange(index, 'ejecutado', Number(e.target.value))} />
                    <Input label="% Variación" type="number" value={frente.variacion.toFixed(2)} readOnly wrapperClassName="[&_input]:bg-gray-200" />
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Actividades Realizadas y Por Realizar</label>
                    <textarea value={frente.actividades} onChange={e => handleFrenteChange(index, 'actividades', e.target.value)} rows={3} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" />
                </div>
            </div>
          ))}
          <Button onClick={handleAddFrente} variant="secondary" leftIcon={<PlusIcon />}>Añadir Frente o Componente</Button>
        </div>
      </SectionCard>

      {/* --- SECCIÓN 3: RESUMEN GENERAL --- */}
      <SectionCard title="3. Resumen General del Estado del Contrato">
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Componente Programación</label>
                <textarea name="resumenGeneral" value={reportData.resumenGeneral} onChange={handleInputChange} rows={4} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seguimiento Matriz de Riesgos</label>
                <textarea name="resumenRiesgos" value={reportData.resumenRiesgos} onChange={handleInputChange} rows={4} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Componente BIM</label>
                <textarea name="resumenBIM" value={reportData.resumenBIM} onChange={handleInputChange} rows={4} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
        </div>
      </SectionCard>
      
      {/* --- Metas Físicas --- */}
      <SectionCard title="Metas Físicas del Contrato de Obra">
          <div className="overflow-x-auto">
              <table className="w-full text-sm">
                  <thead className="text-left text-gray-600">
                      <tr>
                          <th className="pb-2 font-semibold min-w-[200px]">Descripción</th>
                          <th className="pb-2 font-semibold">Unidad</th>
                          <th className="pb-2 font-semibold">Total</th>
                          <th className="pb-2 font-semibold">Prog. Sem.</th>
                          <th className="pb-2 font-semibold">Prog. Acum.</th>
                          <th className="pb-2 font-semibold">Ejec. Sem.</th>
                          <th className="pb-2 font-semibold">Ejec. Acum.</th>
                          <th></th>
                      </tr>
                  </thead>
                  <tbody>
                      {reportData.metasFisicas.map((meta, index) => (
                          <tr key={meta.id}>
                              <td><Input value={meta.descripcion} onChange={e => handleMetaChange(index, 'descripcion', e.target.value)} /></td>
                              <td><Input value={meta.unidad} onChange={e => handleMetaChange(index, 'unidad', e.target.value)} /></td>
                              <td><Input type="number" value={meta.totalProyecto} onChange={e => handleMetaChange(index, 'totalProyecto', Number(e.target.value))} /></td>
                              <td><Input type="number" value={meta.progSemanal} onChange={e => handleMetaChange(index, 'progSemanal', Number(e.target.value))} /></td>
                              <td><Input type="number" value={meta.progAcumulado} onChange={e => handleMetaChange(index, 'progAcumulado', Number(e.target.value))} /></td>
                              <td><Input type="number" value={meta.ejecSemanal} onChange={e => handleMetaChange(index, 'ejecSemanal', Number(e.target.value))} /></td>
                              <td><Input type="number" value={meta.ejecAcumulado} onChange={e => handleMetaChange(index, 'ejecAcumulado', Number(e.target.value))} /></td>
                              <td><button type="button" onClick={() => handleRemoveMeta(index)} className="p-1 text-gray-400 hover:text-red-600"><XMarkIcon className="w-4 h-4" /></button></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
          <Button onClick={handleAddMeta} variant="secondary" leftIcon={<PlusIcon />} className="mt-4">Añadir Meta</Button>
      </SectionCard>

      {/* --- Componente Técnico --- */}
      <SectionCard title="Componente Técnico">
        <textarea name="componenteTecnico" value={reportData.componenteTecnico} onChange={handleInputChange} rows={10} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Detalle las actividades técnicas de la semana..."/>
      </SectionCard>
      
      {/* --- Correspondencia --- */}
      <SectionCard title="Correspondencia">
        <textarea name="correspondencia" value={reportData.correspondencia} onChange={handleInputChange} rows={6} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Liste la correspondencia relevante enviada y recibida..."/>
      </SectionCard>

      {/* --- Componente SST --- */}
      <SectionCard title="Componente SST">
        <textarea name="componenteSST" value={reportData.componenteSST} onChange={handleInputChange} rows={6} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Resumen de actividades de Seguridad y Salud en el Trabajo..."/>
      </SectionCard>
      
      {/* --- Componente Ambiental --- */}
      <SectionCard title="Componente Ambiental">
        <textarea name="componenteAmbiental" value={reportData.componenteAmbiental} onChange={handleInputChange} rows={6} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Resumen de actividades de gestión ambiental..."/>
      </SectionCard>
      
      {/* --- Componente Social --- */}
      <SectionCard title="Componente Social">
        <textarea name="componenteSocial" value={reportData.componenteSocial} onChange={handleInputChange} rows={6} className="block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Resumen de actividades de gestión social..."/>
      </SectionCard>
      
      {/* --- Registro Fotográfico --- */}
      <SectionCard title="Registro Fotográfico">
          <div className="text-center p-6 border-2 border-dashed rounded-lg">
              <p className="text-gray-500 mb-4">Seleccione las fotografías del módulo de Avance Fotográfico que desea incluir en este informe.</p>
              <Button variant="secondary">Seleccionar Fotos de Avance</Button>
          </div>
      </SectionCard>

    </div>
  );
};

export default WeeklyReportGenerator;
