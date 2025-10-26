
import React from 'react';
// Fix: Corrected import path for types
import { Attachment } from '../types';
// Fix: Corrected import path for icon
import { DocumentIcon } from './icons/Icon';

interface AttachmentItemProps {
  attachment: Attachment;
}

const AttachmentItem: React.FC<AttachmentItemProps> = ({ attachment }) => {
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <li className="flex items-center justify-between py-2 pl-3 pr-4 text-sm bg-gray-50 rounded-md border">
      <div className="flex items-center flex-1 w-0">
        <DocumentIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
        <span className="flex-1 w-0 ml-2 truncate font-medium">{attachment.fileName}</span>
      </div>
      <div className="flex-shrink-0 ml-4">
        <span className="text-gray-500 mr-4">{formatBytes(attachment.size)}</span>
        <a
          href={attachment.downloadUrl || attachment.url}
          download={attachment.fileName}
          className="font-medium text-brand-primary hover:text-brand-secondary"
          rel="noreferrer"
        >
          Descargar
        </a>
      </div>
    </li>
  );
};

export default AttachmentItem;
