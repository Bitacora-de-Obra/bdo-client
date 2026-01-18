import React, { useState } from 'react';

interface CascadingLocationSelectorProps {
  locationSegmentCatalog: { id: string; name: string }[];
  onAdd: (selectedItem: { id: string; name: string }) => void;
  selectedIds?: string[]; // IDs already selected (to filter out)
  variant?: 'purple' | 'blue'; // Color variant
  label?: string;
}

export const CascadingLocationSelector: React.FC<CascadingLocationSelectorProps> = ({
  locationSegmentCatalog,
  onAdd,
  selectedIds = [],
  variant = 'blue',
  label = "Localización / Tramo"
}) => {
  const [tempSelection, setTempSelection] = useState<{
    troncal: string;
    civ: string;
    pk: string;
  }>({ troncal: '', civ: '', pk: '' });

  const colorClasses = {
    purple: {
      container: 'bg-purple-100 border-purple-200',
      label: 'text-purple-800',
      border: 'border-purple-300',
      button: 'bg-purple-600 hover:bg-purple-700',
      text: 'text-purple-600'
    },
    blue: {
      container: 'bg-blue-50 border-blue-200',
      label: 'text-blue-800',
      border: 'border-blue-300',
      button: 'bg-blue-600 hover:bg-blue-700',
      text: 'text-blue-600'
    }
  };

  const colors = colorClasses[variant];

  // Extract unique troncales
  const troncales = Array.from(
    new Set(
      locationSegmentCatalog
        .map(item => {
          const match = item.name.match(/^([^-]+) - CIV/);
          return match ? match[1].trim() : null;
        })
        .filter(Boolean)
    )
  ).sort();

  // Extract CIVs for selected troncal
  const civs = tempSelection.troncal
    ? Array.from(
        new Set(
          locationSegmentCatalog
            .filter(item => item.name.startsWith(tempSelection.troncal!))
            .map(item => {
              const match = item.name.match(/CIV (\d+)/);
              return match ? match[1] : null;
            })
            .filter(Boolean)
        )
      ).sort()
    : [];

  // Extract PKs for selected troncal + CIV
  const pks =
    tempSelection.troncal && tempSelection.civ
      ? locationSegmentCatalog
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
          .filter(Boolean)
      : [];

  const handleAdd = () => {
    if (!tempSelection.troncal || !tempSelection.civ || !tempSelection.pk) {
      return;
    }

    const fullName = `${tempSelection.troncal} - CIV ${tempSelection.civ} - PK ${tempSelection.pk}`;
    const catalogItem = locationSegmentCatalog.find(c => c.name === fullName);

    if (catalogItem && !selectedIds.includes(catalogItem.id)) {
      onAdd(catalogItem);
      setTempSelection({ troncal: '', civ: '', pk: '' });
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${colors.container}`}>
      <label className={`block text-sm font-semibold ${colors.label} mb-3`}>
        {label}
      </label>

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
            }}
          >
            <option value="">Seleccionar troncal...</option>
            {troncales.map(troncal => (
              <option key={troncal} value={troncal}>
                {troncal}
              </option>
            ))}
          </select>
        </div>

        {/* CIV Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">CIV</label>
          <select
            className={`w-full border ${colors.border} rounded-md p-2 bg-white text-sm`}
            value={tempSelection.civ || ''}
            onChange={(e) => {
              setTempSelection({
                ...tempSelection,
                civ: e.target.value,
                pk: ''
              });
            }}
            disabled={!tempSelection.troncal}
          >
            <option value="">Seleccionar CIV...</option>
            {civs.map(civ => (
              <option key={civ} value={civ}>
                CIV {civ}
              </option>
            ))}
          </select>
        </div>

        {/* PK Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">PK</label>
          <select
            className={`w-full border ${colors.border} rounded-md p-2 bg-white text-sm`}
            value={tempSelection.pk || ''}
            onChange={(e) => {
              setTempSelection({
                ...tempSelection,
                pk: e.target.value
              });
            }}
            disabled={!tempSelection.civ}
          >
            <option value="">Seleccionar PK...</option>
            {pks.map(item => (
              <option key={item!.id} value={item!.pk}>
                PK {item!.pk}
              </option>
            ))}
          </select>
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
