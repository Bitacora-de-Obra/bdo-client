import React, { useState, useRef, useEffect } from "react";
import { ChevronDownIcon, XMarkIcon } from "../icons/Icon";

export interface Option {
  id?: string;
  value: string;
  label?: string;
}

interface CreatableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: (Option | string)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

const CreatableSelect: React.FC<CreatableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "",
  className = "",
  disabled = false,
  required = false,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Normalize options
  const normalizedOptions = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAll(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
    setShowAll(false); // Typing enables filtering
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setShowAll(false);
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setShowAll(true); // Explicit open shows all
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(true);
    setShowAll(true);
  };

  // Filter options
  const filteredOptions = showAll
    ? normalizedOptions
    : normalizedOptions.filter((opt) =>
        opt.value.toLowerCase().includes(value.toLowerCase())
      );

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onClick={() => {
              // Click on input: open and filter? Or show all?
              // Standard: filter based on current text.
              setIsOpen(true);
              setShowAll(false);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          required={required}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 pl-3 pr-10 border ${
            disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-900"
          }`}
        />
        {/* Actions (Clear + Chevron) */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
           {value && !disabled && (
             <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Limpiar"
             >
               <XMarkIcon className="h-4 w-4" />
             </button>
           )}
          <button
            type="button"
            onClick={toggleDropdown}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
            disabled={disabled}
          >
            <ChevronDownIcon className="h-5 w-5" />
          </button>
        </div>

        {isOpen && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredOptions.length === 0 ? (
              <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-500 italic">
                {value ? "Presiona Enter o guarda para crear nuevo" : "Sin opciones"}
              </li>
            ) : (
              filteredOptions.map((opt, index) => (
                <li
                  key={opt.id || index}
                  className={`relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900`}
                  onClick={() => handleOptionClick(opt.value)}
                >
                  <span className={`block truncate ${opt.value === value ? 'font-semibold' : 'font-normal'}`}>
                    {opt.label || opt.value}
                  </span>
                  {opt.value === value && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </li>
              ))
            )}
            {!showAll && filteredOptions.length > 0 && normalizedOptions.length > filteredOptions.length && (
                <li 
                    className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-blue-500 hover:bg-blue-50 text-xs text-center border-t"
                    onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
                >
                    Mostrar todos...
                </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CreatableSelect;
