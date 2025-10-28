import {
  User,
  UserRole,
  Project,
  LogEntry,
  EntryStatus,
  EntryType,
  Comment,
  Attachment,
  Communication,
  CommunicationStatus,
  CommunicationDirection,
  StatusChange,
  Acta,
  ActaStatus,
  Commitment,
  CommitmentStatus,
  ActaArea,
  CostActa,
  CostActaStatus,
  Observation,
  ContractItem,
  WorkActa,
  WorkActaStatus,
  WorkActaItem,
  ControlPoint,
  PhotoEntry,
  ProjectTask,
  ContractModification,
  ProjectDetails,
  KeyPersonnel,
  Report,
  ReportStatus,
  ModificationType,
  ReportScope,
  DeliveryMethod,
  AppSettings,
  AuditLogEntry,
  AppRole,
  Drawing,
  DrawingDiscipline,
  DrawingStatus,
  WeeklyReport,
} from "../../types";

export const MOCK_USERS: User[] = [
  {
    id: "user-1",
    fullName: "Ana García (Residente)",
    projectRole: UserRole.RESIDENT,
    appRole: "editor",
    avatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
    email: "ana.garcia@constructora.com",
    password: "password123",
    status: "active",
    lastLoginAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "user-2",
    fullName: "Carlos Rodriguez (Supervisor)",
    projectRole: UserRole.SUPERVISOR,
    appRole: "editor",
    avatarUrl: "https://randomuser.me/api/portraits/men/68.jpg",
    email: "carlos.rodriguez@supervision.com",
    password: "password123",
    status: "active",
    lastLoginAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: "user-3",
    fullName: "Laura Martinez (Contratista)",
    projectRole: UserRole.CONTRACTOR_REP,
    appRole: "viewer",
    avatarUrl: "https://randomuser.me/api/portraits/women/69.jpg",
    email: "laura.martinez@constructora.com",
    password: "password123",
    status: "active",
    lastLoginAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: "user-4",
    fullName: "Jorge Hernandez (Admin)",
    projectRole: UserRole.ADMIN,
    appRole: "admin",
    avatarUrl: "https://randomuser.me/api/portraits/men/69.jpg",
    email: "jorge.hernandez@idu.gov.co",
    password: "password123",
    status: "active",
    lastLoginAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "user-5",
    fullName: "Victor Viewer",
    projectRole: UserRole.RESIDENT,
    appRole: "viewer",
    avatarUrl: "https://randomuser.me/api/portraits/men/70.jpg",
    email: "victor.viewer@constructora.com",
    password: "password123",
    status: "inactive",
    lastLoginAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
  },
];

export const MOCK_USER = MOCK_USERS[0]; // Ana García

export const MOCK_PROJECT: Project = {
  id: "proj-1",
  name: "Ampliación Av. Ciudad de Cali - Tramo 1",
  contractId: "IDU-LP-SGI-001-2023",
};

// New Mock Data for Admin Panel
export const MOCK_APP_SETTINGS: AppSettings = {
  companyName: "IDU - Bogotá",
  timezone: "America/Bogota",
  locale: "es-ES",
  requireStrongPassword: true,
  enable2FA: false,
  sessionTimeoutMinutes: 60,
  photoIntervalDays: 3,
  defaultProjectVisibility: "private",
};

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    actorEmail: "jorge.hernandez@idu.gov.co",
    action: "USER_UPDATED",
    entityType: "user",
    entityId: "user-3",
    diff: { appRole: { from: "viewer", to: "editor" } },
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    actorEmail: "jorge.hernandez@idu.gov.co",
    action: "APP_SETTING_CHANGED",
    entityType: "setting",
    diff: { sessionTimeoutMinutes: { from: 30, to: 60 } },
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    actorEmail: "jorge.hernandez@idu.gov.co",
    action: "USER_INVITED",
    entityType: "user",
    entityId: "user-5",
  },
];

// New Mock Data for Drawings
const samplePdfUrl =
  "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

export const MOCK_DRAWINGS: Drawing[] = [
  {
    id: "drawing-1",
    code: "EST-001-A",
    title: "Detalles de Cimentación - Pilotes Eje Central",
    discipline: DrawingDiscipline.ESTRUCTURAL,
    status: DrawingStatus.VIGENTE,
    versions: [
      {
        id: "ver-1-2",
        versionNumber: 2,
        fileName: "EST-001-A_RevB.pdf",
        url: samplePdfUrl,
        size: 3456789,
        uploadDate: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        uploader: MOCK_USERS[1],
      },
      {
        id: "ver-1-1",
        versionNumber: 1,
        fileName: "EST-001-A_RevA.pdf",
        url: samplePdfUrl,
        size: 3123456,
        uploadDate: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
        uploader: MOCK_USERS[1],
      },
    ],
    comments: [
      {
        id: "d-comment-1",
        author: MOCK_USERS[1],
        content:
          "Revisión preliminar OK. Favor verificar las cotas de la viga cabezal.",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "d-comment-2",
        author: MOCK_USERS[0],
        content:
          "Recibido. Estamos verificando las cotas y subiremos la revisión B a la brevedad.",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "drawing-2",
    code: "ARQ-102",
    title: "Planta General de Urbanismo y Paisajismo",
    discipline: DrawingDiscipline.ARQUITECTONICO,
    status: DrawingStatus.VIGENTE,
    versions: [
      {
        id: "ver-2-1",
        versionNumber: 1,
        fileName: "ARQ-102_Paisajismo_RevA.pdf",
        url: samplePdfUrl,
        size: 5678901,
        uploadDate: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        uploader: MOCK_USERS[0],
      },
    ],
    comments: [],
  },
  {
    id: "drawing-3",
    code: "PMT-05",
    title: "Plan de Manejo de Tráfico - Fase II",
    discipline: DrawingDiscipline.SEÑALIZACION,
    status: DrawingStatus.VIGENTE,
    versions: [
      {
        id: "ver-3-3",
        versionNumber: 3,
        fileName: "PMT-05_Fase2_RevC.pdf",
        url: samplePdfUrl,
        size: 2345678,
        uploadDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        uploader: MOCK_USERS[2],
      },
      {
        id: "ver-3-2",
        versionNumber: 2,
        fileName: "PMT-05_Fase2_RevB.pdf",
        url: samplePdfUrl,
        size: 2145678,
        uploadDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        uploader: MOCK_USERS[2],
      },
      {
        id: "ver-3-1",
        versionNumber: 1,
        fileName: "PMT-05_Fase2_RevA.pdf",
        url: samplePdfUrl,
        size: 2045678,
        uploadDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        uploader: MOCK_USERS[2],
      },
    ],
    comments: [],
  },
  {
    id: "drawing-4",
    code: "HID-201",
    title: "Red de Alcantarillado Pluvial",
    discipline: DrawingDiscipline.HIDROSANITARIO,
    status: DrawingStatus.OBSOLETO,
    versions: [
      {
        id: "ver-4-1",
        versionNumber: 1,
        fileName: "HID-201_Pluvial_RevA.dwg",
        url: "#",
        size: 4567890,
        uploadDate: new Date(Date.now() - 50 * 24 * 3600 * 1000).toISOString(),
        uploader: MOCK_USERS[0],
      },
    ],
    comments: [],
  },
];

// New Mock Data for Project Details
const MOCK_KEY_PERSONNEL: KeyPersonnel[] = [
  {
    id: "kp-1",
    name: "Laura Martinez",
    role: "Director de Obra",
    company: "Contratista",
    email: "laura.m@constructoracali.com",
    phone: "310-123-4567",
  },
  {
    id: "kp-2",
    name: "Juan Perez",
    role: "Residente de Obra",
    company: "Contratista",
    email: "juan.p@constructoracali.com",
    phone: "311-987-6543",
  },
  {
    id: "kp-3",
    name: "Carlos Rodriguez",
    role: "Director de Interventoría",
    company: "Interventoría",
    email: "carlos.r@supervisionidu.com",
    phone: "320-555-1234",
  },
  {
    id: "kp-4",
    name: "Sofia Gomez",
    role: "Especialista Estructural",
    company: "Interventoría",
    email: "sofia.g@supervisionidu.com",
    phone: "315-444-5678",
  },
];

export const MOCK_PROJECT_DETAILS: ProjectDetails = {
  ...MOCK_PROJECT,
  object:
    "Construcción y adecuación de la segunda calzada de la Avenida Ciudad de Cali, desde la Avenida Circunvalar del Sur hasta la Avenida San Marteen, incluyendo la construcción del puente vehicular sobre el Canal San Francisco y obras de urbanismo y espacio público.",
  contractorName: "CONSORCIO CELESTINO MUTIS IJK",
  supervisorName: "CONSORCIO DQ",
  initialValue: 13331560035,
  startDate: "2025-01-31",
  initialEndDate: "2025-11-30",
  keyPersonnel: MOCK_KEY_PERSONNEL,
  // New fields
  interventoriaContractId: "2428 DE 2024",
  interventoriaInitialValue: 2666312007,
  technicalSupervisorName: "CARLOS ALBERTO LEURO BERNAL",
};

const MOCK_COMMENTS: Comment[] = [
  {
    id: "comment-1",
    author: MOCK_USERS[1],
    content:
      "Recibido, procedemos con la revisión de la documentación adjunta.",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "comment-2",
    author: MOCK_USERS[2],
    content: "Quedamos atentos a sus comentarios para proceder.",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_ATTACHMENTS: Attachment[] = [
  {
    id: "att-1",
    fileName: "Plano_Estructural_RevA.pdf",
    url: "#",
    size: 2097152,
    type: "application/pdf",
  },
  {
    id: "att-2",
    fileName: "Reporte_Fotografico_Semana12.docx",
    url: "#",
    size: 5242880,
    type: "application/msword",
  },
];

export const MOCK_LOG_ENTRIES: LogEntry[] = [
  {
    id: "entry-1",
    folioNumber: 1024,
    title: "Revisión de Acero de Refuerzo en Pilotes",
    description:
      "Se realiza la inspección del acero de refuerzo para los pilotes P-10 a P-15, encontrando conformidad con los planos estructurales. Se adjunta reporte fotográfico.",
    author: MOCK_USERS[0],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    entryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    activityStartDate: new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    activityEndDate: new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    activitiesPerformed:
      "Inspección visual del acero de refuerzo y verificación de recubrimiento con plantilla de referencia.",
    materialsUsed: "Varillas #6 y #8, separadores plásticos de 2'', anillos de amarre.",
    workforce: "Equipo de interventoría (2), cuadrilla de pilotes (6 operarios).",
    weatherConditions: "Cielo parcialmente nublado, sin precipitaciones; temperatura promedio 19°C.",
    scheduleDay: "Día 45 de 120",
    locationDetails: "Tramo K1+200",
    weatherReport: {
      summary: "Cielo parcialmente nublado",
      temperature: "19°C",
    },
    contractorPersonnel: [
      { text: "Residente de obra (1)" },
      { text: "Topógrafo (1)" },
      { text: "Cuadrilla de pilotes (6)" },
    ],
    interventoriaPersonnel: [{ text: "Inspector de interventoría (2)" }],
    equipmentResources: [
      { text: "Grua móvil 30T - Operativa" },
      { text: "Planta de concreto - En espera" },
    ],
    executedActivities: [
      { text: "Inspección de refuerzo en pilotes P-10 a P-15" },
      { text: "Verificación de recubrimiento" },
    ],
    executedQuantities: [{ text: "6 pilotes inspeccionados" }],
    scheduledActivities: [{ text: "Montaje de formaleta de pilotes - Ejecutado según plan" }],
    qualityControls: [{ text: "Revisión visual de ganchos de anclaje" }],
    materialsReceived: [{ text: "2 viajes de acero corrugado" }],
    safetyNotes: [{ text: "Charla de seguridad sobre maniobras con grúa" }],
    projectIssues: [{ text: "Tránsito pesado externo ralentizó ingreso de mixer" }],
    siteVisits: [{ text: "Visita de supervisor interventoría" }],
    contractorObservations: "Requiere soporte adicional para señalización nocturna.",
    interventoriaObservations: "Conformidad con ítem inspeccionado.",
    additionalObservations:
      "Se recomendó reforzar señalización nocturna en área de excavaciones para ingreso de mixer.",
    location: "Eje 3, Abscisa K1+200",
    subject: "Estructuras",
    type: EntryType.QUALITY,
    status: EntryStatus.APPROVED,
    attachments: MOCK_ATTACHMENTS,
    comments: MOCK_COMMENTS,
    assignees: [],
    isConfidential: false,
    history: [],
    requiredSignatories: [MOCK_USERS[0], MOCK_USERS[1]],
    signatures: [
      {
        signer: MOCK_USERS[0],
        signedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        signer: MOCK_USERS[1],
        signedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "entry-2",
    folioNumber: 1025,
    title: "Solicitud de Información Adicional - Diseño de Pavimentos",
    description:
      "Se requiere aclaración sobre el espesor de la sub-base granular especificada en el plano P-102-RevB, ya que presenta inconsistencias con el estudio de suelos.",
    author: MOCK_USERS[2],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    entryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    activityStartDate: new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString(),
    activityEndDate: new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString(),
    activitiesPerformed:
      "Revisión documental del plano P-102-RevB y comparación con memorias de cálculo suministradas.",
    materialsUsed: "N/A",
    workforce: "Coordinador de diseño (1), especialista de pavimentos (1).",
    weatherConditions: "Jornada en oficina, condiciones meteorológicas sin incidencia.",
    scheduleDay: "Día 48 de 120",
    locationDetails: "Oficinas de interventoría",
    weatherReport: null,
    contractorPersonnel: [{ text: "Coordinador de diseño (1)" }],
    interventoriaPersonnel: [{ text: "Especialista de pavimentos (1)" }],
    equipmentResources: [],
    executedActivities: [{ text: "Revisión documental de planos" }],
    executedQuantities: [],
    scheduledActivities: [{ text: "Respuesta a RFI pendiente" }],
    qualityControls: [],
    materialsReceived: [],
    safetyNotes: [],
    projectIssues: [{ text: "Necesaria aclaración de diseño para continuar con vaciado" }],
    siteVisits: [],
    contractorObservations: "Se requiere respuesta pronta para no afectar cronograma.",
    interventoriaObservations: "En revisión por equipo de diseño.",
    additionalObservations:
      "Se solicitó respuesta antes de 48 horas para no afectar cronograma de vaciado base granular.",
    location: "General",
    subject: "Diseño",
    type: EntryType.ADMINISTRATIVE,
    status: EntryStatus.NEEDS_REVIEW,
    attachments: [
      {
        id: "att-3",
        fileName: "RFI-001-Pavimentos.pdf",
        url: "#",
        size: 512000,
        type: "application/pdf",
      },
    ],
    comments: [],
    assignees: [MOCK_USERS[0]],
    isConfidential: false,
    history: [],
    requiredSignatories: [MOCK_USERS[2], MOCK_USERS[1]],
    signatures: [
      {
        signer: MOCK_USERS[2],
        signedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "entry-3",
    folioNumber: 1026,
    title: "Incidente de Seguridad Menor en Zona de Excavación",
    description:
      "Se reporta un incidente menor durante las operaciones de excavación. No hubo lesionados, pero se debe reforzar la señalización en el área. Se adjunta informe preliminar.",
    author: MOCK_USERS[0],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    entryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    activityStartDate: new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000
    ).toISOString(),
    activityEndDate: new Date(
      Date.now() - 1 * 24 * 60 * 60 * 1000
    ).toISOString(),
    activitiesPerformed:
      "Detención controlada de maniobra, aseguramiento del perímetro y elaboración de informe preliminar.",
    materialsUsed: "Barreras plásticas, cinta de demarcación, fichas de reporte de incidentes.",
    workforce: "Supervisor HSE (1), operador de retroexcavadora (1), ayudantes (3).",
    weatherConditions: "Lluvia ligera intermitente durante la mañana; suelo húmedo.",
    scheduleDay: "Día 50 de 120",
    locationDetails: "Zona de Excavación Norte",
    weatherReport: {
      summary: "Lluvia ligera intermitente",
      rainStart: "08:40",
      rainEnd: "09:25",
      temperature: "17°C",
    },
    contractorPersonnel: [
      { text: "Supervisor HSE (1)" },
      { text: "Operador retroexcavadora (1)" },
      { text: "Ayudantes (3)" },
    ],
    interventoriaPersonnel: [{ text: "Inspector interventoría (1)" }],
    equipmentResources: [
      { text: "Retroexcavadora - Operativa" },
      { text: "Bomba de achique - Standby" },
    ],
    executedActivities: [{ text: "Aseguramiento y reporte de incidente" }],
    executedQuantities: [],
    scheduledActivities: [{ text: "Excavación en zanja norte - Reprogramada por seguridad" }],
    qualityControls: [],
    materialsReceived: [],
    safetyNotes: [{ text: "Charla de seguridad sobre ingreso a zanjas" }],
    projectIssues: [{ text: "Incidente por ingreso sin señalización" }],
    siteVisits: [{ text: "Visita de coordinador HSEQ" }],
    contractorObservations: "Refuerzo inmediato de señalización y control de accesos.",
    interventoriaObservations: "Se solicita informe final de causas y acciones tomadas.",
    additionalObservations:
      "Se programó charla de refuerzo sobre ingreso seguro a zanjas para el turno siguiente.",
    location: "Zona de Excavación Norte",
    subject: "HSE",
    type: EntryType.SAFETY,
    status: EntryStatus.SUBMITTED,
    attachments: [],
    comments: [],
    assignees: [MOCK_USERS[1], MOCK_USERS[3]],
    isConfidential: true,
    history: [],
    requiredSignatories: [MOCK_USERS[0], MOCK_USERS[1]],
    signatures: [],
  },
];

const MOCK_STATUS_HISTORY: StatusChange[] = [
  {
    status: CommunicationStatus.PENDIENTE,
    user: MOCK_USERS[0],
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    status: CommunicationStatus.EN_TRAMITE,
    user: MOCK_USERS[1],
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_COMMUNICATIONS: Communication[] = [
  {
    id: "comm-1",
    radicado: "CTR-IDU-001-2024",
    subject: "Entrega de Informe de Avance Mensual - Enero 2024",
    description:
      "Se adjunta el informe de avance correspondiente al mes de enero de 2024 para su revisión y aprobación.",
    senderDetails: {
      entity: "Consorcio Vial de Cali 2023",
      personName: "Laura Martinez",
      personTitle: "Directora de Obra",
    },
    recipientDetails: {
      entity: "Supervisión IDU 2023 SAS",
      personName: "Carlos Rodriguez",
      personTitle: "Director de Interventoría",
    },
    signerName: "Laura Martinez",
    sentDate: new Date("2024-02-05").toISOString(),
    dueDate: new Date("2024-02-12").toISOString(),
    deliveryMethod: DeliveryMethod.SYSTEM,
    direction: CommunicationDirection.SENT,
    requiresResponse: false,
    responseDueDate: null,
    uploader: MOCK_USERS[2],
    assignee: null,
    assignedAt: null,
    attachments: [
      {
        id: "att-comm-1",
        fileName: "Informe_Enero_2024.pdf",
        url: "#",
        size: 3145728,
        type: "application/pdf",
      },
    ],
    status: CommunicationStatus.RESUELTO,
    statusHistory: [
      ...MOCK_STATUS_HISTORY,
      {
        status: CommunicationStatus.RESUELTO,
        user: MOCK_USERS[1],
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "comm-2",
    radicado: "INT-IDU-005-2024",
    subject: "Respuesta a Informe de Avance Mensual - Enero 2024",
    description:
      "Se emiten observaciones al informe de avance de enero 2024. Se solicita corregir los puntos indicados en el documento adjunto.",
    senderDetails: {
      entity: "Supervisión IDU 2023 SAS",
      personName: "Carlos Rodriguez",
      personTitle: "Director de Interventoría",
    },
    recipientDetails: {
      entity: "Consorcio Vial de Cali 2023",
      personName: "Laura Martinez",
      personTitle: "Directora de Obra",
    },
    signerName: "Carlos Rodriguez",
    sentDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryMethod: DeliveryMethod.SYSTEM,
    direction: CommunicationDirection.RECEIVED,
    requiresResponse: true,
    responseDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    uploader: MOCK_USERS[1],
    assignee: MOCK_USERS[0],
    assignedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [
      {
        id: "att-comm-2",
        fileName: "Observaciones_Informe_Enero.pdf",
        url: "#",
        size: 1048576,
        type: "application/pdf",
      },
    ],
    status: CommunicationStatus.EN_TRAMITE,
    statusHistory: MOCK_STATUS_HISTORY,
    parentId: "comm-1",
  },
  {
    id: "comm-3",
    radicado: "CTR-IDU-010-2024",
    subject: "Solicitud de Aprobación de Materiales - Concreto",
    description:
      "Se envían las fichas técnicas y ensayos de laboratorio para el concreto de 4000 PSI a utilizar en las vigas cabezales.",
    senderDetails: {
      entity: "Consorcio Vial de Cali 2023",
      personName: "Ana García",
      personTitle: "Residente de Calidad",
    },
    recipientDetails: {
      entity: "Supervisión IDU 2023 SAS",
      personName: "Sofia Gomez",
      personTitle: "Especialista Estructural",
    },
    signerName: "Ana García",
    sentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryMethod: DeliveryMethod.MAIL,
    notes: "Enviado con copia al Director de Interventoría.",
    direction: CommunicationDirection.RECEIVED,
    requiresResponse: true,
    responseDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    uploader: MOCK_USERS[0],
    assignee: MOCK_USERS[1],
    assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [],
    status: CommunicationStatus.PENDIENTE,
    statusHistory: [
      {
        status: CommunicationStatus.PENDIENTE,
        user: MOCK_USERS[0],
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

const MOCK_COMMITMENTS: Commitment[] = [
  {
    id: "com-1",
    description: "Contratista debe entregar cronograma de obra actualizado.",
    responsible: MOCK_USERS[2],
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: CommitmentStatus.PENDING,
  },
  {
    id: "com-2",
    description:
      "Interventoría debe revisar y aprobar el diseño de mezclas de asfalto.",
    responsible: MOCK_USERS[1],
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: CommitmentStatus.PENDING,
  },
  {
    id: "com-3",
    description:
      "Residente debe coordinar la logística para el cierre vial del fin de semana.",
    responsible: MOCK_USERS[0],
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: CommitmentStatus.PENDING,
  },
  {
    id: "com-4",
    description:
      "Contratista debe presentar el plan de manejo de tráfico para la fase 2.",
    responsible: MOCK_USERS[2],
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: CommitmentStatus.PENDING,
  },
];

export const MOCK_ACTAS: Acta[] = [
  {
    id: "acta-1",
    number: "ACTA-015-2024",
    title: "Comité de Obra Semanal - Semana 12",
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    area: ActaArea.COMITE_OBRA,
    status: ActaStatus.SIGNED,
    summary:
      "Revisión de avance general, definición de próximos frentes de trabajo y discusión de RFI-001-Pavimentos. Se definen compromisos clave para la próxima semana.",
    commitments: MOCK_COMMITMENTS,
    attachments: [
      {
        id: "att-acta-1",
        fileName: "Minuta_Reunion_Sem12.pdf",
        url: "#",
        size: 850000,
        type: "application/pdf",
      },
    ],
    requiredSignatories: [MOCK_USERS[2], MOCK_USERS[1]],
    signatures: [
      {
        signer: MOCK_USERS[2],
        signedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        signer: MOCK_USERS[1],
        signedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "acta-2",
    number: "ACTA-016-2024",
    title: "Comité de Obra Semanal - Semana 13",
    date: new Date().toISOString(),
    area: ActaArea.COMITE_OBRA,
    status: ActaStatus.DRAFT,
    summary:
      "Seguimiento a compromisos de la reunión anterior y planificación de actividades para la semana 14. Se revisa el estado de la solicitud de aprobación de materiales de concreto.",
    commitments: [],
    attachments: [],
    requiredSignatories: [MOCK_USERS[2], MOCK_USERS[1]],
    signatures: [],
  },
  {
    id: "acta-3",
    number: "ACTA-HSE-005-2024",
    title: "Comité Extraordinario de Seguridad",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    area: ActaArea.HSE,
    status: ActaStatus.FOR_SIGNATURES,
    summary:
      "Análisis de causa raíz del incidente menor en zona de excavación. Se acuerdan acciones correctivas y preventivas, las cuales quedan registradas como compromisos.",
    commitments: [
      {
        id: "com-5",
        description:
          "Reforzar señalización em todas as zonas de excavación activas.",
        responsible: MOCK_USERS[0],
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: CommitmentStatus.PENDING,
      },
      {
        id: "com-6",
        description:
          "Realizar charla de 5 minutos sobre riesgos en excavaciones a todo el personal.",
        responsible: MOCK_USERS[2],
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: CommitmentStatus.COMPLETED,
      },
    ],
    attachments: [
      {
        id: "att-acta-2",
        fileName: "Informe_Incidente_HSE.pdf",
        url: "#",
        size: 1200000,
        type: "application/pdf",
      },
    ],
    requiredSignatories: [MOCK_USERS[0], MOCK_USERS[1]],
    signatures: [
      {
        signer: MOCK_USERS[0],
        signedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

// New Mock Data for Cost Actas
export const MOCK_TOTAL_CONTRACT_VALUE = 1500000000; // e.g., 1.5 billion COP

const approvedDate = new Date();
approvedDate.setDate(approvedDate.getDate() - 15);
const paymentDueDate = new Date(approvedDate);
paymentDueDate.setDate(paymentDueDate.getDate() + 30);

export const MOCK_COST_ACTAS: CostActa[] = [
  {
    id: "cost-acta-1",
    number: "Acta Cobro No. 04 – Septiembre 2025",
    period: "Septiembre 2025",
    submissionDate: new Date("2025-10-05").toISOString(),
    approvalDate: new Date("2025-10-15").toISOString(),
    paymentDueDate: new Date("2025-11-14").toISOString(),
    billedAmount: 120000000,
    totalContractValue: MOCK_TOTAL_CONTRACT_VALUE,
    status: CostActaStatus.PAID,
    observations: [],
    relatedProgress:
      "Corresponde al avance físico del 75% al 85% del proyecto.",
    attachments: [
      {
        id: "att-cost-1",
        fileName: "Factura_FV-004-2025.pdf",
        url: "#",
        size: 125829,
        type: "application/pdf",
      },
    ],
  },
  {
    id: "cost-acta-2",
    number: "Acta Cobro No. 05 – Octubre 2025",
    period: "Octubre 2025",
    submissionDate: new Date(
      Date.now() - 20 * 24 * 60 * 60 * 1000
    ).toISOString(),
    approvalDate: approvedDate.toISOString(),
    paymentDueDate: paymentDueDate.toISOString(),
    billedAmount: 135000000,
    totalContractValue: MOCK_TOTAL_CONTRACT_VALUE,
    status: CostActaStatus.IN_PAYMENT,
    observations: [],
    relatedProgress:
      "Corresponde al avance físico del 85% al 92% del proyecto.",
    attachments: [
      {
        id: "att-cost-2",
        fileName: "Factura_Interventoria_05.pdf",
        url: "#",
        size: 125829,
        type: "application/pdf",
      },
      {
        id: "att-cost-3",
        fileName: "Acta_Cobro_Firmada_05.pdf",
        url: "#",
        size: 891234,
        type: "application/pdf",
      },
    ],
  },
  {
    id: "cost-acta-3",
    number: "Acta Cobro No. 06 – Noviembre 2025",
    period: "Noviembre 2025",
    submissionDate: new Date(
      Date.now() - 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    approvalDate: null,
    paymentDueDate: null,
    billedAmount: 110000000,
    totalContractValue: MOCK_TOTAL_CONTRACT_VALUE,
    status: CostActaStatus.OBSERVED,
    observations: [
      {
        id: "obs-1",
        text: "Falta adjuntar el soporte de pago de seguridad social del mes de Noviembre.",
        author: MOCK_USERS[1],
        timestamp: new Date().toISOString(),
      },
    ],
    relatedProgress: "Pendiente de aprobación. Cubre avance hasta el 95%.",
    attachments: [],
  },
  {
    id: "cost-acta-4",
    number: "Acta Cobro No. 07 – Diciembre 2025",
    period: "Diciembre 2025",
    submissionDate: new Date().toISOString(),
    approvalDate: null,
    paymentDueDate: null,
    billedAmount: 150000000,
    totalContractValue: MOCK_TOTAL_CONTRACT_VALUE,
    status: CostActaStatus.IN_REVIEW,
    observations: [],
    relatedProgress: "Avance final y liquidación parcial.",
    attachments: [],
  },
];

// New Mock Data for Work Progress
export const MOCK_MAIN_CONTRACT_VALUE = 6316535314;

export const MOCK_CONTRACT_ITEMS: ContractItem[] = [
  {
    id: "item-1",
    itemCode: "1.008",
    description:
      "BASE GRANULAR CLASE B (BG_B) (Suministro, Extendido, Nivelación, Humedecimiento y Compactación con vibrocompactador)",
    unit: "M3",
    unitPrice: 182059,
    contractQuantity: 1148.62,
  },
  {
    id: "item-2",
    itemCode: "2.001",
    description: "REPLANTEO GENERAL",
    unit: "M2",
    unitPrice: 766,
    contractQuantity: 21133.3,
  },
  {
    id: "item-3",
    itemCode: "2.003",
    description: "EXCAVACIÓN MECÁNICA EN MATERIAL COMÚN (Incluye Cargue)",
    unit: "M3",
    unitPrice: 6093,
    contractQuantity: 5212.41,
  },
  {
    id: "item-4",
    itemCode: "2.004",
    description: "EXCAVACIÓN MANUAL EN MATERIAL COMÚN. Incluye cargue.",
    unit: "M3",
    unitPrice: 35342,
    contractQuantity: 135.59,
  },
  {
    id: "item-5",
    itemCode: "2.005",
    description:
      "TRANSPORTE Y DISPOSICIÓN FINAL DE ESCOMBROS EN SITIO AUTORIZADO",
    unit: "M3",
    unitPrice: 42354,
    contractQuantity: 10234.01,
  },
  {
    id: "item-6",
    itemCode: "2.010",
    description: "TRATAMIENTO SUPERFICIAL DOBLE.",
    unit: "M2",
    unitPrice: 85227,
    contractQuantity: 7367.05,
  },
];

export const MOCK_WORK_ACTAS: WorkActa[] = [
  {
    id: "work-acta-1",
    number: "Acta de Avance de Obra No. 01",
    period: "Enero 2024",
    date: new Date("2024-02-05").toISOString(),
    status: WorkActaStatus.APPROVED,
    items: [
      { contractItemId: "item-2", quantity: 15000 },
      { contractItemId: "item-3", quantity: 3000 },
      { contractItemId: "item-5", quantity: 3000 },
    ],
    attachments: [],
  },
  {
    id: "work-acta-2",
    number: "Acta de Avance de Obra No. 02",
    period: "Febrero 2024",
    date: new Date("2024-03-05").toISOString(),
    status: WorkActaStatus.APPROVED,
    items: [
      { contractItemId: "item-1", quantity: 500 },
      { contractItemId: "item-6", quantity: 4500 },
    ],
    attachments: [],
  },
  {
    id: "work-acta-3",
    number: "Acta de Avance de Obra No. 03",
    period: "Abril 2025",
    date: new Date("2025-05-02").toISOString(),
    status: WorkActaStatus.IN_REVIEW,
    items: [
      { contractItemId: "item-1", quantity: 250.5 },
      { contractItemId: "item-2", quantity: 3000 },
      { contractItemId: "item-4", quantity: 50 },
    ],
    attachments: [],
  },
];

export const MOCK_CONTRACT_MODIFICATIONS: ContractModification[] = [
  {
    id: "mod-1",
    number: "Otrosí No. 1",
    type: ModificationType.ADDITION,
    date: new Date("2024-05-15").toISOString(),
    value: 500000000,
    justification:
      "Adición de 500 millones para cubrir mayores cantidades de obra no previstas en el diseño original.",
    attachment: {
      id: "att-mod-1",
      fileName: "Otrosi_No_1_Firmado.pdf",
      url: "#",
      size: 1234567,
      type: "application/pdf",
    },
  },
  {
    id: "mod-2",
    number: "Modificatorio No. 2",
    type: ModificationType.TIME_EXTENSION,
    date: new Date("2024-07-20").toISOString(),
    days: 30,
    justification:
      "Prórroga de 30 días debido a demoras en la entrega de materiales por parte del proveedor.",
    attachment: {
      id: "att-mod-2",
      fileName: "Prorroga_No_2.pdf",
      url: "#",
      size: 987654,
      type: "application/pdf",
    },
  },
];

// New Mock Data for Photographic Progress
export const MOCK_CONTROL_POINTS: ControlPoint[] = [
  {
    id: "cp-1",
    name: "Pilote P-15 (Eje 3)",
    description:
      "Seguimiento a la excavación, armado de acero y fundida del pilote P-15.",
    location: "Eje 3, Abscisa K1+200",
    photos: [
      {
        id: "photo-1-1",
        url: "https://upload.wikimedia.org/wikipedia/commons/8/82/Construction_in_the_Barta_quarter_in_Szeged%2C_Hungary_-_2021-03-24_-_35.jpg",
        date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Inicio de excavación.",
        author: MOCK_USERS[2],
      },
      {
        id: "photo-1-2",
        url: "https://upload.wikimedia.org/wikipedia/commons/4/44/Construction_in_the_Barta_quarter_in_Szeged%2C_Hungary_-_2021-03-24_-_36.jpg",
        date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Excavación completada al 50%.",
        author: MOCK_USERS[2],
      },
      {
        id: "photo-1-3",
        url: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Construction_in_the_Barta_quarter_in_Szeged%2C_Hungary_-_2021-03-24_-_32.jpg",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        notes: "Acero de refuerzo instalado.",
        author: MOCK_USERS[2],
      },
      {
        id: "photo-1-4",
        url: "https://upload.wikimedia.org/wikipedia/commons/5/52/Construction_in_the_Barta_quarter_in_Szeged%2C_Hungary_-_2021-03-24_-_28.jpg",
        date: new Date().toISOString(),
        notes: "Listo para fundir concreto.",
        author: MOCK_USERS[2],
      },
    ],
  },
  {
    id: "cp-2",
    name: "Pavimentación Tramo K1+200 - K1+300",
    description:
      "Seguimiento al proceso de conformación y pavimentación del tramo vial.",
    location: "Abscisas K1+200 a K1+300",
    photos: [
      {
        id: "photo-2-1",
        url: "https://i.imgur.com/v82F3BT.jpeg",
        date: new Date("2025-09-26T12:25:02.222Z").toISOString(),
        notes: "Excavación y conformación de la subrasante.",
        author: MOCK_USERS[2],
      },
      {
        id: "photo-2-2",
        url: "https://i.imgur.com/3a4JM0D.jpeg",
        date: new Date("2025-09-29T14:28:15.555Z").toISOString(),
        notes: "Extendido y compactación de la base granular.",
        author: MOCK_USERS[2],
      },
      {
        id: "photo-2-3",
        url: "https://i.imgur.com/Nc47T1z.jpeg",
        date: new Date("2025-10-02T11:05:45.000Z").toISOString(),
        notes: "Imprimación y aplicación de la capa de rodadura asfáltica.",
        author: MOCK_USERS[2],
      },
      {
        id: "photo-2-4",
        url: "https://i.imgur.com/I28a1sY.jpeg",
        date: new Date("2025-10-04T14:30:00.000Z").toISOString(),
        notes: "Capa de rodadura finalizada y demarcación vial.",
        author: MOCK_USERS[2],
      },
    ],
  },
];

// New Mock Data for Project Planning
export const MOCK_PROJECT_TASKS: ProjectTask[] = [
  {
    id: "task-1",
    name: "Fase 1: Preliminares y Movimiento de Tierras",
    startDate: "2024-07-01",
    endDate: "2024-08-15",
    progress: 100,
    duration: 46,
    isSummary: true,
    outlineLevel: 1,
    children: [],
  },
  {
    id: "task-2",
    name: "Movilización y campamentos",
    startDate: "2024-07-01",
    endDate: "2024-07-10",
    progress: 100,
    duration: 10,
    isSummary: false,
    outlineLevel: 2,
    children: [],
  },
  {
    id: "task-3",
    name: "Descapote y limpieza",
    startDate: "2024-07-11",
    endDate: "2024-07-20",
    progress: 100,
    duration: 10,
    isSummary: false,
    outlineLevel: 2,
    dependencies: ["task-2"],
    children: [],
  },
  {
    id: "task-4",
    name: "Excavación general",
    startDate: "2024-07-21",
    endDate: "2024-08-15",
    progress: 100,
    duration: 26,
    isSummary: false,
    outlineLevel: 2,
    dependencies: ["task-3"],
    children: [],
  },
  {
    id: "task-5",
    name: "Fase 2: Estructuras y Cimentación",
    startDate: "2024-08-16",
    endDate: "2024-10-30",
    progress: 75,
    duration: 76,
    isSummary: true,
    outlineLevel: 1,
    children: [],
  },
  {
    id: "task-6",
    name: "Construcción de pilotes (Eje 1-5)",
    startDate: "2024-08-16",
    endDate: "2024-09-15",
    progress: 90,
    duration: 31,
    isSummary: false,
    outlineLevel: 2,
    dependencies: ["task-4"],
    children: [],
  },
  {
    id: "task-7",
    name: "Vigas cabezales",
    startDate: "2024-09-16",
    endDate: "2024-10-10",
    progress: 60,
    duration: 25,
    isSummary: false,
    outlineLevel: 2,
    dependencies: ["task-6"],
    children: [],
  },
  {
    id: "task-8",
    name: "Muros de contención",
    startDate: "2024-10-11",
    endDate: "2024-10-30",
    progress: 50,
    duration: 20,
    isSummary: false,
    outlineLevel: 2,
    dependencies: ["task-7"],
    children: [],
  },
  {
    id: "task-9",
    name: "Fase 3: Superestructura y Acabados",
    startDate: "2024-10-31",
    endDate: "2025-01-15",
    progress: 10,
    duration: 77,
    isSummary: true,
    outlineLevel: 1,
    children: [],
  },
  {
    id: "task-10",
    name: "Montaje de vigas prefabricadas",
    startDate: "2024-10-31",
    endDate: "2024-11-20",
    progress: 20,
    duration: 21,
    isSummary: false,
    outlineLevel: 2,
    dependencies: ["task-8"],
    children: [],
  },
  {
    id: "task-11",
    name: "Placa de concreto",
    startDate: "2024-11-21",
    endDate: "2024-12-15",
    progress: 5,
    duration: 25,
    isSummary: false,
    outlineLevel: 2,
    dependencies: ["task-10"],
    children: [],
  },
  {
    id: "task-12",
    name: "Instalación de barandas y señalización",
    startDate: "2024-12-16",
    endDate: "2025-01-15",
    progress: 0,
    duration: 31,
    isSummary: false,
    outlineLevel: 2,
    dependencies: ["task-11"],
    children: [],
  },
];

export const MOCK_REPORTS: Report[] = [
  {
    id: "rep-w-1",
    type: "Weekly",
    reportScope: ReportScope.OBRA,
    number: "Informe Semanal de Obra No. 25",
    version: 1,
    previousReportId: null,
    period: "Semana del 22 al 28 de Julio, 2024",
    submissionDate: new Date("2024-07-29").toISOString(),
    status: ReportStatus.APPROVED,
    summary:
      "Avance significativo en la cimentación de pilotes del Eje 3. Se completó el 100% de la excavación prevista para la semana. Sin incidentes de seguridad reportados.",
    attachments: [
      {
        id: "att-rep-w1",
        fileName: "Informe_Semanal_25.pdf",
        url: "#",
        size: 1572864,
        type: "application/pdf",
      },
    ],
    author: MOCK_USERS[0], // Ana García (Residente)
    requiredSignatories: [MOCK_USERS[0], MOCK_USERS[1]],
    signatures: [
      { signer: MOCK_USERS[0], signedAt: new Date("2024-07-29").toISOString() },
      { signer: MOCK_USERS[1], signedAt: new Date("2024-07-30").toISOString() },
    ],
    versions: [],
    createdAt: new Date("2024-07-29").toISOString(),
    updatedAt: new Date("2024-07-30").toISOString(),
  },
  {
    id: "rep-w-2",
    type: "Weekly",
    reportScope: ReportScope.OBRA,
    number: "Informe Semanal de Obra No. 26",
    version: 1,
    previousReportId: null,
    period: "Semana del 29 de Julio al 04 de Agosto, 2024",
    submissionDate: new Date("2024-08-05").toISOString(),
    status: ReportStatus.SUBMITTED,
    summary:
      "Inicio de armado de acero para vigas cabezales. Se presentaron demoras por lluvias el día martes. Se adjunta registro fotográfico.",
    attachments: [
      {
        id: "att-rep-w2-1",
        fileName: "Informe_Semanal_26.pdf",
        url: "#",
        size: 1887436,
        type: "application/pdf",
      },
      {
        id: "att-rep-w2-2",
        fileName: "Anexo_Fotografico_Sem26.docx",
        url: "#",
        size: 4194304,
        type: "application/msword",
      },
    ],
    author: MOCK_USERS[0],
    requiredSignatories: [MOCK_USERS[0], MOCK_USERS[1]],
    signatures: [
      { signer: MOCK_USERS[0], signedAt: new Date("2024-08-05").toISOString() },
    ],
    versions: [],
    createdAt: new Date("2024-08-05").toISOString(),
    updatedAt: new Date("2024-08-05").toISOString(),
  },
  {
    id: "rep-m-1",
    type: "Monthly",
    reportScope: ReportScope.OBRA,
    number: "Informe Mensual de Avance de Obra No. 07",
    version: 1,
    previousReportId: null,
    period: "Julio 2024",
    submissionDate: new Date("2024-08-07").toISOString(),
    status: ReportStatus.OBSERVED,
    summary:
      "Cierre de actividades de cimentaciones. El avance programado del mes fue del 15% y se ejecutó un 13.8%, debido a demoras por condiciones climáticas. Se solicita revisión de las proyecciones para Agosto.",
    attachments: [
      {
        id: "att-rep-m1",
        fileName: "Informe_Mensual_Julio_2024.pdf",
        url: "#",
        size: 5242880,
        type: "application/pdf",
      },
    ],
    author: MOCK_USERS[2], // Laura Martinez (Contratista)
    requiredSignatories: [MOCK_USERS[2], MOCK_USERS[1]],
    signatures: [],
    versions: [],
    createdAt: new Date("2024-08-07").toISOString(),
    updatedAt: new Date("2024-08-07").toISOString(),
  },
  {
    id: "rep-m-2",
    type: "Monthly",
    reportScope: ReportScope.OBRA,
    number: "Informe Mensual de Avance de Obra No. 06",
    version: 1,
    previousReportId: null,
    period: "Junio 2024",
    submissionDate: new Date("2024-07-05").toISOString(),
    status: ReportStatus.APPROVED,
    summary:
      "Ejecución de actividades de movimiento de tierras y excavaciones profundas según lo programado. Se cumplió con el 100% de las metas del mes.",
    attachments: [],
    author: MOCK_USERS[2],
    requiredSignatories: [MOCK_USERS[2], MOCK_USERS[1]],
    signatures: [
      { signer: MOCK_USERS[2], signedAt: new Date("2024-07-05").toISOString() },
      { signer: MOCK_USERS[1], signedAt: new Date("2024-07-06").toISOString() },
    ],
    versions: [],
    createdAt: new Date("2024-07-05").toISOString(),
    updatedAt: new Date("2024-07-06").toISOString(),
  },
  {
    id: "rep-w-3",
    type: "Weekly",
    reportScope: ReportScope.INTERVENTORIA,
    number: "Informe Semanal de Interventoría No. 25",
    version: 1,
    previousReportId: null,
    period: "Semana del 22 al 28 de Julio, 2024",
    submissionDate: new Date("2024-07-30").toISOString(),
    status: ReportStatus.SUBMITTED,
    summary:
      "Se verifican y aprueban las actividades de cimentación del Eje 3 reportadas por el contratista. Se realizaron 3 ensayos de densidad de campo con resultados satisfactorios.",
    attachments: [],
    author: MOCK_USERS[1], // Carlos Rodriguez (Supervisor)
    requiredSignatories: [MOCK_USERS[1]],
    signatures: [],
    versions: [],
    createdAt: new Date("2024-07-30").toISOString(),
    updatedAt: new Date("2024-07-30").toISOString(),
  },
  {
    id: "rep-m-3",
    type: "Monthly",
    reportScope: ReportScope.INTERVENTORIA,
    number: "Informe Mensual de Interventoría No. 07",
    version: 1,
    previousReportId: null,
    period: "Julio 2024",
    submissionDate: new Date("2024-08-08").toISOString(),
    status: ReportStatus.DRAFT,
    summary:
      "Consolidación de seguimiento técnico, administrativo, y HSE para el mes de Julio. Se emiten observaciones al informe mensual del contratista.",
    attachments: [],
    author: MOCK_USERS[1],
    requiredSignatories: [MOCK_USERS[1]],
    signatures: [],
    versions: [],
    createdAt: new Date("2024-08-08").toISOString(),
    updatedAt: new Date("2024-08-08").toISOString(),
  },
];

export const MOCK_WEEKLY_REPORTS: WeeklyReport[] = [];
