import React, { useEffect, useMemo, useState, useRef } from "react";
import { LogEntry, EntryStatus, EntryType, User } from "../types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";
import { XMarkIcon, CameraIcon } from "./icons/Icon";
import { getFullRoleName } from "../src/utils/roleDisplay";
import { compressImages } from "../src/utils/compressImage";
import { useApi } from "../src/hooks/useApi";
import api from "../src/services/api";
import ProgressIndicator from "./ui/ProgressIndicator";

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    entryData: Omit<
      LogEntry,
      | "id"
      | "folioNumber"
      | "createdAt"
      | "author"
      | "comments"
      | "history"
      | "updatedAt"
      | "attachments"
    >,
    files: File[]
  ) => void;
  initialDate?: string | null;
  availableUsers: User[];
  currentUser: User | null;
  projectStartDate?: string; // Fecha de inicio del proyecto
  contractNumber?: string; // Número de contrato para marca de agua
}

const EntryFormModal: React.FC<EntryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  availableUsers,
  currentUser,
  projectStartDate,
  contractNumber
}) => {
  const MAX_PHOTOS = 20; // Maximum number of photos per entry
  const [isCompressing, setIsCompressing] = useState(false);
  const [entryDate, setEntryDate] = useState<string>("");
  const [entryType, setEntryType] = useState<EntryType>(EntryType.GENERAL);
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [materialsUsed, setMaterialsUsed] = useState<
    Array<{ material: string; quantity: string; unit: string }>
  >([{ material: "", quantity: "", unit: "" }]);
  const [activitiesPerformed, setActivitiesPerformed] = useState<string>("");
  const [additionalObservations, setAdditionalObservations] =
    useState<string>("");
  const [scheduleDay, setScheduleDay] = useState<string>("");
  const [locationDetails, setLocationDetails] = useState<string>("");
  const [weatherSummary, setWeatherSummary] = useState<string>("");
  const [weatherTemperature, setWeatherTemperature] = useState<string>("");
  const [weatherNotes, setWeatherNotes] = useState<string>("");
  const [rainEvents, setRainEvents] = useState<Array<{ start: string; end: string }>>([
    { start: "", end: "" },
  ]);
  const [contractorPersonnel, setContractorPersonnel] = useState<
    Array<{ role: string; quantity: string; notes: string }>
  >([{ role: "", quantity: "", notes: "" }]);
  const [interventoriaPersonnel, setInterventoriaPersonnel] = useState<
    Array<{ role: string; quantity: string; notes: string }>
  >([{ role: "", quantity: "", notes: "" }]);
  const [equipmentResources, setEquipmentResources] = useState<
    Array<{ name: string; status: string; notes: string }>
  >([{ name: "", status: "", notes: "" }]);
  const [executedActivitiesText, setExecutedActivitiesText] =
    useState<string>("");
  const [executedQuantitiesText, setExecutedQuantitiesText] =
    useState<string>("");
  const [scheduledActivitiesText, setScheduledActivitiesText] =
    useState<string>("");
  const [qualityControlsText, setQualityControlsText] =
    useState<string>("");
  const [materialsReceivedText, setMaterialsReceivedText] =
    useState<string>("");
  const [safetyNotesText, setSafetyNotesText] = useState<string>("");
  const [projectIssuesText, setProjectIssuesText] = useState<string>("");
  const [siteVisitsText, setSiteVisitsText] = useState<string>("");
  const [contractorObservations, setContractorObservations] =
    useState<string>("");
  const [interventoriaObservations, setInterventoriaObservations] =
    useState<string>("");
  const [safetyFindings, setSafetyFindings] = useState<string>("");
  const [safetyContractorResponse, setSafetyContractorResponse] =
    useState<string>("");
  const [environmentFindings, setEnvironmentFindings] = useState<string>("");
  const [environmentContractorResponse, setEnvironmentContractorResponse] =
    useState<string>("");
  const [socialActivitiesText, setSocialActivitiesText] = useState<string>("");
  const [socialObservations, setSocialObservations] = useState<string>("");
  const [socialContractorResponse, setSocialContractorResponse] =
    useState<string>("");
  const [socialPhotoSummary, setSocialPhotoSummary] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>(
    () => (currentUser ? [currentUser.id] : [])
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Camera states for photo capture
  const [showCamera, setShowCamera] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const SAVE_STEPS = [
    { message: 'Validando datos...', percentage: 20 },
    { message: 'Subiendo archivos...', percentage: 50 },
    { message: 'Guardando anotación...', percentage: 85 },
    { message: '¡Guardado exitoso!', percentage: 100 },
  ];

  const isSpecialType =
    entryType === EntryType.SAFETY ||
    entryType === EntryType.ENVIRONMENTAL ||
    entryType === EntryType.SOCIAL;

  const resetForm = () => {
    setEntryDate("");
    setEntryType(EntryType.GENERAL);
    setTitle("");
    setSummary("");
    setMaterialsUsed([{ material: "", quantity: "", unit: "" }]);
    setActivitiesPerformed("");
    setAdditionalObservations("");
    setScheduleDay("");
    setLocationDetails("");
    setWeatherSummary("");
    setWeatherTemperature("");
    setWeatherNotes("");
    setRainEvents([{ start: "", end: "" }]);
    setContractorPersonnel([{ role: "", quantity: "", notes: "" }]);
    setInterventoriaPersonnel([{ role: "", quantity: "", notes: "" }]);
    setEquipmentResources([{ name: "", status: "", notes: "" }]);
    setExecutedActivitiesText("");
    setExecutedQuantitiesText("");
    setScheduledActivitiesText("");
    setQualityControlsText("");
    setMaterialsReceivedText("");
    setSafetyNotesText("");
    setProjectIssuesText("");
    setSiteVisitsText("");
    setContractorObservations("");
    setInterventoriaObservations("");
    setSafetyFindings("");
    setSafetyContractorResponse("");
    setEnvironmentFindings("");
    setEnvironmentContractorResponse("");
    setSocialActivitiesText("");
    setSocialObservations("");
    setSocialContractorResponse("");
    setSocialPhotoSummary("");
    setFiles([]);
    setPhotos([]);
    setValidationError(null);
    setSelectedSignerIds(currentUser ? [currentUser.id] : []);
  };

  // Camera availability detection
  useEffect(() => {
    const checkCamera = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasCamera = devices.some(device => device.kind === 'videoinput');
          setCameraAvailable(hasCamera);
        } catch {
          setCameraAvailable(false);
        }
      }
    };
    checkCamera();
  }, []);

  // Stop camera on modal close
  useEffect(() => {
    if (!isOpen && streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
      setShowCamera(false);
    }
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setShowCamera(false);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      setShowCamera(true);
      
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
      }
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        videoRef.current.play().catch(console.error);
      }
    } catch (error: any) {
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Por favor, permite el acceso.'
          : 'Error al acceder a la cámara.'
      );
      setShowCamera(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Draw the video frame
    ctx.drawImage(video, 0, 0);

    // Get current date/time
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const timeStr = now.toLocaleTimeString('es-CO', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });

    // Try to get geolocation
    let locationText = 'Ubicación no disponible';
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      locationText = `📍 ${lat}°, ${lng}°`;
    } catch {
      locationText = '📍 Ubicación no disponible';
    }

    // Draw watermark background
    const watermarkHeight = 80;
    const padding = 15;
    const lineSpacing = 28;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, canvas.height - watermarkHeight, canvas.width, watermarkHeight);

    // Draw watermark text with better spacing
    ctx.fillStyle = '#ffffff';
    const fontSize = Math.max(16, canvas.width / 45);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(locationText, padding, canvas.height - watermarkHeight + lineSpacing);
    ctx.fillText(`📅 ${dateStr}  🕐 ${timeStr}`, padding, canvas.height - watermarkHeight + lineSpacing * 2);

    // Draw contract number on right side
    ctx.textAlign = 'right';
    ctx.font = `bold ${Math.max(14, canvas.width / 55)}px Arial`;
    const contractLabel = contractNumber ? `Contrato: ${contractNumber}` : 'Bitácora de Obra Digital';
    ctx.fillText(contractLabel, canvas.width - padding, canvas.height - watermarkHeight + lineSpacing + 10);

    // Convert to blob and save
    canvas.toBlob((blob) => {
      if (blob) {
        const fileName = `foto_bitacora_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        setPhotos(prev => [...prev, file]);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  // AUTOSAVE: Guardar y restaurar borrador en localStorage
  const AUTOSAVE_KEY = "logEntryFormDraft";

  useEffect(() => {
    if (!isOpen) return;
    // Restaurar borrador solo si los campos principales están vacíos
    const draft = localStorage.getItem(AUTOSAVE_KEY);
    if (draft) {
      try {
        const data = JSON.parse(draft);
        if (!entryDate && data.entryDate) setEntryDate(data.entryDate);
        if (!entryType && data.entryType) setEntryType(data.entryType);
        if (!title && data.title) setTitle(data.title);
        if (!summary && data.summary) setSummary(data.summary);
        if (materialsUsed.length === 1 && !materialsUsed[0].material && data.materialsUsed) setMaterialsUsed(data.materialsUsed);
        if (!activitiesPerformed && data.activitiesPerformed) setActivitiesPerformed(data.activitiesPerformed);
        if (!additionalObservations && data.additionalObservations) setAdditionalObservations(data.additionalObservations);
        if (!scheduleDay && data.scheduleDay) setScheduleDay(data.scheduleDay);
        if (!locationDetails && data.locationDetails) setLocationDetails(data.locationDetails);
        if (!weatherSummary && data.weatherSummary) setWeatherSummary(data.weatherSummary);
        if (!weatherTemperature && data.weatherTemperature) setWeatherTemperature(data.weatherTemperature);
        if (!weatherNotes && data.weatherNotes) setWeatherNotes(data.weatherNotes);
        if (rainEvents.length === 1 && !rainEvents[0].start && data.rainEvents) setRainEvents(data.rainEvents);
        // Puedes agregar más campos si lo necesitas
      } catch {}
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // Guardar borrador cada vez que cambie el formulario
    const draft = {
      entryDate,
      entryType,
      title,
      summary,
      materialsUsed,
      activitiesPerformed,
      additionalObservations,
      scheduleDay,
      locationDetails,
      weatherSummary,
      weatherTemperature,
      weatherNotes,
      rainEvents,
      // Puedes agregar más campos si lo necesitas
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
  }, [entryDate, entryType, title, summary, materialsUsed, activitiesPerformed, additionalObservations, scheduleDay, locationDetails, weatherSummary, weatherTemperature, weatherNotes, rainEvents, isOpen]);

  // Calcular día del plazo automáticamente basado en la fecha de inicio del proyecto
  const calculateScheduleDay = (entryDate: string) => {
    if (!entryDate || !projectStartDate) return "";
    
    const entryDateObj = new Date(entryDate);
    const projectStartDateObj = new Date(projectStartDate);
    
    // Calcular la diferencia en días desde el inicio del proyecto
    const diffTime = entryDateObj.getTime() - projectStartDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Día ${Math.abs(diffDays)} antes del inicio del proyecto`;
    } else if (diffDays === 0) {
      return "Día 1 del proyecto";
    } else {
      return `Día ${diffDays + 1} del proyecto`;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedSignerIds((prev) => {
        if (prev.length > 0) {
          return prev;
        }
        return currentUser ? [currentUser.id] : [];
      });
      if (initialDate) {
        setEntryDate(initialDate);
      }
    } else {
      const timer = setTimeout(() => {
        resetForm();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialDate]);

  // Actualizar día del plazo cuando cambie la fecha
  useEffect(() => {
    if (entryDate) {
      setScheduleDay(calculateScheduleDay(entryDate));
    }
  }, [entryDate]);

  const entryTypeOptions = [
    { value: EntryType.GENERAL, label: "General / Técnica" },
    { value: EntryType.SAFETY, label: "SST / HSE" },
    { value: EntryType.ENVIRONMENTAL, label: "Ambiental" },
    { value: EntryType.SOCIAL, label: "Social" },
    { value: EntryType.ADMINISTRATIVE, label: "Administrativo" },
    { value: EntryType.QUALITY, label: "Calidad" },
  ];
  const showGeneralSections =
    entryType === EntryType.GENERAL || entryType === EntryType.TECHNICAL;
  const showSafetySection = entryType === EntryType.SAFETY;
  const showEnvironmentalSection = entryType === EntryType.ENVIRONMENTAL;
  const showSocialSection = entryType === EntryType.SOCIAL;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
      );
      const totalPhotos = photos.length + newPhotos.length;
      
      if (totalPhotos > MAX_PHOTOS) {
        alert(`Solo puedes subir un máximo de ${MAX_PHOTOS} fotos. Actualmente tienes ${photos.length} foto(s).`);
        return;
      }
      
      // Compress images before adding to state
      setIsCompressing(true);
      try {
        const compressedPhotos = await compressImages(newPhotos, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8
        });
        setPhotos((prev) => [...prev, ...compressedPhotos]);
      } catch (error) {
        console.error('Error compressing images:', error);
        // Fall back to original photos if compression fails
        setPhotos((prev) => [...prev, ...newPhotos]);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const sortedUsers = useMemo(() => {
    const map = new Map<string, User>();
    const register = (user?: User | null) => {
      // Excluir usuarios con rol "viewer" - no pueden ser firmantes
      if (user?.id && !map.has(user.id) && user.appRole !== "viewer") {
        map.set(user.id, user);
      }
    };
    availableUsers.forEach(register);
    register(currentUser);
    return Array.from(map.values()).sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "es")
    );
  }, [availableUsers, currentUser]);

  const toggleSigner = (userId: string, checked: boolean) => {
    setSelectedSignerIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return Array.from(next);
    });
  };

  const removeFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const addRainEventRow = () =>
    setRainEvents((prev) => [...prev, { start: "", end: "" }]);

  const updateRainEventRow = (
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    setRainEvents((prev) =>
      prev.map((event, i) => (i === index ? { ...event, [field]: value } : event))
    );
  };

  const removeRainEventRow = (index: number) => {
    setRainEvents((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const updatePersonnelRow = (
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

  const addPersonnelRow = (
    setter: React.Dispatch<
      React.SetStateAction<Array<{ role: string; quantity: string; notes: string }>>
    >
  ) => {
    setter((prev) => [...prev, { role: "", quantity: "", notes: "" }]);
  };

  const removePersonnelRow = (
    setter: React.Dispatch<
      React.SetStateAction<Array<{ role: string; quantity: string; notes: string }>>
    >,
    index: number
  ) => {
    setter((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const updateEquipmentRow = (
    index: number,
    field: "name" | "status" | "notes",
    value: string
  ) => {
    setEquipmentResources((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addEquipmentRow = () => {
    setEquipmentResources((prev) => [...prev, { name: "", status: "", notes: "" }]);
  };

  const removeEquipmentRow = (index: number) => {
    setEquipmentResources((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  // Funciones para materiales
  const updateMaterialRow = (
    index: number,
    field: "material" | "quantity" | "unit",
    value: string
  ) => {
    setMaterialsUsed((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addMaterialRow = () => {
    setMaterialsUsed((prev) => [...prev, { material: "", quantity: "", unit: "" }]);
  };

  const removeMaterialRow = (index: number) => {
    setMaterialsUsed((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const linesToItems = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => ({ text }));

  const buildWeatherReport = () => {
    const normalizedEvents = rainEvents
      .map(({ start, end }) => ({ start: start.trim(), end: end.trim() }))
      .filter((event) => event.start || event.end);

    const summary = weatherSummary.trim();
    const temperature = weatherTemperature.trim();
    const notes = weatherNotes.trim();

    if (!summary && !temperature && !notes && normalizedEvents.length === 0) {
      return null;
    }

    return {
      summary: summary || undefined,
      temperature: temperature || undefined,
      notes: notes || undefined,
      rainEvents: normalizedEvents,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Fijar mediodía UTC para evitar corrimientos de fecha
    const parsedDate = new Date(`${entryDate}T12:00:00Z`);
    if (isNaN(parsedDate.getTime())) {
      setValidationError("La fecha seleccionada no es válida.");
      return;
    }

    const entryDateIso = parsedDate.toISOString();

    // Usar el mismo día para inicio/fin de actividades
    const startOfDay = new Date(`${entryDate}T12:00:00Z`);
    const endOfDay = new Date(`${entryDate}T23:59:59.999Z`);

    const signerIds = new Set(selectedSignerIds);
    const requiredSignatories = Array.from(signerIds)
      .map((id) =>
        availableUsers.find((user) => user.id === id) ||
        (currentUser && currentUser.id === id ? currentUser : undefined)
      )
      .filter((user): user is User => Boolean(user));

    const weatherReport = isSpecialType ? null : buildWeatherReport();
    const skipAuthorAsSigner =
      Boolean(currentUser) && !selectedSignerIds.includes(currentUser!.id);

    const normalizePersonnelDraft = (
      entries: Array<{ role: string; quantity: string; notes: string }>
    ) =>
      entries
        .map((entry) => ({
          role: entry.role.trim(),
          quantity: entry.quantity.trim(),
          notes: entry.notes.trim(),
        }))
        .filter((entry) => entry.role)
        .map((entry) => ({
          role: entry.role,
          quantity:
            entry.quantity && !Number.isNaN(Number(entry.quantity))
              ? Number(entry.quantity)
              : undefined,
          notes: entry.notes || undefined,
        }));

    const normalizedContractorPersonnel = isSpecialType
      ? []
      : normalizePersonnelDraft(contractorPersonnel);
    const normalizedInterventoriaPersonnel = isSpecialType
      ? []
      : normalizePersonnelDraft(interventoriaPersonnel);

    const normalizedEquipmentResources = isSpecialType
      ? []
      : equipmentResources
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

    // Convertir lista de materiales a texto formateado
    const normalizedMaterials = isSpecialType
      ? ""
      : materialsUsed
          .map((entry) => ({
            material: entry.material.trim(),
            quantity: entry.quantity.trim(),
            unit: entry.unit.trim(),
          }))
          .filter((entry) => entry.material)
          .map((entry) => {
            const parts = [entry.material];
            if (entry.quantity) parts.push(entry.quantity);
            if (entry.unit) parts.push(entry.unit);
            return parts.join(" - ");
          })
          .join("\n");

    const contractorResponse =
      entryType === EntryType.SAFETY
        ? safetyContractorResponse
        : entryType === EntryType.ENVIRONMENTAL
        ? environmentContractorResponse
        : socialContractorResponse;

    setIsSaving(true);
    setSaveProgress(0);
    
    // Simulate progress steps
    const simulateProgress = async () => {
      // Step 1: Validating (20%)
      setSaveProgress(0);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 2: Uploading files (50%)
      setSaveProgress(1);
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Step 3: Saving (85%) - actual save happens here
      setSaveProgress(2);
    };
    
    try {
      await simulateProgress();
      await onSave(
        {
          title: title.trim(),
          description: summary.trim(),
          entryDate: entryDateIso,
          materialsUsed: normalizedMaterials || "",
          activitiesPerformed: isSpecialType ? "" : activitiesPerformed.trim(),
          workforce: isSpecialType ? "" : "",
          weatherConditions: isSpecialType ? "" : "",
          additionalObservations: additionalObservations.trim(),
          scheduleDay: isSpecialType ? "" : scheduleDay.trim(),
          locationDetails: locationDetails.trim(),
          weatherReport,
          contractorPersonnel: normalizedContractorPersonnel,
          interventoriaPersonnel: normalizedInterventoriaPersonnel,
          equipmentResources: normalizedEquipmentResources,
          executedActivities: isSpecialType ? [] : linesToItems(executedActivitiesText),
          executedQuantities: isSpecialType ? [] : linesToItems(executedQuantitiesText),
          scheduledActivities: isSpecialType ? [] : linesToItems(scheduledActivitiesText),
          qualityControls: isSpecialType ? [] : linesToItems(qualityControlsText),
          materialsReceived: isSpecialType ? [] : linesToItems(materialsReceivedText),
          safetyNotes: isSpecialType ? [] : linesToItems(safetyNotesText),
          projectIssues: isSpecialType ? [] : linesToItems(projectIssuesText),
          siteVisits: isSpecialType ? [] : linesToItems(siteVisitsText),
          contractorObservations: isSpecialType ? "" : contractorObservations.trim(),
          interventoriaObservations: isSpecialType ? "" : interventoriaObservations.trim(),
          safetyFindings: isSpecialType ? "" : safetyFindings.trim(),
          safetyContractorResponse:
            entryType === EntryType.SAFETY ? contractorResponse.trim() : "",
          environmentFindings: isSpecialType ? "" : environmentFindings.trim(),
          environmentContractorResponse:
            entryType === EntryType.ENVIRONMENTAL ? contractorResponse.trim() : "",
          socialActivities: isSpecialType ? [] : linesToItems(socialActivitiesText),
          socialObservations: isSpecialType ? "" : socialObservations.trim(),
          socialContractorResponse:
            entryType === EntryType.SOCIAL ? contractorResponse.trim() : "",
          socialPhotoSummary: isSpecialType ? "" : socialPhotoSummary.trim(),
          activityStartDate: startOfDay.toISOString(),
          activityEndDate: endOfDay.toISOString(),
          subject: "",
          location: "",
          type: entryType,
          status: EntryStatus.DRAFT,
          isConfidential: false,
          assignees: [],
          requiredSignatories,
          skipAuthorAsSigner,
          signatures: [],
        },
        [...files, ...photos]
      );
      localStorage.removeItem(AUTOSAVE_KEY);
      
      // Step 4: Complete (100%)
      setSaveProgress(3);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la bitácora. Intenta nuevamente."
      );
      setSaveProgress(0);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem(AUTOSAVE_KEY);
    onClose();
  };

  if (isSpecialType) {
    const contractorLabel =
      entryType === EntryType.SAFETY
        ? "Respuesta del contratista (SST)"
        : entryType === EntryType.ENVIRONMENTAL
        ? "Respuesta del contratista (Ambiental)"
        : "Respuesta del contratista (Social)";

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Registrar Bitácora Diaria"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 pb-4">
          {isSaving && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <ProgressIndicator
                currentStep={saveProgress}
                steps={SAVE_STEPS}
                className="mb-2"
              />
              <p className="text-center text-sm text-gray-600 mt-2">
                Por favor espera mientras guardamos tu anotación...
              </p>
            </div>
          )}
          {validationError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Fecha de la bitácora"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
            <Select
              label="Tipo de bitácora"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as EntryType)}
            >
              <option value={EntryType.SAFETY}>SST</option>
              <option value={EntryType.ENVIRONMENTAL}>Ambiental</option>
              <option value={EntryType.SOCIAL}>Social</option>
            </Select>
          </div>

          <Input
            label="Título / Asunto"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Registro diario"
          />

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">
              Resumen general del día
            </h4>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Describe las actividades y hallazgos del día"
              required
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">
              {contractorLabel}
            </h4>
            <textarea
              value={
                entryType === EntryType.SAFETY
                  ? safetyContractorResponse
                  : entryType === EntryType.ENVIRONMENTAL
                  ? environmentContractorResponse
                  : socialContractorResponse
              }
              onChange={(e) => {
                const val = e.target.value;
                if (entryType === EntryType.SAFETY) setSafetyContractorResponse(val);
                else if (entryType === EntryType.ENVIRONMENTAL)
                  setEnvironmentContractorResponse(val);
                else setSocialContractorResponse(val);
              }}
              rows={3}
              className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Respuesta del contratista"
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1">
              Observaciones adicionales
            </h4>
            <textarea
              value={additionalObservations}
              onChange={(e) => setAdditionalObservations(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Observaciones adicionales"
            />
          </div>

          {/* Firmantes responsables */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              Firmantes responsables
            </h4>
            <p className="text-xs text-gray-500 mb-2">
              Selecciona a quienes deben firmar la anotación. Puedes quitar al autor si solo va a cargar la bitácora.
            </p>
            <div className="border border-gray-200 rounded-md divide-y max-h-48 overflow-y-auto">
              {sortedUsers.map((user) => {
                const isAuthor = currentUser?.id === user.id;
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
                        toggleSigner(user.id, event.target.checked)
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

          {/* Adjuntar archivos */}
          <div>
            <label
              htmlFor="file-upload-entry"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Adjuntar archivos
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload-entry"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none"
                  >
                    <span>Selecciona archivos</span>
                    <input
                      id="file-upload-entry"
                      name="file-upload-entry"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      multiple
                    />
                  </label>
                  <p className="pl-1">o arrastra y suelta</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, imágenes u otros archivos — máximo 10MB
                </p>
              </div>
            </div>
            {files.length > 0 && (
              <div className="mt-2 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between text-sm p-2 bg-gray-50 border rounded"
                  >
                    <span className="truncate font-medium">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(file)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección de fotos con cámara */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Fotos del día
              </label>
              {cameraAvailable && !showCamera && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  <CameraIcon className="h-4 w-4" />
                  Tomar foto
                </button>
              )}
            </div>

            {cameraError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-xs text-red-600">{cameraError}</p>
              </div>
            )}

            {showCamera ? (
              <div className="border-2 border-blue-300 border-dashed rounded-md p-4">
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '250px' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                    style={{ minHeight: '250px', backgroundColor: '#000' }}
                  />
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                      <div className="text-center text-white">
                        <CameraIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p className="text-sm">Iniciando cámara...</p>
                      </div>
                    </div>
                  )}
                </div>
                {isCameraActive && (
                  <div className="flex justify-center gap-3 mt-3">
                    <Button type="button" variant="secondary" onClick={stopCamera}>
                      Cancelar
                    </Button>
                    <Button type="button" onClick={capturePhoto} className="flex items-center gap-2">
                      <CameraIcon className="h-5 w-5" />
                      Capturar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="photo-upload-entry"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none"
                    >
                      <span>Selecciona fotos</span>
                      <input
                        id="photo-upload-entry"
                        name="photo-upload-entry"
                        type="file"
                        className="sr-only"
                        onChange={handlePhotoChange}
                        multiple
                        accept="image/*"
                      />
                    </label>
                    <p className="pl-1">o arrastra y suelta</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Solo imágenes — máximo 5MB cada una
                  </p>
                  {cameraAvailable && (
                    <p className="text-xs text-blue-600 mt-1">
                      O usa el botón "Tomar foto" para capturar con la cámara
                    </p>
                  )}
                </div>
              </div>
            )}

            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((photo, index) => (
                  <div key={`${photo.name}-${index}`} className="relative group">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{photo.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Bitácora Diaria"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Fecha del Diario"
            id="entryDate"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            required
          />
          <Input
            label="Título"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <Select
          label="Tipo de anotación"
          value={entryType}
          onChange={(e) => setEntryType(e.target.value as EntryType)}
        >
          {entryTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Día del plazo"
            id="scheduleDay"
            placeholder="Se calcula automáticamente"
            value={scheduleDay}
            onChange={(e) => setScheduleDay(e.target.value)}
            disabled
            className="bg-gray-100"
          />
          <Input
            label="Localización / Tramo"
            id="locationDetails"
            placeholder="Ej. Tramo K2+100 al K2+300"
            value={locationDetails}
            onChange={(e) => setLocationDetails(e.target.value)}
          />
        </div>

        {showGeneralSections && (
          <>
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-2">
            Condiciones climáticas
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Resumen"
              id="weatherSummary"
              placeholder="Ej. Cielo parcialmente nublado"
              value={weatherSummary}
              onChange={(e) => setWeatherSummary(e.target.value)}
            />
            <Input
              label="Temperatura"
              id="weatherTemperature"
              placeholder="Ej. 22°C"
              value={weatherTemperature}
              onChange={(e) => setWeatherTemperature(e.target.value)}
            />
          </div>
          <textarea
            className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            rows={2}
            placeholder="Observaciones adicionales sobre el clima"
            value={weatherNotes}
            onChange={(e) => setWeatherNotes(e.target.value)}
          />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Lluvias registradas</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addRainEventRow}
              >
                Añadir intervalo
              </Button>
            </div>
            {rainEvents.map((event, index) => (
              <div
                key={`rain-${index}`}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
              >
                <Input
                  label={index === 0 ? "Inicio" : undefined}
                  id={`rain-start-${index}`}
                  type="time"
                  value={event.start}
                  onChange={(e) => updateRainEventRow(index, "start", e.target.value)}
                />
                <Input
                  label={index === 0 ? "Fin" : undefined}
                  id={`rain-end-${index}`}
                  type="time"
                  value={event.end}
                  onChange={(e) => updateRainEventRow(index, "end", e.target.value)}
                />
                {rainEvents.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRainEventRow(index)}
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

        <div>
          <label
            htmlFor="summary"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Resumen general del día
          </label>
          <textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
        />
      </div>
          </>
        )}

        {showGeneralSections && (
          <>
            {/* Materiales utilizados */}
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-800">Materiales utilizados</h4>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addMaterialRow}
                >
                  Añadir material
                </Button>
              </div>
              <div className="mt-2 space-y-3">
                {materialsUsed.map((item, index) => (
                  <div key={`material-${index}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <Input
                      label={index === 0 ? "Material" : undefined}
                      value={item.material}
                      onChange={(e) => updateMaterialRow(index, 'material', e.target.value)}
                      placeholder="Ej. Cemento, Acero, etc."
                    />
                    <Input
                      label={index === 0 ? "Cantidad" : undefined}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateMaterialRow(index, 'quantity', e.target.value)}
                      placeholder="Ej. 100"
                    />
                    <Input
                      label={index === 0 ? "Unidad" : undefined}
                      value={item.unit}
                      onChange={(e) => updateMaterialRow(index, 'unit', e.target.value)}
                      placeholder="Ej. kg, m³, m², etc."
                    />
                    {materialsUsed.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMaterialRow(index)}
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

            {/* Actividades ejecutadas */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Actividades ejecutadas</h4>
              <textarea
                value={activitiesPerformed}
                onChange={(e) => setActivitiesPerformed(e.target.value)}
                rows={4}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                placeholder="Describe las actividades realizadas..."
              />
            </div>
          </>
        )}
        {showGeneralSections && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800">Personal del contratista</h4>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => addPersonnelRow(setContractorPersonnel)}
              >
                Añadir personal
              </Button>
            </div>
            <div className="mt-2 space-y-3">
              {contractorPersonnel.map((person, index) => (
                <div key={`contractor-${index}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <Input
                    label={index === 0 ? "Cargo" : undefined}
                    value={person.role}
                    onChange={(e) => updatePersonnelRow(setContractorPersonnel, index, 'role', e.target.value)}
                  />
                  <Input
                    label={index === 0 ? "Cantidad" : undefined}
                    type="number"
                    min="0"
                    value={person.quantity}
                    onChange={(e) => updatePersonnelRow(setContractorPersonnel, index, 'quantity', e.target.value)}
                  />
                  <Input
                    label={index === 0 ? "Notas" : undefined}
                    value={person.notes}
                    onChange={(e) => updatePersonnelRow(setContractorPersonnel, index, 'notes', e.target.value)}
                  />
                  {contractorPersonnel.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePersonnelRow(setContractorPersonnel, index)}
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
              <h4 className="text-sm font-semibold text-gray-800">Personal de la interventoría</h4>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => addPersonnelRow(setInterventoriaPersonnel)}
              >
                Añadir personal
              </Button>
            </div>
            <div className="mt-2 space-y-3">
              {interventoriaPersonnel.map((person, index) => (
                <div key={`interventoria-${index}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <Input
                    label={index === 0 ? "Cargo" : undefined}
                    value={person.role}
                    onChange={(e) => updatePersonnelRow(setInterventoriaPersonnel, index, 'role', e.target.value)}
                  />
                  <Input
                    label={index === 0 ? "Cantidad" : undefined}
                    type="number"
                    min="0"
                    value={person.quantity}
                    onChange={(e) => updatePersonnelRow(setInterventoriaPersonnel, index, 'quantity', e.target.value)}
                  />
                  <Input
                    label={index === 0 ? "Notas" : undefined}
                    value={person.notes}
                    onChange={(e) => updatePersonnelRow(setInterventoriaPersonnel, index, 'notes', e.target.value)}
                  />
                  {interventoriaPersonnel.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePersonnelRow(setInterventoriaPersonnel, index)}
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
              <h4 className="text-sm font-semibold text-gray-800">Maquinaria y equipos</h4>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addEquipmentRow}
              >
                Añadir equipo
              </Button>
            </div>
            <div className="mt-2 space-y-3">
              {equipmentResources.map((item, index) => (
                <div key={`equipment-${index}`} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <Input
                    label={index === 0 ? "Equipo" : undefined}
                    value={item.name}
                    onChange={(e) => updateEquipmentRow(index, 'name', e.target.value)}
                  />
                  <Input
                    label={index === 0 ? "Estado" : undefined}
                    value={item.status}
                    onChange={(e) => updateEquipmentRow(index, 'status', e.target.value)}
                    placeholder="Operativa, standby, etc."
                  />
                  <Input
                    label={index === 0 ? "Notas" : undefined}
                    value={item.notes}
                    onChange={(e) => updateEquipmentRow(index, 'notes', e.target.value)}
                  />
                  {equipmentResources.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEquipmentRow(index)}
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
        )}

        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">
            Ejecución y avance
          </h4>
          <textarea
            value={executedActivitiesText}
            onChange={(e) => setExecutedActivitiesText(e.target.value)}
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Actividades ejecutadas (frente, abscisa, tareas específicas)"
          />
          <textarea
            value={executedQuantitiesText}
            onChange={(e) => setExecutedQuantitiesText(e.target.value)}
            rows={3}
            className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Cantidades de obra ejecutadas"
          />
          <textarea
            value={scheduledActivitiesText}
            onChange={(e) => setScheduledActivitiesText(e.target.value)}
            rows={3}
            className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Actividades programadas y no ejecutadas (incluye motivo)"
          />
        </div>

        {showGeneralSections && (
        <div>
          <h4 className="text-sm font-semibold text-gray-800 mb-1">
            Controles y novedades
          </h4>
          <textarea
            value={qualityControlsText}
            onChange={(e) => setQualityControlsText(e.target.value)}
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Ensayos y controles de calidad"
          />
          <textarea
            value={materialsReceivedText}
            onChange={(e) => setMaterialsReceivedText(e.target.value)}
            rows={3}
            className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Materiales recibidos"
          />
          <textarea
            value={safetyNotesText}
            onChange={(e) => setSafetyNotesText(e.target.value)}
            rows={3}
            className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Gestión HSEQ / SST"
          />
          <textarea
            value={projectIssuesText}
            onChange={(e) => setProjectIssuesText(e.target.value)}
            rows={3}
            className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Novedades y contratiempos"
          />
          <textarea
            value={siteVisitsText}
            onChange={(e) => setSiteVisitsText(e.target.value)}
            rows={3}
            className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
            placeholder="Visitas registradas"
          />
        </div>
        )}

        {showGeneralSections && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium.text-gray-700 mb-1">
                Observaciones del contratista
              </label>
              <textarea
                value={contractorObservations}
                onChange={(e) => setContractorObservations(e.target.value)}
                rows={3}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones de la interventoría
              </label>
              <textarea
                value={interventoriaObservations}
                onChange={(e) => setInterventoriaObservations(e.target.value)}
                rows={3}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              />
            </div>
          </div>
        )}

        {showSafetySection && (
          <div className="space-y-5 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800">
              Componente SST (SST y MEV)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones SST (Interventoría)
                </label>
                <textarea
                  value={safetyFindings}
                  onChange={(e) => setSafetyFindings(e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Respuesta del contratista
                </label>
                <textarea
                  value={safetyContractorResponse}
                  onChange={(e) => setSafetyContractorResponse(e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              </div>
            </div>
          </div>
        )}

        {showEnvironmentalSection && (
          <div className="space-y-5 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800">
              Componente ambiental (ambiental, forestal, fauna)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones ambientales (Interventoría)
                </label>
                <textarea
                  value={environmentFindings}
                  onChange={(e) => setEnvironmentFindings(e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Respuesta del contratista
                </label>
                <textarea
                  value={environmentContractorResponse}
                  onChange={(e) =>
                    setEnvironmentContractorResponse(e.target.value)
                  }
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                />
              </div>
            </div>
          </div>
        )}

        {showSocialSection && (
          <div className="space-y-5 border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800">
              Componente social
            </h4>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Registro diario de actividades
              </label>
              <textarea
                value={socialActivitiesText}
                onChange={(e) => setSocialActivitiesText(e.target.value)}
                rows={3}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                placeholder="Describe cada actividad social en una línea."
              />
              <label className="block text-sm font-medium text-gray-700">
                Registro fotográfico (referencia)
              </label>
              <textarea
                value={socialPhotoSummary}
                onChange={(e) => setSocialPhotoSummary(e.target.value)}
                rows={2}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones de la interventoría
                  </label>
                  <textarea
                    value={socialObservations}
                    onChange={(e) => setSocialObservations(e.target.value)}
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Respuesta del contratista
                  </label>
                  <textarea
                    value={socialContractorResponse}
                    onChange={(e) => setSocialContractorResponse(e.target.value)}
                    rows={3}
                    className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones adicionales
          </label>
          <textarea
            value={additionalObservations}
            onChange={(e) => setAdditionalObservations(e.target.value)}
            rows={3}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
          placeholder="Notas relevantes, novedades, riesgos identificados u otros comentarios"
        />
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-1">
          Firmantes responsables
        </h4>
        <p className="text-xs text-gray-500 mb-2">
          Selecciona a quienes deben firmar la anotación. Puedes quitar al autor si solo va a cargar la bitácora.
        </p>
        <div className="border border-gray-200 rounded-md divide-y max-h-48 overflow-y-auto">
          {sortedUsers.map((user) => {
            const isAuthor = currentUser?.id === user.id;
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
                    toggleSigner(user.id, event.target.checked)
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

      <div>
        <label
          htmlFor="file-upload-entry"
          className="block text-sm font-medium text-gray-700 mb-1"
          >
            Adjuntar archivos
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload-entry"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none"
                >
                  <span>Selecciona archivos</span>
                  <input
                    id="file-upload-entry"
                    name="file-upload-entry"
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    multiple
                  />
                </label>
                <p className="pl-1">o arrastra y suelta</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, imágenes u otros archivos — máximo 10MB
              </p>
            </div>
          </div>
          {files.length > 0 && (
            <div className="mt-2 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between text-sm p-2 bg-gray-50 border rounded"
                >
                  <span className="truncate font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección de fotos con cámara */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Fotos del día
            </label>
            {cameraAvailable && !showCamera && (
              <button
                type="button"
                onClick={startCamera}
                className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                <CameraIcon className="h-4 w-4" />
                Tomar foto
              </button>
            )}
          </div>

          {cameraError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-600">{cameraError}</p>
            </div>
          )}

          {showCamera ? (
            <div className="border-2 border-blue-300 border-dashed rounded-md p-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '250px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                  style={{ minHeight: '250px', backgroundColor: '#000' }}
                />
                {!isCameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                    <div className="text-center text-white">
                      <CameraIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p className="text-sm">Iniciando cámara...</p>
                    </div>
                  </div>
                )}
              </div>
              {isCameraActive && (
                <div className="flex justify-center gap-3 mt-3">
                  <Button type="button" variant="secondary" onClick={stopCamera}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={capturePhoto} className="flex items-center gap-2">
                    <CameraIcon className="h-5 w-5" />
                    Capturar
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="photo-upload-general"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-brand-primary hover:text-brand-secondary focus-within:outline-none"
                  >
                    <span>Selecciona fotos</span>
                    <input
                      id="photo-upload-general"
                      name="photo-upload-general"
                      type="file"
                      className="sr-only"
                      onChange={handlePhotoChange}
                      multiple
                      accept="image/*"
                    />
                  </label>
                  <p className="pl-1">o arrastra y suelta</p>
                </div>
                <p className="text-xs text-gray-500">
                  Solo imágenes — máximo 5MB cada una
                </p>
                {cameraAvailable && (
                  <p className="text-xs text-blue-600 mt-1">
                    O usa el botón "Tomar foto" para capturar con la cámara
                  </p>
                )}
              </div>
            </div>
          )}

          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo, index) => (
                <div key={`${photo.name}-${index}`} className="relative group">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-gray-500 mt-1 truncate">{photo.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
            {validationError}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={isSaving}
          >
            {isSaving && saveProgress < SAVE_STEPS.length - 1 ? (
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
              "Guardar Bitácora"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EntryFormModal;
