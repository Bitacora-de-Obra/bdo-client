import React from 'react';
import { Attachment } from '../types';
import AttachmentItem from './AttachmentItem';

interface AttachmentSectionsProps {
  attachments: Attachment[];
  canDownload: boolean;
  formatBytes: (bytes: number) => string;
}

const AttachmentSections: React.FC<AttachmentSectionsProps> = ({
  attachments,
  canDownload,
  formatBytes
}) => {
  // Detect signed PDF from attachments - find the most recent one by timestamp
  const signedPdfCandidates = attachments.filter(att => 
    att.type?.toLowerCase().includes('pdf') && att.fileName?.toLowerCase().includes('firmado')
  );
  
  // Sort by timestamp in filename (format: -TIMESTAMP.pdf) and get the most recent
  const signedPdf = signedPdfCandidates.length > 0 
    ? signedPdfCandidates.sort((a, b) => {
        const timestampA = parseInt(a.fileName?.match(/-([0-9]+)\.pdf$/)?.[1] || '0');
        const timestampB = parseInt(b.fileName?.match(/-([0-9]+)\.pdf$/)?.[1] || '0');
        return timestampB - timestampA;
      })[0]
    : null;
  
  // Classify other attachments by type (excluding signed PDF)
  const photoAttachments = attachments.filter(att => att.type?.startsWith("image/"));
  const pdfAttachments = attachments.filter(att => att.type?.toLowerCase().includes("pdf"));
  const otherAttachments = attachments.filter(att => 
    !att.type?.startsWith("image/") && !att.type?.toLowerCase().includes("pdf")
  );
  
  const hasAnyAttachments = photoAttachments.length > 0 || pdfAttachments.length > 0 || otherAttachments.length > 0;
  
  if (!hasAnyAttachments && !signedPdf) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Signed PDF - Highlighted Section */}
      {signedPdf && (
        <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <h4 className="text-md font-semibold text-green-800 mb-2 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Documento Firmado Final
          </h4>
          <AttachmentItem attachment={signedPdf} />
        </div>
      )}
      
      {/* Photos Section */}
      {photoAttachments.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Fotos del día ({photoAttachments.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photoAttachments.map((att) => (
              <div key={att.id} className="p-2 border rounded-lg bg-gray-50">
                <a
                  href={att.url || att.downloadUrl || att.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={att.url || att.previewUrl}
                    alt={att.fileName}
                    className="w-full h-48 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      console.error('Error cargando imagen:', att.fileName, att.url);
                      if (att.previewUrl && att.previewUrl !== att.url) {
                        (e.target as HTMLImageElement).src = att.previewUrl;
                      } else if (att.downloadUrl && att.downloadUrl !== att.url) {
                        (e.target as HTMLImageElement).src = att.downloadUrl;
                      }
                    }}
                  />
                </a>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <p className="font-medium text-gray-700 truncate flex-1" title={att.fileName}>
                    {att.fileName}
                  </p>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-gray-500 text-xs">
                      {formatBytes(att.size)}
                    </span>
                    {canDownload && (
                      <a
                        href={att.url}
                        download={att.fileName}
                        className="text-brand-primary hover:text-brand-secondary text-xs font-medium"
                      >
                        Descargar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* PDF Documents Section */}
      {pdfAttachments.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Documentos Generados ({pdfAttachments.length})
          </h4>
          <div className="space-y-2">
            {pdfAttachments.map((att) => (
              <AttachmentItem key={att.id} attachment={att} />
            ))}
          </div>
        </div>
      )}
      
      {/* Other Attachments Section */}
      {otherAttachments.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Otros Archivos ({otherAttachments.length})
          </h4>
          <div className="space-y-2">
            {otherAttachments.map((att) => (
              <AttachmentItem key={att.id} attachment={att} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentSections;
