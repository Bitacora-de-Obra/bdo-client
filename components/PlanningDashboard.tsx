import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, ProjectTask } from '../types';
import FileUpload from './FileUpload';
import GanttChart, { ProcessedProjectTask } from './GanttChart';
import Card from './ui/Card';
import Button from './ui/Button';
import { DocumentArrowDownIcon, CalendarIcon, ListBulletIcon } from './icons/Icon';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useApi } from '../src/hooks/useApi';
import api from '../src/services/api';

type ProjectTaskImportPayload = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  duration: number;
  isSummary: boolean;
  outlineLevel: number;
  dependencies: string[];
};

const formatFullDate = (date: Date | null) =>
  date
    ? date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';

const getTextContent = (element: Element, tagName: string): string => {
  const child = element.getElementsByTagName(tagName)[0];
  return child?.textContent?.trim() ?? "";
};

const createIsoDate = (value: string): string => {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const computeDurationInDays = (durationText: string, startIso: string, endIso: string): number => {
  let totalDays = 0;
  if (durationText) {
    const regex = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/i;
    const match = durationText.match(regex);
    if (match) {
      const days = Number(match[1] || 0);
      const hours = Number(match[2] || 0);
      const minutes = Number(match[3] || 0);
      const seconds = Number(match[4] || 0);
      const additionalDays = (hours + minutes / 60 + seconds / 3600) / 8; // Suponiendo jornadas de 8h
      totalDays = days + additionalDays;
    }
  }

  if (!totalDays || !Number.isFinite(totalDays) || totalDays <= 0) {
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
      const diff = end.getTime() - start.getTime();
      totalDays = diff / (1000 * 60 * 60 * 24);
    }
  }

  if (!totalDays || !Number.isFinite(totalDays) || totalDays <= 0) {
    return 1;
  }

  return Math.max(1, Math.round(totalDays));
};

const parseMsProjectXml = async (file: File): Promise<ProjectTaskImportPayload[]> => {
  const xmlText = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("El archivo XML no es válido. Asegúrate de exportarlo desde MS Project.");
  }

  const taskNodes = Array.from(doc.getElementsByTagName("Task"));
  const tasks: ProjectTaskImportPayload[] = [];
  const seenIds = new Set<string>();

  for (const taskNode of taskNodes) {
    const uid = getTextContent(taskNode, "UID");
    if (!uid || uid === "0" || seenIds.has(uid)) {
      continue;
    }

    const name = getTextContent(taskNode, "Name") || `Tarea ${uid}`;
    const startIso = createIsoDate(getTextContent(taskNode, "Start"));
    const endIsoFromXml = getTextContent(taskNode, "Finish");
    const endIso = createIsoDate(endIsoFromXml || startIso);
    const outlineLevelValue = parseInt(getTextContent(taskNode, "OutlineLevel"), 10);
    const outlineLevel = Number.isFinite(outlineLevelValue) && outlineLevelValue > 0 ? outlineLevelValue : 1;
    const summaryFlag = getTextContent(taskNode, "Summary");
    const isSummary = summaryFlag === "1" || summaryFlag.toLowerCase() === "true";
    const percentComplete = parseInt(getTextContent(taskNode, "PercentComplete"), 10);
    const progress = Math.max(0, Math.min(100, Number.isFinite(percentComplete) ? percentComplete : 0));
    const durationText = getTextContent(taskNode, "Duration");
    const duration = computeDurationInDays(durationText, startIso, endIso);

    const dependencies = Array.from(taskNode.getElementsByTagName("PredecessorLink"))
      .map((link) => getTextContent(link, "PredecessorUID"))
      .filter((value) => value && value !== uid);

    tasks.push({
      id: uid,
      name,
      startDate: startIso,
      endDate: endIso,
      progress,
      duration,
      isSummary,
      outlineLevel,
      dependencies,
    });

    seenIds.add(uid);
  }

  if (!tasks.length) {
    throw new Error("No se encontraron tareas válidas dentro del archivo XML proporcionado.");
  }

  return tasks;
};

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
  const ganttGridRef = useRef<HTMLDivElement>(null);
  const ganttExportRef = useRef<HTMLDivElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);


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

  const flattenedTasks = useMemo(() => {
    const tasks: ProjectTask[] = [];
    const traverse = (items: ProjectTask[]) => {
      items.forEach((task) => {
        tasks.push(task);
        if (Array.isArray(task.children) && task.children.length > 0) {
          traverse(task.children);
        }
      });
    };
    traverse(processedHierarchicalTasks);
    return tasks;
  }, [processedHierarchicalTasks]);

  const scheduleRange = useMemo(() => {
    if (!flattenedTasks.length) {
      return { start: null as Date | null, end: null as Date | null, days: 0 };
    }
    const start = new Date(
      Math.min(...flattenedTasks.map((task) => new Date(task.startDate).getTime()))
    );
    const end = new Date(
      Math.max(...flattenedTasks.map((task) => new Date(task.endDate).getTime()))
    );
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
    return { start, end, days };
  }, [flattenedTasks]);


  const handleFileUpload = async (file: File) => {
    try {
      setUploadStatus({ type: 'info', message: `Procesando cronograma "${file.name}"...` });
      const tasksToImport = await parseMsProjectXml(file);
      await api.projectTasks.import(tasksToImport);
      await refetchTasks();
      setUploadStatus({
        type: 'success',
        message: `Cronograma actualizado con ${tasksToImport.length} tareas.`,
      });
    } catch (err: any) {
      const message = err?.message || 'No se pudo procesar el cronograma.';
      setUploadStatus({ type: 'error', message });
      throw err instanceof Error ? err : new Error(message);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ganttExportRef.current || isGeneratingPdf) {
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const canvas = await html2canvas(ganttExportRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        scrollY: -window.scrollY,
      });

      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);

      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imageData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`cronograma-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (pdfError) {
      console.error('Error generando PDF del cronograma:', pdfError);
      setUploadStatus({
        type: 'error',
        message: 'No se pudo generar el PDF. Intenta nuevamente o reduce el zoom.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 border-brand-primary/20 bg-brand-primary/5">
          <div className="flex items-center gap-3 text-brand-primary">
            <CalendarIcon className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Fecha de Inicio</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-gray-900">{formatFullDate(scheduleRange.start)}</p>
        </Card>
        <Card className="p-5 border-brand-secondary/20 bg-brand-secondary/5">
          <div className="flex items-center gap-3 text-brand-secondary">
            <CalendarIcon className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Fecha de Finalización</span>
          </div>
          <p className="mt-3 text-lg font-semibold text-gray-900">{formatFullDate(scheduleRange.end)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 text-gray-500">
            <ListBulletIcon className="w-6 h-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Resumen del Cronograma</span>
          </div>
          <div className="mt-3 text-gray-900">
            <p className="text-lg font-semibold">{flattenedTasks.length} tareas</p>
            <p className="text-sm text-gray-600">Duración estimada de {scheduleRange.days} días calendario</p>
          </div>
        </Card>
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

      {uploadStatus && (
        <div
          className={`p-4 rounded-lg border text-sm font-medium ${
            uploadStatus.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : uploadStatus.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {uploadStatus.message}
        </div>
      )}

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
        <div ref={ganttExportRef} className="print:bg-white">
          <GanttChart
            tasks={processedHierarchicalTasks}
            ref={ganttGridRef}
            onTasksUpdate={handleUpdateGanttTasks} // Aún actualiza solo localmente
          />
        </div>
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
