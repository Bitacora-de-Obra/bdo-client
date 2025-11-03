import React from 'react';
import { Drawing } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import DrawingDisciplineBadge from './DrawingDisciplineBadge';
import { MapIcon, PlusIcon } from './icons/Icon';

interface DrawingCardProps {
  drawing: Drawing;
  onSelect: (drawing: Drawing) => void;
  onAddVersion?: (drawing: Drawing) => void;
  canEdit?: boolean;
}

const DrawingCard: React.FC<DrawingCardProps> = ({ drawing, onSelect, onAddVersion, canEdit = true }) => {
  const latestVersion = drawing.versions[0];

  return (
    <Card className="flex flex-col group hover:shadow-xl hover:border-brand-primary/50 transition-all duration-200">
      <div onClick={() => onSelect(drawing)} className="p-4 flex-grow cursor-pointer">
        <div className="flex items-center justify-center h-24 bg-gray-100 rounded-md mb-4 group-hover:bg-idu-blue/5">
            <MapIcon className="h-10 w-10 text-gray-400 group-hover:text-idu-blue" />
        </div>
        <div className="flex justify-between items-start">
            <DrawingDisciplineBadge discipline={drawing.discipline} />
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Ver. {latestVersion.versionNumber}
            </span>
        </div>
        <h4 className="mt-2 font-bold text-gray-800 leading-tight truncate" title={drawing.title}>{drawing.title}</h4>
        <p className="text-sm text-gray-500 font-mono">{drawing.code}</p>
      </div>
      {canEdit && onAddVersion && (
        <div className="p-2 bg-gray-50 border-t">
          <Button 
              variant="secondary" 
              size="sm" 
              className="w-full"
              onClick={(e) => {
                  e.stopPropagation();
                  onAddVersion(drawing);
              }}
              leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            Nueva Versión
          </Button>
        </div>
      )}
    </Card>
  );
};

export default DrawingCard;
