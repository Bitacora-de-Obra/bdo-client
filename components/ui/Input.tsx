
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  wrapperClassName?: string;
  error?: string;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({ label, id, wrapperClassName, error, helperText, ...props }) => {
  const baseClasses = "block w-full px-3 py-2 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm";
  const stateClasses = error
    ? "border border-red-400 focus:ring-red-200 focus:border-red-400"
    : "border border-gray-300 focus:ring-brand-primary/50 focus:border-brand-primary";

  return (
    <div className={wrapperClassName}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input
        id={id}
        className={`${baseClasses} ${stateClasses}`}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
