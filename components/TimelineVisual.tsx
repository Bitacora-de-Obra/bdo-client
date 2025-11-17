import React from 'react';

interface TimelineVisualProps {
  startDate: string;
  originalEndDate: string;
  currentEndDate: string;
}

const TimelineVisual: React.FC<TimelineVisualProps> = ({ startDate, originalEndDate, currentEndDate }) => {
  const start = new Date(startDate);
  const originalEnd = new Date(originalEndDate);
  const currentEnd = new Date(currentEndDate);
  const today = new Date();

  const totalDuration = currentEnd.getTime() - start.getTime();
  const originalDuration = originalEnd.getTime() - start.getTime();
  const timeElapsed = today.getTime() - start.getTime();

  const progressPercentage = totalDuration > 0 ? (timeElapsed / totalDuration) * 100 : 0;
  const originalEndPercentage = totalDuration > 0 ? (originalDuration / totalDuration) * 100 : 0;
  
  const safeProgress = Math.max(0, Math.min(100, progressPercentage));
  const safeOriginalEnd = Math.max(0, Math.min(100, originalEndPercentage));
  
  const formatDate = (date: Date) => date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="space-y-3">
      <div className="relative w-full h-8 bg-gray-200 rounded-lg overflow-hidden">
        {/* Progress Bar */}
        <div 
          className="absolute top-0 left-0 h-full bg-idu-cyan/50" 
          style={{ width: `${safeProgress}%` }}
        ></div>

        {/* Original End Date Marker */}
        {originalEnd.getTime() !== currentEnd.getTime() && (
            <div 
              className="absolute top-0 h-full border-r-2 border-dashed border-gray-500"
              style={{ left: `${safeOriginalEnd}%` }}
              title={`Fin Original: ${formatDate(originalEnd)}`}
            ></div>
        )}

        {/* Today Marker */}
        {safeProgress > 0 && safeProgress < 100 && (
             <div 
              className="absolute top-0 h-full w-0.5 bg-red-500"
              style={{ left: `${safeProgress}%` }}
              title={`Hoy: ${formatDate(today)}`}
            ></div>
        )}
      </div>
      <div className="flex justify-between text-xs font-medium text-gray-600">
        <div className="text-left">
          <p className="font-bold">Inicio</p>
          <p>{formatDate(start)}</p>
        </div>
        {originalEnd.getTime() !== currentEnd.getTime() && (
          <div className="text-center text-gray-500">
            <p className="font-bold">Fin Original</p>
            <p>{formatDate(originalEnd)}</p>
          </div>
        )}
        <div className="text-right">
          <p className="font-bold">Fin Vigente</p>
          <p>{formatDate(currentEnd)}</p>
        </div>
      </div>
    </div>
  );
};

export default TimelineVisual;