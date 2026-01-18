import React, { useState, useMemo, useRef } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/ToastProvider';
import api from '../../src/services/api';

// Hierarchical structure: Troncal → CIV → PKs[]
interface InfrastructureHierarchy {
  [troncal: string]: {
    [civ: string]: string[];  // Array of PK IDs
  };
}

const InfrastructureManager: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<InfrastructureHierarchy>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTroncal, setActiveTroncal] = useState<string | null>(null);
  const [expandedCivs, setExpandedCivs] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        if (lines.length < 3) {
           throw new Error("El archivo CSV no tiene el formato esperado (muy pocas líneas).");
        }

        const headerLine = lines[0].split(';');
        const troncalMap: Record<number, string> = {};
        
        // Map column indices to Troncal names
        for (let i = 0; i < headerLine.length; i += 3) {
           if (headerLine[i] && headerLine[i].trim()) {
              troncalMap[i] = headerLine[i].trim();
           }
        }

        const newHierarchy: InfrastructureHierarchy = {};
        
        // Parse data rows
        for (let i = 2; i < lines.length; i++) {
           const line = lines[i];
           if (!line.trim()) continue;
           
           const columns = line.split(';');
           
           // Iterate through column triplets
           for (let col = 0; col < columns.length; col += 3) {
              const civ = columns[col]?.trim();
              const pk = columns[col + 1]?.trim();
              
              if (civ && pk) {
                 const troncal = troncalMap[col] || "Desconocido";
                 
                 // Initialize hierarchy levels if needed
                 if (!newHierarchy[troncal]) {
                    newHierarchy[troncal] = {};
                 }
                 if (!newHierarchy[troncal][civ]) {
                    newHierarchy[troncal][civ] = [];
                 }
                 
                 // Add PK if not duplicate
                 if (!newHierarchy[troncal][civ].includes(pk)) {
                    newHierarchy[troncal][civ].push(pk);
                 }
              }
           }
        }

        // Count total records
        let totalCount = 0;
        Object.values(newHierarchy).forEach(civs => {
           Object.values(civs).forEach(pks => {
              totalCount += pks.length;
           });
        });

        setHierarchy(newHierarchy);
        setActiveTroncal(Object.keys(newHierarchy)[0] || null);
        showToast({
           variant: 'success',
           title: 'Carga Completada',
           message: `Se han procesado ${totalCount} registros en ${Object.keys(newHierarchy).length} troncales.`
        });

      } catch (error) {
         console.error(error);
         showToast({
            variant: 'error',
            title: 'Error de Lectura',
            message: 'No se pudo procesar el archivo CSV. Verifique el formato.'
         });
      } finally {
         setLoading(false);
         if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Filter hierarchy based on search
  const filteredHierarchy = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return hierarchy;
    
    const filtered: InfrastructureHierarchy = {};
    
    Object.entries(hierarchy).forEach(([troncal, civs]) => {
       if (troncal.toLowerCase().includes(normalizedSearch)) {
          filtered[troncal] = civs;
          return;
       }
       
       const filteredCivs: { [civ: string]: string[] } = {};
       Object.entries(civs).forEach(([civ, pks]) => {
          if (civ.toLowerCase().includes(normalizedSearch)) {
             filteredCivs[civ] = pks;
          } else {
             const matchingPks = pks.filter(pk => pk.toLowerCase().includes(normalizedSearch));
             if (matchingPks.length > 0) {
                filteredCivs[civ] = matchingPks;
             }
          }
       });
       
       if (Object.keys(filteredCivs).length > 0) {
          filtered[troncal] = filteredCivs;
       }
    });
    
    return filtered;
  }, [hierarchy, search]);

  const handleSyncToCatalog = async () => {
    // Count total items
    let totalCount = 0;
    Object.values(hierarchy).forEach(civs => {
       Object.values(civs).forEach(pks => {
          totalCount += pks.length;
       });
    });

    if (!confirm(`¿Estás seguro de sincronizar ${totalCount} registros con el catálogo general? Esto permitirá usarlos en los formularios.`)) return;

    setSyncing(true);
    try {
      // Format items for catalog (same as before)
      const catalogItems: { category: string; name: string }[] = [];
      
      Object.entries(hierarchy).forEach(([troncal, civs]) => {
         Object.entries(civs).forEach(([civ, pks]) => {
            pks.forEach(pk => {
               catalogItems.push({
                  category: 'LOCATION_SEGMENT',
                  name: `${troncal} - CIV ${civ} - PK ${pk}`
               });
            });
         });
      });
      
      // Chunking (batches of 500)
      const BATCH_SIZE = 500;
      const batches = [];
      for (let i = 0; i < catalogItems.length; i += BATCH_SIZE) {
        batches.push(catalogItems.slice(i, i + BATCH_SIZE));
      }

      // Send batches sequentially
      let processed = 0;
      for (const batch of batches) {
        await api.admin.createCatalogItems(batch);
        processed += batch.length;
      }

      showToast({
        variant: 'success',
        title: 'Sincronización Exitosa',
        message: `Se han actualizado ${processed} registros en el catálogo.`
      });

    } catch (error) {
      console.error("Error syncing catalog:", error);
      showToast({
        variant: 'error',
        title: 'Error de Sincronización',
        message: 'Hubo un fallo al sincronizar con el servidor.'
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleCiv = (civ: string) => {
     const newExpanded = new Set(expandedCivs);
     if (newExpanded.has(civ)) {
        newExpanded.delete(civ);
     } else {
        newExpanded.add(civ);
     }
     setExpandedCivs(newExpanded);
  };

  const troncales = Object.keys(filteredHierarchy);
  const hasData = Object.keys(hierarchy).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h3 className="text-lg font-semibold text-gray-900">Infraestructura (CIVs y PKs)</h3>
            <p className="text-sm text-gray-500">
               Gestiona el inventario de infraestructura vial del proyecto.
            </p>
            {hasData && (
               <p className="text-xs text-gray-400 mt-1">
                  {Object.keys(hierarchy).length} troncales, {
                     Object.values(hierarchy).reduce((acc, civs) => acc + Object.keys(civs).length, 0)
                  } CIVs
               </p>
            )}
         </div>
         <div className="flex gap-2">
            <input 
               type="file" 
               accept=".csv"
               ref={fileInputRef}
               className="hidden" 
               onChange={handleFileUpload}
            />
            <Button 
               variant="secondary" 
               onClick={() => fileInputRef.current?.click()}
               size="sm"
               disabled={syncing}
            >
               Importar CSV
            </Button>
            {hasData && (
                <Button 
                   variant="primary" 
                   onClick={handleSyncToCatalog}
                   size="sm"
                   disabled={syncing}
                >
                   {syncing ? "Sincronizando..." : "Sincronizar Catálogo"}
                </Button>
            )}
         </div>
      </div>

      <Card>
         {!hasData ? (
            <div className="p-12 text-center text-gray-500">
               <p className="mb-2">No hay datos cargados.</p>
               <p className="text-sm">Importa el archivo CSV local (<code>docs/PK_ID.csv</code>) para visualizar la información.</p>
            </div>
         ) : (
            <>
               <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4 items-center">
                   <Input 
                      placeholder="Buscar por Troncal, CIV o PK..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      wrapperClassName="max-w-md w-full"
                   />
               </div>

               {/* Tabs for Troncales */}
               <div className="border-b border-gray-200 bg-white">
                  <nav className="-mb-px flex overflow-x-auto" aria-label="Tabs">
                     {troncales.map((troncal) => (
                        <button
                           key={troncal}
                           onClick={() => setActiveTroncal(troncal)}
                           className={`${
                              activeTroncal === troncal
                                 ? 'border-blue-500 text-blue-600'
                                 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                           } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition flex-shrink-0`}
                        >
                           {troncal}
                           <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                              {Object.keys(filteredHierarchy[troncal] || {}).length}
                           </span>
                        </button>
                     ))}
                  </nav>
               </div>

               {/* Accordion for CIVs */}
               {activeTroncal && filteredHierarchy[activeTroncal] && (
                  <div className="divide-y divide-gray-200">
                     {Object.entries(filteredHierarchy[activeTroncal]).map(([civ, pks]) => (
                        <div key={civ} className="bg-white">
                           <button
                              onClick={() => toggleCiv(civ)}
                              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                           >
                              <div className="flex items-center gap-3">
                                 <span className={`transform transition-transform ${expandedCivs.has(civ) ? 'rotate-90' : ''}`}>
                                    ▶
                                 </span>
                                 <span className="font-medium text-gray-900">CIV {civ}</span>
                                 <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    {pks.length} PKs
                                 </span>
                              </div>
                           </button>
                           
                           {expandedCivs.has(civ) && (
                              <div className="px-6 pb-4 bg-gray-50">
                                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-2">
                                    {pks.map((pk) => (
                                       <div
                                          key={pk}
                                          className="bg-white border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-700"
                                       >
                                          {pk}
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               )}
            </>
         )}
      </Card>
    </div>
  );
};

export default InfrastructureManager;
