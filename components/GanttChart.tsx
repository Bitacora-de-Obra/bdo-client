import React, { useState, useMemo, forwardRef, useEffect, useRef, useCallback } from 'react';
import { ProjectTask } from '../types';
import Card from './ui/Card';
import { ChevronDownIcon, PlusIcon, XMarkIcon } from './icons/Icon';

// --- Type Extension ---
export interface ProcessedProjectTask extends ProjectTask {
    plannedProgress: number;
    variance: number;
    children: ProcessedProjectTask[];
}


const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

// --- Configuration ---
const TASK_COL_WIDTH = 320;
const PROGRESS_COL_WIDTH = 90;
const BASE_DAY_COL_WIDTH = 30;
const ROW_HEIGHT = 32;

// --- Helper Components ---
const TaskCell: React.FC<{ task: ProcessedProjectTask; onToggle: () => void; isExpanded: boolean }> = ({ task, onToggle, isExpanded }) => (
  <div className="flex items-center h-full" style={{ paddingLeft: `${(task.outlineLevel - 1) * 1.5}rem` }}>
    {task.children.length > 0 ? (
      <button onClick={onToggle} className="mr-1 p-0.5 rounded hover:bg-gray-200">
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
      </button>
    ) : (
      <span className="w-5 mr-1"></span> // Placeholder for alignment
    )}
    <span className={`truncate ${task.isSummary ? 'font-bold' : ''}`}>{task.name}</span>
  </div>
);

const getBarColor = (variance: number): string => {
    if (variance < -10) return 'bg-status-red'; // Significantly behind
    if (variance < 0) return 'bg-status-yellow text-gray-800'; // Slightly behind
    return 'bg-brand-primary'; // On track or ahead
};


const GanttBar: React.FC<{ 
    task: ProcessedProjectTask; 
    dayOffset: number; 
    dayWidth: number;
    onHover: (e: React.MouseEvent, task: ProcessedProjectTask) => void; 
    onLeave: () => void;
    onInteractionStart: (type: 'move' | 'resize-end' | 'resize-start', e: React.MouseEvent, task: ProcessedProjectTask) => void;
}> = ({ task, dayOffset, dayWidth, onHover, onLeave, onInteractionStart }) => (
    <div 
        className="h-full py-1 group"
        style={{
            gridColumn: `${dayOffset} / span ${task.duration}`,
            gridRow: 1,
        }}
        onMouseEnter={(e) => onHover(e, task)}
        onMouseLeave={onLeave}
    >
        <div 
            className={`relative h-full rounded flex items-center ${task.isSummary ? 'bg-gray-700 cursor-default' : getBarColor(task.variance) + ' cursor-move'} text-white text-xs overflow-hidden`}
            onMouseDown={(e) => !task.isSummary && onInteractionStart('move', e, task)}
        >
            {!task.isSummary && (
              <>
                <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" onMouseDown={(e) => onInteractionStart('resize-start', e, task)} />
                <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10" onMouseDown={(e) => onInteractionStart('resize-end', e, task)} />
              </>
            )}
            <div 
                className={`h-full opacity-40 ${task.isSummary ? 'bg-gray-500' : 'bg-brand-accent'}`} 
                style={{ width: `${task.progress}%` }}
            ></div>
            <span className="absolute left-2 right-2 truncate" title={`${task.progress}%`}>{task.progress}%</span>
        </div>
    </div>
);

const Tooltip: React.FC<{ task: Partial<ProcessedProjectTask>; position: { top: number; left: number } }> = ({ task, position }) => (
    <div 
        className="fixed z-30 p-3 bg-white rounded-lg shadow-xl border text-sm text-gray-800 max-w-xs pointer-events-none"
        style={{ top: position.top, left: position.left, transform: 'translateY(10px)' }}
    >
        <p className="font-bold">{task.name}</p>
        {task.startDate && <p><strong>Inicio:</strong> {formatDate(task.startDate)}</p>}
        {task.endDate && <p><strong>Fin:</strong> {formatDate(task.endDate)}</p>}
        {task.duration && <p><strong>Duración:</strong> {task.duration} días</p>}
        {task.plannedProgress !== undefined && <p><strong>Avance Planificado:</strong> {task.plannedProgress.toFixed(1)}%</p>}
        {task.progress !== undefined && <p><strong>Avance Real:</strong> {task.progress.toFixed(1)}%</p>}
        {task.variance !== undefined && <p><strong>Variación:</strong> <span className={task.variance < 0 ? 'text-red-500' : 'text-green-600'}>{task.variance.toFixed(1)}%</span></p>}
    </div>
);


// --- Main Component ---
const GanttChart = forwardRef<HTMLDivElement, { tasks: ProcessedProjectTask[], onTasksUpdate: (taskId: string, newDates: { startDate: Date, endDate: Date }) => void }>(({ tasks, onTasksUpdate }, ref) => {
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(() => {
        const initialExpanded = new Set<string>();
        const expandAll = (taskList: ProcessedProjectTask[]) => {
            taskList.forEach(t => {
                if (t.isSummary && t.children.length > 0) {
                    initialExpanded.add(t.id);
                    expandAll(t.children);
                }
            });
        };
        expandAll(tasks);
        return initialExpanded;
    });

    const [dayWidth, setDayWidth] = useState(BASE_DAY_COL_WIDTH);
    const [hoveredTask, setHoveredTask] = useState<{ task: ProcessedProjectTask; position: { top: number; left: number } } | null>(null);
    const [interaction, setInteraction] = useState<{
        type: 'move' | 'resize-end' | 'resize-start';
        task: ProcessedProjectTask;
        initialX: number;
        initialStartDate: Date;
        initialEndDate: Date;
        ghostPosition?: { left: number; width: number; task: Partial<ProcessedProjectTask> }
    } | null>(null);

    const timelineRef = useRef<HTMLDivElement>(null);

    const toggleExpand = (taskId: string) => {
        setExpandedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) newSet.delete(taskId);
            else newSet.add(taskId);
            return newSet;
        });
    };

    const visibleTasks = useMemo(() => {
        const result: ProcessedProjectTask[] = [];
        const addTasks = (taskList: ProcessedProjectTask[]) => {
            taskList.forEach(task => {
                result.push(task);
                if (expandedTasks.has(task.id)) {
                    addTasks(task.children);
                }
            });
        };
        addTasks(tasks);
        return result;
    }, [tasks, expandedTasks]);

    const { minDate, totalDays } = useMemo(() => {
        if (!tasks || tasks.length === 0) return { minDate: new Date(), totalDays: 30 };
        let allDates: Date[] = [];
        const collectDates = (taskList: ProjectTask[]) => {
            taskList.forEach(t => {
                allDates.push(new Date(t.startDate));
                allDates.push(new Date(t.endDate));
                collectDates(t.children);
            });
        };
        collectDates(tasks);
        if (allDates.length === 0) return { minDate: new Date(), totalDays: 30 };
        let min = new Date(Math.min(...allDates.map(d => d.getTime())));
        let max = new Date(Math.max(...allDates.map(d => d.getTime())));
        min.setDate(min.getDate() - 7);
        max.setDate(max.getDate() + 14);
        const duration = (max.getTime() - min.getTime()) / (1000 * 3600 * 24);
        return { minDate: min, totalDays: Math.ceil(duration) };
    }, [tasks]);
    
    const todayOffset = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return Math.floor((today.getTime() - minDate.getTime()) / (1000 * 3600 * 24)) + 1;
    }, [minDate]);

    const getDayOffset = (date: Date) => Math.floor((date.getTime() - minDate.getTime()) / (1000 * 3600 * 24)) + 1;
    
    const getDateFromOffset = (offset: number): Date => {
        const newDate = new Date(minDate);
        newDate.setDate(newDate.getDate() + offset - 1);
        return newDate;
    };


    const handleInteractionStart = (type: 'move' | 'resize-end' | 'resize-start', e: React.MouseEvent, task: ProcessedProjectTask) => {
        e.preventDefault();
        e.stopPropagation();
        setInteraction({
            type,
            task,
            initialX: e.clientX,
            initialStartDate: new Date(task.startDate),
            initialEndDate: new Date(task.endDate),
        });
    };
    
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!interaction) return;
        
        const deltaX = e.clientX - interaction.initialX;
        const deltaDays = Math.round(deltaX / dayWidth);
        
        let newStartDate = new Date(interaction.initialStartDate);
        let newEndDate = new Date(interaction.initialEndDate);

        if (interaction.type === 'move') {
            newStartDate.setDate(interaction.initialStartDate.getDate() + deltaDays);
            newEndDate.setDate(interaction.initialEndDate.getDate() + deltaDays);
        } else if (interaction.type === 'resize-end') {
            newEndDate.setDate(interaction.initialEndDate.getDate() + deltaDays);
            if (newEndDate <= newStartDate) newEndDate.setDate(newStartDate.getDate() + 1);
        } else if (interaction.type === 'resize-start') {
            newStartDate.setDate(interaction.initialStartDate.getDate() + deltaDays);
            if (newStartDate >= newEndDate) newStartDate.setDate(newEndDate.getDate() - 1);
        }
        
        const duration = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 3600 * 24));

        setInteraction(prev => prev && ({
            ...prev,
            ghostPosition: {
                left: getDayOffset(newStartDate),
                width: duration,
                task: { ...prev.task, startDate: newStartDate.toISOString(), endDate: newEndDate.toISOString(), duration }
            }
        }));

        // Update tooltip while dragging
        if (interaction.ghostPosition?.task) {
            const rect = timelineRef.current?.getBoundingClientRect();
            if (rect) {
                setHoveredTask({
                    task: interaction.ghostPosition.task as ProcessedProjectTask,
                    position: { top: e.clientY - rect.top + 20, left: e.clientX - rect.left }
                });
            }
        }

    }, [interaction, dayWidth, minDate]);
    
    const handleMouseUp = useCallback(() => {
        if (interaction?.ghostPosition) {
            const { task, ghostPosition } = interaction;
            const newStartDate = getDateFromOffset(ghostPosition.left);
            const newEndDate = getDateFromOffset(ghostPosition.left + ghostPosition.width -1);
            onTasksUpdate(task.id, { startDate: newStartDate, endDate: newEndDate });
        }
        setInteraction(null);
    }, [interaction, onTasksUpdate, minDate]);

    useEffect(() => {
        if (interaction) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [interaction, handleMouseMove, handleMouseUp]);

    const handleMouseEnter = (e: React.MouseEvent, task: ProcessedProjectTask) => {
        if (!interaction) {
             setHoveredTask({ task, position: { top: e.clientY + 15, left: e.clientX } });
        }
    };

    const handleMouseLeave = () => {
        if (!interaction) {
            setHoveredTask(null);
        }
    };
    
    const gridTemplateColumns = `${TASK_COL_WIDTH}px repeat(3, ${PROGRESS_COL_WIDTH}px) repeat(${totalDays}, ${dayWidth}px)`;

    return (
        <Card>
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Cronograma de Obra (Gantt)</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Zoom:</span>
                     <button onClick={() => setDayWidth(w => Math.max(10, w - 5))} className="p-1 rounded-md hover:bg-gray-200">-</button>
                    <button onClick={() => setDayWidth(w => Math.min(60, w + 5))} className="p-1 rounded-md hover:bg-gray-200">+</button>
                </div>
            </div>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-brand-primary"></span> Avance real</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-brand-accent opacity-60"></span> Planificado</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-600"></span> Tarea resumen</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-200"></span> Fin de semana</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-3 border border-dashed border-red-500"></span> Hoy</span>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '70vh' }} ref={timelineRef}>
                <div ref={ref} style={{ display: 'grid', gridTemplateColumns, minWidth: `${TASK_COL_WIDTH + (PROGRESS_COL_WIDTH * 3) + (totalDays * dayWidth)}px`, background: 'white', position: 'relative' }}>
                    {/* --- HEADERS --- */}
                    <div className="font-semibold text-sm p-2 bg-gray-100 border-b-2 border-r border-gray-300 sticky top-0 z-20" style={{ left: 0 }}>Nombre Tarea</div>
                    <div className="font-semibold text-sm p-2 bg-gray-100 border-b-2 border-r border-gray-300 sticky top-0 z-20" style={{ left: `${TASK_COL_WIDTH}px` }}>Avance Plan. (%)</div>
                    <div className="font-semibold text-sm p-2 bg-gray-100 border-b-2 border-r border-gray-300 sticky top-0 z-20" style={{ left: `${TASK_COL_WIDTH + PROGRESS_COL_WIDTH}px` }}>Avance Real (%)</div>
                    <div className="font-semibold text-sm p-2 bg-gray-100 border-b-2 border-r border-gray-300 sticky top-0 z-20" style={{ left: `${TASK_COL_WIDTH + PROGRESS_COL_WIDTH * 2}px` }}>Variación (%)</div>
                    
                    {Array.from({ length: totalDays }).map((_, i) => {
                        const date = new Date(minDate);
                        date.setDate(date.getDate() + i);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        return (
                            <div key={i} className={`text-center text-xs p-1 bg-gray-100 border-b-2 border-r border-gray-300 sticky top-0 z-10 ${isWeekend ? 'font-semibold text-gray-400' : 'text-gray-600'}`}>{date.getDate()}</div>
                        );
                    })}
                    
                    {/* --- BODY --- */}
                    {visibleTasks.map((task, index) => {
                        const row = index + 2;
                        return (
                           <React.Fragment key={task.id}>
                                <div className="text-sm p-1 bg-white border-b border-r border-gray-200 sticky z-10" style={{ left: 0, gridRow: row }}><TaskCell task={task} onToggle={() => toggleExpand(task.id)} isExpanded={expandedTasks.has(task.id)} /></div>
                                <div className="text-sm p-1 bg-white border-b border-r border-gray-200 sticky z-10 flex items-center justify-center" style={{ left: `${TASK_COL_WIDTH}px`, gridRow: row }}>{task.plannedProgress.toFixed(1)}%</div>
                                <div className="text-sm p-1 bg-white border-b border-r border-gray-200 sticky z-10 flex items-center justify-center font-bold" style={{ left: `${TASK_COL_WIDTH + PROGRESS_COL_WIDTH}px`, gridRow: row }}>{task.progress.toFixed(1)}%</div>
                                <div className={`text-sm p-1 bg-white border-b border-r border-gray-200 sticky z-10 flex items-center justify-center font-bold ${task.variance < 0 ? 'text-red-500' : 'text-green-600'}`} style={{ left: `${TASK_COL_WIDTH + PROGRESS_COL_WIDTH * 2}px`, gridRow: row }}>{task.variance.toFixed(1)}%</div>
                                
                                <div style={{ gridColumn: `5 / span ${totalDays}`, gridRow: row, display: 'grid', gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                                    {Array.from({ length: totalDays }).map((_, i) => {
                                        const date = new Date(minDate);
                                        date.setDate(date.getDate() + i);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        return <div key={`bg-${i}`} className={`h-full ${isWeekend ? 'bg-gray-100/70' : ''} border-r border-b border-gray-200`}></div>;
                                    })}
                                    <GanttBar task={task} dayOffset={getDayOffset(new Date(task.startDate))} dayWidth={dayWidth} onHover={handleMouseEnter} onLeave={handleMouseLeave} onInteractionStart={handleInteractionStart} />
                                </div>
                           </React.Fragment>
                        );
                    })}

                    {/* Today Marker */}
                    {todayOffset > 0 && todayOffset <= totalDays && (
                        <div 
                            className="absolute top-0 h-full border-r-2 border-red-500 border-dashed z-20 pointer-events-none"
                            style={{ 
                                left: `${TASK_COL_WIDTH + (PROGRESS_COL_WIDTH * 3) + (todayOffset * dayWidth)}px`,
                                top: '40px',
                                height: `${(visibleTasks.length * ROW_HEIGHT) + 24}px`
                             }}
                             title={`Hoy: ${new Date().toLocaleDateString('es-CO')}`}
                        ></div>
                    )}

                    {/* Ghost element for dragging */}
                    {interaction?.ghostPosition && (
                         <div className="absolute h-full py-1 z-20 pointer-events-none" style={{
                            gridRow: visibleTasks.findIndex(t => t.id === interaction.task.id) + 2,
                            gridColumn: `${4 + interaction.ghostPosition.left} / span ${interaction.ghostPosition.width}`,
                            top: 0,
                            left: 0,
                         }}>
                             <div className="h-full bg-brand-secondary opacity-50 rounded" />
                         </div>
                    )}
                </div>
            </div>
            {hoveredTask && <Tooltip task={hoveredTask.task} position={hoveredTask.position} />}
        </Card>
    );
});

export default GanttChart;
