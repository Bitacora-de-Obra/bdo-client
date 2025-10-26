import React, { useState, useEffect } from "react";
import { Report, ReportStatus, ReportVersionInfo, User } from "../types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Select from "./ui/Select";
import ReportStatusBadge from "./ReportStatusBadge";
import AttachmentItem from "./AttachmentItem";
import SignatureBlock from "./SignatureBlock";
import SignatureModal from "./SignatureModal";
import { DocumentArrowDownIcon } from "./icons/Icon";

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  onUpdate: (updatedReport: Report) => void | Promise<void>;
  onSign: (
    documentId: string,
    documentType: "report",
    signer: User,
    password: string
  ) => Promise<{ success: boolean; error?: string; updated?: Report }>;
  currentUser: User;
  onSelectVersion?: (reportId: string) => void | Promise<void>;
  onCreateVersion?: (report: Report) => void;
  onGenerateExcel?: (reportId: string) => Promise<void>;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div>
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{value}</dd>
  </div>
);

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  report,
  onUpdate,
  onSign,
  currentUser,
  onSelectVersion,
  onCreateVersion,
  onGenerateExcel,
}) => {
  const [editedReport, setEditedReport] = useState<Report>(report);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  const previousVersionInfo = React.useMemo(() => {
    if (!report.previousReportId || !report.versions) {
      return null;
    }
    return report.versions.find(
      (version) => version.id === report.previousReportId
    );
  }, [report.previousReportId, report.versions]);

  useEffect(() => {
    setEditedReport(report);
    setIsSaving(false);
    setExcelError(null);
    setIsGeneratingExcel(false);
  }, [report, isOpen]);

  const handleStatusChange = (newStatus: ReportStatus) => {
    setEditedReport((prev) => ({ ...prev, status: newStatus }));
  };

  const handleGenerateExcelClick = async () => {
    if (!onGenerateExcel || isGeneratingExcel) return;
    try {
      setExcelError(null);
      setIsGeneratingExcel(true);
      await onGenerateExcel(report.id);
    } catch (err) {
      console.error("Error generando Excel del informe:", err);
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo generar el Excel del informe.";
      setExcelError(message);
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleConfirmSignature = async (
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Ya no hacemos la validación de contraseña aquí
    const result = await onSign(report.id, "report", currentUser, password);
    if (!result.success) {
      return {
        success: false,
        error:
          result.error ||
          "La firma falló. Revisa la contraseña o contacta al administrador.",
      };
    }

    if (result.updated) {
      setEditedReport(result.updated);
    }
    setIsSignatureModalOpen(false);
    return { success: true };
  };

  const handleSaveChanges = async () => {
    if (isSaving) return;
    try {
      setIsSaving(true);
      await Promise.resolve(onUpdate(editedReport));
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Detalle de Informe - ${report.number} · v${report.version}`}
        size="2xl"
      >
        <div className="space-y-6">
          <div className="pb-4 border-b space-y-3">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {report.number}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Periodo: {report.period}
                </p>
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-brand-primary mt-2 bg-brand-primary/10 px-2 py-0.5 rounded-full">
                  Versión {report.version}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ReportStatusBadge status={editedReport.status} />
                {onGenerateExcel && report.type === "Weekly" && (
                  <Button
                    variant="secondary"
                    onClick={handleGenerateExcelClick}
                    size="sm"
                    disabled={isGeneratingExcel}
                    leftIcon={
                      <DocumentArrowDownIcon className="w-4 h-4 -ml-0.5" />
                    }
                  >
                    {isGeneratingExcel ? "Generando..." : "Generar Excel"}
                  </Button>
                )}
                {onCreateVersion && (
                  <Button
                    variant="secondary"
                    onClick={() => onCreateVersion(report)}
                    size="sm"
                  >
                    Nueva Versión
                  </Button>
                )}
              </div>
            </div>

            {report.versions && report.versions.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Historial de versiones
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {report.versions.map((versionInfo: ReportVersionInfo) => {
                    const isCurrent = versionInfo.id === report.id;
                    return (
                      <button
                        key={versionInfo.id}
                        onClick={() =>
                          !isCurrent &&
                          onSelectVersion &&
                          onSelectVersion(versionInfo.id)
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                          isCurrent
                            ? "bg-brand-primary text-white border-brand-primary cursor-default"
                            : "bg-white text-gray-700 border-gray-300 hover:border-brand-primary hover:text-brand-primary"
                        }`}
                        title={`Estado: ${versionInfo.status}\nPresentado: ${new Date(
                          versionInfo.submissionDate
                        ).toLocaleDateString("es-CO")}`}
                        disabled={isCurrent}
                      >
                        v{versionInfo.version}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {excelError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {excelError}
            </div>
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
            <DetailRow
              label="Fecha de Presentación"
              value={new Date(report.submissionDate).toLocaleDateString(
                "es-CO",
                { dateStyle: "long" }
              )}
            />
            {/* Fix: Replaced `report.author.name` with `report.author.fullName`. */}
            <DetailRow
              label="Autor del Informe"
              value={report.author.fullName}
            />
            <DetailRow label="Versión" value={`v${report.version}`} />
            {previousVersionInfo && (
              <DetailRow
                label="Deriva de"
                value={`v${previousVersionInfo.version} · ${new Date(
                  previousVersionInfo.submissionDate
                ).toLocaleDateString("es-CO")}`}
              />
            )}
            {report.createdAt && (
              <DetailRow
                label="Fecha de Registro"
                value={new Date(report.createdAt).toLocaleString("es-CO")}
              />
            )}
            {report.updatedAt && (
              <DetailRow
                label="Última Actualización"
                value={new Date(report.updatedAt).toLocaleString("es-CO")}
              />
            )}
          </dl>

          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Resumen Ejecutivo
            </h4>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
              {report.summary || "No hay resumen disponible."}
            </p>
          </div>

          {report.attachments && report.attachments.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Archivos Adjuntos
              </h4>
              <ul className="mt-2 space-y-2">
                {report.attachments.map((att) => (
                  <AttachmentItem key={att.id} attachment={att} />
                ))}
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-2">
              Actualizar Estado del Informe
            </h4>
            <Select
              id="status"
              value={editedReport.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as ReportStatus)
              }
            >
              {Object.values(ReportStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>

          <SignatureBlock
            requiredSignatories={editedReport.requiredSignatories}
            signatures={editedReport.signatures}
            currentUser={currentUser}
            onSignRequest={() => setIsSignatureModalOpen(true)}
            documentType="Informe"
          />
        </div>
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </Modal>
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onConfirm={handleConfirmSignature}
        userToSign={currentUser}
      />
    </>
  );
};

export default ReportDetailModal;
