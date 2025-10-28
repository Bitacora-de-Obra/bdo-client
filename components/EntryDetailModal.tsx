import React, { useEffect, useMemo, useState } from "react";
import {
  LogEntry,
  EntryStatus,
  User,
  UserRole,
  Attachment,
  LogEntryListItem,
  WeatherReport,
  PersonnelEntry,
} from "../types";
import Modal from "./ui/Modal";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import AttachmentItem from "./AttachmentItem";
import Input from "./ui/Input";
import Select from "./ui/Select";
import ChangeHistory from "./ChangeHistory";
import {
  LockClosedIcon,
  XMarkIcon,
  PaperClipIcon,
  DocumentArrowDownIcon,
} from "./icons/Icon";
import SignatureBlock from "./SignatureBlock";
import SignatureModal from "./SignatureModal";
import { useToast } from "./ui/ToastProvider";
import api from "../src/services/api";

interface EntryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LogEntry;
  onUpdate: (updatedEntry: LogEntry) => void;
  onAddComment: (
    entryId: string,
    commentText: string,
    files: File[]
  ) => Promise<void>;
  onSign: (
    documentId: string,
    documentType: "logEntry",
    signer: User,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (entryId: string) => Promise<void>;
  currentUser: User;
  availableUsers: User[];
  onRefresh?: () => void;
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

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  isOpen,
  onClose,
  entry,
  onUpdate,
  onAddComment,
  onSign,
  onDelete,
  currentUser,
  availableUsers,
  onRefresh = () => {},
}) => {
  const extractSignerIds = (entryData: LogEntry): string[] => {
    const fromTasks = (entryData.signatureTasks || [])
      .map((task) => task.signer?.id)
      .filter((id): id is string => Boolean(id));
    const baseIds =
      fromTasks.length > 0
        ? fromTasks
        : (entryData.requiredSignatories || []).map((user) => user.id);
    const setOfIds = new Set<string>(baseIds);
    if (entryData.author?.id) {
      setOfIds.add(entryData.author.id);
    }
    return Array.from(setOfIds);
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState<LogEntry>(entry);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [formEntryDate, setFormEntryDate] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [hasStoredSignature, setHasStoredSignature] = useState(false);
  const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>(() =>
    extractSignerIds(entry)
  );
  const [weatherSummaryDraft, setWeatherSummaryDraft] = useState<string>("");
  const [weatherTemperatureDraft, setWeatherTemperatureDraft] =
    useState<string>("");
  const [weatherNotesDraft, setWeatherNotesDraft] = useState<string>("");
  const [rainEventsDraft, setRainEventsDraft] = useState<
    Array<{ start: string; end: string }>
  >([{ start: "", end: "" }]);
  const [contractorPersonnelDraft, setContractorPersonnelDraft] = useState<
    Array<{ role: string; quantity: string; notes: string }>
  >([{ role: "", quantity: "", notes: "" }]);
  const [interventoriaPersonnelDraft, setInterventoriaPersonnelDraft] = useState<
    Array<{ role: string; quantity: string; notes: string }>
  >([{ role: "", quantity: "", notes: "" }]);
  const [equipmentResourcesDraft, setEquipmentResourcesDraft] = useState<
    Array<{ name: string; status: string; notes: string }>
  >([{ name: "", status: "", notes: "" }]);
  const knownUsers = useMemo(() => {
    const map = new Map<string, User>();
    const register = (user?: User | null) => {
      if (user?.id && !map.has(user.id)) {
        map.set(user.id, user);
      }
    };
    availableUsers.forEach(register);
    (entry.requiredSignatories || []).forEach(register);
    (entry.assignees || []).forEach(register);
    (entry.signatureTasks || []).forEach((task) => register(task.signer as User | null));
    (entry.signatures || []).forEach((signature) => register(signature.signer));
    register(entry.author);
    (editedEntry.requiredSignatories || []).forEach(register);
    (editedEntry.assignees || []).forEach(register);
    (editedEntry.signatureTasks || []).forEach((task) => register(task.signer as User | null));
    (editedEntry.signatures || []).forEach((signature) => register(signature.signer));
    return map;
  }, [availableUsers, entry, editedEntry]);

  const sortedUsers = useMemo(
    () =>
      Array.from(knownUsers.values()).sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "es")
      ),
    [knownUsers]
  );

  const findUserById = (id: string): User | undefined => knownUsers.get(id);

  const handleToggleSigner = (userId: string, checked: boolean) => {
    setSelectedSignerIds((prev) => {
      const nextSet = new Set(prev);
      if (checked) {
        nextSet.add(userId);
      } else {
        nextSet.delete(userId);
      }
      if (entry.author?.id) {
        nextSet.add(entry.author.id);
      }
      const nextIds = Array.from(nextSet);
      const resolved = nextIds
        .map((id) => findUserById(id))
        .filter((user): user is User => Boolean(user));
      setEditedEntry((prevEntry) => ({
        ...prevEntry,
        requiredSignatories: resolved,
      }));
      return nextIds;
    });
  };

  const applyEntryState = (entryData: LogEntry) => {
    setEditedEntry({
      ...entryData,
      assignees: entryData.assignees || [],
      attachments: entryData.attachments || [],
      comments: entryData.comments || [],
      history: entryData.history || [],
      requiredSignatories: entryData.requiredSignatories || [],
      signatures: entryData.signatures || [],
      signatureTasks: entryData.signatureTasks || [],
      signatureSummary: entryData.signatureSummary,
      contractorPersonnel: entryData.contractorPersonnel || [],
      interventoriaPersonnel: entryData.interventoriaPersonnel || [],
      equipmentResources: entryData.equipmentResources || [],
      executedActivities: entryData.executedActivities || [],
      executedQuantities: entryData.executedQuantities || [],
      scheduledActivities: entryData.scheduledActivities || [],
      qualityControls: entryData.qualityControls || [],
      materialsReceived: entryData.materialsReceived || [],
      safetyNotes: entryData.safetyNotes || [],
      projectIssues: entryData.projectIssues || [],
      siteVisits: entryData.siteVisits || [],
      contractorObservations: entryData.contractorObservations || "",
      interventoriaObservations: entryData.interventoriaObservations || "",
      scheduleDay: entryData.scheduleDay || "",
      locationDetails: entryData.locationDetails || "",
      weatherReport: entryData.weatherReport || null,
    });

    const weather = entryData.weatherReport || null;
    setWeatherSummaryDraft(weather?.summary || "");
    setWeatherTemperatureDraft(weather?.temperature || "");
    setWeatherNotesDraft(weather?.notes || "");
    const normalizedRainEvents =
      Array.isArray(weather?.rainEvents) && weather?.rainEvents.length
        ? weather!.rainEvents.map((event) => ({
            start:
              typeof event?.start === "string"
                ? event.start
                : typeof (event as any)?.start === "number"
                ? String((event as any).start)
                : "",
            end:
              typeof event?.end === "string"
                ? event.end
                : typeof (event as any)?.end === "number"
                ? String((event as any).end)
                : "",
          }))
        : [];
    setRainEventsDraft(
      normalizedRainEvents.length
        ? normalizedRainEvents
        : [{ start: "", end: "" }]
    );

    const toPersonnelDraft = (
      entries: Array<Partial<PersonnelEntry & { text?: string }>> | undefined
    ) => {
      if (!Array.isArray(entries) || !entries.length) {
        return [{ role: "", quantity: "", notes: "" }];
      }
      const mapped = entries
        .map((item) => {
          if (!item) return null;
          const role =
            typeof item.role === "string" && item.role.trim()
              ? item.role.trim()
              : typeof item.text === "string" && item.text.trim()
              ? item.text.trim()
              : "";
          if (!role) return null;
          const quantityValue =
            typeof item.quantity === "number"
              ? item.quantity.toString()
              : typeof (item as any)?.quantity === "string"
              ? (item as any).quantity
              : "";
          const notesValue =
            typeof item.notes === "string"
              ? item.notes
              : typeof (item as any)?.notes === "string"
              ? (item as any).notes
              : "";
          return {
            role,
            quantity: quantityValue,
            notes: notesValue,
          };
        })
        .filter((item): item is { role: string; quantity: string; notes: string } =>
          Boolean(item)
        );
      return mapped.length ? mapped : [{ role: "", quantity: "", notes: "" }];
    };

    const toEquipmentDraft = (
      items:
        | Array<Partial<{ name?: string; status?: string; notes?: string; text?: string }>>
        | undefined
    ) => {
      if (!Array.isArray(items) || !items.length) {
        return [{ name: "", status: "", notes: "" }];
      }
      const mapped = items
        .map((item) => {
          if (!item) return null;
          const name =
            typeof item.name === "string" && item.name.trim()
              ? item.name.trim()
              : typeof item.text === "string" && item.text.trim()
              ? item.text.trim()
              : "";
          if (!name) return null;
          const status =
            typeof item.status === "string"
              ? item.status
              : typeof (item as any)?.status === "string"
              ? (item as any).status
              : "";
          const notes =
            typeof item.notes === "string"
              ? item.notes
              : typeof (item as any)?.notes === "string"
              ? (item as any).notes
              : "";
          return { name, status, notes };
        })
        .filter(
          (item): item is { name: string; status: string; notes: string } =>
            Boolean(item)
        );
      return mapped.length ? mapped : [{ name: "", status: "", notes: "" }];
    };

    setContractorPersonnelDraft(
      toPersonnelDraft(entryData.contractorPersonnel as any)
    );
    setInterventoriaPersonnelDraft(
      toPersonnelDraft(entryData.interventoriaPersonnel as any)
    );
    setEquipmentResourcesDraft(
      toEquipmentDraft(entryData.equipmentResources as any)
    );

    setSelectedSignerIds(extractSignerIds(entryData));
    if (entryData.entryDate) {
      setFormEntryDate(entryData.entryDate.substring(0, 10));
    }
  };
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      applyEntryState(entry);
      setValidationError(null);
      (async () => {
        try {
          const response = await api.userSignature.get();
          setHasStoredSignature(Boolean(response.signature));
        } catch (error) {
          console.warn("No se pudo verificar la firma del usuario.", error);
          setHasStoredSignature(false);
        }
      })();
    } else {
      const timer = setTimeout(() => {
        setIsEditing(false);
        setNewFiles([]);
        setNewComment("");
        setCommentFiles([]);
        setValidationError(null);
        setFormEntryDate("");
        setSelectedSignerIds(extractSignerIds(entry));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [entry, isOpen]);

  const handleDelete = async () => {
    if (
      window.confirm(
        "¿Estás seguro de que quieres eliminar esta anotación? Esta acción no se puede deshacer."
      )
    ) {
      await onDelete(entry.id);
      onClose();
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setEditedEntry((prev) => ({ ...prev, [name]: checked }));
    } else {
      setEditedEntry((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleCommentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCommentFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveExistingAttachment = (attachmentId: string) => {
    setEditedEntry((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter(
        (att) => att.id !== attachmentId
      ),
    }));
  };

  const handleRemoveNewFile = (fileToRemove: File) => {
    setNewFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleRemoveCommentFile = (fileToRemove: File) => {
    setCommentFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  type TextListField =
    | "executedActivities"
    | "executedQuantities"
    | "scheduledActivities"
    | "qualityControls"
    | "materialsReceived"
    | "safetyNotes"
    | "projectIssues"
    | "siteVisits";

  const listToPlainText = (items?: LogEntryListItem[]) =>
    (items || []).map((item) => item.text).join("\n");

  const plainTextToList = (value: string): LogEntryListItem[] =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

  const handleListChange = (field: TextListField, value: string) => {
    setEditedEntry((prev) => ({
      ...prev,
      [field]: plainTextToList(value),
    }));
  };

  const addRainEventDraftRow = () =>
    setRainEventsDraft((prev) => [...prev, { start: "", end: "" }]);

  const updateRainEventDraftRow = (
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    setRainEventsDraft((prev) =>
      prev.map((event, i) =>
        i === index ? { ...event, [field]: value } : event
      )
    );
  };

  const removeRainEventDraftRow = (index: number) => {
    setRainEventsDraft((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const updatePersonnelDraft = (
    setter: React.Dispatch<
      React.SetStateAction<Array<{ role: string; quantity: string; notes: string }>>
    >,
    index: number,
    field: "role" | "quantity" | "notes",
    value: string
  ) => {
    setter((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addPersonnelDraft = (
    setter: React.Dispatch<
      React.SetStateAction<Array<{ role: string; quantity: string; notes: string }>>
    >
  ) => {
    setter((prev) => [...prev, { role: "", quantity: "", notes: "" }]);
  };

  const removePersonnelDraft = (
    setter: React.Dispatch<
      React.SetStateAction<Array<{ role: string; quantity: string; notes: string }>>
    >,
    index: number
  ) => {
    setter((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const updateEquipmentDraftRow = (
    index: number,
    field: "name" | "status" | "notes",
    value: string
  ) => {
    setEquipmentResourcesDraft((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addEquipmentDraftRow = () => {
    setEquipmentResourcesDraft((prev) => [
      ...prev,
      { name: "", status: "", notes: "" },
    ]);
  };

  const removeEquipmentDraftRow = (index: number) => {
    setEquipmentResourcesDraft((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const formatPersonnelLine = (item: Partial<PersonnelEntry> & { text?: string }) => {
    const role =
      typeof item.role === "string" && item.role.trim()
        ? item.role.trim()
        : typeof item.text === "string" && item.text.trim()
        ? item.text.trim()
        : "";
    if (!role) return null;
    const quantityValue =
      typeof item.quantity === "number"
        ? item.quantity
        : typeof (item as any)?.quantity === "string"
        ? Number((item as any).quantity)
        : undefined;
    const hasQuantity =
      typeof quantityValue === "number" && !Number.isNaN(quantityValue);
    const quantityLabel =
      hasQuantity && quantityValue !== 0 ? `${quantityValue}` : undefined;
    const base = quantityLabel ? `${quantityLabel} · ${role}` : role;
    const notesLabel =
      typeof item.notes === "string" && item.notes.trim()
        ? item.notes.trim()
        : undefined;
    return notesLabel ? `${base} — ${notesLabel}` : base;
  };

  const formatEquipmentLine = (
    item: Partial<{ name?: string; status?: string; notes?: string; text?: string }>
  ) => {
    const name =
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim()
        : typeof item.text === "string" && item.text.trim()
        ? item.text.trim()
        : "";
    if (!name) return null;
    const status =
      typeof item.status === "string" && item.status.trim()
        ? item.status.trim()
        : undefined;
    const notes =
      typeof item.notes === "string" && item.notes.trim()
        ? item.notes.trim()
        : undefined;
    let label = name;
    if (status) {
      label += ` — ${status}`;
    }
    if (notes) {
      label += status ? ` (${notes})` : ` — ${notes}`;
    }
    return label;
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() || commentFiles.length > 0) {
      await onAddComment(entry.id, newComment.trim(), commentFiles);
      setNewComment("");
      setCommentFiles([]);
    }
  };

  const handleSave = async () => {
    setValidationError(null);

    if (!formEntryDate) {
      setValidationError("Debes indicar la fecha de la bitácora.");
      return;
    }

    if (!editedEntry.title.trim()) {
      setValidationError("El título no puede estar vacío.");
      return;
    }

    if (!editedEntry.description.trim()) {
      setValidationError("El resumen general es obligatorio.");
      return;
    }

    const parsedDate = new Date(`${formEntryDate}T00:00:00`);
    if (isNaN(parsedDate.getTime())) {
      setValidationError("La fecha del diario no es válida.");
      return;
    }

    const normalizedDate = new Date(parsedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const newAttachments = newFiles.map((file) => ({
      id: `att-${Date.now()}-${file.name}`,
      fileName: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
    }));

    const finalEntry = {
      ...editedEntry,
      title: editedEntry.title.trim(),
      description: editedEntry.description.trim(),
      activitiesPerformed: (editedEntry.activitiesPerformed || "").trim(),
      materialsUsed: (editedEntry.materialsUsed || "").trim(),
      workforce: (editedEntry.workforce || "").trim(),
      weatherConditions: (editedEntry.weatherConditions || "").trim(),
      additionalObservations: (editedEntry.additionalObservations || "").trim(),
      entryDate: normalizedDate.toISOString(),
      activityStartDate: normalizedDate.toISOString(),
      activityEndDate: endOfDay.toISOString(),
      attachments: [...(editedEntry.attachments || []), ...newAttachments],
    } as LogEntry;

    const normalizePersonnelDraftEntries = (
      entries: Array<{ role: string; quantity: string; notes: string }>
    ) =>
      entries
        .map((entry) => ({
          role: entry.role.trim(),
          quantity: entry.quantity.trim(),
          notes: entry.notes.trim(),
        }))
        .filter((entry) => entry.role)
        .map((entry) => {
          const parsedQuantity = entry.quantity;
          const quantity =
            parsedQuantity && !Number.isNaN(Number(parsedQuantity))
              ? Number(parsedQuantity)
              : undefined;
          return {
            role: entry.role,
            quantity,
            notes: entry.notes || undefined,
          };
        });

    const normalizedContractorPersonnel = normalizePersonnelDraftEntries(
      contractorPersonnelDraft
    );
    const normalizedInterventoriaPersonnel = normalizePersonnelDraftEntries(
      interventoriaPersonnelDraft
    );

    const normalizedEquipmentResources = equipmentResourcesDraft
      .map((entry) => ({
        name: entry.name.trim(),
        status: entry.status.trim(),
        notes: entry.notes.trim(),
      }))
      .filter((entry) => entry.name)
      .map((entry) => ({
        name: entry.name,
        status: entry.status || undefined,
        notes: entry.notes || undefined,
      }));

    const normalizedRainEvents = rainEventsDraft
      .map((event) => ({
        start: event.start.trim(),
        end: event.end.trim(),
      }))
      .filter((event) => event.start || event.end);

    const summaryValue = weatherSummaryDraft.trim();
    const temperatureValue = weatherTemperatureDraft.trim();
    const notesValue = weatherNotesDraft.trim();

    const normalizedWeatherReport =
      summaryValue ||
      temperatureValue ||
      notesValue ||
      normalizedRainEvents.length
        ? {
            summary: summaryValue || undefined,
            temperature: temperatureValue || undefined,
            notes: notesValue || undefined,
            rainEvents: normalizedRainEvents,
          }
        : null;

    finalEntry.contractorPersonnel = normalizedContractorPersonnel;
    finalEntry.interventoriaPersonnel = normalizedInterventoriaPersonnel;
    finalEntry.equipmentResources = normalizedEquipmentResources;
    finalEntry.weatherReport = normalizedWeatherReport;
    finalEntry.contractorObservations =
      (editedEntry.contractorObservations || "").trim();
    finalEntry.interventoriaObservations =
      (editedEntry.interventoriaObservations || "").trim();

    const signerIds = new Set(selectedSignerIds);
    if (author?.id) {
      signerIds.add(author.id);
    }
    const requiredSignatories = Array.from(signerIds)
      .map((id) => findUserById(id))
      .filter((user): user is User => Boolean(user));
    finalEntry.requiredSignatories = requiredSignatories;

    try {
      await onUpdate(finalEntry);
      setIsEditing(false);
      setNewFiles([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la bitácora.";
      setValidationError(message);
    }
  };

const handleConfirmSignature = async (password: string): Promise<{ success: boolean, error?: string }> => {
    // Ya no verificamos la contraseña aquí, se la pasamos al backend
    const result = await onSign(entry.id, 'logEntry', currentUser, password);
    if (result.success) {
        setIsSignatureModalOpen(false);
    }
    return result; // Devolvemos el resultado al modal para que muestre el error si es necesario
};

  const handleCancel = () => {
    applyEntryState(entry);
    setIsEditing(false);
    setNewFiles([]);
    setValidationError(null);
  };

  const handleExportPdf = async () => {
    setValidationError(null);
    setIsGeneratingPdf(true);
    try {
      const exportResponse = await api.logEntries.exportPdf(entry.id);
      let latestEntry =
        exportResponse?.entry && (exportResponse.entry as LogEntry);
      let generatedAttachment = exportResponse?.attachment as
        | Attachment
        | undefined;
      let finalDownloadUrl =
        generatedAttachment?.downloadUrl || generatedAttachment?.url || null;

      if (generatedAttachment && hasStoredSignature) {
        try {
          const signResponse = await api.attachments.sign(
            generatedAttachment.id,
            {
              consentStatement:
                "Autorizo la inserción de mi firma manuscrita digital en esta bitácora.",
              x: 140,
              y: 520,
              width: 260,
              baseline: true,
              baselineRatio: 0.7,
            }
          );

          setHasStoredSignature(true);

          if (signResponse?.entry) {
            latestEntry = signResponse.entry as LogEntry;
          }
          if (signResponse?.signedAttachment) {
            generatedAttachment = signResponse.signedAttachment as Attachment;
            finalDownloadUrl =
              generatedAttachment.downloadUrl || generatedAttachment.url || null;
          }
        } catch (signError) {
          console.warn("No se pudo firmar automáticamente el PDF:", signError);
          const message =
            signError instanceof Error
              ? signError.message
              : "No se pudo firmar el documento.";
          setValidationError(message);
          showToast({
            variant: "warning",
            title: "Firma pendiente",
            message:
              "Descargamos el PDF, pero debes registrar tu firma manuscrita para firmarlo automáticamente.",
          });
          if (
            signError instanceof Error &&
            signError.message.toLowerCase().includes("firma manuscrita")
          ) {
            setHasStoredSignature(false);
          }
        }
      } else if (generatedAttachment && !hasStoredSignature) {
        showToast({
          variant: "info",
          title: "Firma no registrada",
          message:
            "Puedes descargar el PDF. Registra tu firma manuscrita para firmarlo automáticamente la próxima vez.",
        });
      }

      if (latestEntry) {
        applyEntryState(latestEntry);
      }

      await onRefresh();

      if (finalDownloadUrl) {
        window.open(finalDownloadUrl, "_blank", "noopener,noreferrer");
      }

      showToast({
        variant: "success",
        title: generatedAttachment ? "Bitácora firmada" : "PDF generado",
        message: generatedAttachment
          ? "Se generó un PDF firmado con tu rúbrica."
          : "La bitácora diaria se exportó correctamente.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el PDF.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al exportar",
        message,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSignAttachment = async (attachment: Attachment) => {
    if (!hasStoredSignature) {
      showToast({
        variant: "warning",
        title: "Firma requerida",
        message: "Debes registrar tu firma manuscrita antes de firmar documentos PDF.",
      });
      return;
    }

    if (
      !window.confirm(
        "¿Confirmas que autorizas aplicar tu firma manuscrita sobre este documento PDF?"
      )
    ) {
      return;
    }

    try {
      const response = await api.attachments.sign(attachment.id, {
        consentStatement:
          "Autorizo la inserción de mi firma manuscrita digital en este documento.",
        x: 140,
        y: 520,
        width: 260,
        baseline: true,
        baselineRatio: 0.7,
      });

      setHasStoredSignature(true);

      if (response?.entry) {
        const updatedEntry = response.entry as LogEntry;
        applyEntryState(updatedEntry);
        onUpdate(updatedEntry);
      } else if (response?.signedAttachment) {
        setEditedEntry((prev) => ({
          ...prev,
          attachments: [
            ...(prev.attachments || []),
            response.signedAttachment as Attachment,
          ],
        }));
      }

      await onRefresh();

      const signedAttachmentResponse = response?.signedAttachment as Attachment | undefined;
      if (signedAttachmentResponse) {
        const signedUrl =
          signedAttachmentResponse.downloadUrl || signedAttachmentResponse.url;
        if (signedUrl) {
          window.open(signedUrl, "_blank", "noopener,noreferrer");
        }
      }

      showToast({
        variant: "success",
        title: "Documento firmado",
        message: "Se generó un PDF firmado con tu rúbrica.",
      });
    } catch (error) {
      console.error("Error al firmar el documento:", error);
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo firmar el documento.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al firmar",
        message,
      });
    }
  };

  const { folioNumber, author, comments = [] } = entry;
  const {
    title,
    description,
    entryDate: entryDateIso,
    activitiesPerformed = "",
    materialsUsed = "",
    workforce = "",
    weatherConditions = "",
    additionalObservations = "",
    scheduleDay = "",
    locationDetails = "",
    weatherReport,
    contractorPersonnel = [],
    interventoriaPersonnel = [],
    equipmentResources = [],
    executedActivities = [],
    executedQuantities = [],
    scheduledActivities = [],
    qualityControls = [],
    materialsReceived = [],
    safetyNotes = [],
    projectIssues = [],
    siteVisits = [],
    contractorObservations = "",
    interventoriaObservations = "",
    type,
    status,
    isConfidential,
    history = [],
    createdAt,
    attachments = [],
    requiredSignatories = [],
    signatures = [],
  } = editedEntry;

  const weatherReportData: WeatherReport = weatherReport
    ? { ...weatherReport, rainEvents: weatherReport.rainEvents || [] }
    : { rainEvents: [] };

  const contractorPersonnelLines = (contractorPersonnel || [])
    .map((item) => formatPersonnelLine(item))
    .filter((line): line is string => Boolean(line));

  const interventoriaPersonnelLines = (interventoriaPersonnel || [])
    .map((item) => formatPersonnelLine(item))
    .filter((line): line is string => Boolean(line));

  const equipmentResourceLines = (equipmentResources || [])
    .map((item) => formatEquipmentLine(item))
    .filter((line): line is string => Boolean(line));

  const toDatetimeLocal = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset)
      .toISOString()
      .slice(0, -1);
    return localISOTime.substring(0, 16);
  };

  const canEdit =
    currentUser.id === author?.id || currentUser.projectRole === UserRole.ADMIN;

  const entryDateDisplay = entryDateIso
    ? new Date(entryDateIso).toLocaleDateString("es-CO", { dateStyle: "long" })
    : "N/A";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Detalle Anotación - Folio #${folioNumber}`}
        size="2xl"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="pb-4 border-b">
            <div className="flex justify-between items-start">
              {isEditing ? (
                <Input
                  name="title"
                  value={title}
                  onChange={handleInputChange}
                  wrapperClassName="w-full"
                />
              ) : (
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {title}{" "}
                  {isConfidential && (
                    <LockClosedIcon className="text-gray-500 h-5 w-5" />
                  )}
                </h3>
              )}
            </div>
            <div className="mt-2 flex justify-between items-center">
              <p className="text-sm text-gray-500 mt-1">{type}</p>
              {isEditing ? (
                <Select
                  name="status"
                  value={status}
                  onChange={handleInputChange}
                >
                  {Object.values(EntryStatus).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge status={status} />
              )}
            </div>
          </div>
          {/* Details Grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6">
            <DetailRow label="Autor" value={author?.fullName || "N/A"} />
            {isEditing ? (
              <Input
                label="Fecha del diario"
                name="entryDate"
                type="date"
                value={formEntryDate}
                onChange={(e) => setFormEntryDate(e.target.value)}
              />
            ) : (
              <DetailRow label="Fecha del diario" value={entryDateDisplay} />
            )}
            <DetailRow
              label="Fecha de creación"
              value={new Date(createdAt).toLocaleString("es-CO")}
            />
          <DetailRow
            label="Última actualización"
            value={
              entry.updatedAt
                ? new Date(entry.updatedAt).toLocaleString("es-CO")
                : "N/A"
            }
          />
          {isEditing ? (
            <Input
              label="Día del plazo"
              name="scheduleDay"
              value={scheduleDay}
              onChange={handleInputChange}
            />
          ) : (
            <DetailRow
              label="Día del plazo"
              value={scheduleDay || "No registrado"}
            />
          )}
          {isEditing ? (
            <Input
              label="Localización / Tramo"
              name="locationDetails"
              value={locationDetails}
              onChange={handleInputChange}
            />
          ) : (
            <DetailRow
              label="Localización / Tramo"
              value={locationDetails || "No registrado"}
            />
          )}
        </dl>

          {/* Summary */}
          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Resumen general del día
            </h4>
            {isEditing ? (
              <textarea
                name="description"
                value={description}
                onChange={handleInputChange}
                rows={4}
                className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              />
            ) : (
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {description || "Sin resumen registrado."}
              </p>
            )}
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Condiciones climáticas
            </h4>
            {isEditing ? (
              <div className="mt-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Resumen"
                    value={weatherSummaryDraft}
                    onChange={(e) => setWeatherSummaryDraft(e.target.value)}
                    placeholder="Ej. Cielo parcialmente nublado"
                  />
                  <Input
                    label="Temperatura"
                    value={weatherTemperatureDraft}
                    onChange={(e) => setWeatherTemperatureDraft(e.target.value)}
                    placeholder="Ej. 22°C"
                  />
                </div>
                <textarea
                  value={weatherNotesDraft}
                  onChange={(e) => setWeatherNotesDraft(e.target.value)}
                  rows={2}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Observaciones adicionales sobre el clima"
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">
                      Lluvias registradas
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addRainEventDraftRow}
                    >
                      Añadir intervalo
                    </Button>
                  </div>
                  {rainEventsDraft.map((event, index) => (
                    <div
                      key={`rain-edit-${index}`}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                    >
                      <Input
                        label={index === 0 ? "Inicio" : undefined}
                        type="time"
                        value={event.start}
                        onChange={(e) =>
                          updateRainEventDraftRow(index, "start", e.target.value)
                        }
                      />
                      <Input
                        label={index === 0 ? "Fin" : undefined}
                        type="time"
                        value={event.end}
                        onChange={(e) =>
                          updateRainEventDraftRow(index, "end", e.target.value)
                        }
                      />
                      {rainEventsDraft.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRainEventDraftRow(index)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold sm:justify-self-start sm:self-center"
                        >
                          <span className="inline-flex items-center gap-1">
                            <XMarkIcon className="h-4 w-4" /> Quitar
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-700 space-y-1">
                <p>
                  <span className="font-medium">Resumen: </span>
                  {weatherReportData.summary || "No registrado"}
                </p>
                <p>
                  <span className="font-medium">Temperatura: </span>
                  {weatherReportData.temperature || "No registrada"}
                </p>
                <div>
                  <span className="font-medium">Lluvias registradas: </span>
                  {weatherReportData.rainEvents?.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {weatherReportData.rainEvents.map((event, idx) => (
                        <li key={`rain-${idx}`}>{event.start || "-"} a {event.end || "-"}</li>
                      ))}
                    </ul>
                  ) : (
                    <span>No registradas.</span>
                  )}
                </div>
                {weatherReportData.notes && (
                  <p>
                    <span className="font-medium">Notas: </span>
                    {weatherReportData.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Actividades realizadas
              </h4>
              {isEditing ? (
                <textarea
                  name="activitiesPerformed"
                  value={activitiesPerformed}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {activitiesPerformed || "Sin registro."}
                </p>
              )}
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Materiales utilizados
              </h4>
              {isEditing ? (
                <textarea
                  name="materialsUsed"
                  value={materialsUsed}
                  onChange={handleInputChange}
                  rows={4}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {materialsUsed || "Sin registro."}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Personal en obra
              </h4>
              {isEditing ? (
                <textarea
                  name="workforce"
                  value={workforce}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {workforce || "Sin registro."}
                </p>
              )}
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Condiciones climáticas
              </h4>
              {isEditing ? (
                <textarea
                  name="weatherConditions"
                  value={weatherConditions}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {weatherConditions || "Sin registro."}
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Recursos del día
            </h4>
            {isEditing ? (
              <div className="mt-2 space-y-5 text-sm text-gray-700">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">
                      Personal del contratista
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addPersonnelDraft(setContractorPersonnelDraft)}
                    >
                      Añadir persona
                    </Button>
                  </div>
                  <div className="mt-2 space-y-3">
                    {contractorPersonnelDraft.map((person, index) => (
                      <div
                        key={`contractor-edit-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                      >
                        <Input
                          label={index === 0 ? "Cargo" : undefined}
                          value={person.role}
                          onChange={(e) =>
                            updatePersonnelDraft(
                              setContractorPersonnelDraft,
                              index,
                              "role",
                              e.target.value
                            )
                          }
                        />
                        <Input
                          label={index === 0 ? "Cantidad" : undefined}
                          type="number"
                          min="0"
                          value={person.quantity}
                          onChange={(e) =>
                            updatePersonnelDraft(
                              setContractorPersonnelDraft,
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                        />
                        <Input
                          label={index === 0 ? "Notas" : undefined}
                          value={person.notes}
                          onChange={(e) =>
                            updatePersonnelDraft(
                              setContractorPersonnelDraft,
                              index,
                              "notes",
                              e.target.value
                            )
                          }
                        />
                        {contractorPersonnelDraft.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removePersonnelDraft(setContractorPersonnelDraft, index)
                            }
                            className="text-red-500 hover:text-red-700 text-xs font-semibold sm:col-span-3 text-left"
                          >
                            <span className="inline-flex items-center gap-1">
                              <XMarkIcon className="h-4 w-4" /> Quitar
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">
                      Personal de la interventoría
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addPersonnelDraft(setInterventoriaPersonnelDraft)}
                    >
                      Añadir persona
                    </Button>
                  </div>
                  <div className="mt-2 space-y-3">
                    {interventoriaPersonnelDraft.map((person, index) => (
                      <div
                        key={`interventoria-edit-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                      >
                        <Input
                          label={index === 0 ? "Cargo" : undefined}
                          value={person.role}
                          onChange={(e) =>
                            updatePersonnelDraft(
                              setInterventoriaPersonnelDraft,
                              index,
                              "role",
                              e.target.value
                            )
                          }
                        />
                        <Input
                          label={index === 0 ? "Cantidad" : undefined}
                          type="number"
                          min="0"
                          value={person.quantity}
                          onChange={(e) =>
                            updatePersonnelDraft(
                              setInterventoriaPersonnelDraft,
                              index,
                              "quantity",
                              e.target.value
                            )
                          }
                        />
                        <Input
                          label={index === 0 ? "Notas" : undefined}
                          value={person.notes}
                          onChange={(e) =>
                            updatePersonnelDraft(
                              setInterventoriaPersonnelDraft,
                              index,
                              "notes",
                              e.target.value
                            )
                          }
                        />
                        {interventoriaPersonnelDraft.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removePersonnelDraft(
                                setInterventoriaPersonnelDraft,
                                index
                              )
                            }
                            className="text-red-500 hover:text-red-700 text-xs font-semibold sm:col-span-3 text-left"
                          >
                            <span className="inline-flex items-center gap-1">
                              <XMarkIcon className="h-4 w-4" /> Quitar
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-800">
                      Maquinaria y equipos
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addEquipmentDraftRow}
                    >
                      Añadir equipo
                    </Button>
                  </div>
                  <div className="mt-2 space-y-3">
                    {equipmentResourcesDraft.map((item, index) => (
                      <div
                        key={`equipment-edit-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
                      >
                        <Input
                          label={index === 0 ? "Equipo" : undefined}
                          value={item.name}
                          onChange={(e) =>
                            updateEquipmentDraftRow(index, "name", e.target.value)
                          }
                        />
                        <Input
                          label={index === 0 ? "Estado" : undefined}
                          value={item.status}
                          onChange={(e) =>
                            updateEquipmentDraftRow(index, "status", e.target.value)
                          }
                          placeholder="Operativa, standby, etc."
                        />
                        <Input
                          label={index === 0 ? "Notas" : undefined}
                          value={item.notes}
                          onChange={(e) =>
                            updateEquipmentDraftRow(index, "notes", e.target.value)
                          }
                        />
                        {equipmentResourcesDraft.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEquipmentDraftRow(index)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold sm:col-span-3 text-left"
                          >
                            <span className="inline-flex items-center gap-1">
                              <XMarkIcon className="h-4 w-4" /> Quitar
                            </span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 space-y-3 text-sm text-gray-700">
                <div>
                  <p className="font-medium">Personal del contratista</p>
                  {contractorPersonnelLines.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {contractorPersonnelLines.map((line, index) => (
                        <li key={`cp-${index}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Personal de la interventoría</p>
                  {interventoriaPersonnelLines.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {interventoriaPersonnelLines.map((line, index) => (
                        <li key={`ip-${index}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Maquinaria y equipos</p>
                  {equipmentResourceLines.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {equipmentResourceLines.map((line, index) => (
                        <li key={`eq-${index}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Ejecución de actividades
            </h4>
            {isEditing ? (
              <div className="mt-2 space-y-3">
                <textarea
                  value={listToPlainText(executedActivities)}
                  onChange={(e) => handleListChange("executedActivities", e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Actividades ejecutadas"
                />
                <textarea
                  value={listToPlainText(executedQuantities)}
                  onChange={(e) => handleListChange("executedQuantities", e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Cantidades de obra"
                />
                <textarea
                  value={listToPlainText(scheduledActivities)}
                  onChange={(e) => handleListChange("scheduledActivities", e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Programadas y no ejecutadas"
                />
              </div>
            ) : (
              <div className="mt-2 space-y-3 text-sm text-gray-700">
                <div>
                  <p className="font-medium">Actividades ejecutadas</p>
                  {executedActivities.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {executedActivities.map((item, index) => (
                        <li key={`ea-${index}`}>{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Cantidades ejecutadas</p>
                  {executedQuantities.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {executedQuantities.map((item, index) => (
                        <li key={`eqty-${index}`}>{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Programadas y no ejecutadas</p>
                  {scheduledActivities.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {scheduledActivities.map((item, index) => (
                        <li key={`sa-${index}`}>{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Control, novedades e incidencias
            </h4>
            {isEditing ? (
              <div className="mt-2 space-y-3">
                <textarea
                  value={listToPlainText(qualityControls)}
                  onChange={(e) => handleListChange("qualityControls", e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Control de calidad"
                />
                <textarea
                  value={listToPlainText(materialsReceived)}
                  onChange={(e) => handleListChange("materialsReceived", e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Materiales recibidos"
                />
                <textarea
                  value={listToPlainText(safetyNotes)}
                  onChange={(e) => handleListChange("safetyNotes", e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Gestión HSEQ / SST"
                />
                <textarea
                  value={listToPlainText(projectIssues)}
                  onChange={(e) => handleListChange("projectIssues", e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Novedades y contratiempos"
                />
                <textarea
                  value={listToPlainText(siteVisits)}
                  onChange={(e) => handleListChange("siteVisits", e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Visitas registradas"
                />
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <p className="font-medium">Control de calidad</p>
                  {qualityControls.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {qualityControls.map((item, index) => (
                        <li key={`qc-${index}`}>{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Materiales recibidos</p>
                  {materialsReceived.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {materialsReceived.map((item, index) => (
                        <li key={`mr-${index}`}>{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Gestión HSEQ / SST</p>
                  {safetyNotes.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {safetyNotes.map((item, index) => (
                        <li key={`sn-${index}`}>{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
                <div>
                  <p className="font-medium">Novedades / Contratiempos</p>
                  {projectIssues.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {projectIssues.map((item, index) => (
                        <li key={`pi-${index}`}>{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <p className="font-medium">Visitas</p>
                  {siteVisits.length ? (
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {siteVisits.map((item, index) => (
                        <li key={`sv-${index}`}>{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-gray-500">Sin registro.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Observaciones del contratista
              </h4>
              {isEditing ? (
                <textarea
                  value={contractorObservations}
                  onChange={(e) =>
                    setEditedEntry((prev) => ({
                      ...prev,
                      contractorObservations: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {contractorObservations || "Sin observaciones."}
                </p>
              )}
            </div>
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Observaciones de la interventoría
              </h4>
              {isEditing ? (
                <textarea
                  value={interventoriaObservations}
                  onChange={(e) =>
                    setEditedEntry((prev) => ({
                      ...prev,
                      interventoriaObservations: e.target.value,
                    }))
                  }
                  rows={3}
                  className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              ) : (
                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                  {interventoriaObservations || "Sin observaciones."}
                </p>
              )}
            </div>
          </div>

        <div>
          <h4 className="text-md font-semibold text-gray-800">
            Observaciones adicionales
            </h4>
            {isEditing ? (
              <textarea
                name="additionalObservations"
                value={additionalObservations}
                onChange={handleInputChange}
                rows={3}
                className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              />
            ) : (
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                {additionalObservations || "Sin observaciones."}
              </p>
            )}
          </div>
          {isEditing && (
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Firmantes responsables
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Define quiénes deben firmar esta anotación. El autor está incluido automáticamente.
              </p>
              <div className="mt-2 border border-gray-200 rounded-md divide-y max-h-48 overflow-y-auto">
                {sortedUsers.map((user) => {
                  const isAuthor = author?.id === user.id;
                  const isChecked = selectedSignerIds.includes(user.id) || isAuthor;
                  return (
                    <label
                      key={user.id}
                      className="flex items-start gap-3 px-3 py-2 text-sm text-gray-700"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                        checked={isChecked}
                        onChange={(event) =>
                          handleToggleSigner(user.id, event.target.checked)
                        }
                        disabled={isAuthor}
                      />
                      <span>
                        <span className="font-semibold text-gray-900">
                          {user.fullName}
                        </span>
                        {user.projectRole && (
                          <span className="block text-xs text-gray-500">
                            {user.projectRole}
                          </span>
                        )}
                        {isAuthor && (
                          <span className="block text-xs text-green-600 font-medium">
                            Autor de la bitácora
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {/* Confidential Checkbox */}
          {isEditing && (
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="isConfidential"
                  name="isConfidential"
                  type="checkbox"
                  checked={isConfidential}
                  onChange={handleInputChange}
                  className="focus:ring-brand-primary h-4 w-4 text-brand-primary border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="isConfidential"
                  className="font-medium text-gray-700"
                >
                  Marcar como confidencial
                </label>
                <p className="text-gray-500">
                  Solo usuarios autorizados podrán ver esta anotación.
                </p>
              </div>
            </div>
          )}
          {/* Attachments */}
          {isEditing ? (
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Gestión de Archivos Adjuntos
              </h4>
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {attachments.map((att) => (
                    <li
                      key={att.id}
                      className="flex items-center justify-between py-2 pl-3 pr-2 text-sm bg-gray-50 rounded-md border"
                    >
                      <span className="truncate font-medium flex-1 w-0">
                        {att.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingAttachment(att.id)}
                        className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {newFiles.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-gray-600">
                    Nuevos archivos para adjuntar:
                  </h5>
                  <ul className="mt-1 space-y-2">
                    {newFiles.map((file, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between py-2 pl-3 pr-2 text-sm bg-blue-50 rounded-md border border-blue-200"
                      >
                        <span className="truncate font-medium flex-1 w-0">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewFile(file)}
                          className="ml-4 flex-shrink-0 text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-3">
                <label
                  htmlFor="file-upload-edit"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <PaperClipIcon className="h-5 w-5 mr-2 text-gray-500" />
                  <span>Añadir Archivos</span>
                  <input
                    id="file-upload-edit"
                    name="file-upload-edit"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    multiple
                  />
                </label>
              </div>
            </div>
          ) : (
            attachments.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-800">
                  Archivos Adjuntos
                </h4>
                <div className="mt-2 space-y-3">
                  {attachments.map((att) => {
                    const isImage = att.type?.startsWith("image/");
                    if (isImage) {
                      return (
                        <div key={att.id} className="p-2 border rounded-lg">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img
                              src={att.url}
                              alt={att.fileName}
                              className="max-h-80 w-auto rounded-md border cursor-pointer hover:opacity-90"
                            />
                          </a>
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <p className="font-medium text-gray-700 truncate">
                              {att.fileName}
                            </p>
                            <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                              <span className="text-gray-500">
                                {formatBytes(att.size)}
                              </span>
                              <a
                                href={att.url}
                                download={att.fileName}
                                className="font-medium text-brand-primary hover:text-brand-secondary"
                              >
                                Descargar
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const isPdf =
                      typeof att.type === "string" &&
                      att.type.toLowerCase().includes("pdf");
                    return (
                      <AttachmentItem
                        key={att.id}
                        attachment={att}
                        actions={
                          isPdf ? (
                            <Button
                              size="sm"
                              onClick={() => handleSignAttachment(att)}
                              disabled={isGeneratingPdf}
                            >
                              Firmar documento
                            </Button>
                          ) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )
          )}
          {/* Signature Block */}
          {!isEditing && (
            <SignatureBlock
              requiredSignatories={requiredSignatories}
              signatures={signatures}
              signatureTasks={editedEntry.signatureTasks}
              signatureSummary={editedEntry.signatureSummary}
              currentUser={currentUser}
              onSignRequest={() => setIsSignatureModalOpen(true)}
              documentType="Anotación"
            />
          )}
          {/* Comments */}
          <div>
            <h4 className="text-md font-semibold text-gray-800">Comentarios</h4>
            {comments.length > 0 ? (
              <div className="mt-2 space-y-4 max-h-40 overflow-y-auto pr-2">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3">
                    {/* Cambia "user" por "author" en las siguientes 2 líneas */}
                    <img
                      src={comment.author.avatarUrl}
                      alt={comment.author.fullName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">
                          {comment.author.fullName}
                        </span>

                        <span className="text-gray-500 ml-2 text-xs">
                          {new Date(comment.timestamp).toLocaleString("es-CO")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-md whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      {(comment.attachments || []).length > 0 && (
                        <div className="mt-2 space-y-3">
                          {(comment.attachments || []).map((att) => {
                            const isImage = att.type?.startsWith("image/");
                            if (isImage) {
                              return (
                                <div key={att.id}>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={att.url}
                                      alt={att.fileName}
                                      className="max-h-40 rounded border cursor-pointer hover:opacity-90"
                                    />
                                  </a>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {att.fileName} -
                                    <a
                                      href={att.url}
                                      download={att.fileName}
                                      className="ml-1 font-medium text-brand-primary hover:text-brand-secondary"
                                    >
                                      Descargar
                                    </a>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <AttachmentItem key={att.id} attachment={att} />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Aún no hay comentarios. ¡Sé el primero en añadir uno!
              </p>
            )}
          </div>
          {/* New Comment Form */}
          <div className="pt-4 border-t">
            <form
              onSubmit={handleCommentSubmit}
              className="flex items-start space-x-3"
            >
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="flex-1">
                <textarea
                  rows={2}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  placeholder="Escribe tu comentario aquí..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                ></textarea>
                {commentFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {commentFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1 pl-2 pr-1 text-sm bg-blue-50 rounded-md border border-blue-200"
                      >
                        <span className="truncate font-medium flex-1 w-0 text-gray-700">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCommentFile(file)}
                          className="ml-2 flex-shrink-0 text-red-500 hover:text-red-700"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex justify-between items-center">
                  <label
                    htmlFor="comment-file-upload"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 cursor-pointer"
                  >
                    <PaperClipIcon className="h-4 w-4 mr-2" />
                    <span>Adjuntar</span>
                    <input
                      id="comment-file-upload"
                      type="file"
                      multiple
                      onChange={handleCommentFileChange}
                      className="sr-only"
                    />
                  </label>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newComment.trim() && commentFiles.length === 0}
                  >
                    Publicar Comentario
                  </Button>
                </div>
              </div>
            </form>
          </div>
          {/* Change History */}
          <ChangeHistory history={history} />
        </div>

        {isEditing && validationError && (
          <div className="p-3 my-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {validationError}
          </div>
        )}
        {/* Modal Footer */}
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
          {isEditing ? (
            <div>
              <Button variant="danger" onClick={handleDelete}>
                Eliminar Anotación
              </Button>
            </div>
          ) : (
            <div></div>
          )}

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  Guardar Cambios
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={onClose}>
                  Cerrar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleExportPdf}
                  leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? "Generando..." : "Exportar PDF"}
                </Button>
                {canEdit && (
                  <Button variant="primary" onClick={() => setIsEditing(true)}>
                    Modificar Anotación
                  </Button>
                )}
              </>
            )}
          </div>
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

export default EntryDetailModal;
