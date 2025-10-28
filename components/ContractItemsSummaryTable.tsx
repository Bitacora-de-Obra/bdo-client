import React from 'react';
import { ContractItem } from '../types';
import Card from './ui/Card';

interface ContractItemsSummaryTableProps {
  items: (ContractItem & { executedQuantity: number; balance: number; executionPercentage: number })[];
  isLoading: boolean;
}

const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => {
    const safePercentage = Math.max(0, Math.min(100, percentage));
    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
                className="bg-idu-cyan h-2.5 rounded-full" 
                style={{ width: `${safePercentage}%` }}
                title={`${percentage.toFixed(2)}%`}
            ></div>
        </div>
    );
};

const ContractItemsSummaryTable: React.FC<ContractItemsSummaryTableProps> = ({ items, isLoading }) => {
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
  };
  
  if (isLoading) {
    return (
      <Card>
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Resumen de Cantidades de Obra (Contractual vs. Ejecutado)</h3>
        </div>
        <div className="p-6 text-center text-gray-500">Cargando resumen...</div>
      </Card>
    );
  }
  
  return (
    <Card>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Resumen de Cantidades de Obra (Contractual vs. Ejecutado)</h3>
        <p className="text-sm text-gray-500 mt-1">Consolidado de todos los ítems del contrato basado en las actas de avance aprobadas.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3">Ítem</th>
              <th scope="col" className="px-4 py-3 min-w-[300px]">Descripción</th>
              <th scope="col" className="px-4 py-3">Unidad</th>
              <th scope="col" className="px-4 py-3 text-right">Cant. Contratada</th>
              <th scope="col" className="px-4 py-3 text-right">Cant. Ejecutada</th>
              <th scope="col" className="px-4 py-3 text-right">Saldo por Ejecutar</th>
              <th scope="col" className="px-4 py-3 min-w-[150px]">% Avance</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-4 font-medium text-gray-900">{item.itemCode}</td>
                <td className="px-4 py-4">{item.description}</td>
                <td className="px-4 py-4 text-center">{item.unit}</td>
                <td className="px-4 py-4 text-right">{formatNumber(item.contractQuantity)}</td>
                <td className="px-4 py-4 text-right font-semibold">{formatNumber(item.executedQuantity)}</td>
                <td className="px-4 py-4 text-right">{formatNumber(item.balance)}</td>
                <td className="px-4 py-4">
                   <div className="flex items-center gap-2">
                     <ProgressBar percentage={item.executionPercentage} />
                     <span className="text-xs font-semibold w-12 text-right">{item.executionPercentage.toFixed(1)}%</span>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default ContractItemsSummaryTable;