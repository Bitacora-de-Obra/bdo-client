import React, { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { LogEntry, EntryStatus, EntryType } from '../types';
import Card from './ui/Card';

interface CalendarViewProps {
  entries: LogEntry[];
  onEventClick: (entry: LogEntry) => void;
  onDateClick?: (dateStr: string) => void;
}

// Colors by EntryType (Area) - Using actual enum values
const entryTypeColorMap: Record<string, string> = {
  'General': '#1976D2',       // Azul - General
  'Técnico': '#0D47A1',       // Azul oscuro - Técnica
  'HSE': '#F57C00',           // Naranja - SST/HSE
  'Ambiental': '#2E7D32',     // Verde - Ambiental
  'Social': '#7B1FA2',        // Púrpura - Social
  'Administrativo': '#5D4037',// Marrón - Administrativo
  'Calidad': '#00838F',       // Cian - Calidad
};

const CalendarView: React.FC<CalendarViewProps> = ({ entries, onEventClick, onDateClick }) => {
  const calendarEvents = useMemo(() => {
    return entries
      .filter((e) => !e.isConfidential)
      .map((entry) => {
        const entryDate = new Date(entry.entryDate);
        const isoDate = entryDate.toISOString().split("T")[0];
        const entryType = entry.type || 'General';
        const color = entryTypeColorMap[entryType] || "#6B7280";

        return {
          id: entry.id,
          title: `#${entry.folioNumber}: Reporte ${entryType.toUpperCase()} #${entry.folioNumber}`,
          start: isoDate,
          end: isoDate,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          extendedProps: {
            logEntry: entry,
          },
        };
      });
  }, [entries]);

  const handleEventClick = (clickInfo: any) => {
    const logEntry = clickInfo.event.extendedProps.logEntry;
    if (logEntry) {
      onEventClick(logEntry);
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
        .fc .fc-event {
          cursor: pointer;
        }
        .fc-event-title {
          white-space: normal;
        }
        .fc-daygrid-day:hover {
          background-color: rgba(41, 182, 246, 0.05);
          cursor: pointer;
        }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek,dayGridDay'
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
        selectable={Boolean(onDateClick)}
        dateClick={(arg) => {
          if (onDateClick) {
            onDateClick(arg.dateStr);
          }
        }}
      />
    </Card>
  );
};

export default CalendarView;
