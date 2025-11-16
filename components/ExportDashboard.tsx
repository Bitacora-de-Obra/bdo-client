

import React, { useState } from 'react';
import { ProjectDetails, LogEntry, Communication, Acta, Report, Attachment } from '../types';
import { useApi } from '../src/hooks/useApi';
import Card from './ui/Card';
import Button from './ui/Button';
import { DocumentArrowDownIcon, CheckCircleIcon } from './icons/Icon';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { API_BASE_URL } from '../src/services/api';

interface ExportDashboardProps {
  project: ProjectDetails;
}

const ExportDashboard: React.FC<ExportDashboardProps> = ({ project }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressMessage, setExportProgressMessage] = useState('');

  const { data: logEntries } = useApi.logEntries();
  const { data: communications } = useApi.communications();
  const { data: actas } = useApi.actas();
  const { data: reports } = useApi.reports();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const sanitizeFilename = (name: string) => {
    return name.replace(/[\/\\?%*:|"<>]/g, '-').substring(0, 100);
  };

  // Helper function to format a Log Entry into a readable text format
  const formatLogEntryAsText = (entry: LogEntry): string => {
    return `
==================================================
BITÁCORA DE OBRA - ANOTACIÓN
==================================================
Folio: #${entry.folioNumber}
Título: ${entry.title}
Estado: ${entry.status}
Tipo: ${entry.type}
Autor: ${entry.author.fullName}
Fecha del Diario: ${new Date(entry.entryDate).toLocaleDateString('es-CO', { dateStyle: 'long' })}
Fecha de Registro: ${new Date(entry.createdAt).toLocaleString('es-CO')}
Confidencial: ${entry.isConfidential ? 'Sí' : 'No'}

--------------------------------------------------
RESUMEN GENERAL
--------------------------------------------------
${entry.description}

--------------------------------------------------
ACTIVIDADES REALIZADAS
--------------------------------------------------
${entry.activitiesPerformed || 'Sin registro.'}

--------------------------------------------------
MATERIALES UTILIZADOS
--------------------------------------------------
${entry.materialsUsed || 'Sin registro.'}

--------------------------------------------------
PERSONAL EN OBRA
--------------------------------------------------
${entry.workforce || 'Sin registro.'}

--------------------------------------------------
CONDICIONES CLIMÁTICAS
--------------------------------------------------
${entry.weatherConditions || 'Sin registro.'}

--------------------------------------------------
OBSERVACIONES ADICIONALES
--------------------------------------------------
${entry.additionalObservations || 'Sin observaciones.'}

--------------------------------------------------
COMENTARIOS (${entry.comments.length})
--------------------------------------------------
${entry.comments.map(c => `[${new Date(c.timestamp).toLocaleString('es-CO')}] ${c.author.fullName}: ${c.content}`).join('\n') || 'Sin comentarios.'}

--------------------------------------------------
ADJUNTOS (${entry.attachments.length})
--------------------------------------------------
${entry.attachments.map(a => `- ${a.fileName} (${(a.size / 1024).toFixed(2)} KB)`).join('\n') || 'Sin adjuntos.'}
    `;
  };
  
  // Helper function to format an Acta into a readable text format
  const formatActaAsText = (acta: Acta): string => {
    return `
==================================================
ACTA DE COMITÉ
==================================================
Número: ${acta.number}
Título: ${acta.title}
Fecha: ${new Date(acta.date).toLocaleDateString('es-CO', { dateStyle: 'full' })}
Área: ${acta.area}
Estado: ${acta.status}

--------------------------------------------------
RESUMEN
--------------------------------------------------
${acta.summary}

--------------------------------------------------
COMPROMISOS (${acta.commitments.length})
--------------------------------------------------
${acta.commitments.map(c => 
`* [${c.status}] ${c.description}
  - Responsable: ${c.responsible.fullName}
  - Vence: ${new Date(c.dueDate).toLocaleDateString('es-CO')}
`).join('\n\n') || 'Sin compromisos.'}

--------------------------------------------------
ADJUNTOS (${acta.attachments.length})
--------------------------------------------------
${acta.attachments.map(a => `- ${a.fileName}`).join('\n') || 'Sin adjuntos.'}
    `;
  };
  
  const resolveAbsoluteUrl = (rawUrl?: string | null) => {
    if (!rawUrl) return null;
    try {
      return new URL(rawUrl).toString();
    } catch {
      try {
        return new URL(rawUrl, `${API_BASE_URL}/`).toString();
      } catch {
        return null;
      }
    }
  };

  const resolveAttachmentUrl = (attachment: Attachment): string | null => {
    const downloadPath = attachment.downloadPath
      ? `${API_BASE_URL}${attachment.downloadPath.startsWith("/") ? "" : "/"}${attachment.downloadPath}`
      : null;

    return (
      resolveAbsoluteUrl(attachment.downloadUrl) ||
      downloadPath ||
      resolveAbsoluteUrl(attachment.url)
    );
  };

  const buildAttachmentErrorBlob = (attachment: Attachment, reason: string) => {
    const message = `No fue posible descargar el adjunto '${attachment.fileName}'.\nMotivo: ${reason}\nID adjunto: ${attachment.id}`;
    return new Blob([message], { type: "text/plain" });
  };

  const fetchAttachmentContent = async (attachment: Attachment) => {
    const resolvedUrl = resolveAttachmentUrl(attachment);
    const safeBaseName = sanitizeFilename(attachment.fileName || `adjunto_${attachment.id}`);

    if (!resolvedUrl) {
      return {
        fileName: `${safeBaseName || "adjunto"}_error.txt`,
        blob: buildAttachmentErrorBlob(attachment, "URL de descarga no disponible."),
      };
    }

    const headers: Record<string, string> = {};
    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(resolvedUrl, {
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      return {
        fileName: safeBaseName,
        blob,
      };
    } catch (error: any) {
      console.error("Error descargando adjunto", attachment, error);
      return {
        fileName: `${safeBaseName || "adjunto"}_error.txt`,
        blob: buildAttachmentErrorBlob(
          attachment,
          error?.message || "Error desconocido durante la descarga."
        ),
      };
    }
  };


  const handleExportProject = async () => {
    setIsExporting(true);
    setExportProgressMessage('Iniciando exportación...');
    await sleep(500);

    const zip = new JSZip();
    const projectFolderName = sanitizeFilename(project.name);
    const projectFolder = zip.folder(projectFolderName);
    
    if (!projectFolder) {
        alert("Error creating project folder in ZIP.");
        setIsExporting(false);
        return;
    }

    // 1. Create Summary File
    setExportProgressMessage('Generando resumen del proyecto...');
    let summaryContent = `RESUMEN DEL PROYECTO\n\n`;
    summaryContent += `Nombre: ${project.name}\n`;
    summaryContent += `Contrato: ${project.contractId}\n`;
    summaryContent += `Objeto: ${project.object}\n`;
    summaryContent += `Contratista: ${project.contractorName}\n`;
    summaryContent += `Interventoría: ${project.supervisorName}\n\n`;
    projectFolder.file('resumen_proyecto.txt', summaryContent);
    await sleep(500);

    // 2. Export Log Entries (PDF + adjuntos originales)
    const bitacoraEntries = logEntries ?? [];
    setExportProgressMessage(`Procesando ${bitacoraEntries.length} anotaciones de bitácora...`);
    const bitacoraFolder = projectFolder.folder('1_Bitacora');
    for (let index = 0; index < bitacoraEntries.length; index += 1) {
        const entry = bitacoraEntries[index];
        const entryFolderName = sanitizeFilename(`Folio_${entry.folioNumber}_${entry.title}`);
        const entryFolder = bitacoraFolder?.folder(entryFolderName);
        // Generar PDF en backend y descargarlo
        try {
          setExportProgressMessage(`Generando PDF de bitácora (${index + 1}/${bitacoraEntries.length})...`);
          const token = localStorage.getItem("accessToken") || "";
          const pdfResp = await fetch(`${API_BASE_URL}/api/log-entries/${entry.id}/export-pdf`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            credentials: "include",
          });
          if (pdfResp.ok) {
            const { attachment } = await pdfResp.json();
            if (attachment) {
              const { fileName, blob } = await fetchAttachmentContent(attachment as Attachment);
              const safePdfName = sanitizeFilename(fileName || `Folio_${entry.folioNumber}.pdf`);
              entryFolder?.file(safePdfName.endsWith(".pdf") ? safePdfName : `${safePdfName}.pdf`, blob);
            }
          } else {
            // Fallback: incluir TXT si no se pudo generar PDF
            const entryText = formatLogEntryAsText(entry);
            entryFolder?.file('detalle_anotacion.txt', entryText);
          }
        } catch {
          const entryText = formatLogEntryAsText(entry);
          entryFolder?.file('detalle_anotacion.txt', entryText);
        }
        
        if (entry.attachments && entry.attachments.length > 0) {
            setExportProgressMessage(`Descargando adjuntos de bitácora (${index + 1}/${bitacoraEntries.length})...`);
            const adjuntosFolder = entryFolder?.folder('adjuntos');
            for (const att of entry.attachments) {
                const { fileName, blob } = await fetchAttachmentContent(att);
                adjuntosFolder?.file(fileName, blob);
            }
        }
    }
    await sleep(1000);

    // 3. Export Actas
    const actasData = actas ?? [];
    setExportProgressMessage(`Procesando ${actasData.length} actas de comité...`);
    const actasFolder = projectFolder.folder('2_Actas_de_Comite');
    for (let index = 0; index < actasData.length; index += 1) {
        const acta = actasData[index];
        const actaText = formatActaAsText(acta);
        const actaFileName = sanitizeFilename(`${acta.number}.txt`);
        actasFolder?.file(actaFileName, actaText);
        
        if (acta.attachments && acta.attachments.length > 0) {
            setExportProgressMessage(`Descargando adjuntos de actas (${index + 1}/${actasData.length})...`);
            const adjuntosFolder = actasFolder?.folder(sanitizeFilename(acta.number) + '_adjuntos');
            for (const att of acta.attachments) {
                 const { fileName, blob } = await fetchAttachmentContent(att);
                 adjuntosFolder?.file(fileName, blob);
            }
        }
    }
    await sleep(1000);
    
    const communicationsData = communications ?? [];
    const communicationsFolder = projectFolder.folder('3_Comunicaciones');
    for (let index = 0; index < communicationsData.length; index += 1) {
      const comm = communicationsData[index];
      const commFolderName = sanitizeFilename(`${comm.radicado}_${comm.subject}`) || `comunicacion_${index + 1}`;
      const commFolder = communicationsFolder?.folder(commFolderName);
      const commFileName = 'detalle_comunicacion.txt';
      const commContent = `Radicado: ${comm.radicado}
Asunto: ${comm.subject}
Estado: ${comm.status}
Remitente: ${comm.senderDetails.entity} - ${comm.senderDetails.personName}
Destinatario: ${comm.recipientDetails.entity} - ${comm.recipientDetails.personName}
Fecha de envío: ${new Date(comm.sentDate).toLocaleDateString('es-CO')}
Dirección: ${comm.direction}
Requiere respuesta: ${comm.requiresResponse ? 'Sí' : 'No'}
Fecha límite de respuesta: ${comm.requiresResponse && comm.responseDueDate ? new Date(comm.responseDueDate).toLocaleDateString('es-CO') : 'N/A'}

Descripción:
${comm.description}
`;
      commFolder?.file(commFileName, commContent);

      if (comm.attachments && comm.attachments.length > 0) {
        setExportProgressMessage(`Descargando adjuntos de comunicaciones (${index + 1}/${communicationsData.length})...`);
        const adjuntosFolder = commFolder?.folder('adjuntos');
        for (const att of comm.attachments) {
          const { fileName, blob } = await fetchAttachmentContent(att);
          adjuntosFolder?.file(fileName, blob);
        }
      }
    }

    const reportsData = reports ?? [];
    const reportsFolder = projectFolder.folder('4_Informes');
    for (let index = 0; index < reportsData.length; index += 1) {
      const report = reportsData[index];
      const reportFolderName = sanitizeFilename(`${report.number}_${report.type}_${report.reportScope}`) || `informe_${index + 1}`;
      const reportFolder = reportsFolder?.folder(reportFolderName);
      const reportFileName = 'detalle_informe.txt';
      const reportContent = `Número: ${report.number}
Tipo: ${report.type}
Ámbito: ${report.reportScope}
Estado: ${report.status}
Autor: ${report.author.fullName}
Periodo: ${report.period}
Fecha de presentación: ${new Date(report.submissionDate).toLocaleDateString('es-CO')}

Resumen:
${report.summary}
`;
      reportFolder?.file(reportFileName, reportContent);

      if (report.attachments && report.attachments.length > 0) {
        setExportProgressMessage(`Descargando adjuntos de informes (${index + 1}/${reportsData.length})...`);
        const adjuntosFolder = reportFolder?.folder('adjuntos');
        for (const att of report.attachments) {
          const { fileName, blob } = await fetchAttachmentContent(att);
          adjuntosFolder?.file(fileName, blob);
        }
      }
    }

    // 4. Generate ZIP and Download
    setExportProgressMessage('Comprimiendo archivos y preparando descarga...');
    await sleep(1500);
    
    zip.generateAsync({ type: 'blob' })
      .then(function(content) {
        saveAs(content, `${projectFolderName}_expediente.zip`);
        setExportProgressMessage('¡Exportación completada!');
        setTimeout(() => setIsExporting(false), 3000); // Reset after a delay
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Exportación Completa del Expediente</h2>
        <p className="text-sm text-gray-500">Descarga todos los datos del proyecto en un único archivo comprimido (.zip).</p>
      </div>
      
      <Card>
        <div className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-shrink-0 bg-idu-blue/10 p-4 rounded-lg">
                    <DocumentArrowDownIcon className="h-10 w-10 text-idu-blue" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">¿Qué se incluye en la exportación?</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Se generará un archivo <strong>.zip</strong> con una estructura de carpetas organizada que contiene:
                    </p>
                    <ul className="mt-3 list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li>Un resumen general del proyecto y contrato.</li>
                        <li>Todas las <strong>anotaciones de la bitácora</strong> en archivos de texto individuales.</li>
                        <li>Todas las <strong>actas de comité</strong> y sus compromisos.</li>
                        <li>El historial de <strong>comunicaciones</strong> oficiales.</li>
                        <li>Los <strong>informes semanales y mensuales</strong>.</li>
                        <li><strong>Todos los archivos adjuntos</strong> asociados a cada elemento, organizados en sus respectivas carpetas.</li>
                    </ul>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t">
                {isExporting ? (
                     <div className="text-center">
                        <div className="flex justify-center items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-md font-semibold text-gray-700">{exportProgressMessage}</p>
                        </div>
                        {exportProgressMessage === '¡Exportación completada!' && (
                             <CheckCircleIcon className="h-8 w-8 text-green-500 mx-auto mt-2" />
                        )}
                    </div>
                ) : (
                    <Button
                        onClick={handleExportProject}
                        className="w-full md:w-auto"
                        size="lg"
                    >
                        Iniciar Exportación y Descargar Expediente
                    </Button>
                )}
            </div>
        </div>
      </Card>
    </div>
  );
};

export default ExportDashboard;
