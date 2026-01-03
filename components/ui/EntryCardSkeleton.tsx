import React from 'react';

const EntryCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar skeleton */}
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            {/* Title skeleton */}
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
            {/* Date skeleton */}
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        
        {/* Status badge skeleton */}
        <div className="h-6 w-20 bg-gray-200 rounded-full flex-shrink-0" />
      </div>

      {/* Description */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        {/* Folio skeleton */}
        <div className="h-4 bg-gray-200 rounded w-24" />
        
        {/* Signature status skeleton */}
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    </div>
  );
};

export default EntryCardSkeleton;
