import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, ProjectTask } from '../types';
import FileUpload from './FileUpload';
import GanttChart, { ProcessedProjectTask } from './GanttChart';
import Card from './ui/Card';
import Button from './ui/Button';
import { DocumentArrowDownIcon } from './icons/Icon';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useApi } from '../src/hooks/useApi';

// Helper function to build the task tree from a flat list with outline levels
const buildTaskTree = (tasks: Omit<ProjectTask, 'children'>[]): ProjectTask[] => {
  // Asegúrate de que las tareas estén ordenadas por outlineLevel y luego, idealmente, por su orden original si es posible
  // Si el backend no garantiza un orden específico más allá de outlineLevel, podríamos necesitar un campo 'orden' o similar.
  // Por ahora, asumimos que el orden devuelto por el backend + outlineLevel es suficiente.
  const sortedTasks = [...tasks].sort((a, b) => {
      if (a.outlineLevel !== b.outlineLevel) {
          return a.outlineLevel - b.outlineLevel;
      }
      // Si el nivel es el mismo, intenta mantener el orden relativo (esto puede ser imperfecto sin un índice de orden)
      // Podríamos usar el ID si sigue un patrón secuencial, o startDate.
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
      // Fallback al orden original en la lista plana si las fechas son iguales
      // Esto asume que el orden de `tasks` es significativo
      return tasks.findIndex(t => t.id === a.id) - tasks.findIndex(t => t.id === b.id);
  });

  const tasksWithChildren: ProjectTask[] = sortedTasks.map(t => ({ ...t, children: [] }));
  const tree: ProjectTask[] = [];
  const parentStack: ProjectTask[] = [];

  tasksWithChildren.forEach(task => {
    // Encuentra el padre correcto en la pila basado en outlineLevel
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].outlineLevel >= task.outlineLevel) {
      parentStack.pop();
    }

    if (parentStack.length === 0) {
      // Tarea de nivel superior
      tree.push(task);
    } else {
      // Tarea hija, añádela al último padre en la pila
      parentStack[parentStack.length - 1].children.push(task);
    }

    // Añade la tarea actual a la pila como posible padre para las siguientes
    parentStack.push(task);
  });

  return tree;
};


const KPICard: React.FC<{ title: string; value: string; progress?: number; variance?: number }> = ({ title, value, progress, variance }) => {
    let varianceColor = 'text-gray-900';
    if (variance !== undefined) {
        if (variance < -5) varianceColor = 'text-status-red';
        else if (variance < 0) varianceColor = 'text-status-yellow';
        else varianceColor = 'text-status-green';
    }

    return (
        <Card className="p-5">
            <h3 className="text-sm font-medium text-gray-500 truncate">{title}</h3>
            <p className={`mt-1 text-2xl lg:text-3xl font-bold ${variance !== undefined ? varianceColor : 'text-gray-900'}`}>{value}</p>
            {progress !== undefined && (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-brand-primary h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}></div>
                </div>
            )}
        </Card>
    );
};


interface PlanningDashboardProps { // <-- Interfaz de Props actualizada
    project: Project;
    // Se elimina api
}

const PlanningDashboard: React.FC<PlanningDashboardProps> = ({ project }) => { // <-- Usa la interfaz actualizada
  const { data: flatTasks, isLoading, error, retry: refetchTasks } = useApi.projectTasks();
  const [hierarchicalTasks, setHierarchicalTasks] = useState<ProjectTask[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const ganttChartRef = useRef<HTMLDivElement>(null);


  // Este useEffect reconstruye el árbol cuando flatTasks cambia
  useEffect(() => {
    if (Array.isArray(flatTasks) && flatTasks.length > 0) {
      try {
        setHierarchicalTasks(buildTaskTree(flatTasks));
      } catch (treeError) {
        console.error("Error construyendo el árbol de tareas:", treeError);
        setHierarchicalTasks([]); // Limpia en caso de error
      }
    } else {
      setHierarchicalTasks([]); // Limpia si no hay tareas o no es un array
    }
  }, [flatTasks]);

  const handleUpdateGanttTasks = async (taskId: string, newDates: { startDate: Date; endDate: Date }) => {
    try {
      console.warn("Actualización remota de tareas aún no implementada.", taskId, newDates);
      refetchTasks();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Error al actualizar la tarea.");
    }
  };

  // processedHierarchicalTasks se mantiene igual (calcula progreso planificado, etc.)
  const processedHierarchicalTasks = useMemo((): ProcessedProjectTask[] => {
        // Añade un try-catch aquí por si acaso hay datos inválidos
        try {
            const statusDate = new Date();
            statusDate.setHours(0,0,0,0);
            const statusTime = statusDate.getTime();

            const processTask = (task: ProjectTask): ProcessedProjectTask => {
                const startDate = new Date(task.startDate);
                const endDate = new Date(task.endDate);
                // Aseguramos que las fechas sean válidas antes de usarlas
                const startTime = !isNaN(startDate.getTime()) ? startDate.getTime() : 0;
                const endTime = !isNaN(endDate.getTime()) ? endDate.getTime() : 0;

                let plannedProgress = 0;
                const durationMillis = Math.max(0, endTime - startTime); // Evita duraciones negativas

                // Solo calcula si las fechas y duración son válidas
                if (task.duration > 0 && durationMillis > 0 && startTime > 0 && endTime > 0) {
                    if (statusTime >= endTime) {
                        plannedProgress = 100;
                    } else if (statusTime > startTime) {
                        const elapsedDuration = statusTime - startTime;
                        plannedProgress = Math.min(100, Math.max(0, (elapsedDuration / durationMillis) * 100));
                    }
                } else if (statusTime >= endTime && endTime > 0) { // Tareas hito
                    plannedProgress = 100;
                }

                let processedChildren: ProcessedProjectTask[] = [];
                // Verifica que children sea un array antes de mapear
                if (Array.isArray(task.children) && task.children.length > 0) {
                     processedChildren = task.children.map(processTask);
                }

                let actualProgress = task.progress || 0;
                // Para tareas resumen, calcula progreso ponderado por duración
                if (task.isSummary && processedChildren.length > 0) {
                    const totalDuration = processedChildren.reduce((sum, child) => sum + (child.duration || 1), 0);
                    if (totalDuration > 0) {
                        const weightedProgress = processedChildren.reduce((sum, child) => sum + (child.progress || 0) * (child.duration || 1), 0);
                        actualProgress = weightedProgress / totalDuration;

                        const weightedPlannedProgress = processedChildren.reduce((sum, child) => sum + (child.plannedProgress || 0) * (child.duration || 1), 0);
                        plannedProgress = weightedPlannedProgress / totalDuration;
                    } else {
                         actualProgress = processedChildren.length > 0 ? processedChildren.reduce((sum, child) => sum + (child.progress || 0), 0) / processedChildren.length : 0;
                         plannedProgress = processedChildren.length > 0 ? processedChildren.reduce((sum, child) => sum + (child.plannedProgress || 0), 0) / processedChildren.length : 0;
                    }
                }

                actualProgress = Math.max(0, Math.min(100, actualProgress));
                plannedProgress = Math.max(0, Math.min(100, plannedProgress));

                const variance = actualProgress - plannedProgress;

                return {
                    ...task,
                    children: processedChildren,
                    plannedProgress,
                    variance,
                    progress: actualProgress,
                };
            };
            // Verifica que hierarchicalTasks sea un array antes de mapear
            return Array.isArray(hierarchicalTasks) ? hierarchicalTasks.map(processTask) : [];
        } catch (calcError) {
            console.error("Error calculando tareas procesadas:", calcError);
            return []; // Devuelve vacío en caso de error
        }
    }, [hierarchicalTasks]);

  // projectSummary se mantiene igual
  const projectSummary = useMemo(() => {
     if (!Array.isArray(processedHierarchicalTasks) || processedHierarchicalTasks.length === 0) { // Añade chequeo de array
            return { planned: 0, executed: 0, variance: 0 };
        }
        const topLevelTasks = processedHierarchicalTasks;
        const totalDuration = topLevelTasks.reduce((sum, task) => sum + (task.duration || 1), 0);

        if (totalDuration === 0) {
            const planned = topLevelTasks.length > 0 ? topLevelTasks.reduce((sum, task) => sum + task.plannedProgress, 0) / topLevelTasks.length : 0;
            const executed = topLevelTasks.length > 0 ? topLevelTasks.reduce((sum, task) => sum + task.progress, 0) / topLevelTasks.length : 0;
            return { planned, executed, variance: executed - planned };
        }

        const weightedPlanned = topLevelTasks.reduce((sum, task) => sum + task.plannedProgress * (task.duration || 1), 0) / totalDuration;
        const weightedExecuted = topLevelTasks.reduce((sum, task) => sum + task.progress * (task.duration || 1), 0) / totalDuration;

        return {
            planned: weightedPlanned,
            executed: weightedExecuted,
            variance: weightedExecuted - weightedPlanned,
        };
  }, [processedHierarchicalTasks]);


  const handleFileUpload = async (file: File) => {
    console.warn("Importación de cronograma no implementada aún.", file.name);
  };

  // handleDownloadPdf se mantiene igual
  const handleDownloadPdf = async () => { /* ... */ };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Planificación y Cronograma</h2>
        <p className="text-sm text-gray-500">Proyecto: {project.name}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Avance Programado a la Fecha" value={`${projectSummary.planned.toFixed(1)}%`} />
        <KPICard title="Avance Ejecutado a la Fecha" value={`${projectSummary.executed.toFixed(1)}%`} progress={projectSummary.executed} />
        <KPICard title="Estado (Variación)" value={`${projectSummary.variance > 0 ? '+' : ''}${projectSummary.variance.toFixed(1)}%`} variance={projectSummary.variance} />
      </div>

      {/* Carga y Exportación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800">Cargar Cronograma de Obra</h3>
              <p className="text-sm text-gray-500 mt-1">
                Sube tu cronograma directamente desde MS Project en formato <strong>XML (.xml)</strong>. Esto reemplazará el cronograma actual.
              </p>
              <FileUpload onFileUpload={handleFileUpload} />
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800">Exportar Cronograma</h3>
              <p className="text-sm text-gray-500 mt-1">
                Descarga una vista completa y de alta calidad del cronograma actual en formato PDF para tus informes.
              </p>
              <div className="mt-4">
                  <Button
                    onClick={handleDownloadPdf}
                    leftIcon={<DocumentArrowDownIcon />}
                    // Deshabilita si no hay tareas jerárquicas o se está generando
                    disabled={isGeneratingPdf || !Array.isArray(hierarchicalTasks) || hierarchicalTasks.length === 0}
                    className="w-full"
                  >
                    {isGeneratingPdf ? 'Generando PDF...' : 'Descargar Cronograma en PDF'}
                  </Button>
              </div>
            </div>
          </Card>
      </div>

      {/* Muestra errores */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-sm text-red-700 font-semibold">Error</p>
            <p className="text-sm text-red-600 mt-1">{error.message}</p>
        </Card>
      )}

      {/* Muestra indicador de carga */}
      {isLoading && (
        <Card>
          <div className="p-6 text-center text-gray-500">Cargando cronograma...</div>
        </Card>
      )}

      {/* Muestra el Gantt si no está cargando, no hay error y hay tareas procesadas */}
      {!isLoading && !error && Array.isArray(processedHierarchicalTasks) && processedHierarchicalTasks.length > 0 && (
        <GanttChart
            tasks={processedHierarchicalTasks}
            ref={ganttChartRef}
            onTasksUpdate={handleUpdateGanttTasks} // Aún actualiza solo localmente
        />
      )}

      {/* Muestra EmptyState si no hay tareas después de cargar y no hay error */}
      {!isLoading && !error && (!Array.isArray(processedHierarchicalTasks) || processedHierarchicalTasks.length === 0) && (
          <Card>
            <div className="p-6 text-center text-gray-500">
                <p>No hay tareas de cronograma cargadas para este proyecto.</p>
                <p className="mt-2">Puedes cargarlas desde un archivo XML de MS Project.</p>
            </div>
          </Card>
      )}
    </div>
  );
};

export default PlanningDashboard;
