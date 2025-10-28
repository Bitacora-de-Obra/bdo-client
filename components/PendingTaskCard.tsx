import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { ClockIcon, ClipboardDocumentListIcon, Squares2X2Icon, ChatBubbleLeftRightIcon } from './icons/Icon';
import type { PendingTask } from './PendingTasksDashboard';

type Urgency = 'overdue' | 'dueSoon' | 'upcoming';

interface PendingTaskCardProps {
  task: PendingTask;
  urgency: Urgency;
  onSelect: (task: PendingTask) => void;
}

const urgencyStyles: Record<Urgency, { border: string, icon: React.ReactNode, textColor: string }> = {
    overdue: {
        border: 'border-l-4 border-red-500',
        icon: <ClockIcon className="h-5 w-5 text-red-500" />,
        textColor: 'text-red-600',
    },
    dueSoon: {
        border: 'border-l-4 border-yellow-500',
        icon: <ClockIcon className="h-5 w-5 text-yellow-500" />,
        textColor: 'text-yellow-600',
    },
    upcoming: {
        border: 'border-l-4 border-gray-400',
        icon: <ClockIcon className="h-5 w-5 text-gray-500" />,
        textColor: 'text-gray-600',
    }
};

const taskTypeIcons: Record<PendingTask['type'], React.ReactNode> = {
    commitment: <ClipboardDocumentListIcon className="h-4 w-4 text-gray-500" />,
    logEntry: <Squares2X2Icon className="h-4 w-4 text-gray-500" />,
    communication: <ChatBubbleLeftRightIcon className="h-4 w-4 text-gray-500" />,
};

const getDueDateMessage = (dueDateStr: string, urgency: Urgency): string => {
    const dueDate = new Date(dueDateStr);
    if (Number.isNaN(dueDate.getTime())) {
        return 'Sin fecha límite';
    }
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const timeDiff = dueDate.getTime() - today.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (urgency === 'overdue') {
        const daysOverdue = Math.abs(dayDiff) + 1; // Show at least 1 day
        return `Vencido hace ${daysOverdue} día(s)`;
    }
    if (dayDiff === 0) return 'Vence hoy';
    return `Vence en ${dayDiff} día(s)`;
};

const PendingTaskCard: React.FC<PendingTaskCardProps> = ({ task, urgency, onSelect }) => {
  const styles = urgencyStyles[urgency];

  return (
    <Card className={`flex flex-col sm:flex-row items-start gap-4 p-4 ${styles.border}`}>
        <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                {taskTypeIcons[task.type]}
                <span>{task.source}</span>
            </div>
            <p className="mt-1 text-base text-gray-800 font-medium">{task.description}</p>
            <div className={`mt-2 flex items-center text-sm font-semibold ${styles.textColor}`}>
                {styles.icon}
                <span className="ml-1.5">
                    {getDueDateMessage(task.dueDate, urgency)}
                    {(() => {
                        const parsed = new Date(task.dueDate);
                        return Number.isNaN(parsed.getTime())
                            ? ''
                            : ` · ${parsed.toLocaleDateString('es-CO')}`;
                    })()}
                </span>
            </div>
        </div>
        <div className="flex-shrink-0 self-center">
            <Button onClick={() => onSelect(task)} variant="secondary" size="sm">
                Ver Detalle
            </Button>
        </div>
    </Card>
  );
};

export default PendingTaskCard;
