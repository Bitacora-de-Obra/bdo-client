import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { PendingTask } from './PendingTasksDashboard';
import Card from './ui/Card';

interface PendingTasksCalendarViewProps {
  tasks: PendingTask[];
  onTaskSelect: (task: PendingTask) => void;
}

const getUrgency = (dueDateStr: string): 'overdue' | 'dueSoon' | 'upcoming' => {
    const dueDateRaw = new Date(dueDateStr);
    if (Number.isNaN(dueDateRaw.getTime())) {
        return 'upcoming';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    const dueDate = new Date(dueDateRaw.valueOf() + new Date().getTimezoneOffset() * 60 * 1000);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < today) return 'overdue';
    if (dueDate <= sevenDaysFromNow) return 'dueSoon';
    return 'upcoming';
};


const urgencyColorMap = {
  overdue: '#C62828', // status-red
  dueSoon: '#F9A825', // status-yellow
  upcoming: '#6B7280', // gray-500
};

const PendingTasksCalendarView: React.FC<PendingTasksCalendarViewProps> = ({ tasks, onTaskSelect }) => {
  const calendarEvents = useMemo(() => {
    return tasks
      .map(task => {
      const urgency = getUrgency(task.dueDate);
      const parsedDate = new Date(task.dueDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return null;
      }
      const isoDate = parsedDate.toISOString().substring(0, 10);
      return {
        id: task.id,
        title: task.description,
        start: isoDate, // Use YYYY-MM-DD format for allday events
        allDay: true,
        backgroundColor: urgencyColorMap[urgency],
        borderColor: urgencyColorMap[urgency],
        extendedProps: {
          pendingTask: task,
        },
        className: 'cursor-pointer'
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));
  }, [tasks]);

  const handleEventClick = (clickInfo: any) => {
    const pendingTask = clickInfo.event.extendedProps.pendingTask;
    if (pendingTask) {
      onTaskSelect(pendingTask);
    }
  };

  return (
    <Card className="p-4">
      <style>{`
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
        }
        .fc .fc-button-primary {
          background-color: #0D47A1;
          border-color: #0D47A1;
        }
        .fc .fc-button-primary:hover, .fc .fc-button-primary:active {
          background-color: #1976D2 !important;
          border-color: #1976D2 !important;
        }
        .fc .fc-daygrid-day.fc-day-today {
          background-color: rgba(41, 182, 246, 0.1);
        }
        .fc-event-title {
          white-space: normal;
          padding: 2px 4px;
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek'
        }}
        events={calendarEvents}
        locale="es"
        buttonText={{
            today:    'hoy',
            month:    'mes',
            week:     'semana',
            day:      'día',
        }}
        height="auto"
        eventClick={handleEventClick}
        eventDisplay="block"
      />
    </Card>
  );
};

export default PendingTasksCalendarView;
