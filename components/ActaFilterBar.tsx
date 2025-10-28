import React from 'react';
import { ActaStatus, ActaArea } from '../types';
import Input from './ui/Input';
import Select from './ui/Select';
import { MagnifyingGlassIcon } from './icons/Icon';

interface ActaFilterBarProps {
  filters: {
    searchTerm: string;
    status: string;
    area: string;
    startDate: string;
    endDate: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const ActaFilterBar: React.FC<ActaFilterBarProps> = ({ filters, setFilters }) => {
  
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
            placeholder="Buscar por número, título..."
            wrapperClassName="w-full"
          />
           <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
         <Select name="status" value={filters.status} onChange={handleInputChange}>
          <option value="all">Todos los estados</option>
          {Object.values(ActaStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </Select>
        <Select name="area" value={filters.area} onChange={handleInputChange}>
          <option value="all">Todas las áreas</option>
          {Object.values(ActaArea).map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </Select>
        <Input name="startDate" type="date" value={filters.startDate} onChange={handleInputChange} label="Desde"/>
        <Input name="endDate" type="date" value={filters.endDate} onChange={handleInputChange} label="Hasta"/>
      </div>
    </div>
  );
};

export default ActaFilterBar;
