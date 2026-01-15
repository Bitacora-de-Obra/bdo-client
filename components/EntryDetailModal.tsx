import React, { useEffect, useMemo, useState } from "react";
import {
  LogEntry,
  EntryStatus,
  EntryType,
  User,
  UserRole,
  Attachment,
  LogEntryListItem,
  WeatherReport,
  PersonnelEntry,
  SignatureConsentPayload,
  ReviewTask,
  Comment,
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
import SSTIncidentViewer from "./SSTIncidentViewer";
import SignatureBlock from "./SignatureBlock";
import SignatureModal from "./SignatureModal";
import { useToast } from "./ui/ToastProvider";
import api from "../src/services/api";
import { useAuth } from "../contexts/AuthContext";
import { getFullRoleName } from "../src/utils/roleDisplay";
import { getUserAvatarUrl } from "../src/utils/avatar";
import MentionTextarea from "./ui/MentionTextarea";
import LazyImage from "./ui/LazyImage";
import { convertInputMentionsToPayload, renderCommentWithMentions } from "../src/utils/mentions";
import AttachmentSections from "./AttachmentSections";
import ReviewWorkflowBanner from "./ReviewWorkflowBanner";

interface EntryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: LogEntry;
  onUpdate: (updatedEntry: LogEntry) => void;
  onAddComment: (
    entryId: string,
    commentText: string,
    files: File[]
  ) => Promise<Comment>;
  onSign: (
    documentId: string,
    documentType: "logEntry",
    signer: User,
    payload: SignatureConsentPayload
  ) => Promise<{ success: boolean; error?: string }>;
  onDelete: (entryId: string) => Promise<void>;
  currentUser: User;
  availableUsers: User[];
  onRefresh?: () => void;
  readOnly?: boolean;
  projectStartDate?: string; // Fecha de inicio del proyecto para calcular días
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



const LEGACY_STATUS_ALIASES: Record<string, EntryStatus> = {
  // Legacy display values (old data)
  Radicado: EntryStatus.SUBMITTED,
  "En Revisión": EntryStatus.NEEDS_REVIEW,
  Aprobado: EntryStatus.APPROVED,
  "Revisión contratista": EntryStatus.SUBMITTED,
  "Revisión final": EntryStatus.NEEDS_REVIEW,
  "Listo para firmas": EntryStatus.APPROVED,
  Firmado: EntryStatus.SIGNED,
  // Prisma enum keys (database values)
  DRAFT: EntryStatus.DRAFT,
  SUBMITTED: EntryStatus.SUBMITTED,
  NEEDS_REVIEW: EntryStatus.NEEDS_REVIEW,
  APPROVED: EntryStatus.APPROVED,
  SIGNED: EntryStatus.SIGNED,
  REJECTED: EntryStatus.REJECTED,
};

const PROJECT_ROLE_ALIASES: Record<string, UserRole> = {
  resident: UserRole.RESIDENT,
  "residente de obra": UserRole.RESIDENT,
  supervisor: UserRole.SUPERVISOR,
  "contractor_rep": UserRole.CONTRACTOR_REP,
  contratista: UserRole.CONTRACTOR_REP,
  "representante contratista": UserRole.CONTRACTOR_REP,
  "admin": UserRole.ADMIN,
  "administrador": UserRole.ADMIN,
  "administrador idu": UserRole.ADMIN,
};

const normalizeWorkflowStatusValue = (
  value: string
): EntryStatus | string => {
  return LEGACY_STATUS_ALIASES[value] || value;
};

const normalizeProjectRoleValue = (value?: string | null): UserRole | string => {
  if (!value) {
    return value || "";
  }
  const key = value.trim().toLowerCase();
  return PROJECT_ROLE_ALIASES[key] || value;
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
  readOnly = false,
  projectStartDate,
}) => {
  const { user: authUser } = useAuth();
  const canDownload = authUser?.canDownload ?? true;
  
  const extractSignerIds = (entryData: LogEntry): string[] => {
    const fromTasks = (entryData.signatureTasks || [])
      .map((task) => task.signer?.id)
      .filter((id): id is string => Boolean(id));
    const baseIds =
      fromTasks.length > 0
        ? fromTasks
        : (entryData.requiredSignatories || []).map((user) => user.id);
    const setOfIds = new Set<string>(baseIds);
    // Solo agregar autor si el entry no tenía skipAuthorAsSigner
    if (entryData.author?.id && !entryData.skipAuthorAsSigner) {
      setOfIds.add(entryData.author.id);
    }
    return Array.from(setOfIds);
  };

  const [isEditing, setIsEditing] = useState(false);

  // Calcular día del plazo automáticamente
  const calculateScheduleDay = (entryDateVal: string) => {
    if (!entryDateVal || !projectStartDate) return "";
    const entryDateObj = new Date(entryDateVal.includes('T') ? entryDateVal : `${entryDateVal}T12:00:00`);
    const projectStartDateObj = new Date(projectStartDate);
    const diffTime = entryDateObj.getTime() - projectStartDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Día ${Math.abs(diffDays)} antes del inicio del proyecto`;
    if (diffDays === 0) return "Día 1 del proyecto";
    return `Día ${diffDays + 1} del proyecto`;
  };



  const [editedEntry, setEditedEntry] = useState<LogEntry>(entry);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [formEntryDate, setFormEntryDate] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isRegeneratingPdf, setIsRegeneratingPdf] = useState(false);

  // Effect to recalculate schedule day when date changes during edit
  useEffect(() => {
    if (isEditing && formEntryDate && projectStartDate) {
      // Avoid ghost updates: only recalculate if date actually changed from original
      const originalEntryDate = entry.entryDate 
        ? (typeof entry.entryDate === 'string' ? entry.entryDate : new Date(entry.entryDate).toISOString()).substring(0, 10) 
        : "";
        
      if (formEntryDate === originalEntryDate) {
        return;
      }

      const calculated = calculateScheduleDay(formEntryDate);
      if (calculated && calculated !== editedEntry.scheduleDay) {
        setEditedEntry(prev => ({ ...prev, scheduleDay: calculated }));
      }
    }
  }, [formEntryDate, isEditing, projectStartDate, entry.entryDate]);
  const [isApproving, setIsApproving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
  const initialContractorResponses = useMemo(
    () => ({
      contractorObservations: entry.contractorObservations || "",
      safetyContractorResponse: entry.safetyContractorResponse || "",
      environmentContractorResponse: entry.environmentContractorResponse || "",
      socialContractorResponse: entry.socialContractorResponse || "",
    }),
    [entry.contractorObservations,
      entry.environmentContractorResponse,
      entry.safetyContractorResponse,
      entry.socialContractorResponse]
  );
  const [contractorResponsesDraft, setContractorResponsesDraft] = useState(
    initialContractorResponses
  );
  const [isContractorEditingNotes, setIsContractorEditingNotes] =
    useState(false);
  const [isSavingContractorNotes, setIsSavingContractorNotes] =
    useState(false);
  const [isSavingInterventoriaObs, setIsSavingInterventoriaObs] =
    useState(false);
  const [isSendingToContractor, setIsSendingToContractor] = useState(false);
  // Separate state for new observation inputs (avoid overwriting existing text)
  const [contractorNoteInput, setContractorNoteInput] = useState("");
  const [interventoriaNoteInput, setInterventoriaNoteInput] = useState("");
  const [
    isCompletingContractorReview,
    setIsCompletingContractorReview,
  ] = useState(false);
  const [isReturningToContractor, setIsReturningToContractor] =
    useState(false);
  const [contractorPersonnelDraft, setContractorPersonnelDraft] = useState<
    Array<{ role: string; quantity: string; notes: string }>
  >([{ role: "", quantity: "", notes: "" }]);
  const [interventoriaPersonnelDraft, setInterventoriaPersonnelDraft] = useState<
    Array<{ role: string; quantity: string; notes: string }>
  >([{ role: "", quantity: "", notes: "" }]);
  const [equipmentResourcesDraft, setEquipmentResourcesDraft] = useState<
    Array<{ name: string; status: string; notes: string }>
  >([{ name: "", status: "", notes: "" }]);

  // Debug: asegurarnos de que el modal de edición abra correctamente
  useEffect(() => {
    if (isEditing) {
      console.info("[EntryDetailModal] editing mode ON (z-fix)");
    }
  }, [isEditing]);
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
      Array.from(knownUsers.values())
        .filter((user) => user.appRole !== "viewer") // Excluir viewers - no pueden ser firmantes
        .sort((a, b) =>
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
      safetyFindings: entryData.safetyFindings || "",
      safetyContractorResponse: entryData.safetyContractorResponse || "",
      environmentFindings: entryData.environmentFindings || "",
      environmentContractorResponse: entryData.environmentContractorResponse || "",
      socialActivities: entryData.socialActivities || [],
      socialObservations: entryData.socialObservations || "",
      socialContractorResponse: entryData.socialContractorResponse || "",
      socialPhotoSummary: entryData.socialPhotoSummary || "",
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
    setContractorResponsesDraft({
      contractorObservations: entryData.contractorObservations || "",
      safetyContractorResponse: entryData.safetyContractorResponse || "",
      environmentContractorResponse: entryData.environmentContractorResponse || "",
      socialContractorResponse: entryData.socialContractorResponse || "",
    });
    setIsContractorEditingNotes(false);

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
    if (readOnly && !isAdmin) {
      showToast({
        title: "Acción no permitida",
        message: "No tienes permisos para eliminar anotaciones.",
        variant: "error",
      });
      return;
    }
    if (
      window.confirm(
        "¿Estás seguro de que quieres eliminar esta anotación? Esta acción no se puede deshacer."
      )
    ) {
      setIsDeleting(true);
      try {
        await onDelete(entry.id);
        onClose();
      } catch (error) {
        showToast({
          title: "Error",
          message: "No se pudo eliminar la anotación.",
          variant: "error",
        });
        setIsDeleting(false);
      }
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
    | "siteVisits"
    | "socialActivities";

  const listToPlainText = (items?: LogEntryListItem[]) =>
    (items || []).map((item) => item.text).join("\n");

  const plainTextToList = (value: string): LogEntryListItem[] =>
    value
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line)
      .filter((line) => line.trim().length > 0)
      .map((text) => ({ text }));

  const handleListChange = (field: TextListField, value: string) => {
    setEditedEntry((prev) => ({
      ...prev,
      [field]: plainTextToList(value),
    }));
  };

  type ContractorResponseKey =
    | "contractorObservations"
    | "safetyContractorResponse"
    | "environmentContractorResponse"
    | "socialContractorResponse";

  const contractorResponseFields: Array<{
    key: ContractorResponseKey;
    label: string;
  }> = [
    {
      key: "contractorObservations",
      label: "Observaciones generales del contratista",
    },
    {
      key: "safetyContractorResponse",
      label: "Respuesta componente SST",
    },
    {
      key: "environmentContractorResponse",
      label: "Respuesta componente ambiental",
    },
    {
      key: "socialContractorResponse",
      label: "Respuesta componente social",
    },
  ];

  const handleContractorResponseDraftChange = (
    field: ContractorResponseKey,
    value: string
  ) => {
    setContractorResponsesDraft((prev) => ({
      ...prev,
      [field]: value,
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
    if (isSubmittingComment) {
      return;
    }
    // Allow commenting if not readOnly, OR if user is Contractor/Supervisor/Admin (reviewers)
    // We recalculate permissions here because the main permission block is defined below
    const roleForComment = normalizeProjectRoleValue(currentUser.projectRole);
    const canCommentOverride = 
      roleForComment === UserRole.CONTRACTOR_REP || 
      roleForComment === UserRole.SUPERVISOR || 
      roleForComment === UserRole.RESIDENT || 
      roleForComment === UserRole.ADMIN || 
      currentUser.appRole === 'admin';

    if (readOnly && !canCommentOverride) {
      showToast({
        title: "Acción no permitida",
        message: "No tienes permisos para agregar comentarios.",
        variant: "error",
      });
      return;
    }
    const preparedComment = convertInputMentionsToPayload(newComment).trim();
    if (preparedComment || commentFiles.length > 0) {
      try {
        setIsSubmittingComment(true);
        const createdComment = await onAddComment(entry.id, preparedComment, commentFiles);
        // Si el backend devuelve el comentario creado (con attachments), agréguelo al estado
        if (createdComment) {
          setEditedEntry((prev) => ({
            ...prev,
            comments: [...(prev.comments || []), createdComment],
          }));
        }
        setNewComment("");
        setCommentFiles([]);
      } catch (error) {
        console.error("Error al publicar comentario:", error);
        showToast({
          title: "No se pudo publicar el comentario",
          message: "Intenta nuevamente en unos segundos.",
          variant: "error",
        });
      } finally {
        setIsSubmittingComment(false);
      }
    }
  };

  const handleSave = async () => {
    setValidationError(null);
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "No tienes permisos para modificar esta anotación.",
        variant: "error",
      });
      return;
    }

    // Fijar mediodía UTC para evitar corrimientos de fecha
    const parsedDate = new Date(`${formEntryDate}T12:00:00Z`);
    if (isNaN(parsedDate.getTime())) {
      setValidationError("La fecha del diario no es válida.");
      return;
    }

    const entryDateIso = parsedDate.toISOString();
    const endOfDay = new Date(`${formEntryDate}T23:59:59.999Z`);

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
      entryDate: entryDateIso,
      activityStartDate: entryDateIso,
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
    const skipAuthorAsSigner = !selectedSignerIds.includes(author?.id || "");
    const requiredSignatories = Array.from(signerIds)
      .map((id) => findUserById(id))
      .filter((user): user is User => Boolean(user));
    finalEntry.requiredSignatories = requiredSignatories;
    finalEntry.skipAuthorAsSigner = skipAuthorAsSigner;

    setIsUpdating(true);
    try {
      await onUpdate(finalEntry);
      
      // Refresh to get side effects from backend (e.g. review task completion)
      if (onRefresh) {
        await onRefresh();
      }
      
      setIsEditing(false);
      setNewFiles([]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la bitácora.";
      setValidationError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmSignature = async (
    payload: SignatureConsentPayload
  ): Promise<{ success: boolean; error?: string }> => {
    if (readOnly) {
      showToast({
        title: "Acción no permitida",
        message: "No tienes permisos para firmar documentos.",
        variant: "error",
      });
      return { success: false, error: "No autorizado" };
    }
    // Ya no verificamos la contraseña aquí, se la pasamos al backend
    const result = await onSign(entry.id, "logEntry", currentUser, payload);
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

  const handleSendToContractor = async () => {
    if (!canSendToContractor) {
      showToast({
        variant: "error",
        title: "Acción no permitida",
        message: "No puedes enviar esta anotación al contratista.",
      });
      return;
    }

    if (
      !window.confirm(
        "¿Enviar esta anotación al contratista para su revisión? Después de hacerlo, no podrás editar el contenido hasta que vuelva."
      )
    ) {
      return;
    }

    setIsSendingToContractor(true);
    try {
      const updatedEntry = await api.logEntries.sendToContractor(entry.id);
      syncEntryState(updatedEntry);
      await onRefresh();
      showToast({
        variant: "success",
        title: "Anotación enviada",
        message:
          "La anotación fue enviada al contratista para su revisión.",
      });
    } catch (error: any) {
      const message = error?.message || "No se pudo enviar la anotación.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al enviar",
        message,
      });
    } finally {
      setIsSendingToContractor(false);
    }
  };

  const handleSendToInterventoria = async () => {
    if (!window.confirm(
      "¿Enviar esta anotación a interventoría para su revisión?"
    )) {
      return;
    }

    setIsSendingToContractor(true);
    try {
      const updatedEntry = await api.logEntries.sendToInterventoria(entry.id);
      syncEntryState(updatedEntry);
      await onRefresh();
      showToast({
        variant: "success",
        title: "Anotación enviada",
        message: "La anotación fue enviada a interventoría para su revisión.",
      });
    } catch (error: any) {
      const message = error?.message || "No se pudo enviar la anotación.";
      showToast({
        variant: "error",
        title: "Error al enviar",
        message,
      });
    } finally {
      setIsSendingToContractor(false);
    }
  };

  // NEW: Per-signatory review workflow handlers
  const handleSendForReview = async () => {
    setIsSendingToContractor(true);
    try {
      const updatedEntry = await api.logEntries.sendForReview(entry.id);
      syncEntryState(updatedEntry);
      await onRefresh();
      showToast({
        variant: "success",
        title: "Enviado para revisión",
        message: "La anotación fue enviada a todos los firmantes para su revisión.",
      });
    } catch (error: any) {
      const message = error?.message || "No se pudo enviar para revisión.";
      showToast({
        variant: "error",
        title: "Error al enviar",
        message,
      });
    } finally {
      setIsSendingToContractor(false);
    }
  };

  const handleApproveReview = async () => {
    try {
      const updatedEntry = await api.logEntries.approveReview(entry.id);
      syncEntryState(updatedEntry);
      await onRefresh();
      showToast({
        variant: "success",
        title: "Revisión aprobada",
        message: updatedEntry.allReviewsComplete
          ? "Todas las revisiones están completas. Las firmas están habilitadas."
          : "Tu revisión fue registrada exitosamente.",
      });
    } catch (error: any) {
      const message = error?.message || "No se pudo aprobar la revisión.";
      showToast({
        variant: "error",
        title: "Error",
        message,
      });
    }
  };

  const handleCompleteContractorReview = async () => {
    if (!canCompleteContractorReview) {
      showToast({
        variant: "error",
        title: "Acción no permitida",
        message: "No puedes completar esta etapa.",
      });
      return;
    }

    if (
      !window.confirm(
        "¿Confirmas que completaste la revisión del contratista? Notificarás a la interventoría para la revisión final."
      )
    ) {
      return;
    }

    setIsCompletingContractorReview(true);
    try {
      const updatedEntry = await api.logEntries.completeContractorReview(
        entry.id
      );
      syncEntryState(updatedEntry);
      await onRefresh();
      showToast({
        variant: "success",
        title: "Revisión registrada",
        message:
          "Tu revisión quedó registrada. La interventoría continuará con la revisión final.",
      });
    } catch (error: any) {
      const message =
        error?.message || "No se pudo registrar la revisión.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al completar revisión",
        message,
      });
    } finally {
      setIsCompletingContractorReview(false);
    }
  };

  const handleReturnToContractor = async () => {
    if (!canReturnToContractor) {
      showToast({
        variant: "error",
        title: "Acción no permitida",
        message: "No puedes devolver esta anotación al contratista.",
      });
      return;
    }

    const reason = window.prompt(
      "Describe brevemente el motivo de la devolución (opcional):"
    );

    setIsReturningToContractor(true);
    try {
      const payload =
        reason && reason.trim().length > 0
          ? { reason: reason.trim() }
          : undefined;
      const updatedEntry = await api.logEntries.returnToContractor(
        entry.id,
        payload
      );
      syncEntryState(updatedEntry);
      await onRefresh();
      showToast({
        variant: "success",
        title: "Anotación devuelta",
        message:
          "La anotación fue devuelta al contratista para una nueva iteración.",
      });
    } catch (error: any) {
      const message =
        error?.message ||
        "No se pudo devolver la anotación al contratista.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al devolver anotación",
        message,
      });
    } finally {
      setIsReturningToContractor(false);
    }
  };

  const handleSaveContractorNotes = async () => {
    if (!canEditContractorResponses) {
      showToast({
        variant: "error",
        title: "Acción no permitida",
        message: "No puedes editar las observaciones del contratista.",
      });
      return;
    }

    setIsSavingContractorNotes(true);
    try {
      const payload: Partial<LogEntry> = {
        contractorObservations:
          contractorResponsesDraft.contractorObservations.trim(),
        safetyContractorResponse:
          contractorResponsesDraft.safetyContractorResponse.trim(),
        environmentContractorResponse:
          contractorResponsesDraft.environmentContractorResponse.trim(),
        socialContractorResponse:
          contractorResponsesDraft.socialContractorResponse.trim(),
      };
      const updatedEntry = await api.logEntries.update(entry.id, payload);
      syncEntryState(updatedEntry);
      await onRefresh();
      showToast({
        variant: "success",
        title: "Observaciones guardadas",
        message: "Tus observaciones fueron registradas correctamente.",
      });
      setIsContractorEditingNotes(false);
    } catch (error: any) {
      const message =
        error?.message || "No se pudieron guardar las observaciones.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al guardar observaciones",
        message,
      });
    } finally {
      setIsSavingContractorNotes(false);
    }
  };

  // Simple handler for the simplified contractor observations panel
  const handleSaveContractorObservations = async () => {
    if (!canEditContractorResponses) {
      showToast({
        variant: "error",
        title: "Acción no permitida",
        message: "No puedes editar las observaciones del contratista.",
      });
      return;
    }

    setIsSavingContractorNotes(true);
    try {
      const currentObs = (editedEntry.contractorObservations || "").trim();
      const newObs = contractorNoteInput.trim();
      
      let finalObs = currentObs;
      if (newObs) {
        const timestamp = new Date().toLocaleString("es-CO");
        const authorName = currentUser.fullName || "Usuario";
        const entryText = `[${timestamp}] ${authorName}: ${newObs}`;
        finalObs = currentObs ? `${currentObs}\n\n${entryText}` : entryText;
      }

      const payload: Partial<LogEntry> = {
        contractorObservations: finalObs,
      };
      const updatedEntry = await api.logEntries.update(entry.id, payload);
      syncEntryState(updatedEntry);
      setContractorNoteInput(""); // Clear input after successful save
      await onRefresh();
      showToast({
        variant: "success",
        title: "Observaciones guardadas",
        message: "Tus observaciones fueron registradas correctamente.",
      });
    } catch (error: any) {
      const message =
        error?.message || "No se pudieron guardar las observaciones.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al guardar observaciones",
        message,
      });
    } finally {
      setIsSavingContractorNotes(false);
    }
  };

  const handleSaveInterventoriaObservations = async () => {
    if (!canEditInterventoriaResponses) {
      showToast({
        variant: "error",
        title: "Acción no permitida",
        message: "No puedes editar las observaciones de la interventoría.",
      });
      return;
    }

    setIsSavingInterventoriaObs(true);
    try {
      const currentObs = (editedEntry.interventoriaObservations || "").trim();
      const newObs = interventoriaNoteInput.trim();
      
      let finalObs = currentObs;
      if (newObs) {
        const timestamp = new Date().toLocaleString("es-CO");
        const authorName = currentUser.fullName || "Usuario";
        const entryText = `[${timestamp}] ${authorName}: ${newObs}`;
        finalObs = currentObs ? `${currentObs}\n\n${entryText}` : entryText;
      }

      const payload: Partial<LogEntry> = {
        interventoriaObservations: finalObs,
      };
      const updatedEntry = await api.logEntries.update(entry.id, payload);
      syncEntryState(updatedEntry);
      setInterventoriaNoteInput(""); // Clear input after successful save
      await onRefresh();
      showToast({
        variant: "success",
        title: "Observaciones guardadas",
        message: "Las observaciones de la interventoría fueron registradas correctamente.",
      });
    } catch (error: any) {
      const message =
        error?.message || "No se pudieron guardar las observaciones.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al guardar observaciones",
        message,
      });
    } finally {
      setIsSavingInterventoriaObs(false);
    }
  };

  const handleCompleteReview = async () => {
    if (!canCompleteReview) {
      showToast({
        variant: "error",
        title: "Acción no permitida",
        message: "No tienes permisos para completar la revisión o ya la completaste.",
      });
      return;
    }

    if (
      !window.confirm(
        "¿Estás seguro de que deseas marcar tu revisión como completada? Esto indicará que has terminado de revisar y modificar la anotación."
      )
    ) {
      return;
    }

    try {
      setValidationError(null);
      const updatedEntry = await api.logEntries.completeReview(entry.id);
      
      syncEntryState(updatedEntry);
      await onRefresh();
      
      showToast({
        variant: "success",
        title: "Revisión completada",
        message: "Tu revisión ha sido marcada como completada. El autor podrá aprobar la anotación cuando todas las revisiones estén completadas.",
      });
    } catch (error: any) {
      const message =
        error?.message || "No se pudo completar la revisión.";
      setValidationError(message);
      showToast({
        variant: "error",
        title: "Error al completar revisión",
        message,
      });
    }
  };

  const handleApprove = async () => {
    // Prevenir doble ejecución
    if (isApproving) {
      console.log("DEBUG FRONTEND: Ya se está aprobando, ignorando segundo clic");
      return;
    }

    // Verificar que la anotación no esté ya aprobada
    if (isReadyForSignaturesStatus) {
      showToast({
        variant: "error",
        title: "Anotación ya aprobada",
        message: "Esta anotación ya está aprobada. No se puede aprobar nuevamente.",
      });
      return;
    }

    if (!canApprove) {
      showToast({
        variant: "error",
        title: "Acción no permitida",
        message: "No tienes permisos para aprobar esta anotación o la anotación no está en un estado que permita aprobación.",
      });
      return;
    }

    if (
      !window.confirm(
        "¿Estás seguro de que deseas aprobar esta anotación? Una vez aprobada, no se podrá editar y se procederá a las firmas."
      )
    ) {
      return;
    }

    setIsApproving(true);
    try {
      setValidationError(null);
      console.log("DEBUG FRONTEND: Intentando aprobar anotación", {
        entryId: entry.id,
        currentStatus: status,
        entryStatus: entry.status,
      });
      
      const updatedEntry = await api.logEntries.approveForSignature(entry.id);
      
      console.log("DEBUG FRONTEND: Anotación aprobada exitosamente", {
        newStatus: updatedEntry.status,
      });
      
      syncEntryState(updatedEntry);
      try {
        await onRefresh();
      } catch (refreshError) {
        console.warn("Error al refrescar después de aprobar:", refreshError);
      }
      
      showToast({
        variant: "success",
        title: "Anotación aprobada",
        message: "La anotación ha sido aprobada y quedó lista para firmas.",
      });
    } catch (error: any) {
      console.error("DEBUG FRONTEND: Error al aprobar", error);
      const message =
        error?.message || "No se pudo aprobar la anotación.";
      setValidationError(message);
      
      // Si el error es que ya está aprobada, actualizar el estado local
      if (error?.code === "ALREADY_APPROVED" || message.includes("ya está aprobada")) {
        // Refrescar para obtener el estado actualizado, pero sin mostrar error
        if (onRefresh) {
          try {
            await onRefresh();
            // No mostrar error si ya está aprobada (probablemente se aprobó en la primera llamada)
            return;
          } catch (refreshError) {
            console.warn("Error al refrescar después de error de aprobación:", refreshError);
          }
        }
      }
      
      showToast({
        variant: "error",
        title: "Error al aprobar",
        message,
      });
    } finally {
      setIsApproving(false);
    }
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

      if (generatedAttachment && !hasStoredSignature) {
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
        if (canDownload) {
          window.open(finalDownloadUrl, "_blank", "noopener,noreferrer");
        } else {
          // Si no tiene permiso de descarga, abrir en modo previsualización
          const previewUrl = finalDownloadUrl.replace('/download', '/view');
          window.open(previewUrl, "_blank", "noopener,noreferrer");
        }
      }

      showToast({
        variant: "success",
        title: "PDF generado",
        message: canDownload 
          ? "La bitácora diaria se exportó correctamente." 
          : "El PDF se generó. Solo puedes previsualizarlo (sin permiso de descarga).",
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

  const handleRegeneratePdf = async () => {
    if (!window.confirm('¿Estás seguro de regenerar el PDF? Esto reconstruirá el documento con las firmas en las posiciones correctas.')) {
      return;
    }
    setIsRegeneratingPdf(true);
    setValidationError(null);
    try {
      const response = await api.logEntries.regeneratePdf(entry.id);
      if (response?.entry) {
        applyEntryState(response.entry as LogEntry);
      }
      await onRefresh();
      showToast({
        variant: 'success',
        title: 'PDF regenerado',
        message: response?.message || 'El PDF se regeneró correctamente con las firmas en posiciones correctas.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo regenerar el PDF.';
      setValidationError(message);
      showToast({
        variant: 'error',
        title: 'Error al regenerar PDF',
        message,
      });
    } finally {
      setIsRegeneratingPdf(false);
    }
  };

  // Eliminado: handleSignAttachment ya no se usa
  // El flujo de firma ahora es solo a través de "Firmar anotación" con contraseña

  const { folioNumber, folioFormatted, author } = entry;
  const { comments = [] } = editedEntry;
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
    safetyFindings = "",
    safetyContractorResponse = "",
    environmentFindings = "",
    environmentContractorResponse = "",
    socialActivities = [],
    socialObservations = "",
    socialContractorResponse = "",
    socialPhotoSummary = "",
    type,
    status,
    isConfidential,
    history = [],
    createdAt,
    attachments = [],
    requiredSignatories = [],
    signatures = [],
    reviewTasks = [],
  } = editedEntry;

  const workflowStatus = normalizeWorkflowStatusValue(status);
  const statusLabel = workflowStatus as string;
  
  // Normalize entry type to handle both old display values and new Prisma values
  const normalizeEntryType = (t: string | undefined): EntryType => {
    if (!t) return EntryType.GENERAL;
    const typeMap: { [key: string]: EntryType } = {
      // New Prisma values
      'SAFETY': EntryType.SAFETY,
      'ENVIRONMENTAL': EntryType.ENVIRONMENTAL,
      'SOCIAL': EntryType.SOCIAL,
      'GENERAL': EntryType.GENERAL,
      'TECHNICAL': EntryType.TECHNICAL,
      'ADMINISTRATIVE': EntryType.ADMINISTRATIVE,
      'QUALITY': EntryType.QUALITY,
      // Old display values (from backend reverse map)
      'HSE': EntryType.SAFETY,
      'Ambiental': EntryType.ENVIRONMENTAL,
      'Social': EntryType.SOCIAL,
      'General': EntryType.GENERAL,
      'Técnica': EntryType.TECHNICAL,
      'Técnico': EntryType.TECHNICAL,
      'Administrativo': EntryType.ADMINISTRATIVE,
      'Calidad': EntryType.QUALITY,
    };
    return typeMap[t] || EntryType.GENERAL;
  };

  const entryTypeValue = normalizeEntryType(type as string);
  const isSpecialType =
    entryTypeValue === EntryType.SAFETY ||
    entryTypeValue === EntryType.ENVIRONMENTAL ||
    entryTypeValue === EntryType.SOCIAL;

  const showGeneralSections = !isSpecialType &&
    [
      EntryType.GENERAL,
      EntryType.TECHNICAL,
      EntryType.ADMINISTRATIVE,
      EntryType.QUALITY,
    ].includes(entryTypeValue);
  const showSafetyPanel = entryTypeValue === EntryType.SAFETY;
  const showEnvironmentalPanel = entryTypeValue === EntryType.ENVIRONMENTAL;
  const showSocialPanel = entryTypeValue === EntryType.SOCIAL;

  // DEBUG: Log type values
  console.log('[DETAIL DEBUG] type from entry:', type);
  console.log('[DETAIL DEBUG] entryTypeValue (normalized):', entryTypeValue);
  console.log('[DETAIL DEBUG] EntryType.SAFETY:', EntryType.SAFETY);
  console.log('[DETAIL DEBUG] isSpecialType:', isSpecialType);
  console.log('[DETAIL DEBUG] showSafetyPanel:', showSafetyPanel);
  console.log('[DETAIL DEBUG] safetyNotes:', safetyNotes);

  const syncEntryState = (updatedEntry: LogEntry) => {
    applyEntryState(updatedEntry);
    setIsEditing(false);
    setValidationError(null);
  };

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

  // Determinar permisos basados en estado y roles
  const normalizedCurrentProjectRole = normalizeProjectRoleValue(
    currentUser.projectRole
  );
  const isAuthor = currentUser.id === author?.id;
  const isAssignee = entry.assignees?.some((a) => a.id === currentUser.id) || false;
  const isAdmin =
    normalizedCurrentProjectRole === UserRole.ADMIN ||
    currentUser.appRole === "admin";
  const isContractorUser =
    normalizedCurrentProjectRole === UserRole.CONTRACTOR_REP;
  const isInterventoriaUser = [
    UserRole.SUPERVISOR,
    UserRole.RESIDENT,
    UserRole.ADMIN
  ].includes(normalizedCurrentProjectRole as UserRole);
  
  // Detect author's party based on their role
  const authorRole = normalizeProjectRoleValue(author?.projectRole);
  const isAuthorContractor = authorRole === UserRole.CONTRACTOR_REP;
  const isAuthorInterventoria = [
    UserRole.SUPERVISOR,
    UserRole.RESIDENT,
    UserRole.ADMIN
  ].includes(authorRole as UserRole);
  
  const effectiveReadOnly = readOnly && !isContractorUser;
  const isDraftStatus = workflowStatus === EntryStatus.DRAFT;
  const isSubmittedStatus = workflowStatus === EntryStatus.SUBMITTED;
  const isContractorReviewStatus = workflowStatus === EntryStatus.SUBMITTED;
  const isFinalReviewStatus = workflowStatus === EntryStatus.NEEDS_REVIEW;
  const isReadyForSignaturesStatus = workflowStatus === EntryStatus.APPROVED;
  const isSignedStatus = workflowStatus === EntryStatus.SIGNED;
  const contractorReviewCompleted = !!entry.contractorReviewCompleted;
  
  // Status where observations can be edited (before all signatures are complete)
  const canEditObservationsStatus = isSubmittedStatus || isReadyForSignaturesStatus;
  
  // Verificar si el usuario es un responsable (firmante requerido)
  const isRequiredSigner = entry.signatureTasks?.some(
      (task) => task.signer?.id === currentUser.id
  ) || false;
  
  // Verificar si hay firmas completadas
  const hasCompletedSignatures = entry.signatureTasks?.some(
    (task) => task.status === "SIGNED"
  ) || false;
  
  // Verificar si el autor ya ha firmado (completó su firma, no solo asignado)
  const authorHasSigned = entry.signatureTasks?.some(
    (task) => task.signer?.id === author?.id && task.status === "SIGNED"
  ) || false;
  
  // Permitir editar si:
  // 1. Es el autor (siempre puede editar si el estado lo permite)
  // 2. Es un asignado y el autor no ha firmado
  // 3. Es un responsable (firmante) y el autor no ha firmado
  // 4. Es admin
  // Permitir editar hasta que haya firmas completadas
  // DRAFT, SUBMITTED, APPROVED (deprecated pero aún existe) y NEEDS_REVIEW son editables
  const isStatusEditableForInterventoria =
    isDraftStatus || isSubmittedStatus || isReadyForSignaturesStatus || isFinalReviewStatus;

  const canEdit =
    !effectiveReadOnly &&
    isStatusEditableForInterventoria &&
    (!isContractorUser || isAdmin) &&
    (isAuthor ||
     (isAssignee && !authorHasSigned) ||
     (isRequiredSigner && !authorHasSigned));
  
  const canSendToContractor =
    !effectiveReadOnly && isDraftStatus && (isAuthor || isAdmin);

  const canCompleteContractorReview =
    !effectiveReadOnly &&
    isContractorReviewStatus &&
    (isContractorUser || isAdmin);

  const canReturnToContractor =
    !effectiveReadOnly && isFinalReviewStatus && (isAuthor || isAdmin);

  const canApprove =
    !effectiveReadOnly &&
    isFinalReviewStatus &&
    contractorReviewCompleted &&
    (isAuthor || isAdmin);
  
  // On per-signatory workflow: signatures disabled until ALL review tasks complete
  const allReviewTasksComplete = reviewTasks.length === 0 || reviewTasks.every(t => t.status === 'COMPLETED');
  const isSigningStage = (isReadyForSignaturesStatus || isSignedStatus) && !entry.pendingReviewBy && allReviewTasksComplete;
  const signatureBlockReadOnly = readOnly || !isSigningStage;
  const canSign = !effectiveReadOnly && isSigningStage;

  // Verificar si el usuario actual puede completar su revisión
  const myReviewTask = reviewTasks.find((task) => task.reviewer?.id === currentUser.id);
  
  // Per-signatory workflow: any signer with a PENDING review task can complete it
  const myPendingSignatoryReview = myReviewTask?.status === "PENDING" && 
    entry.pendingReviewBy === "ALL_SIGNERS";

  const canAddComments = !effectiveReadOnly || isAssignee || isAdmin || !!myReviewTask || isContractorUser || isInterventoriaUser;
  
  // Legacy workflow or new per-signatory workflow
  const canCompleteReview =
    !effectiveReadOnly &&
    myReviewTask?.status === "PENDING" &&
    (
      // Legacy: assignees in final review status
      (isFinalReviewStatus && (isAssignee || isAdmin)) ||
      // New: any signer with pending task when using per-signatory workflow
      myPendingSignatoryReview
    );
  const isAssignedContractor = isAssignee || entry.assignees?.some((u) => u.id === currentUser.id);
  
  // Contractor can edit their observations when:
  // 1. Status is SUBMITTED or APPROVED (before signing is complete)
  // 2. AND no signatures have been completed yet
  // 3. AND user is contractor (by role)
  // 4. AND (author was interventoría OR user has pending review task)
  // 5. AND observations are not already saved (lock after save)
  const hasPendingReviewTask = myReviewTask?.status === "PENDING";
  const canEditContractorResponses =
    canEditObservationsStatus &&
    !hasCompletedSignatures &&
    isContractorUser &&
    !isInterventoriaUser &&
    (isAuthorInterventoria || hasPendingReviewTask);
  
  // Interventoría can edit their observations when:
  // 1. Status is SUBMITTED or APPROVED (before signing is complete)
  // 2. AND no signatures have been completed yet
  // 3. AND user is interventoría (by role, not appRole admin)
  // 4. AND (author was contractor OR user has pending review task)
  // 5. AND observations are not already saved (lock after save)
  const canEditInterventoriaResponses =
    canEditObservationsStatus &&
    !hasCompletedSignatures &&
    isInterventoriaUser &&
    !isContractorUser &&
    (isAuthorContractor || hasPendingReviewTask);

  const workflowActionButtons: React.ReactNode[] = [];

  // New Review Workflow Banner (for San Mateo + new clients)
  const reviewWorkflowBanner = (
    <ReviewWorkflowBanner
      entry={entry}
      currentUser={currentUser}
      isAuthor={isAuthor}
      isDraftStatus={isDraftStatus}
      isSubmittedStatus={isSubmittedStatus}
      onSendForReview={handleSendForReview}
      onApproveReview={handleApproveReview}
      onRefresh={onRefresh}
      isLoading={isSendingToContractor}
    />
  );

  // Duplicate 'Send to Contractor' button removed in favor of ReviewWorkflowBanner dropdown

  if (canCompleteContractorReview) {
    workflowActionButtons.push(
      <Button
        key="complete-contractor-review"
        variant="primary"
        onClick={handleCompleteContractorReview}
        disabled={isCompletingContractorReview}
      >
        {isCompletingContractorReview
          ? "Registrando..."
          : "Marcar revisión completada"}
      </Button>
    );
  }

  if (canReturnToContractor) {
    workflowActionButtons.push(
      <Button
        key="return-to-contractor"
        variant="secondary"
        onClick={handleReturnToContractor}
        disabled={isReturningToContractor}
      >
        {isReturningToContractor
          ? "Devolviendo..."
          : "Devolver al contratista"}
      </Button>
    );
  }

  if (canApprove) {
    workflowActionButtons.push(
      <Button
        key="approve"
        variant="primary"
        onClick={handleApprove}
        disabled={isApproving}
        className="bg-green-600 hover:bg-green-700"
      >
        {isApproving ? "Aprobando..." : "Aprobar para firmas"}
      </Button>
    );
  }

  const entryDateDisplay = entryDateIso
    ? new Date(entryDateIso).toLocaleDateString("es-CO", { dateStyle: "long" })
    : "N/A";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Detalle Anotación - Folio ${folioFormatted || `#${folioNumber}`}`}
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
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Badge status={statusLabel as EntryStatus} />
                    <span>
                      El estado cambia mediante las acciones del flujo.
                    </span>
                  </div>
                ) : (
                  <>
                    <Badge status={statusLabel as EntryStatus} />
                    {!isStatusEditableForInterventoria && (
                      <span className="text-xs text-gray-500">
                        {isSignedStatus 
                          ? '(No editable, anotación firmada)' 
                          : hasCompletedSignatures
                          ? '(No editable, tiene firmas completadas)'
                          : '(No editable)'}
                      </span>
                    )}
                    {isStatusEditableForInterventoria && !canEdit && (
                      <span className="text-xs text-gray-500">
                        (No editable, no eres el autor)
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {(showSafetyPanel || showEnvironmentalPanel || showSocialPanel) && (
          <div className="space-y-6">
            {showSafetyPanel && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm bg-white">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-800">
                  Componente SST (SST y MEV)
                </h4>
              </div>
              
              {/* Extended SST Reports */}
              {safetyNotes && safetyNotes.length > 0 && (
                 <div className="space-y-4">
                    {safetyNotes.map((item, index) => {
                        if (item.type === 'ACCIDENT_REPORT' && item.accidentData) {
                            return <SSTIncidentViewer key={`sst-acc-${index}`} type="ACCIDENT" data={item.accidentData} />;
                        }
                        if (item.type === 'DISEASE_REPORT' && item.diseaseData) {
                            return <SSTIncidentViewer key={`sst-dis-${index}`} type="DISEASE" data={item.diseaseData} />;
                        }
                        return null;
                    })}
                 </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Observaciones de la interventoría
                </p>
                {isEditing ? (
                  <textarea
                    name="safetyFindings"
                    value={safetyFindings}
                    onChange={(e) =>
                      setEditedEntry((prev) => ({
                        ...prev,
                        safetyFindings: e.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {safetyFindings || "Sin observaciones."}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Respuesta del contratista
                </p>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {safetyContractorResponse || "Sin respuesta registrada."}
                </p>
              </div>
            </div>
            )}

            {showEnvironmentalPanel && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm bg-white">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold text-gray-800">
                  Componente ambiental (ambiental, forestal, fauna)
                </h4>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Observaciones de la interventoría
                </p>
                {isEditing ? (
                  <textarea
                    name="environmentFindings"
                    value={environmentFindings}
                    onChange={(e) =>
                      setEditedEntry((prev) => ({
                        ...prev,
                        environmentFindings: e.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {environmentFindings || "Sin observaciones."}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Respuesta del contratista
                </p>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {environmentContractorResponse || "Sin respuesta registrada."}
                </p>
              </div>
            </div>
            )}

            {showSocialPanel && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4 shadow-sm bg-white">
              <div>
                <h4 className="text-md font-semibold text-gray-800">
                  Componente social
                </h4>
                <p className="text-sm text-gray-500">
                  Registro diario de actividades, soporte fotográfico y observaciones.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Registro diario de actividades
                </p>
                {isEditing ? (
                  <textarea
                    value={listToPlainText(socialActivities)}
                    onChange={(e) =>
                      handleListChange("socialActivities", e.target.value)
                    }
                    rows={4}
                    className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                    placeholder="Describe cada actividad en una línea."
                  />
                ) : socialActivities.length ? (
                  <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-gray-700">
                    {socialActivities.map((item, index) => (
                      <li key={`social-act-${index}`}>{item.text}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">Sin registro.</p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Registro fotográfico (referencia)
                </p>
                {isEditing ? (
                  <textarea
                    name="socialPhotoSummary"
                    value={socialPhotoSummary}
                    onChange={(e) =>
                      setEditedEntry((prev) => ({
                        ...prev,
                        socialPhotoSummary: e.target.value,
                      }))
                    }
                    rows={2}
                    className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                    placeholder="Describe o referencia las fotografías relacionadas."
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {socialPhotoSummary || "Sin registro."}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Observaciones de la interventoría
                </p>
                {isEditing ? (
                  <textarea
                    name="socialObservations"
                    value={socialObservations}
                    onChange={(e) =>
                      setEditedEntry((prev) => ({
                        ...prev,
                        socialObservations: e.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {socialObservations || "Sin observaciones."}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">
                  Respuesta del contratista
                </p>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {socialContractorResponse || "Sin respuesta registrada."}
                </p>
              </div>
            </div>
            )}
          </div>
          )}
          
          {/* Estado y Acciones Permitidas */}
          {!isEditing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                Estado y Acciones Disponibles
              </h4>
              <div className="text-sm text-blue-800 space-y-2">
                {isDraftStatus && (
                  <>
                    <p>
                      📝 <strong>Borrador:</strong> la interventoría puede
                      ajustar toda la información antes de enviarla al
                      contratista.
                    </p>
                    {canEdit ? (
                      <p>
                        ✓ Puedes seguir editando el contenido y agregando
                        adjuntos.
                      </p>
                    ) : (
                      <p className="text-orange-700">
                        ⚠ No tienes permisos para editar este borrador.
                      </p>
                    )}
                  </>
                )}
                {isContractorReviewStatus && (
                  <>
                    <p>
                      📨 <strong>Revisión contratista:</strong> el contenido
                      técnico está congelado. Solo se pueden registrar las
                      observaciones del contratista.
                    </p>
                    {canEditContractorResponses ? (
                      <p>
                        ✓ Puedes actualizar tus observaciones en el panel
                        inferior.
                      </p>
                    ) : (
                      <p className="text-orange-700">
                        ⚠ Solo el contratista asignado puede editar su sección.
                      </p>
                    )}
                  </>
                )}
                {isFinalReviewStatus && (
                  <>
                    <p>
                      🔍 <strong>Revisión final:</strong> la interventoría valida
                      las observaciones antes de aprobar para firmas.
                    </p>
                    {contractorReviewCompleted ? (
                      <p>✓ El contratista ya completó su revisión.</p>
                    ) : (
                      <p className="text-orange-700">
                        ⚠ Falta que el contratista confirme su revisión.
                      </p>
                    )}
                    {canEdit ? (
                      <p>✓ Puedes realizar ajustes finales antes de aprobar.</p>
                    ) : (
                      <p className="text-orange-700">
                        ⚠ Solo la interventoría puede editar en esta etapa.
                      </p>
                    )}
                  </>
                )}
                {isReadyForSignaturesStatus && (
                  <>
                    {(entry.pendingReviewBy || !allReviewTasksComplete) ? (
                       <>
                         <p>
                           📝 <strong>En Revisión:</strong> Se requiere completar todas las revisiones antes de habilitar las firmas.
                         </p>
                         <p className="text-orange-700">
                           ⚠ Las firmas se habilitarán automáticamente cuando todos los participantes aprueben su revisión.
                         </p>
                         {canEdit && (
                           <p>
                             ✓ Los participantes pueden seguir editando hasta que se completen las firmas.
                           </p>
                         )}
                       </>
                    ) : (
                       <>
                        <p>
                          ✍️ <strong>Listo para firmas:</strong> los firmantes asignados 
                          pueden proceder a firmar.
                        </p>
                        {canEdit && (
                          <p>
                            ✓ Los participantes pueden seguir editando hasta que se completen las firmas.
                          </p>
                        )}
                        {canSign ? (
                          <p>✓ Puedes firmar si estás en la lista de firmantes.</p>
                        ) : (
                          <p className="text-orange-700">
                            ⚠ Solo los firmantes designados pueden firmar.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
                {isSignedStatus && (
                  <p>
                    ✔️ <strong>Firmado:</strong> el documento está cerrado y
                    disponible únicamente para consulta.
                  </p>
                )}
              </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-left">
                    {reviewWorkflowBanner}
                    {workflowActionButtons}
                  </div>
            </div>
          )}
          
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
              value={scheduleDay || (projectStartDate ? calculateScheduleDay(entryDateIso) : "No registrado")}
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
          {!isSpecialType && (
            <>
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
                        onChange={(e) =>
                          setWeatherTemperatureDraft(e.target.value)
                        }
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
                              updateRainEventDraftRow(
                                index,
                                "start",
                                e.target.value
                              )
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
                            <li key={`rain-${idx}`}>
                              {event.start || "-"} a {event.end || "-"}
                            </li>
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
            </>
          )}

          {showGeneralSections && (
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
          )}

          {showGeneralSections && (
          <div>
            <h4 className="text-md font-semibold text-gray-800">
              Ejecución de actividades
            </h4>
            {isEditing ? (
              <div className="mt-2 space-y-3">
                <textarea
                  value={listToPlainText(executedActivities)}
                  onChange={(e) => handleListChange("executedActivities", e.target.value)}
                  onKeyDown={(e) => {
                    // Permitir espacios y todos los caracteres normalmente
                    e.stopPropagation();
                  }}
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
          )}

          {isSpecialType && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">
                  Registro diario de actividades
                </h4>
                {isEditing ? (
                  <textarea
                    name="description"
                    value={description}
                    onChange={handleInputChange}
                    rows={4}
                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {description || "Sin resumen registrado."}
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">
                  Respuesta del contratista
                </h4>
                {isEditing ? (
                  <textarea
                    value={
                      entryTypeValue === EntryType.SAFETY
                        ? safetyContractorResponse
                        : entryTypeValue === EntryType.ENVIRONMENTAL
                        ? environmentContractorResponse
                        : socialContractorResponse
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (entryTypeValue === EntryType.SAFETY) {
                        setEditedEntry((prev) => ({
                          ...prev,
                          safetyContractorResponse: val,
                        }));
                      } else if (entryTypeValue === EntryType.ENVIRONMENTAL) {
                        setEditedEntry((prev) => ({
                          ...prev,
                          environmentContractorResponse: val,
                        }));
                      } else {
                        setEditedEntry((prev) => ({
                          ...prev,
                          socialContractorResponse: val,
                        }));
                      }
                    }}
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                    placeholder="Respuesta del contratista"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {(entryTypeValue === EntryType.SAFETY
                      ? safetyContractorResponse
                      : entryTypeValue === EntryType.ENVIRONMENTAL
                      ? environmentContractorResponse
                      : socialContractorResponse) || "Sin respuesta registrada."}
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-1">
                  Observaciones adicionales
                </h4>
                {isEditing ? (
                  <textarea
                    value={additionalObservations}
                    onChange={(e) =>
                      setEditedEntry((prev) => ({
                        ...prev,
                        additionalObservations: e.target.value,
                      }))
                    }
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                    placeholder="Observaciones adicionales"
                  />
                ) : (
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {additionalObservations || "Sin observaciones."}
                  </p>
                )}
              </div>
            </div>
          )}

          {showGeneralSections && (
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
                  onKeyDown={(e) => {
                    // Permitir espacios y todos los caracteres normalmente
                    e.stopPropagation();
                  }}
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
          )}

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
                  disabled={!isContractorUser}
                  readOnly={!isContractorUser}
                  className={`mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2 ${!isContractorUser ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder={!isContractorUser ? 'Solo el contratista puede editar este campo' : ''}
                />
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {contractorObservations || "Sin observaciones."}
                  </p>
                  {canEditContractorResponses && (
                    <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 space-y-3">
                      <p className="text-xs text-yellow-800">
                        Como contratista, puedes agregar tus observaciones antes de aprobar.
                      </p>
                      <textarea
                        value={contractorNoteInput}
                        onChange={(e) => setContractorNoteInput(e.target.value)}
                        rows={3}
                        className="block w-full border border-yellow-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm p-2"
                        placeholder="Escribe tus observaciones aquí..."
                      />
                      <Button
                        variant="primary"
                        onClick={handleSaveContractorObservations}
                        disabled={isSavingContractorNotes}
                      >
                        {isSavingContractorNotes ? "Guardando..." : "Guardar observaciones"}
                      </Button>
                    </div>
                  )}
                </>
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
                  disabled={!isInterventoriaUser}
                  readOnly={!isInterventoriaUser}
                  className={`mt-2 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2 ${!isInterventoriaUser ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder={!isInterventoriaUser ? 'Solo la interventoría puede editar este campo' : ''}
                />
              ) : (
                <>
                  <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                    {interventoriaObservations || "Sin observaciones."}
                  </p>
                  {canEditInterventoriaResponses && (
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
                      <p className="text-xs text-blue-800">
                        Como interventoría, puedes agregar tus observaciones antes de aprobar.
                      </p>
                      <textarea
                        value={interventoriaNoteInput}
                        onChange={(e) => setInterventoriaNoteInput(e.target.value)}
                        rows={3}
                        className="block w-full border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                        placeholder="Escribe tus observaciones aquí..."
                      />
                      <Button
                        variant="primary"
                        onClick={handleSaveInterventoriaObservations}
                        disabled={isSavingInterventoriaObs}
                      >
                        {isSavingInterventoriaObs ? "Guardando..." : "Guardar observaciones"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        {!isSpecialType && (
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
        )}
          {isEditing && (
            <div>
              <h4 className="text-md font-semibold text-gray-800">
                Firmantes responsables
              </h4>
              <p className="mt-1 text-xs text-gray-500">
                Define quiénes deben firmar esta anotación. Puedes quitar al autor si solo cargará la bitácora.
              </p>
              <div className="mt-2 border border-gray-200 rounded-md divide-y max-h-48 overflow-y-auto">
                {sortedUsers.map((user) => {
                  const isAuthor = author?.id === user.id;
                  const isChecked = selectedSignerIds.includes(user.id);
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
                      />
                      <span>
                        <span className="font-semibold text-gray-900">
                          {user.fullName}
                        </span>
                        {user.cargo ? (
                          <span className="block text-xs text-gray-500">
                            {user.cargo}
                          </span>
                        ) : user.projectRole ? (
                          <span className="block text-xs text-gray-500">
                            {getFullRoleName(user.projectRole, user.entity)}
                          </span>
                        ) : null}
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
            <AttachmentSections 
              attachments={attachments}
              canDownload={canDownload}
              formatBytes={formatBytes}
            />
          )}
          
          {/* Review Tasks Block */}
          {!isEditing && reviewTasks && reviewTasks.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-md font-semibold text-gray-800 mb-3">
                Revisiones del Documento
              </h4>
              <div className="mb-2 text-sm text-gray-600">
                Revisiones completadas: {reviewTasks.filter((t) => t.status === "COMPLETED").length} de {reviewTasks.length}.
              </div>
              <div className="space-y-3">
                {reviewTasks.map((task) => {
                  const reviewer = task.reviewer;
                  if (!reviewer) return null;
                  
                  const isCompleted = task.status === "COMPLETED";
                  const isMyReview = reviewer.id === currentUser.id;
                  
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isCompleted
                          ? "bg-green-50 border-green-200"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <img
                          src={getUserAvatarUrl(reviewer)}
                          alt={reviewer.fullName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {reviewer.fullName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {reviewer.projectRole || "Sin rol"}
                          </p>
                          {isCompleted && task.completedAt && (
                            <p className="text-xs text-green-700 mt-1">
                              Completada: {new Date(task.completedAt).toLocaleString("es-CO")}
                            </p>
                          )}
                          {!isCompleted && task.assignedAt && (
                            <p className="text-xs text-yellow-700 mt-1">
                              Asignada: {new Date(task.assignedAt).toLocaleString("es-CO")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {isCompleted ? (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              ✓ Completada
                            </span>
                          ) : (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {canCompleteReview && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800 mb-2">
                    Tienes una revisión pendiente. Puedes completarla agregando observaciones arriba o aprobar directamente:
                  </p>
                  <Button
                    variant="primary"
                    onClick={myPendingSignatoryReview ? handleApproveReview : handleCompleteReview}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    ✓ Aprobar y Completar Mi Revisión
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Signature Block */}
          {!isEditing && (
            <>
              <SignatureBlock
                requiredSignatories={requiredSignatories}
                signatures={editedEntry.signatures}
                signatureTasks={editedEntry.signatureTasks}
                signatureSummary={editedEntry.signatureSummary}
                currentUser={currentUser}
                onSignRequest={
                  signatureBlockReadOnly
                    ? undefined
                    : () => setIsSignatureModalOpen(true)
                }
                readOnly={signatureBlockReadOnly}
                documentType="Anotación"
              />
              {!isSigningStage && (
                <p className="mt-2 text-sm text-gray-500">
                  Las firmas se habilitan cuando la interventoría marca la
                  anotación como “Listo para firmas”.
                </p>
              )}
            </>
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
                      src={getUserAvatarUrl(comment.author)}
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
                        {renderCommentWithMentions(comment.content, availableUsers)}
                      </p>
                      {(comment.attachments || []).length > 0 && (
                        <div className="mt-2 space-y-3">
                          {(comment.attachments || []).map((att) => {
                            const isImage = att.type?.startsWith("image/");
                            if (isImage) {
                              return (
                                <div key={att.id}>
                                  <a
                                    href={att.url || att.downloadUrl || att.previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <LazyImage
                                      src={att.url || att.previewUrl}
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
          {(canAddComments) && (
            <div className="pt-4 border-t" onClick={(e) => e.stopPropagation()}>
              <form
                onSubmit={handleCommentSubmit}
                className="flex items-start space-x-3"
              >
                <img
                  src={getUserAvatarUrl(currentUser)}
                  alt={currentUser.fullName}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <MentionTextarea
                    rows={2}
                    placeholder="Escribe tu comentario aquí... (usa @ para mencionar usuarios)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    users={availableUsers}
                  />
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
                    <div className="flex flex-col items-end">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          (!newComment.trim() && commentFiles.length === 0) ||
                          isSubmittingComment
                        }
                      >
                        {isSubmittingComment ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Publicando...
                          </>
                        ) : (
                          "Publicar Comentario"
                        )}
                      </Button>
                      {isSubmittingComment && (
                        <p
                          className="mt-1 text-xs text-gray-500"
                          aria-live="polite"
                        >
                          Estamos enviando tu comentario...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
          {/* Change History */}
          <ChangeHistory history={history} users={Array.from(knownUsers.values())} />
        </div>

        {isEditing && validationError && (
          <div className="p-3 my-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {validationError}
          </div>
        )}
        {/* Modal Footer */}
        <div className="mt-6 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
          {(isEditing || isAdmin) ? (
            <div>
              <Button variant="danger" onClick={handleDelete} disabled={isDeleting || isUpdating}>
                {isDeleting ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24"
                    >
                      <circle 
                        className="opacity-25" 
                        cx="12" 
                        cy="12" 
                        r="10" 
                        stroke="currentColor" 
                        strokeWidth="4"
                      ></circle>
                      <path 
                        className="opacity-75" 
                        fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Eliminando...
                  </>
                ) : (
                  "Eliminar Anotación"
                )}
              </Button>
            </div>
          ) : (
            <div></div>
          )}

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="secondary" 
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <svg 
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        ></circle>
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
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
                  disabled={isGeneratingPdf || !canDownload}
                  title={!canDownload ? "No tienes permiso para descargar archivos" : undefined}
                >
                  {isGeneratingPdf ? "Generando..." : canDownload ? "Exportar PDF" : "Solo previsualización"}
                </Button>
                {canEdit && (
                  <Button variant="primary" onClick={() => setIsEditing(true)}>
                    Modificar Anotación
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="secondary"
                    onClick={handleRegeneratePdf}
                    disabled={isRegeneratingPdf}
                    title="Regenerar PDF con firmas en posiciones correctas (solo admin)"
                  >
                    {isRegeneratingPdf ? 'Regenerando...' : 'Regenerar PDF'}
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
        consentStatement="Autorizo el uso de mi firma manuscrita digital para esta anotación de bitácora."
      />
    </>
  );
};

export default EntryDetailModal;
