import React from "react";
import { EntryStatus, EntryType, User } from "../types";
import Input from "./ui/Input";
import Select from "./ui/Select";
// Fix: Corrected import path for icon
import { MagnifyingGlassIcon } from "./icons/Icon";

interface FilterBarProps {
  filters: {
    searchTerm: string;
    status: string;
    type: string;
    user: string;
    startDate: string;
    endDate: string;
  };
  users: User[];
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, users }) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="relative col-span-1 md:col-span-3 lg:col-span-2">
          <Input
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleInputChange}
            placeholder="Buscar por folio, título..."
            wrapperClassName="w-full"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <Select
          name="status"
          value={filters.status}
          onChange={handleInputChange}
        >
          <option value="all">Todos los estados</option>
          {Object.values(EntryStatus).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <Select name="type" value={filters.type} onChange={handleInputChange}>
          <option value="all">Todos los tipos</option>
          {Object.values(EntryType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Select name="user" value={filters.user} onChange={handleInputChange}>
          <option value="all">Todos los usuarios</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </Select>
        <Input
          name="startDate"
          type="date"
          value={filters.startDate}
          onChange={handleInputChange}
          label="Desde"
        />
        <Input
          name="endDate"
          type="date"
          value={filters.endDate}
          onChange={handleInputChange}
          label="Hasta"
        />
      </div>
    </div>
  );
};

export default FilterBar;
