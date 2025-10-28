// New types for Admin View
export type AppRole = "admin" | "editor" | "viewer";

export interface Permission {
  canManageUsers: boolean;
  canEditProjects: boolean;
  canViewFinancials: boolean;
  canConfigureApp: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO
  actorEmail: string;
  action:
    | "USER_INVITED"
    | "USER_UPDATED"
    | "ROLE_CHANGED"
    | "APP_SETTING_CHANGED";
  entityType: "user" | "project" | "setting";
  entityId?: string;
  diff?: Record<string, { from: any; to: any }>;
}

export interface AppSettings {
  companyName: string;
  timezone: string;       // e.g. "Europe/Madrid"
  locale: "es-ES" | "en-US";
  requireStrongPassword: boolean;
  enable2FA: boolean;
  sessionTimeoutMinutes: number;
  photoIntervalDays: number; // e.g. 3
  defaultProjectVisibility: "private" | "organization";
}


// Updated/Existing types
export enum UserRole {
  RESIDENT = 'Residente de Obra',
  SUPERVISOR = 'Supervisor',
  CONTRACTOR_REP = 'Representante Contratista',
  ADMIN = 'Administrador IDU',
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  projectRole: UserRole;
  avatarUrl: string;
  password?: string;
  // Admin fields
  appRole: AppRole;
  permissions?: Partial<Permission>;
  status: "active" | "inactive";
  lastLoginAt?: string; // ISO
  emailVerifiedAt?: string | null;
}

export interface Project {
  id: string;
  name: string;
  contractId: string;
}

// PROJECT SUMMARY
export interface KeyPersonnel {
  id: string;
  name: string;
  role: string;
  company: 'Contratista' | 'Interventoría';
  email: string;
  phone: string;
}

export interface ProjectDetails {
  id: string;
  name: string;
  contractId: string;
  object: string;
  contractorName: string;
  supervisorName: string;
  initialValue: number;
  startDate: string; // ISO date string
  initialEndDate: string; // ISO date string
  keyPersonnel: KeyPersonnel[];
  // New fields for Interventoria
  interventoriaContractId: string;
  interventoriaInitialValue: number;
  technicalSupervisorName: string;
}


// SHARED
export interface Attachment {
  id: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  downloadUrl?: string;
  storagePath?: string;
  createdAt?: string;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  timestamp: string; // ISO date string
  attachments?: Attachment[];
}

export interface Change {
  id: string;
  user: User;
  timestamp: string; // ISO date string
  fieldName: string;
  oldValue: string;
  newValue: string;
}

export interface Signature {
  signer: User;
  signedAt: string; // ISO date string
}

export interface UserSignature {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureTask {
  id: string;
  status: 'PENDING' | 'SIGNED' | 'DECLINED' | 'CANCELLED';
  assignedAt: string;
  signedAt?: string;
  signer: User | null;
}

export interface SignatureSummary {
  total: number;
  signed: number;
  pending: number;
  completed: boolean;
}

export interface WeatherReport {
  summary?: string;
  rainStart?: string;
  rainEnd?: string;
  temperature?: string;
  notes?: string;
}

export interface LogEntryListItem {
  text: string;
}


// LOGBOOK ENTRIES (ANOTACIONES)
export enum EntryStatus {
  APPROVED = 'Aprobado',
  NEEDS_REVIEW = 'En Revisión',
  SUBMITTED = 'Radicado',
  REJECTED = 'Rechazado',
  DRAFT = 'Borrador',
  SIGNED = 'Firmado',
}

export enum EntryType {
  QUALITY = 'Calidad',
  ADMINISTRATIVE = 'Administrativo',
  SAFETY = 'HSE',
  GENERAL = 'General',
}

export interface LogEntry {
  id: string;
  folioNumber: number;
  title: string;
  description: string;
  entryDate: string;
  activitiesPerformed: string;
  materialsUsed: string;
  workforce: string;
  weatherConditions: string;
  additionalObservations: string;
  scheduleDay: string;
  locationDetails: string;
  weatherReport: WeatherReport | null;
  contractorPersonnel: LogEntryListItem[];
  interventoriaPersonnel: LogEntryListItem[];
  equipmentResources: LogEntryListItem[];
  executedActivities: LogEntryListItem[];
  executedQuantities: LogEntryListItem[];
  scheduledActivities: LogEntryListItem[];
  qualityControls: LogEntryListItem[];
  materialsReceived: LogEntryListItem[];
  safetyNotes: LogEntryListItem[];
  projectIssues: LogEntryListItem[];
  siteVisits: LogEntryListItem[];
  contractorObservations: string;
  interventoriaObservations: string;
  author: User;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  activityStartDate: string; // ISO date string
  activityEndDate: string; // ISO date string
  location?: string;
  subject?: string;
  type: EntryType;
  status: EntryStatus;
  attachments: Attachment[];
  comments: Comment[];
  assignees?: User[];
  isConfidential: boolean;
  history?: Change[];
  requiredSignatories: User[];
  signatures: Signature[];
  signatureTasks?: SignatureTask[];
  signatureSummary?: SignatureSummary;
  pendingSignatureSignatories?: User[];
}

// DRAWINGS (PLANOS)
export enum DrawingDiscipline {
  ARQUITECTONICO = 'Arquitectónico',
  ESTRUCTURAL = 'Estructural',
  ELECTRICO = 'Eléctrico',
  HIDROSANITARIO = 'Hidrosanitario',
  MECANICO = 'Mecánico',
  URBANISMO = 'Urbanismo y Paisajismo',
  SEÑALIZACION = 'Señalización y PMT',
  GEOTECNIA = 'Geotecnia y Suelos',
  OTHER = 'Otro',
}

export enum DrawingStatus {
  VIGENTE = 'Vigente',
  OBSOLETO = 'Obsoleto',
}

export interface DrawingVersion {
  id: string;
  versionNumber: number;
  fileName: string;
  url: string;
  size: number;
  uploadDate: string; // ISO date string
  uploader: User;
}

export interface Drawing {
  id: string;
  code: string; // e.g. "EST-001"
  title: string;
  discipline: DrawingDiscipline;
  status: DrawingStatus;
  versions: DrawingVersion[]; // Newest version is always at index 0
  comments: Comment[];
}

// COMMUNICATIONS (COMUNICACIONES)
export enum CommunicationStatus {
  PENDIENTE = 'Pendiente',
  EN_TRAMITE = 'En Trámite',
  RESUELTO = 'Resuelto',
}

export enum CommunicationDirection {
  SENT = 'Enviada',
  RECEIVED = 'Recibida',
}

export enum DeliveryMethod {
  MAIL = 'Correo Electrónico',
  PRINTED = 'Impreso',
  SYSTEM = 'Sistema BDO',
  FAX = 'Fax',
}

export interface CommunicationPartyDetails {
  entity: string;
  personName: string;
  personTitle: string;
}


export interface StatusChange {
  status: CommunicationStatus;
  user: User;
  timestamp: string; // ISO date string
}

export interface Communication {
  id: string;
  radicado: string; // Código consecutivo de enviado
  subject: string; // Asunto general, para el título
  description: string; // Asunto tratado (Breve descripción...)
  senderDetails: CommunicationPartyDetails;
  recipientDetails: CommunicationPartyDetails;
  signerName: string; // Persona que firma el documento
  sentDate: string; // Fecha de documento
  dueDate?: string; // Usado para 'Requiere Respuesta'
  deliveryMethod: DeliveryMethod;
  notes?: string; // Observaciones
  uploader: User;
  assignee?: User | null;
  assignedAt?: string | null;
  attachments: Attachment[];
  status: CommunicationStatus;
  statusHistory: StatusChange[];
  parentId?: string; // opcional
  direction: CommunicationDirection;
  requiresResponse: boolean;
  responseDueDate?: string | null;
}


// MINUTES (ACTAS)
export enum CommitmentStatus {
  PENDING = 'Pendiente',
  COMPLETED = 'Completado',
}

export interface Commitment {
  id: string;
  description: string;
  responsible: User;
  dueDate: string; // ISO date string
  status: CommitmentStatus;
}

export enum ActaStatus {
  SIGNED = 'Firmada',
  DRAFT = 'En Borrador',
  FOR_SIGNATURES = 'Para Firmas',
  CLOSED = 'Cerrada',
}

export enum ActaArea {
  COMITE_OBRA = 'Comité de Obra',
  HSE = 'Comité HSE',
  AMBIENTAL = 'Comité Ambiental',
  SOCIAL = 'Comité Social',
  JURIDICO = 'Comité Jurídico',
  TECNICO = 'Comité Técnico',
  OTHER = 'Otro',
}

export interface Acta {
  id: string;
  number: string;
  title: string;
  date: string; // ISO date string
  area: ActaArea;
  status: ActaStatus;
  summary: string;
  commitments: Commitment[];
  attachments: Attachment[];
  requiredSignatories: User[];
  signatures: Signature[];
}


// COSTS (COSTOS)
export enum CostActaStatus {
  PAID = 'Pagada',
  IN_PAYMENT = 'En Trámite de Pago',
  OBSERVED = 'Observada',
  IN_REVIEW = 'En Revisión',
  APPROVED = 'Aprobada',
  SUBMITTED = 'Radicada',
}

export interface Observation {
  id: string;
  text: string;
  author: User;
  timestamp: string; // ISO date string
}

export interface CostActa {
  id: string;
  number: string;
  period: string;
  submissionDate: string; // ISO date string
  approvalDate: string | null;
  paymentDueDate: string | null;
  billedAmount: number;
  totalContractValue: number;
  status: CostActaStatus;
  observations: Observation[];
  relatedProgress: string;
  attachments: Attachment[];
}

// WORK PROGRESS (AVANCE DE OBRA)
export interface ContractItem {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  unitPrice: number;
  contractQuantity: number;
}

export interface WorkActaItem {
  contractItemId: string; // Links to ContractItem
  quantity: number; // Quantity for the current period
}

export enum WorkActaStatus {
  APPROVED = 'Aprobada',
  IN_REVIEW = 'En Revisión',
  DRAFT = 'En Borrador',
  REJECTED = 'Rechazada',
}

export interface WorkActa {
  id: string;
  number: string;
  period: string;
  date: string; // ISO date string
  status: WorkActaStatus;
  items: WorkActaItem[];
  attachments: Attachment[];
}

export enum ModificationType {
  ADDITION = "Adición en Valor",
  TIME_EXTENSION = "Prórroga en Tiempo",
  SUSPENSION = "Suspensión",
  REINSTATEMENT = "Reinicio",
  OTHER = "Otro",
}

export interface ContractModification {
    id: string;
    number: string; // e.g., "Otrosí No. 1"
    type: ModificationType;
    date: string; // ISO date string
    value?: number; // Positive for additions, 0 for others
    days?: number; // For time extensions
    justification: string;
    attachment?: Attachment;
}


// PHOTOGRAPHIC PROGRESS (AVANCE FOTOGRÁFICO)
export interface PhotoEntry {
  id: string;
  url: string;
  date: string; // ISO date string
  notes?: string;
  author: User;
}

export interface ControlPoint {
  id: string;
  name: string;
  description: string;
  location: string;
  photos: PhotoEntry[];
}

// PLANNING (CRONOGRAMA)
export interface ProjectTask {
  id: string;
  name: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  progress: number; // 0 to 100
  duration: number; // in days
  isSummary: boolean; // Is it a summary task?
  dependencies?: string[]; // Array of task IDs
  outlineLevel: number;
  children: ProjectTask[];
}


// REPORTS (Informes)
export enum ReportStatus {
  DRAFT = 'Borrador',
  SUBMITTED = 'Presentado',
  APPROVED = 'Aprobado',
  OBSERVED = 'Con Observaciones',
}

export enum ReportScope {
  OBRA = 'Obra',
  INTERVENTORIA = 'Interventoría',
}

export interface ReportVersionInfo {
  id: string;
  version: number;
  status: ReportStatus;
  submissionDate: string;
  createdAt?: string;
}

export interface Report {
  id: string;
  type: 'Weekly' | 'Monthly';
  reportScope: ReportScope;
  number: string;
  version: number;
  previousReportId?: string | null;
  period: string; // "Semana del X al Y" or "Mes de Z"
  submissionDate: string; // ISO date string
  status: ReportStatus;
  summary: string;
  attachments: Attachment[];
  author: User;
  requiredSignatories: User[];
  signatures: Signature[];
  versions?: ReportVersionInfo[];
  createdAt?: string;
  updatedAt?: string;
}

// NOTIFICATIONS
export interface Notification {
  id: string;
  type: 'commitment_due' | 'log_entry_assigned' | 'communication_assigned';
  urgency: 'overdue' | 'due_soon' | 'info';
  message: string;
  sourceDescription: string;
  relatedView: 'minutes' | 'logbook' | 'communications';
  relatedItemType: 'acta' | 'logEntry' | 'communication';
  relatedItemId: string;
  createdAt: string;
  isRead: boolean;
}

// WEEKLY REPORT (Informe Semanal de Interventoria)
export interface AvanceContrato {
  trabajoProgramadoSemanal: number;
  valorProgramadoSemanal: number;
  trabajoEjecutadoSemanal: number;
  valorEjecutadoSemanal: number;
  trabajoProgramadoAcumulado: number;
  valorProgramadoAcumulado: number;
  trabajoEjecutadoAcumulado: number;
  valorEjecutadoAcumulado: number;
}

export interface EmpleoPersonal {
  adminContratista: number;
  operativoDiurnoContratista: number;
  operativoNocturnoContratista: number;
  adminInterventoria: number;
  operativoDiurnoInterventoria: number;
  operativoNocturnoInterventoria: number;
}

export interface FrenteResumen {
  id: string;
  nombre: string;
  programado: number;
  ejecutado: number;
  variacion: number;
  actividades: string;
}

export interface MetasFisicas {
  id: string;
  descripcion: string;
  unidad: string;
  totalProyecto: number;
  progSemanal: number;
  progAcumulado: number;
  ejecSemanal: number;
  ejecAcumulado: number;
}


export interface WeeklyReport {
  id: string;
  semana: number;
  del: string; // ISO date
  al: string; // ISO date
  
  empleos: EmpleoPersonal;
  
  avanceTotalContrato: AvanceContrato;
  avancePreliminar: AvanceContrato;
  avanceConstruccion: AvanceContrato;

  resumenCronograma: FrenteResumen[];

  resumenGeneral: string;
  resumenRiesgos: string;
  resumenBIM: string;

  metasFisicas: MetasFisicas[];

  componenteTecnico: string; // Could be more structured later
  correspondencia: string;
  componenteSST: string;
  componenteAmbiental: string;
  componenteSocial: string;

  // Link to photos, not storing blobs
  registroFotograficoIds: string[]; 
}
