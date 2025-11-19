
import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '../icons/Icon';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  wrapperClassName?: string;
  error?: string;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({ label, id, wrapperClassName, error, helperText, type, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const baseClasses = "block w-full px-3 py-2 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm";
  const stateClasses = error
    ? "border border-red-400 focus:ring-red-200 focus:border-red-400"
    : "border border-gray-300 focus:ring-brand-primary/50 focus:border-brand-primary";

  return (
    <div className={wrapperClassName}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          className={`${baseClasses} ${stateClasses} ${isPassword ? 'pr-10' : ''}`}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
