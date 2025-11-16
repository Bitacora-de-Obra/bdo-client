import React from "react";
import { Attachment } from "../types";
import { DocumentIcon } from "./icons/Icon";
import { useAuth } from "../contexts/AuthContext";

interface AttachmentItemProps {
  attachment: Attachment;
  actions?: React.ReactNode;
  canDownload?: boolean; // Si no se proporciona, se verifica del contexto
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const AttachmentItem: React.FC<AttachmentItemProps> = ({ attachment, actions, canDownload: propCanDownload }) => {
  const { user } = useAuth();
  const canDownload = propCanDownload ?? (user?.canDownload ?? true);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 pl-3 pr-4 text-sm bg-gray-50 rounded-md border">
      <div className="flex items-center flex-1 w-full sm:w-0">
        <DocumentIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
        <span className="flex-1 w-0 ml-2 truncate font-medium">
          {attachment.fileName}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <span className="text-gray-500">{formatBytes(attachment.size)}</span>
        {canDownload ? (
          <a
            href={attachment.downloadUrl || attachment.url}
            download={attachment.fileName}
            className="font-medium text-brand-primary hover:text-brand-secondary"
            rel="noreferrer"
          >
            Descargar
          </a>
        ) : (
          <span className="text-gray-400 text-xs italic">Solo previsualización</span>
        )}
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
};

export default AttachmentItem;
