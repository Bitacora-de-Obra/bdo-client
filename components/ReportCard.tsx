
import React from 'react';
import { Report } from '../types';
import Card from './ui/Card';
import ReportStatusBadge from './ReportStatusBadge';
import { CalendarIcon, UserCircleIcon, PaperClipIcon } from './icons/Icon';

interface ReportCardProps {
  report: Report;
  onSelect: (report: Report) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onSelect }) => {
  const submissionDate = new Date(report.submissionDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Card className="hover:shadow-lg hover:border-brand-primary/50 transition-shadow duration-200 cursor-pointer">
      <div onClick={() => onSelect(report)} className="p-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
            <div className="flex-1">
                <p className="text-sm font-semibold text-brand-primary">{report.number}</p>
                <h3 className="text-lg font-bold text-gray-800 mt-1">{report.period}</h3>
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                  Versión {report.version}
                </span>
            </div>
            <div className="flex-shrink-0 pt-1">
                <ReportStatusBadge status={report.status} />
            </div>
        </div>
        
        <p className="mt-3 text-sm text-gray-600 line-clamp-2">{report.summary}</p>
        
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                <div className="flex items-center">
                    <UserCircleIcon className="mr-1.5 text-gray-400" />
                    {/* Fix: Replaced `author.name` with `author.fullName`. */}
                    <span>{report.author.fullName}</span>
                </div>
                 <div className="flex items-center">
                    <CalendarIcon className="mr-1.5 text-gray-400" />
                    <span>Presentado: {submissionDate}</span>
                </div>
                {report.attachments.length > 0 && (
                    <div className="flex items-center font-medium">
                        <PaperClipIcon className="mr-1.5 text-gray-400" />
                        <span>{report.attachments.length} Adjunto(s)</span>
                    </div>
                )}
            </div>
        </div>
      </div>
    </Card>
  );
};

export default ReportCard;
