import React, { useState } from 'react';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';

interface LoginInputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: LucideIcon;
  error?: string;
  required?: boolean;
  autoComplete?: string;
}

export const LoginInputField: React.FC<LoginInputFieldProps> = ({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  error,
  required,
  autoComplete,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="mb-5">
      <label 
        htmlFor={id} 
        className={`block text-sm font-medium transition-colors duration-200 mb-1.5 ${isFocused ? 'text-brand-primary' : 'text-slate-600'}`}
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={`h-5 w-5 transition-colors duration-200 ${isFocused ? 'text-brand-primary' : 'text-slate-400'}`} />
          </div>
        )}
        <input
          id={id}
          name={id}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={`
            block w-full rounded-lg border-2 
            ${Icon ? 'pl-10' : 'pl-4'} 
            ${isPassword ? 'pr-10' : 'pr-4'} 
            py-2.5
            text-slate-900 placeholder-slate-400
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-0
            ${error 
              ? 'border-red-300 focus:border-red-500 bg-red-50' 
              : isFocused 
                ? 'border-brand-primary bg-white shadow-[0_0_0_4px_rgba(14,165,233,0.1)]' 
                : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
            }
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default LoginInputField;
