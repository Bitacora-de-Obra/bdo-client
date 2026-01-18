import React, { useState, useMemo } from 'react';

interface CascadingLocationSelectorProps {
  locationSegmentCatalog: { id: string; name: string }[];
  onAdd: (selectedItem: { id: string; name: string }) => void;
  selectedIds?: string[]; // IDs already selected (to filter out)
  variant?: 'purple' | 'blue';
  label?: string;
  showSelectAll?: boolean; // New prop to enable "Select All" button
  onSelectAll?: () => void; // Callback when user clicks "Select All"
}

export const CascadingLocationSelector: React.FC<CascadingLocationSelectorProps> = ({
  locationSegmentCatalog,
  onAdd,
  selectedIds = [],
  variant = 'blue',
  label = "Localización / Tramo",
  showSelectAll = false,
  onSelectAll
}) => {
  const [tempSelection, setTempSelection] = useState<{
    troncal: string;
    civ: string;
    pk: string;
  }>({ troncal: '', civ: '', pk: '' });

  // Search states
  const [civSearch, setCivSearch] = useState('');
  const [pkSearch, setPkSearch] = useState('');

  const colorClasses = {
    purple: {
      container: 'bg-purple-100 border-purple-200',
      label: 'text-purple-800',
      border: 'border-purple-300',
      button: 'bg-purple-600 hover:bg-purple-700',
      buttonSecondary: 'bg-purple-500 hover:bg-purple-600',
      text: 'text-purple-600'
    },
    blue: {
      container: 'bg-blue-50 border-blue-200',
      label: 'text-blue-800',
      border: 'border-blue-300',
      button: 'bg-blue-600 hover:bg-blue-700',
      buttonSecondary: 'bg-blue-500 hover:bg-blue-600',
      text: 'text-blue-600'
    }
  };

  const colors = colorClasses[variant];

  // Extract unique troncales
  const troncales = useMemo(() => Array.from(
    new Set(
      locationSegmentCatalog
        .map(item => {
          const match = item.name.match(/^([^-]+) - CIV/);
          return match ? match[1].trim() : null;
        })
        .filter(Boolean) as string[]
    )
  ).sort(), [locationSegmentCatalog]);

  // Extract CIVs for selected troncal (with search filtering)
  const civs = useMemo(() => {
    if (!tempSelection.troncal) return [];
    
    const allCivs = Array.from(
      new Set(
        locationSegmentCatalog
          .filter(item => item.name.startsWith(tempSelection.troncal!))
          .map(item => {
            const match = item.name.match(/CIV (\d+)/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[]
      )
    ).sort();

    // Apply search filter
    if (!civSearch.trim()) return allCivs;
    const searchLower = civSearch.toLowerCase();
    return allCivs.filter(civ => civ.toLowerCase().includes(searchLower));
  }, [tempSelection.troncal, locationSegmentCatalog, civSearch]);

  // Extract PKs for selected troncal + CIV (with search filtering)
  const pks = useMemo(() => {
    if (!tempSelection.troncal || !tempSelection.civ) return [];
    
    const allPks = locationSegmentCatalog
      .filter(
        item =>
          item.name.startsWith(tempSelection.troncal!) &&
          item.name.includes(`CIV ${tempSelection.civ}`) &&
          !selectedIds.includes(item.id)
      )
      .map(item => {
        const match = item.name.match(/PK (\S+)$/);
        return match ? { id: item.id, pk: match[1], name: item.name } : null;
      })
      .filter(Boolean) as { id: string; pk: string; name: string }[];

    // Apply search filter
    if (!pkSearch.trim()) return allPks;
    const searchLower = pkSearch.toLowerCase();
    return allPks.filter(item => item.pk.toLowerCase().includes(searchLower));
  }, [tempSelection.troncal, tempSelection.civ, locationSegmentCatalog, selectedIds, pkSearch]);

  const handleAdd = () => {
    if (!tempSelection.troncal || !tempSelection.civ || !tempSelection.pk) {
      return;
    }

    const fullName = `${tempSelection.troncal} - CIV ${tempSelection.civ} - PK ${tempSelection.pk}`;
    const catalogItem = locationSegmentCatalog.find(c => c.name === fullName);

    if (catalogItem && !selectedIds.includes(catalogItem.id)) {
      onAdd(catalogItem);
      setTempSelection({ troncal: '', civ: '', pk: '' });
      setCivSearch('');
      setPkSearch('');
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${colors.container}`}>
      <div className="flex items-center justify-between mb-3">
        <label className={`block text-sm font-semibold ${colors.label}`}>
          {label}
        </label>
        {showSelectAll && onSelectAll && (
          <button
            type="button"
            onClick={onSelectAll}
            className={`${colors.buttonSecondary} text-white text-xs px-3 py-1 rounded-md transition font-medium`}
          >
            ✓ Todos los tramos
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {/* Troncal Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Troncal</label>
          <select
            className={`w-full border ${colors.border} rounded-md p-2 bg-white text-sm`}
            value={tempSelection.troncal || ''}
            onChange={(e) => {
              setTempSelection({
                troncal: e.target.value,
                civ: '',
                pk: ''
              });
              setCivSearch('');
              setPkSearch('');
            }}
          >
            <option value="">Seleccionar...</option>
            {troncales.map(troncal => (
              <option key={troncal} value={troncal}>
                {troncal}
              </option>
            ))}
          </select>
        </div>

        {/* CIV Selector with Search */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            CIV {tempSelection.troncal && `(${civs.length})`}
          </label>
          <input
            type="text"
            list={`civ-options-${variant}`}
            className={`w-full border ${colors.border} rounded-md p-2 bg-white text-sm`}
            placeholder="Escribir o seleccionar..."
            value={civSearch || tempSelection.civ}
            onChange={(e) => {
              setCivSearch(e.target.value);
              setTempSelection({
                ...tempSelection,
                civ: '',
                pk: ''
              });
              setPkSearch('');
            }}
            onBlur={() => {
              // If search matches exactly one CIV, select it
              if (civs.length === 1) {
                setTempSelection({ ...tempSelection, civ: civs[0], pk: '' });
                setCivSearch('');
              } else if (civs.includes(civSearch)) {
                setTempSelection({ ...tempSelection, civ: civSearch, pk: '' });
                setCivSearch('');
              }
            }}
            disabled={!tempSelection.troncal}
          />
          <datalist id={`civ-options-${variant}`}>
            {civs.map(civ => (
              <option key={civ} value={civ}>
                CIV {civ}
              </option>
            ))}
          </datalist>
        </div>

        {/* PK Selector with Search */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            PK {tempSelection.civ && `(${pks.length})`}
          </label>
          <input
            type="text"
            list={`pk-options-${variant}`}
            className={`w-full border ${colors.border} rounded-md p-2 bg-white text-sm`}
            placeholder="Escribir o seleccionar..."
            value={pkSearch || tempSelection.pk}
            onChange={(e) => {
              setPkSearch(e.target.value);
              setTempSelection({
                ...tempSelection,
                pk: ''
              });
            }}
            onBlur={() => {
              // If search matches exactly one PK, select it
              if (pks.length === 1) {
                setTempSelection({ ...tempSelection, pk: pks[0].pk });
                setPkSearch('');
              } else {
                const match = pks.find(p => p.pk === pkSearch);
                if (match) {
                  setTempSelection({ ...tempSelection, pk: match.pk });
                  setPkSearch('');
                }
              }
            }}
            disabled={!tempSelection.civ}
          />
          <datalist id={`pk-options-${variant}`}>
            {pks.map(item => (
              <option key={item.id} value={item.pk}>
                PK {item.pk}
              </option>
            ))}
          </datalist>
        </div>
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={!tempSelection.troncal || !tempSelection.civ || !tempSelection.pk}
        className={`w-full ${colors.button} text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition`}
      >
        + Agregar Tramo
      </button>
    </div>
  );
};
