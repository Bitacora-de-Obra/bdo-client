import React, { useState } from "react";
import { LogEntry } from "../types";
import Button from "./ui/Button";

interface ReviewWorkflowBannerProps {
  entry: LogEntry;
  isAuthor: boolean;
  isAdmin: boolean;
  isContractorUser: boolean;
  isDraftStatus: boolean;
  onSendToContractor: () => Promise<void>;
  onSendToInterventoria: () => Promise<void>;
  isLoading?: boolean;
}

/**
 * Component for the new review workflow (San Mateo + new clients).
 * Shows:
 * - A dropdown to send entry for review (Contractor or Interventoria)
 * - A status banner when review is pending
 * - Blocks signature actions via the pendingReviewBy field
 */
const ReviewWorkflowBanner: React.FC<ReviewWorkflowBannerProps> = ({
  entry,
  isAuthor,
  isAdmin,
  isContractorUser,
  isDraftStatus,
  onSendToContractor,
  onSendToInterventoria,
  isLoading = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const canSendForReview = isDraftStatus && (isAuthor || isAdmin);
  const hasPendingReview = !!entry.pendingReviewBy;

  const handleSendToContractor = async () => {
    setIsDropdownOpen(false);
    await onSendToContractor();
  };

  const handleSendToInterventoria = async () => {
    setIsDropdownOpen(false);
    await onSendToInterventoria();
  };

  const getPendingReviewLabel = () => {
    if (entry.pendingReviewBy === "CONTRACTOR") {
      return "contratista";
    }
    if (entry.pendingReviewBy === "INTERVENTORIA") {
      return "interventoría";
    }
    return "la otra parte";
  };

  return (
    <div className="space-y-3">
      {/* Pending Review Banner */}
      {hasPendingReview && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-lg flex items-center gap-3">
          <span className="text-yellow-600 text-lg">⏳</span>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Esperando revisión de {getPendingReviewLabel()}
            </p>
            <p className="text-xs text-yellow-700 mt-0.5">
              Las firmas estarán disponibles después de que complete la revisión.
            </p>
          </div>
        </div>
      )}

      {/* Send for Review Dropdown */}
      {canSendForReview && (
        <div className="relative inline-block">
          <Button
            variant="primary"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isLoading}
          >
            {isLoading ? "Enviando..." : "Enviar para revisión ▼"}
          </Button>

          {isDropdownOpen && (
            <div className="absolute z-50 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              {/* Show option based on who can send to whom */}
              {!isContractorUser && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={handleSendToContractor}
                >
                  📤 Enviar a Contratista
                </button>
              )}
              {isContractorUser && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={handleSendToInterventoria}
                >
                  📤 Enviar a Interventoría
                </button>
              )}
              {/* If admin, show both options */}
              {isAdmin && !isContractorUser && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                  onClick={handleSendToInterventoria}
                >
                  📤 Enviar a Interventoría
                </button>
              )}
              {isAdmin && isContractorUser && (
                <button
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors border-t border-gray-100"
                  onClick={handleSendToContractor}
                >
                  📤 Enviar a Contratista
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewWorkflowBanner;
