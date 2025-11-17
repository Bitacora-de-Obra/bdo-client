import React from 'react';

interface EmptyStateProps {
  icon: React.ReactElement;
  title: string;
  message: string;
  actionButton?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, actionButton }) => {
  return (
    <div className="text-center p-8 sm:p-12 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col items-center">
      <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-brand-primary/5 text-brand-primary">
        {/* Fix: Cast the icon to a more specific type to allow className prop injection with React.cloneElement. */}
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, {
          className: 'h-8 w-8 sm:h-10 sm:w-10',
        })}
      </div>
      <h3 className="mt-5 text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm sm:text-base text-gray-500 max-w-md mx-auto">
        {message}
      </p>
      {actionButton && <div className="mt-6">{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
