import React, { useState } from "react";
import { LogEntry, ReviewTask, User } from "../types";
import Button from "./ui/Button";

interface ReviewWorkflowBannerProps {
  entry: LogEntry;
  currentUser: User;
  isAuthor: boolean;
  isDraftStatus: boolean;
  isSubmittedStatus: boolean;
  onSendForReview: () => Promise<void>;
  onApproveReview: () => Promise<void>;
  onRefresh: () => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Component for the per-signatory review workflow.
 * Shows:
 * - A single "Enviar para revisión" button when in draft (author only)
 * - A status panel showing each reviewer and their status (pending/completed)
 * - An "Aprobar" button if current user has a pending review
 */
const ReviewWorkflowBanner: React.FC<ReviewWorkflowBannerProps> = ({
  entry,
  currentUser,
  isAuthor,
  isDraftStatus,
  isSubmittedStatus,
  onSendForReview,
  onApproveReview,
  onRefresh,
  isLoading = false,
}) => {
  const [isApproving, setIsApproving] = useState(false);

  const reviewTasks = entry.reviewTasks || [];
  const hasReviewTasks = reviewTasks.length > 0;
  const pendingReviews = reviewTasks.filter((t) => t.status === "PENDING");
  const completedReviews = reviewTasks.filter((t) => t.status === "COMPLETED");
  const allReviewsComplete = hasReviewTasks && pendingReviews.length === 0;

  // Check if current user has a pending review
  const myPendingReview = reviewTasks.find(
    (t) => t.reviewer?.id === currentUser.id && t.status === "PENDING"
  );

  const handleApprove = async () => {
    if (
      !window.confirm(
        "¿Confirmas que apruebas esta anotación sin agregar comentarios?"
      )
    ) {
      return;
    }
    setIsApproving(true);
    try {
      await onApproveReview();
      await onRefresh();
    } finally {
      setIsApproving(false);
    }
  };

  const handleSendForReview = async () => {
    if (
      !window.confirm(
        "¿Enviar esta anotación para revisión de todos los firmantes? Cada uno deberá aprobar o comentar antes de poder firmar."
      )
    ) {
      return;
    }
    await onSendForReview();
  };

  // Only show if we have review workflow active
  const hasPendingReviewBy = !!entry.pendingReviewBy;
  const showReviewPanel = isSubmittedStatus && hasReviewTasks;
  const canSendForReview = isDraftStatus && isAuthor;

  if (!canSendForReview && !showReviewPanel) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Send for Review Button (Draft only, author only) */}
      {canSendForReview && (
        <Button
          variant="primary"
          onClick={handleSendForReview}
          disabled={isLoading}
        >
          {isLoading ? "Enviando..." : "Enviar para revisión"}
        </Button>
      )}

      {/* Review Status Panel */}
      {showReviewPanel && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-yellow-800 mb-3">
            Estado de Revisiones ({completedReviews.length}/{reviewTasks.length} completadas)
          </h4>
          <div className="space-y-2">
            {reviewTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-700">
                  {task.reviewer?.fullName || "Usuario"}
                </span>
                {task.status === "COMPLETED" ? (
                  <span className="text-green-600 font-medium">✅ Revisado</span>
                ) : (
                  <span className="text-orange-600 font-medium">⏳ Pendiente</span>
                )}
              </div>
            ))}
          </div>

          {allReviewsComplete && (
            <p className="mt-3 text-sm text-green-700 font-medium">
              ✅ Todas las revisiones están completas. Las firmas están habilitadas.
            </p>
          )}

          {/* Approve Button for current user */}
          {myPendingReview && (
            <div className="mt-4 pt-3 border-t border-yellow-300">
              <p className="text-sm text-yellow-800 mb-2">
                Tienes una revisión pendiente. Puedes agregar un comentario arriba o aprobar directamente:
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isApproving ? "Aprobando..." : "✓ Aprobar sin comentario"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewWorkflowBanner;
