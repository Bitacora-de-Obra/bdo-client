import React from 'react';
import { HardHat, TrendingUp, Wifi, Building2 } from 'lucide-react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center w-20 h-20 bg-white border-2 border-slate-200 rounded-full shadow-sm mb-4 overflow-hidden">
        {/* Abstract representation of the logo */}
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50" />
        
        {/* Building/Construction Icon to represent Consortium */}
        <Building2 className="relative z-10 w-10 h-10 text-slate-700" strokeWidth={1.5} />
        
        {/* Hard Hat Icon overlay (Yellow) - smaller now as an accent */}
        <HardHat className="absolute z-20 w-6 h-6 text-yellow-500 fill-yellow-100 bottom-4 right-4 translate-x-1 translate-y-1" strokeWidth={1.5} />
        
        {/* Signal/Wifi Icon small */}
        <Wifi className="absolute top-3 right-3 w-3 h-3 text-brand-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center uppercase">
        CONSORCIO SAN MATEO
      </h1>
      <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mt-1">
        Bitácora Digital de Obra
      </p>
    </div>
  );
};