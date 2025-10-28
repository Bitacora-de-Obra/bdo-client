import React from "react";
// Fix: Corrected import path for types
import { LogEntry } from "../types";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
// Fix: Corrected import path for icons
import {
  PaperClipIcon,
  CalendarIcon,
  UserCircleIcon,
  LockClosedIcon,
  ClockIcon,
  CheckCircleIcon,
} from "./icons/Icon";

interface EntryCardProps {
  entry: LogEntry;
  onSelect: (entry: LogEntry) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onSelect }) => {
  const entryDate = new Date(entry.entryDate).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // A real app would have a more complex logic, e.g. checking user permissions.
  const isLocked = entry.isConfidential;
  const signatureSummary = entry.signatureSummary;
  const hasPendingSignatures =
    signatureSummary && !signatureSummary.completed;

  return (
    <Card
      className={`transition-shadow duration-200 ${
        isLocked
          ? "bg-gray-50 opacity-70"
          : "hover:shadow-lg hover:border-brand-primary/50"
      }`}
    >
      <div
        onClick={isLocked ? undefined : () => onSelect(entry)}
        className={`p-4 ${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-brand-primary">
                Folio #{entry.folioNumber}
              </p>
              {/* The lock icon is now more prominent for locked entries */}
              {/* Fix: Wrapped icon in a span with a title attribute to fix typing error. */}
              {isLocked && (
                <span title="Confidencial">
                  <LockClosedIcon className="h-5 w-5 text-gray-600" />
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-800 mt-1">
              {entry.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{entry.type}</p>
          </div>
          <div className="flex-shrink-0 pt-1">
            <Badge status={entry.status} />
          </div>
        </div>

        {isLocked ? (
          <div className="mt-3 text-sm text-gray-600 italic bg-gray-100 p-3 rounded-md flex items-center gap-2 border">
            <LockClosedIcon className="h-4 w-4 text-gray-500" />
            <span>El contenido de esta anotación es confidencial.</span>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
              {entry.description || "Sin resumen registrado."}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
              <div>
                <p className="font-semibold">Actividades</p>
                <p className="mt-1 whitespace-pre-wrap line-clamp-3">
                  {entry.activitiesPerformed || "Sin registro."}
                </p>
              </div>
              <div>
                <p className="font-semibold">Materiales</p>
                <p className="mt-1 whitespace-pre-wrap line-clamp-3">
                  {entry.materialsUsed || "Sin registro."}
                </p>
              </div>
              <div>
                <p className="font-semibold">Personal</p>
                <p className="mt-1 whitespace-pre-wrap line-clamp-3">
                  {entry.workforce || "Sin registro."}
                </p>
              </div>
              <div>
                <p className="font-semibold">Clima</p>
                <p className="mt-1 whitespace-pre-wrap line-clamp-3">
                  {entry.weatherConditions || "Sin registro."}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center">
              <UserCircleIcon className="mr-1.5 text-gray-400" />
              <span>{entry.author.fullName}</span>
            </div>
            <div className="flex items-center">
              <CalendarIcon className="mr-1.5 text-gray-400" />
              <span>Bitácora: {entryDate}</span>
            </div>
            {(entry.attachments || []).length > 0 && (
              <div className="flex items-center font-medium">
                <PaperClipIcon className="mr-1.5 text-gray-400" />
                <span>{entry.attachments.length} adjunto(s)</span>
              </div>
            )}
            {signatureSummary && (
              <div
                className={`flex items-center font-medium ${
                  hasPendingSignatures ? "text-amber-600" : "text-green-600"
                }`}
              >
                {hasPendingSignatures ? (
                  <ClockIcon className="mr-1.5 h-4 w-4" />
                ) : (
                  <CheckCircleIcon className="mr-1.5 h-4 w-4" />
                )}
                <span>
                  {hasPendingSignatures
                    ? `Firmas ${signatureSummary.signed}/${signatureSummary.total}`
                    : `Firmas completas ${signatureSummary.signed}/${signatureSummary.total}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EntryCard;
