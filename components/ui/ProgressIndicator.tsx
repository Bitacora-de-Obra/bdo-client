import React from 'react';

interface ProgressStep {
  message: string;
  percentage: number;
}

interface ProgressIndicatorProps {
  currentStep: number;
  steps: ProgressStep[];
  showPercentage?: boolean;
  showMessage?: boolean;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  steps,
  showPercentage = true,
  showMessage = true,
  className = '',
}) => {
  const current = steps[currentStep] || steps[steps.length - 1];
  const percentage = current?.percentage || 0;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status Text */}
      <div className="flex justify-between items-center text-sm">
        {showMessage && (
          <span className="text-gray-700 font-medium animate-pulse">
            {current?.message || 'Procesando...'}
          </span>
        )}
        {showPercentage && (
          <span className="text-gray-500 font-semibold ml-auto">
            {percentage}%
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;
