import React, { useState, useMemo } from 'react';
import { CommitmentStatus, EntryStatus, Acta, LogEntry, Communication, CommunicationStatus, CommunicationDirection } from '../types';
import { useApi } from '../src/hooks/useApi';
import EmptyState from './ui/EmptyState';
import { BellIcon, CalendarIcon, ListBulletIcon } from './icons/Icon';
import PendingTaskCard from './PendingTaskCard';
import { useAuth } from '../contexts/AuthContext';
import PendingTasksCalendarView from './PendingTasksCalendarView';

export type PendingCommitment = {
  type: 'commitment';
  id: string;
  description: string;
  dueDate: string;
  source: string;
  parentId: string;
};

export type PendingLogEntry = {
  type: 'logEntry';
  id: string;
  description: string;
  dueDate: string;
  source: string;
  parentId: string;
};

export type PendingCommunication = {
  type: 'communication';
  id: string;
  description: string;
  dueDate: string;
  source: string;
  parentId: string;
};

export type PendingTask = PendingCommitment | PendingLogEntry | PendingCommunication;

interface PendingTasksDashboardProps {
  onNavigate: (view: string, item: { type: 'acta' | 'logEntry' | 'communication'; id: string }) => void;
}

const PendingTasksDashboard: React.FC<PendingTasksDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { data: actas, isLoading: actasLoading, error: actasError } = useApi.actas();
  const { data: logEntries, isLoading: logEntriesLoading, error: logEntriesError } = useApi.logEntries();
  const { data: communications, isLoading: communicationsLoading, error: communicationsError } = useApi.communications();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const isLoading = actasLoading || logEntriesLoading || communicationsLoading;
  const error = actasError || logEntriesError || communicationsError;

  const pendingTasks = useMemo((): PendingTask[] => {
    if (!user) return [];

    const commitmentTasks: PendingCommitment[] = (actas || []).flatMap((acta: Acta) =>
      acta.commitments
        .filter((c) => c.responsible.id === user.id && c.status === CommitmentStatus.PENDING)
        .map((c) => ({
          type: 'commitment' as const,
          id: c.id,
          description: c.description,
          dueDate: c.dueDate,
          source: `Acta: ${acta.number}`,
          parentId: acta.id,
        }))
    );
    
    const logEntryTasks: PendingLogEntry[] = [];

    (logEntries || []).forEach((entry) => {
      if (
        entry.assignees?.some((assignee) => assignee.id === user.id) &&
        (entry.status === EntryStatus.NEEDS_REVIEW || entry.status === EntryStatus.SUBMITTED)
      ) {
        logEntryTasks.push({
          type: 'logEntry' as const,
          id: entry.id,
          description: entry.title,
          dueDate: entry.activityEndDate,
          source: `Anotación: #${entry.folioNumber}`,
          parentId: entry.id,
        });
      }

      (entry.signatureTasks || []).forEach((task) => {
        if (task.signer?.id !== user.id || task.status !== 'PENDING') {
          return;
        }
        logEntryTasks.push({
          type: 'logEntry' as const,
          id: task.id,
          description: `Firmar: ${entry.title}`,
          dueDate: entry.activityEndDate,
          source: `Anotación: #${entry.folioNumber}`,
          parentId: entry.id,
        });
      });
    });

    const communicationTasks: PendingCommunication[] = (communications || [])
      .filter((comm: Communication) => {
        if (comm.status !== CommunicationStatus.PENDIENTE) {
          return false;
        }
        if (comm.direction !== CommunicationDirection.RECEIVED) {
          return false;
        }
        if (!comm.requiresResponse) {
          return false;
        }
        return comm.assignee?.id === user.id;
      })
      .map((comm) => {
        const dueDate = comm.responseDueDate || comm.dueDate || comm.sentDate;
        return {
          type: 'communication' as const,
          id: comm.id,
          description: comm.subject,
          dueDate,
          source: `Comunicación: ${comm.radicado}`,
          parentId: comm.id,
        };
      });

    return [...commitmentTasks, ...logEntryTasks, ...communicationTasks].sort((a, b) => {
      const dateA = new Date(a.dueDate).getTime();
      const dateB = new Date(b.dueDate).getTime();
      const safeDateA = Number.isNaN(dateA) ? Number.MAX_SAFE_INTEGER : dateA;
      const safeDateB = Number.isNaN(dateB) ? Number.MAX_SAFE_INTEGER : dateB;
      return safeDateA - safeDateB;
    });
  }, [actas, communications, logEntries, user]);

  const { overdue, dueSoon, upcoming } = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const categorized = {
      overdue: [] as PendingTask[],
      dueSoon: [] as PendingTask[],
      upcoming: [] as PendingTask[],
    };

    pendingTasks.forEach(task => {
        const dueDate = new Date(task.dueDate);
        if (Number.isNaN(dueDate.getTime())) {
            categorized.upcoming.push(task);
            return;
        }
        if (dueDate < today) {
            categorized.overdue.push(task);
        } else if (dueDate <= sevenDaysFromNow) {
            categorized.dueSoon.push(task);
        } else {
            categorized.upcoming.push(task);
        }
    });
    return categorized;
  }, [pendingTasks]);
  
  const handleViewDetail = (task: PendingTask) => {
    if (task.type === 'commitment') {
      onNavigate('minutes', { type: 'acta', id: task.parentId });
    } else if (task.type === 'logEntry') {
      onNavigate('logbook', { type: 'logEntry', id: task.parentId });
    } else if (task.type === 'communication') {
      onNavigate('communications', { type: 'communication', id: task.parentId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Mis Pendientes</h2>
            <p className="text-sm text-gray-500">Un resumen de todas tus tareas y compromisos asignados.</p>
        </div>
        <div className="flex items-center bg-gray-200 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            title="Vista de Lista"
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'list' ? 'bg-white text-brand-primary shadow' : 'text-gray-600 hover:bg-gray-300/50'}`}
          >
            <ListBulletIcon className="h-5 w-5" />
            <span>Lista</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            title="Vista de Calendario"
            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-white text-brand-primary shadow' : 'text-gray-600 hover:bg-gray-300/50'}`}
          >
            <CalendarIcon className="h-5 w-5" />
            <span>Calendario</span>
          </button>
        </div>
      </div>

      {isLoading && <div className="text-center p-8">Cargando tus tareas pendientes...</div>}
      {error && <div className="text-center p-8 text-red-500">{error.message}</div>}

      {!isLoading && !error && (
        <>
          {pendingTasks.length > 0 ? (
            <>
              {viewMode === 'list' ? (
                <div className="space-y-8">
                    {overdue.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold text-red-600 mb-3">Vencidas</h3>
                            <div className="space-y-3">
                                {overdue.map(task => <PendingTaskCard key={task.id} task={task} onSelect={handleViewDetail} urgency="overdue" />)}
                            </div>
                        </section>
                    )}
                    {dueSoon.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold text-yellow-600 mb-3">Vencen Pronto (Próximos 7 días)</h3>
                            <div className="space-y-3">
                                {dueSoon.map(task => <PendingTaskCard key={task.id} task={task} onSelect={handleViewDetail} urgency="dueSoon" />)}
                            </div>
                        </section>
                    )}
                    {upcoming.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold text-gray-700 mb-3">Próximas</h3>
                            <div className="space-y-3">
                                {upcoming.map(task => <PendingTaskCard key={task.id} task={task} onSelect={handleViewDetail} urgency="upcoming" />)}
                            </div>
                        </section>
                    )}
                </div>
              ) : (
                <PendingTasksCalendarView tasks={pendingTasks} onTaskSelect={handleViewDetail} />
              )}
            </>
          ) : (
            <EmptyState
              icon={<BellIcon />}
              title="¡Estás al día!"
              message="No tienes tareas o compromisos pendientes asignados en este momento. ¡Buen trabajo!"
            />
          )}
        </>
      )}
    </div>
  );
};

export default PendingTasksDashboard;
