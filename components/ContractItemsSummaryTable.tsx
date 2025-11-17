import React, { useState, useMemo, useEffect } from 'react';
import { ContractItem, ContractItemExecution, CorredorVialElement } from '../types';
import Card from './ui/Card';
import { ChevronDownIcon, ChevronUpIcon } from './icons/Icon';

interface ContractItemsSummaryTableProps {
  items: (ContractItem & { executedQuantity: number; balance: number; executionPercentage: number })[];
  isLoading: boolean;
  onUpdateQuantity?: (itemId: string, newQuantity: number, pkId: string) => Promise<void>;
  canEdit?: boolean;
  corredorVialElements?: CorredorVialElement[]; // Elementos del corredor vial para mapear PK_ID a CIV
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

const ContractItemsSummaryTable: React.FC<ContractItemsSummaryTableProps> = ({ 
  items, 
  isLoading, 
  onUpdateQuantity,
  canEdit = false,
  corredorVialElements = []
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPkId, setEditingPkId] = useState<string>('');
  const [editingValue, setEditingValue] = useState<string>('');
  const [savingItemId, setSavingItemId] = useState<string | null>(null); // Item que se está guardando
  const [savedItemId, setSavedItemId] = useState<string | null>(null); // Item que se guardó exitosamente
  const [filterType, setFilterType] = useState<'none' | 'civ' | 'pkid'>('none'); // Tipo de filtro
  const [selectedCivFilter, setSelectedCivFilter] = useState<string>(''); // Filtro por CIV
  const [selectedPkIdFilter, setSelectedPkIdFilter] = useState<string>(''); // Filtro por PK_ID
  const [localItems, setLocalItems] = useState(items); // Estado local para optimistic updates
  const [isExpanded, setIsExpanded] = useState(false); // Estado para expandir/colapsar
  const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda
  const itemsToShowInitially = 10; // Número de items a mostrar inicialmente

  // Sincronizar items locales con los que vienen del padre
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Mapeo de PK_ID a CIV
  const pkIdToCivMap = useMemo(() => {
    const map = new Map<string, string>();
    corredorVialElements.forEach(el => {
      map.set(el.pkId, el.civ);
    });
    return map;
  }, [corredorVialElements]);

  // Obtener CIVs únicos
  const availableCivs = useMemo(() => {
    const civsSet = new Set<string>();
    corredorVialElements.forEach(el => {
      civsSet.add(el.civ);
    });
    return Array.from(civsSet).sort();
  }, [corredorVialElements]);

  // Obtener todos los PK_IDs únicos de los items y del corredor vial
  const allPkIds = useMemo(() => {
    const pkIdsSet = new Set<string>();
    localItems.forEach(item => {
      if (item.executions) {
        item.executions.forEach(exec => {
          pkIdsSet.add(exec.pkId);
        });
      }
    });
    // Agregar también los PK_IDs disponibles del corredor vial
    corredorVialElements.forEach(el => pkIdsSet.add(el.pkId));
    return Array.from(pkIdsSet).sort();
  }, [localItems, corredorVialElements]);
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format(value);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Filtrar items y ejecuciones según el filtro activo
  const filteredItems = useMemo(() => {
    let itemsToFilter = localItems;
    
    // Aplicar filtro por CIV o PK_ID primero
    if (filterType === 'civ' && selectedCivFilter) {
      // Con filtro por CIV, sumar todas las ejecuciones de los PK_IDs que pertenecen a ese CIV
      itemsToFilter = localItems.map(item => {
        const pkIdsForCiv = Array.from(pkIdToCivMap.entries())
          .filter(([_, civ]) => civ === selectedCivFilter)
          .map(([pkId, _]) => pkId);
        
        const filteredExecutions = item.executions?.filter(exec => 
          pkIdsForCiv.includes(exec.pkId)
        ) || [];
        
        const filteredQuantity = filteredExecutions.reduce((sum, exec) => sum + exec.quantity, 0);
        return {
          ...item,
          executedQuantity: filteredQuantity,
          balance: item.contractQuantity - filteredQuantity,
          executionPercentage: item.contractQuantity > 0 
            ? (filteredQuantity / item.contractQuantity) * 100 
            : 0,
        };
      });
    } else if (filterType === 'pkid' && selectedPkIdFilter) {
      // Con filtro por PK_ID, mostrar solo las ejecuciones de ese PK_ID
      itemsToFilter = localItems.map(item => {
        const filteredExecutions = item.executions?.filter(exec => 
          exec.pkId === selectedPkIdFilter
        ) || [];
        
        const filteredQuantity = filteredExecutions.reduce((sum, exec) => sum + exec.quantity, 0);
        return {
          ...item,
          executedQuantity: filteredQuantity,
          balance: item.contractQuantity - filteredQuantity,
          executionPercentage: item.contractQuantity > 0 
            ? (filteredQuantity / item.contractQuantity) * 100 
            : 0,
        };
      });
    }
    
    // Aplicar búsqueda por término si existe
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      itemsToFilter = itemsToFilter.filter(item => 
        item.itemCode.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }
    
    return itemsToFilter;
  }, [localItems, filterType, selectedCivFilter, selectedPkIdFilter, pkIdToCivMap, searchTerm]);
  
  // Determinar si se puede editar (no se puede editar cuando hay filtro por CIV)
  const canEditItem = canEdit && filterType !== 'civ';
  
  // Items a mostrar según el estado de expansión
  const itemsToDisplay = useMemo(() => {
    if (isExpanded || filteredItems.length <= itemsToShowInitially) {
      return filteredItems;
    }
    return filteredItems.slice(0, itemsToShowInitially);
  }, [filteredItems, isExpanded, itemsToShowInitially]);
  
  const hasMoreItems = filteredItems.length > itemsToShowInitially;

  const handleStartEdit = (itemId: string) => {
    setEditingItemId(itemId);
    // Si hay filtro por PK_ID, usar ese PK_ID, sino el primero disponible
    let defaultPkId = '';
    if (filterType === 'pkid' && selectedPkIdFilter) {
      defaultPkId = selectedPkIdFilter;
    } else {
      defaultPkId = allPkIds.length > 0 ? allPkIds[0] : '';
    }
    setEditingPkId(defaultPkId);
    
    const item = localItems.find(i => i.id === itemId);
    // Si hay filtro por PK_ID, mostrar la cantidad existente de ese PK_ID
    if (filterType === 'pkid' && selectedPkIdFilter && item) {
      const execution = item.executions?.find(exec => exec.pkId === selectedPkIdFilter);
      setEditingValue(execution ? execution.quantity.toString() : '0');
    } else {
      // Siempre mostrar 0 al iniciar edición, el usuario debe ingresar el valor
      setEditingValue('0');
    }
  };
  
  // Manejar cambio de filtro
  const handleCivFilterChange = (civ: string) => {
    setSelectedCivFilter(civ);
    setSelectedPkIdFilter(''); // Limpiar filtro de PK_ID
    setFilterType(civ ? 'civ' : 'none');
    setIsExpanded(false); // Resetear expansión al cambiar filtro
  };
  
  const handlePkIdFilterChange = (pkId: string) => {
    setSelectedPkIdFilter(pkId);
    setSelectedCivFilter(''); // Limpiar filtro de CIV
    setFilterType(pkId ? 'pkid' : 'none');
    setIsExpanded(false); // Resetear expansión al cambiar filtro
  };

  const handleSave = async (itemId: string) => {
    if (!onUpdateQuantity || !editingPkId) return;
    const numValue = parseFloat(editingValue);
    if (isNaN(numValue) || numValue < 0) {
      const originalItem = localItems.find(i => i.id === itemId);
      if (originalItem) {
        setEditingValue(originalItem.executedQuantity.toString());
      }
      setEditingItemId(null);
      setEditingPkId('');
      return;
    }

    // Optimistic update: actualizar la UI inmediatamente
    setLocalItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === itemId) {
          // Actualizar la ejecución local
          const updatedExecutions = item.executions ? [...item.executions] : [];
          const existingExecutionIndex = updatedExecutions.findIndex(exec => exec.pkId === editingPkId);
          
          if (existingExecutionIndex >= 0) {
            updatedExecutions[existingExecutionIndex] = {
              ...updatedExecutions[existingExecutionIndex],
              quantity: numValue,
            };
          } else {
            updatedExecutions.push({
              id: `temp-${Date.now()}`,
              contractItemId: itemId,
              pkId: editingPkId,
              quantity: numValue,
            });
          }

          // Calcular nueva cantidad total
          const newTotalQuantity = updatedExecutions.reduce((sum, exec) => sum + exec.quantity, 0);
          
          return {
            ...item,
            executions: updatedExecutions,
            executedQuantity: newTotalQuantity,
            balance: item.contractQuantity - newTotalQuantity,
            executionPercentage: item.contractQuantity > 0 
              ? (newTotalQuantity / item.contractQuantity) * 100 
              : 0,
          };
        }
        return item;
      });
    });

    setEditingItemId(null);
    setSavingItemId(itemId);
    setSavedItemId(null);

    try {
      await onUpdateQuantity(itemId, numValue, editingPkId);
      setSavedItemId(itemId);
      setEditingPkId('');
      setEditingValue('');
      
      // Ocultar el indicador de éxito después de 2 segundos
      setTimeout(() => {
        setSavedItemId(null);
        setSavingItemId(null);
      }, 2000);
    } catch (error) {
      console.error('Error al guardar:', error);
      // Revertir el optimistic update en caso de error
      setLocalItems(items);
      const originalItem = items.find(i => i.id === itemId);
      if (originalItem) {
        setEditingValue(originalItem.executedQuantity.toString());
      }
      setSavingItemId(null);
      setEditingItemId(itemId); // Volver a modo edición para que el usuario pueda corregir
    }
  };

  const handleCancel = () => {
    setEditingItemId(null);
    setEditingPkId('');
    setEditingValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      handleSave(itemId);
    } else if (e.key === 'Escape') {
      handleCancel();
    }
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
        <p className="text-sm text-gray-500 mt-1">
          {canEdit
            ? "Ingresa las cantidades ejecutadas directamente en la columna 'Cant. Ejecutada'. Al editar, selecciona el PK_ID al que corresponde la cantidad. Los cambios se guardan automáticamente al salir del campo."
            : "Consolidado de todos los ítems del contrato basado en las cantidades ejecutadas."}
        </p>
        
        {/* Búsqueda por item */}
        <div className="mt-4">
          <label htmlFor="itemSearch" className="block text-sm font-medium text-gray-700 mb-2">
            Buscar item:
          </label>
          <div className="relative">
            <input
              id="itemSearch"
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsExpanded(false); // Resetear expansión al buscar
              }}
              placeholder="Buscar por código de item o descripción..."
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setIsExpanded(false);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                title="Limpiar búsqueda"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="mt-1 text-xs text-gray-500">
              {filteredItems.length === 0 
                ? 'No se encontraron items que coincidan con la búsqueda'
                : `Se encontraron ${filteredItems.length} item(s) que coinciden con "${searchTerm}"`}
            </p>
          )}
        </div>
        
        {/* Filtros por CIV y PK_ID */}
        {(availableCivs.length > 0 || allPkIds.length > 0) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableCivs.length > 0 && (
              <div>
                <label htmlFor="civFilter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por CIV (solo visualización):
                </label>
                <select
                  id="civFilter"
                  value={selectedCivFilter}
                  onChange={(e) => handleCivFilterChange(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                >
                  <option value="">Todos (Suma Total)</option>
                  {availableCivs.map(civ => (
                    <option key={civ} value={civ}>
                      CIV: {civ}
                    </option>
                  ))}
                </select>
                {filterType === 'civ' && selectedCivFilter && (
                  <p className="mt-1 text-xs text-gray-500">
                    Mostrando la suma consolidada de todos los PK_IDs del CIV {selectedCivFilter}. La edición está deshabilitada en este modo.
                  </p>
                )}
              </div>
            )}
            {allPkIds.length > 0 && (
              <div>
                <label htmlFor="pkIdFilter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filtrar por PK_ID:
                </label>
                <select
                  id="pkIdFilter"
                  value={selectedPkIdFilter}
                  onChange={(e) => handlePkIdFilterChange(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary sm:text-sm p-2"
                >
                  <option value="">Todos (Suma Total)</option>
                  {allPkIds.map(pkId => (
                    <option key={pkId} value={pkId}>
                      PK_ID: {pkId}
                    </option>
                  ))}
                </select>
                {filterType === 'pkid' && selectedPkIdFilter && (
                  <p className="mt-1 text-xs text-gray-500">
                    Mostrando solo las cantidades del PK_ID {selectedPkIdFilter}. Puedes editar asignando cantidades a este PK_ID.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3">Ítem</th>
              <th scope="col" className="px-4 py-3 min-w-[300px]">Descripción</th>
              <th scope="col" className="px-4 py-3">Unidad</th>
              <th scope="col" className="px-4 py-3 text-right">Valor Unitario</th>
              <th scope="col" className="px-4 py-3 text-right">Cant. Contratada</th>
              <th scope="col" className="px-4 py-3 text-right">
                {filterType === 'civ' && selectedCivFilter 
                  ? `Cant. Ejecutada (CIV: ${selectedCivFilter})` 
                  : filterType === 'pkid' && selectedPkIdFilter
                  ? `Cant. Ejecutada (PK_ID: ${selectedPkIdFilter})`
                  : 'Cant. Ejecutada (Total)'}
              </th>
              <th scope="col" className="px-4 py-3 text-right">Total</th>
              <th scope="col" className="px-4 py-3 text-right">Saldo por Ejecutar</th>
              <th scope="col" className="px-4 py-3 min-w-[150px]">% Avance</th>
            </tr>
          </thead>
          <tbody>
            {itemsToDisplay.map(item => {
              const isEditing = editingItemId === item.id;
              return (
                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-900">{item.itemCode}</td>
                  <td className="px-4 py-4">{item.description}</td>
                  <td className="px-4 py-4 text-center">{item.unit}</td>
                  <td className="px-4 py-4 text-right font-semibold">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-4 py-4 text-right">{formatNumber(item.contractQuantity)}</td>
                  <td className="px-4 py-4 text-right">
                    {canEditItem && onUpdateQuantity ? (
                      <div className="flex items-center gap-2 justify-end">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editingPkId}
                              onChange={(e) => {
                                const newPkId = e.target.value;
                                setEditingPkId(newPkId);
                                // Actualizar el valor mostrado según el PK_ID seleccionado
                                const currentItem = localItems.find(i => i.id === item.id);
                                if (currentItem) {
                                  const execution = currentItem.executions?.find(exec => exec.pkId === newPkId);
                                  setEditingValue(execution ? execution.quantity.toString() : '0');
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                              disabled={savingItemId === item.id}
                            >
                              {allPkIds.map(pkId => (
                                <option key={pkId} value={pkId}>
                                  {pkId}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, item.id)}
                              onBlur={() => {
                                if (isEditing && savingItemId !== item.id) {
                                  handleSave(item.id);
                                }
                              }}
                              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right font-semibold focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                              disabled={savingItemId === item.id}
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartEdit(item.id)}
                              disabled={savingItemId === item.id}
                              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right font-semibold hover:bg-gray-50 focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Click para editar"
                            >
                              {formatNumber(item.executedQuantity)}
                            </button>
                            {savingItemId === item.id && (
                              <div className="flex items-center">
                                <svg className="animate-spin h-4 w-4 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="ml-1 text-xs text-gray-500">Guardando...</span>
                              </div>
                            )}
                            {savedItemId === item.id && (
                              <div className="flex items-center text-green-600">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="ml-1 text-xs">Guardado</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-semibold">
                        {formatNumber(item.executedQuantity)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-gray-900">
                    {formatCurrency(item.executedQuantity * item.unitPrice)}
                  </td>
                  <td className="px-4 py-4 text-right">{formatNumber(item.balance)}</td>
                  <td className="px-4 py-4">
                     <div className="flex items-center gap-2">
                       <ProgressBar percentage={item.executionPercentage} />
                       <span className="text-xs font-semibold w-12 text-right">{item.executionPercentage.toFixed(1)}%</span>
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {hasMoreItems && (
          <div className="p-4 border-t bg-gray-50 flex justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUpIcon className="w-5 h-5" />
                  <span>Mostrar menos ({filteredItems.length - itemsToShowInitially} items ocultos)</span>
                </>
              ) : (
                <>
                  <ChevronDownIcon className="w-5 h-5" />
                  <span>Mostrar más ({filteredItems.length - itemsToShowInitially} items más)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ContractItemsSummaryTable;
