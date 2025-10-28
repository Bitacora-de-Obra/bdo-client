

import React from 'react';
// Fix: Corrected import path for types
import { CommunicationStatus } from '../types';
import Input from './ui/Input';
import Select from './ui/Select';
// Fix: Corrected import path for icon
import { MagnifyingGlassIcon } from './icons/Icon';

interface CommunicationFilterBarProps {
  filters: {
    searchTerm: string;
    sender: string;
    recipient: string;
    status: string;
    direction: 'all' | 'sent' | 'received';
  };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  userRole: string;
}

const CommunicationFilterBar: React.FC<CommunicationFilterBarProps> = ({ filters, setFilters, userRole }) => {
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative col-span-1 md:col-span-2 lg:col-span-1">
          <Input 
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleInputChange}
            placeholder="Buscar por radicado, asunto..."
            wrapperClassName="w-full"
          />
           <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <Select name="direction" value={filters.direction} onChange={handleInputChange}>
          <option value="all">Todas las comunicaciones</option>
          <option value="received">Recibidas</option>
          <option value="sent">Enviadas</option>
        </Select>
        <Select name="status" value={filters.status} onChange={handleInputChange}>
          <option value="all">Todos los estados</option>
          {Object.values(CommunicationStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
        <Input 
            name="sender"
            value={filters.sender}
            onChange={handleInputChange}
            placeholder="Filtrar por remitente..."
        />
        <Input 
            name="recipient"
            value={filters.recipient}
            onChange={handleInputChange}
            placeholder="Filtrar por destinatario..."
        />
      </div>
    </div>
  );
};

export default CommunicationFilterBar;