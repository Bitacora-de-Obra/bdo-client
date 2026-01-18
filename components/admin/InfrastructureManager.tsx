import React, { useState, useMemo, useRef } from 'react';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/ToastProvider';
import api from '../../src/services/api';

interface InfrastructureItem {
  id: string; // generated unique id
  civ: string;
  pk: string;
  troncal: string;
}

const InfrastructureManager: React.FC = () => {
  const [items, setItems] = useState<InfrastructureItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
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
        
        // Structure analysis based on provided CSV:
        // Line 0: Header with Troncal names (every 3 columns)
        // Line 1: Subheader (CIV;PK_ID;;)
        // Line 2+: Data
        
        if (lines.length < 3) {
           throw new Error("El archivo CSV no tiene el formato esperado (muy pocas líneas).");
        }

        const headerLine = lines[0].split(';');
        // Troncal mappings: index -> Troncal Name
        const troncalMap: Record<number, string> = {};
        
        for (let i = 0; i < headerLine.length; i += 3) {
           if (headerLine[i] && headerLine[i].trim()) {
              troncalMap[i] = headerLine[i].trim();
           }
        }

        const newItems: InfrastructureItem[] = [];
        
        // Start from line 2 (index 2), skipping headers
        for (let i = 2; i < lines.length; i++) {
           const line = lines[i];
           if (!line.trim()) continue;
           
           const columns = line.split(';');
           
           // Iterate through column triplets
           for (let col = 0; col < columns.length; col += 3) {
              const civ = columns[col]?.trim();
              const pk = columns[col + 1]?.trim();
              // const empty = columns[col + 2]
              
              if (civ && pk) {
                 // Determine Troncal for this column group
                 // The Troncal header might be in this column index or a previous one in the merged cell structure
                 // Simple approach: check the exact column index mapping from the first row
                 let troncal = troncalMap[col] || "Desconocido";
                 
                 // Fallback: search backwards for the nearest Troncal header if merged cells aren't perfectly aligned in parsing?
                 // Given the structure "TRONCAL CALLE 6 ;;;TRONCAL AV. AMERICAS...", it seems aligned to start of triplet.
                 
                 newItems.push({
                    id: `${civ}-${pk}-${Math.random().toString(36).substr(2, 9)}`,
                    civ,
                    pk,
                    troncal
                 });
              }
           }
        }

        setItems(newItems);
        showToast({
           variant: 'success',
           title: 'Carga Completada',
           message: `Se han procesado ${newItems.length} registros de infraestructura.`
        });
        setPage(1);

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

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return items;
    
    return items.filter(item => 
       item.civ.toLowerCase().includes(normalizedSearch) ||
       item.pk.toLowerCase().includes(normalizedSearch) ||
       item.troncal.toLowerCase().includes(normalizedSearch)
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
     const start = (page - 1) * ITEMS_PER_PAGE;
     return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, page]);

  // Reset page when search changes
  React.useEffect(() => {
     setPage(1);
  }, [search]);

  const handleSyncToCatalog = async () => {
    if (!confirm(`¿Estás seguro de sincronizar ${items.length} registros con el catálogo general? Esto permitirá usarlos en los formularios.`)) return;

    setSyncing(true);
    try {
      // 1. Format items for catalog
      const catalogItems = items.map(item => ({
        category: 'LOCATION_SEGMENT',
        name: `${item.troncal} - CIV ${item.civ} - PK ${item.pk}`
      }));
      
      // 2. Chunking (batches of 500)
      const BATCH_SIZE = 500;
      const batches = [];
      for (let i = 0; i < catalogItems.length; i += BATCH_SIZE) {
        batches.push(catalogItems.slice(i, i + BATCH_SIZE));
      }

      // 3. Send batches sequentially
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h3 className="text-lg font-semibold text-gray-900">Infraestructura (CIVs y PKs)</h3>
            <p className="text-sm text-gray-500">
               Gestiona el inventario de infraestructura vial del proyecto.
            </p>
            <p className="text-xs text-gray-400 mt-1">
               Total registros: {items.length}
            </p>
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
            {items.length > 0 && (
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
         <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4 items-center">
             <Input 
                placeholder="Buscar por CIV, PK o Troncal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                wrapperClassName="max-w-md w-full"
             />
         </div>
         
         {items.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
               <p className="mb-2">No hay datos cargados.</p>
               <p className="text-sm">Importa el archivo CSV local (<code>docs/PK_ID.csv</code>) para visualizar la información.</p>
            </div>
         ) : (
            <>
               <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-600">
                     <thead className="text-xs uppercase bg-gray-50 text-gray-500">
                        <tr>
                           <th className="px-6 py-3">Troncal</th>
                           <th className="px-6 py-3">CIV</th>
                           <th className="px-6 py-3">PK ID</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {paginatedItems.map((item) => (
                           <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-gray-900">{item.troncal}</td>
                              <td className="px-6 py-3">{item.civ}</td>
                              <td className="px-6 py-3 font-mono">{item.pk}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>

               {filteredItems.length > ITEMS_PER_PAGE && (
                  <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                     <div className="text-sm text-gray-500">
                        Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(page * ITEMS_PER_PAGE, filteredItems.length)} de {filteredItems.length}
                     </div>
                     <div className="flex gap-2">
                        <Button 
                           variant="secondary" 
                           size="sm"
                           onClick={() => setPage(p => Math.max(1, p - 1))}
                           disabled={page === 1}
                        >
                           Anterior
                        </Button>
                        <span className="flex items-center px-4 text-sm font-medium">
                           Página {page} de {totalPages}
                        </span>
                        <Button 
                           variant="secondary" 
                           size="sm"
                           onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                           disabled={page === totalPages}
                        >
                           Siguiente
                        </Button>
                     </div>
                  </div>
               )}
            </>
         )}
      </Card>
    </div>
  );
};

export default InfrastructureManager;
