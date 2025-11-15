import React, { useEffect, useMemo, useState } from "react";
import { LogEntry, EntryStatus, EntryType, User } from "../types";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { XMarkIcon } from "./icons/Icon";

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
}

const EntryFormModal: React.FC<EntryFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  availableUsers,
  currentUser,
  projectStartDate
}) => {
  const [entryDate, setEntryDate] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [activitiesPerformed, setActivitiesPerformed] = useState<string>("");
  const [materialsUsed, setMaterialsUsed] = useState<string>("");
  const [workforce, setWorkforce] = useState<string>("");
  const [weatherConditions, setWeatherConditions] = useState<string>("");
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
  const [files, setFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedSignerIds, setSelectedSignerIds] = useState<string[]>(
    () => (currentUser ? [currentUser.id] : [])
  );

  const resetForm = () => {
    setEntryDate("");
    setTitle("");
    setSummary("");
    setActivitiesPerformed("");
    setMaterialsUsed("");
    setWorkforce("");
    setWeatherConditions("");
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
    setFiles([]);
    setPhotos([]);
    setValidationError(null);
    setSelectedSignerIds(currentUser ? [currentUser.id] : []);
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
      );
      setPhotos((prev) => [...prev, ...newPhotos]);
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
      if (currentUser) {
        next.add(currentUser.id);
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

    if (!entryDate) {
      setValidationError("Debes seleccionar la fecha de la bitácora.");
      return;
    }

    if (!title.trim()) {
      setValidationError("El título es obligatorio.");
      return;
    }

    if (!summary.trim()) {
      setValidationError("El resumen general del día es obligatorio.");
      return;
    }

    const parsedDate = new Date(`${entryDate}T00:00:00`);
    if (isNaN(parsedDate.getTime())) {
      setValidationError("La fecha seleccionada no es válida.");
      return;
    }

    const normalizedDate = new Date(parsedDate);
    normalizedDate.setHours(0, 0, 0, 0);
    const entryDateIso = normalizedDate.toISOString();

    const endOfDay = new Date(normalizedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const signerIds = new Set(selectedSignerIds);
    if (currentUser) {
      signerIds.add(currentUser.id);
    }
    const requiredSignatories = Array.from(signerIds)
      .map((id) =>
        availableUsers.find((user) => user.id === id) ||
        (currentUser && currentUser.id === id ? currentUser : undefined)
      )
      .filter((user): user is User => Boolean(user));

    const weatherReport = buildWeatherReport();

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

    const normalizedContractorPersonnel = normalizePersonnelDraft(contractorPersonnel);
    const normalizedInterventoriaPersonnel = normalizePersonnelDraft(interventoriaPersonnel);

    const normalizedEquipmentResources = equipmentResources
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

    try {
      await onSave(
        {
          title: title.trim(),
          description: summary.trim(),
          entryDate: entryDateIso,
          activitiesPerformed: activitiesPerformed.trim(),
          materialsUsed: materialsUsed.trim(),
          workforce: workforce.trim(),
          weatherConditions: weatherConditions.trim(),
          additionalObservations: additionalObservations.trim(),
          scheduleDay: scheduleDay.trim(),
          locationDetails: locationDetails.trim(),
          weatherReport,
          contractorPersonnel: normalizedContractorPersonnel,
          interventoriaPersonnel: normalizedInterventoriaPersonnel,
          equipmentResources: normalizedEquipmentResources,
          executedActivities: linesToItems(executedActivitiesText),
          executedQuantities: linesToItems(executedQuantitiesText),
          scheduledActivities: linesToItems(scheduledActivitiesText),
          qualityControls: linesToItems(qualityControlsText),
          materialsReceived: linesToItems(materialsReceivedText),
          safetyNotes: linesToItems(safetyNotesText),
          projectIssues: linesToItems(projectIssuesText),
          siteVisits: linesToItems(siteVisitsText),
          contractorObservations: contractorObservations.trim(),
          interventoriaObservations: interventoriaObservations.trim(),
          activityStartDate: normalizedDate.toISOString(),
          activityEndDate: endOfDay.toISOString(),
          subject: "",
          location: "",
          type: EntryType.GENERAL,
          status: EntryStatus.DRAFT,
          isConfidential: false,
          assignees: [],
          requiredSignatories,
          signatures: [],
        },
        [...files, ...photos]
      );
    } catch (err) {
      setValidationError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la bitácora. Intenta nuevamente."
      );
    }
  };

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
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actividades realizadas
            </label>
            <textarea
              value={activitiesPerformed}
              onChange={(e) => setActivitiesPerformed(e.target.value)}
              rows={4}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Describe las tareas ejecutadas en la jornada"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Materiales utilizados
            </label>
            <textarea
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              rows={4}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Registra cantidades, tipos de material, proveedores, etc."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal en obra
            </label>
            <textarea
              value={workforce}
              onChange={(e) => setWorkforce(e.target.value)}
              rows={3}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Cuadrillas presentes, subcontratistas, horas hombre..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condiciones climáticas
            </label>
            <textarea
              value={weatherConditions}
              onChange={(e) => setWeatherConditions(e.target.value)}
              rows={3}
              className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
              placeholder="Estado del clima, incidencia en las actividades, riesgos, etc."
            />
          </div>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
          Selecciona a quienes deben firmar la anotación. El autor se incluye automáticamente.
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
                  checked={isChecked || isAuthor}
                  onChange={(event) =>
                    toggleSigner(user.id, event.target.checked)
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

        {/* Sección de fotos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fotos del día
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
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
            </div>
          </div>
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
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar Bitácora</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EntryFormModal;
