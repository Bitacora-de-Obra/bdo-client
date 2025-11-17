import React from 'react';
import { DrawingDiscipline } from '../types';
import Input from './ui/Input';
import Select from './ui/Select';
import { MagnifyingGlassIcon } from './icons/Icon';

interface DrawingFilterBarProps {
  filters: {
    searchTerm: string;
    discipline: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const DrawingFilterBar: React.FC<DrawingFilterBarProps> = ({ filters, setFilters }) => {
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative col-span-1 md:col-span-2">
          <Input 
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleInputChange}
            placeholder="Buscar por código o título del plano..."
            wrapperClassName="w-full"
          />
           <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <Select name="discipline" value={filters.discipline} onChange={handleInputChange}>
          <option value="all">Todas las disciplinas</option>
          {Object.values(DrawingDiscipline).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
      </div>
    </div>
  );
};

export default DrawingFilterBar;
