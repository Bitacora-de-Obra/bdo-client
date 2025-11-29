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
import { usePermissions } from '../src/hooks/usePermissions';
import { useToast } from './ui/ToastProvider';

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
  baselineCost?: number;
  cost?: number;
};

type SCurvePoint = {
  label: string; // semana o fecha
  planned: number;
  executed: number;
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
    const baselineCost = parseFloat(getTextContent(taskNode, "BaselineCost")) || 0;
    const cost = parseFloat(getTextContent(taskNode, "Cost")) || 0;

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
      baselineCost,
      cost,
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
  const {
    data: contractorProgress,
    isLoading: isLoadingContractorProgress,
    error: contractorProgressError,
    retry: refetchContractorProgress,
  } = useApi.contractorProgress();
  const [hierarchicalTasks, setHierarchicalTasks] = useState<ProjectTask[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const ganttGridRef = useRef<HTMLDivElement>(null);
  const ganttExportRef = useRef<HTMLDivElement>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const { canEditContent } = usePermissions();
  const readOnly = !canEditContent;
  const { showToast } = useToast();
  const [isUploadingContractorProgress, setIsUploadingContractorProgress] = useState(false);


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

  const handleContractorExcelUpload = async (file: File) => {
    if (readOnly) {
      showToast({
        title: 'Acción no permitida',
        message: 'El perfil Viewer no puede actualizar el avance del contratista.',
        variant: 'error',
      });
      throw new Error('El perfil Viewer no puede actualizar el avance del contratista.');
    }

    try {
      setIsUploadingContractorProgress(true);
      setUploadStatus({
        type: 'info',
        message: `Procesando informe del contratista "${file.name}"...`,
      });
      await api.contractorProgress.importExcel(file);
      await refetchContractorProgress();
      setUploadStatus({
        type: 'success',
        message: `Avance del contratista actualizado con ${file.name}.`,
      });
    } catch (err: any) {
      const message = err?.message || 'No se pudo procesar el Excel del contratista.';
      setUploadStatus({ type: 'error', message });
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setIsUploadingContractorProgress(false);
    }
  };

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
                const weight = task.baselineCost && task.baselineCost > 0 ? task.baselineCost : (task.duration || 1);

                // Para tareas resumen, calcula progreso ponderado por costo (o duración como fallback)
                if (task.isSummary && processedChildren.length > 0) {
                    const totalWeight = processedChildren.reduce((sum, child) => {
                        const w = child.baselineCost && child.baselineCost > 0 ? child.baselineCost : (child.duration || 1);
                        return sum + w;
                    }, 0);
                    if (totalWeight > 0) {
                        const weightedProgress = processedChildren.reduce((sum, child) => {
                            const w = child.baselineCost && child.baselineCost > 0 ? child.baselineCost : (child.duration || 1);
                            return sum + (child.progress || 0) * w;
                        }, 0);
                        actualProgress = weightedProgress / totalWeight;

                        const weightedPlannedProgress = processedChildren.reduce((sum, child) => {
                            const w = child.baselineCost && child.baselineCost > 0 ? child.baselineCost : (child.duration || 1);
                            return sum + (child.plannedProgress || 0) * w;
                        }, 0);
                        plannedProgress = weightedPlannedProgress / totalWeight;
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
                    baselineCost: task.baselineCost ?? 0,
                    cost: task.cost ?? 0,
                };
            };
            // Verifica que hierarchicalTasks sea un array antes de mapear
            return Array.isArray(hierarchicalTasks) ? hierarchicalTasks.map(processTask) : [];
        } catch (calcError) {
            console.error("Error calculando tareas procesadas:", calcError);
            return []; // Devuelve vacío en caso de error
        }
    }, [hierarchicalTasks]);

  // Resumen desde MS Project (fallback)
  const msProjectSummary = useMemo(() => {
     if (!Array.isArray(processedHierarchicalTasks) || processedHierarchicalTasks.length === 0) { // Añade chequeo de array
            return { planned: 0, executed: 0, variance: 0 };
        }
        const topLevelTasks = processedHierarchicalTasks;
        const totalWeight = topLevelTasks.reduce((sum, task) => {
            const w = task.baselineCost && task.baselineCost > 0 ? task.baselineCost : (task.duration || 1);
            return sum + w;
        }, 0);

        if (totalWeight === 0) {
            const planned = topLevelTasks.length > 0 ? topLevelTasks.reduce((sum, task) => sum + task.plannedProgress, 0) / topLevelTasks.length : 0;
            const executed = topLevelTasks.length > 0 ? topLevelTasks.reduce((sum, task) => sum + task.progress, 0) / topLevelTasks.length : 0;
            return { planned, executed, variance: executed - planned };
        }

        const weightedPlanned = topLevelTasks.reduce((sum, task) => {
            const w = task.baselineCost && task.baselineCost > 0 ? task.baselineCost : (task.duration || 1);
            return sum + task.plannedProgress * w;
        }, 0) / totalWeight;
        const weightedExecuted = topLevelTasks.reduce((sum, task) => {
            const w = task.baselineCost && task.baselineCost > 0 ? task.baselineCost : (task.duration || 1);
            return sum + task.progress * w;
        }, 0) / totalWeight;

        return {
            planned: weightedPlanned,
            executed: weightedExecuted,
            variance: weightedExecuted - weightedPlanned,
        };
  }, [processedHierarchicalTasks]);

  const contractorSummary = useMemo(() => {
    if (!contractorProgress) {
      return null;
    }
    const preliminar = contractorProgress.acumulado?.preliminar || { proyectado: 0, ejecutado: 0 };
    const ejecucion = contractorProgress.acumulado?.ejecucion || { proyectado: 0, ejecutado: 0 };
    const rawPlanned = preliminar.proyectado + ejecucion.proyectado;
    const rawExecuted = preliminar.ejecutado + ejecucion.ejecutado;
    const planned = Number(Math.min(100, rawPlanned).toFixed(2));
    const executed = Number(Math.min(100, rawExecuted).toFixed(2));
    return {
      planned,
      executed,
      variance: Number((executed - planned).toFixed(2)),
      preliminar,
      ejecucion,
    };
  }, [contractorProgress]);

  const summary = contractorSummary ?? msProjectSummary;

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

  const aggregatedSCurvePoints = useMemo((): SCurvePoint[] => {
    if (!contractorProgress) {
      return [];
    }
    const grouped = new Map<number, { label: string; planned: number; executed: number }>();
    contractorProgress.semanal.forEach((row) => {
      const semanaNumber = Number(row.semana);
      const key = Number.isFinite(semanaNumber) ? semanaNumber : grouped.size + 1;
      const existing = grouped.get(key) || {
        label: String(key),
        planned: 0,
        executed: 0,
      };
      existing.planned += row.proyectado;
      existing.executed += row.ejecutado;
      grouped.set(key, existing);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => ({
        label: value.label,
        planned: Number(value.planned.toFixed(2)),
        executed: Number(value.executed.toFixed(2)),
      }));
  }, [contractorProgress]);

  const contractorStageTotals = useMemo(() => {
    if (!contractorSummary) {
      return null;
    }
    const total = {
      proyectado: Number(
        Math.min(
          100,
          contractorSummary.preliminar.proyectado + contractorSummary.ejecucion.proyectado
        ).toFixed(2)
      ),
      ejecutado: Number(
        Math.min(
          100,
          contractorSummary.preliminar.ejecutado + contractorSummary.ejecucion.ejecutado
        ).toFixed(2)
      ),
    };
    return {
      preliminar: contractorSummary.preliminar,
      ejecucion: contractorSummary.ejecucion,
      total,
    };
  }, [contractorSummary]);

  const formatWeekDate = (value?: string | null) =>
    formatFullDate(value ? new Date(value) : null);


  const handleFileUpload = async (file: File) => {
    if (readOnly) {
      showToast({
        title: 'Acción no permitida',
        message: 'El perfil Viewer no puede importar cronogramas.',
        variant: 'error',
      });
        throw new Error('El perfil Viewer no puede importar cronogramas.');
    }
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

  const renderSCurveChart = (points: SCurvePoint[]) => {
    if (!points.length) {
      return (
        <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-md p-3">
          Sube el Excel del contratista para visualizar la curva S programado vs ejecutado.
        </div>
      );
    }

    const width = 720;
    const height = 320;
    const padding = 50;
    const values = points.flatMap((p) => [p.planned, p.executed]);
    const maxValue = Math.max(100, Math.ceil(Math.max(...values)));
    const minValue = Math.min(0, Math.floor(Math.min(...values)));
    const xStep = (width - padding * 2) / Math.max(1, points.length - 1);

    const toY = (v: number) =>
      height - padding - ((v - minValue) / (maxValue - minValue)) * (height - padding * 2);
    const toX = (idx: number) => padding + idx * xStep;

    const plannedPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.planned)}`)
      .join(' ');
    const executedPath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.executed)}`)
      .join(' ');

    const yTicks = [];
    for (let t = minValue; t <= maxValue; t += 10) {
      yTicks.push(t);
    }

    return (
      <div className="space-y-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full border border-gray-200 rounded-lg bg-white">
          {/* Grid lines and Y axis labels */}
          {yTicks.map((val, idx) => {
            const y = toY(val);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
                <text x={padding - 10} y={y + 4} fontSize="10" textAnchor="end" fill="#6b7280">
                  {val}%
                </text>
              </g>
            );
          })}
          {/* X labels */}
          {points.map((p, i) => (
            <text
              key={p.label}
              x={toX(i)}
              y={height - padding + 20}
              fontSize="10"
              textAnchor="middle"
              fill="#6b7280"
            >
              {p.label}
            </text>
          ))}
          {/* Planned line */}
          <path d={plannedPath} fill="none" stroke="#1d4ed8" strokeWidth={2.5} />
          {/* Executed line */}
          <path d={executedPath} fill="none" stroke="#f97316" strokeWidth={2.5} />
          {/* Legend */}
          <g transform={`translate(${padding}, ${padding - 20})`}>
            <rect x={0} y={-10} width={12} height={3} fill="#1d4ed8" />
            <text x={18} y={-6} fontSize="11" fill="#1f2937">Proyectado</text>
            <rect x={90} y={-10} width={12} height={3} fill="#f97316" />
            <text x={106} y={-6} fontSize="11" fill="#1f2937">Ejecutado</text>
          </g>
        </svg>
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 uppercase">
              <tr>
                <th className="px-3 py-2">Semana/Fecha</th>
                <th className="px-3 py-2">% Programado</th>
                <th className="px-3 py-2">% Ejecutado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {points.map((p) => (
                <tr key={p.label} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{p.label}</td>
                  <td className="px-3 py-2 text-brand-primary font-semibold">{p.planned.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-orange-500 font-semibold">{p.executed.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
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
        <KPICard title="Avance Programado a la Fecha" value={`${summary.planned.toFixed(1)}%`} />
        <KPICard title="Avance Ejecutado a la Fecha" value={`${summary.executed.toFixed(1)}%`} progress={summary.executed} />
        <KPICard title="Estado (Variación)" value={`${summary.variance > 0 ? '+' : ''}${summary.variance.toFixed(1)}%`} variance={summary.variance} />
      </div>
      <p className="text-xs text-gray-500">
        {contractorSummary
          ? "Fuente: Informe semanal del contratista"
          : "Fuente: Cronograma MS Project"}
      </p>

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
            {canEditContent ? (
              <FileUpload onFileUpload={handleFileUpload} />
            ) : (
              <div className="mt-4 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3">
                Solo los roles Editor o Admin pueden actualizar el cronograma.
              </div>
            )}
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
                disabled={isGeneratingPdf || !Array.isArray(hierarchicalTasks) || hierarchicalTasks.length === 0}
                className="w-full"
              >
                {isGeneratingPdf ? 'Generando PDF...' : 'Descargar Cronograma en PDF'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Curva S */}
      <Card>
        <div className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Curva S (Programado vs Ejecutado)</h3>
              <p className="text-sm text-gray-500 mt-1">
                Importa el archivo <strong>Excel del informe semanal (hoja CURVAS S)</strong> para sincronizar los
                porcentajes reportados por el contratista.
              </p>
            </div>
            <div>
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm"
                className="hidden"
                id="contractor-progress-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleContractorExcelUpload(file);
                }}
              />
              <Button
                leftIcon={<DocumentArrowDownIcon />}
                onClick={() =>
                  document.getElementById("contractor-progress-upload")?.click()
                }
                variant="secondary"
                disabled={isUploadingContractorProgress}
              >
                {isUploadingContractorProgress ? 'Procesando Excel...' : 'Cargar Excel del contratista'}
              </Button>
            </div>
          </div>
          {isLoadingContractorProgress ? (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-md p-3">
              Cargando avance del contratista...
            </div>
          ) : contractorProgressError ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {contractorProgressError.message || 'No se pudo cargar el avance del contratista.'}
            </div>
          ) : (
            <>
              {renderSCurveChart(aggregatedSCurvePoints)}
              {contractorStageTotals ? (
                <div className="space-y-2">
                  <div className="overflow-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                        <tr>
                          <th className="px-3 py-2 text-left">Etapa</th>
                          <th className="px-3 py-2 text-right">% Proyectado</th>
                          <th className="px-3 py-2 text-right">% Ejecutado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-800">Preliminar</td>
                          <td className="px-3 py-2 text-right">{contractorStageTotals.preliminar.proyectado.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{contractorStageTotals.preliminar.ejecutado.toFixed(2)}%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-800">Ejecución</td>
                          <td className="px-3 py-2 text-right">{contractorStageTotals.ejecucion.proyectado.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{contractorStageTotals.ejecucion.ejecutado.toFixed(2)}%</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="px-3 py-2 font-semibold text-gray-900">Total contrato</td>
                          <td className="px-3 py-2 text-right">{contractorStageTotals.total.proyectado.toFixed(2)}%</td>
                          <td className="px-3 py-2 text-right">{contractorStageTotals.total.ejecutado.toFixed(2)}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500">
                    Semana {contractorProgress?.weekNumber ?? '—'} · {formatWeekDate(contractorProgress?.weekStart)} - {formatWeekDate(contractorProgress?.weekEnd)} · Fuente: Excel del contratista
                  </p>
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-md p-3">
                  Aún no se ha cargado el informe semanal del contratista.
                </div>
              )}
            </>
          )}
        </div>
      </Card>

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
