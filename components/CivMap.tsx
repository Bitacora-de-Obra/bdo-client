import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CorredorVialElement } from '../types';
import L from 'leaflet';

interface CivMapProps {
  elements: CorredorVialElement[];
  className?: string;
}

const ARCGIS_BASE_URL =
  'https://services2.arcgis.com/NEwhEo9GGSHXcRXV/arcgis/rest/services/Malla_Vial_Integral_Bogota_D_C/FeatureServer/0/query';

const COLORS = [
  '#2563EB', // Azul
  '#DC2626', // Rojo
  '#16A34A', // Verde
  '#EA580C', // Naranja
  '#9333EA', // Morado
  '#0891B2', // Cyan
  '#CA8A04', // Amarillo oscuro
  '#DB2777', // Rosa
];

interface CivFeature {
  civCode: number;
  label: string;
  tipo: string;
  coordinates: [number, number][][]; // array of lines, each line is array of [lat, lng]
}

// Componente para auto-ajustar el zoom del mapa a los bounds de las features
const FitBounds: React.FC<{ features: CivFeature[] }> = ({ features }) => {
  const map = useMap();

  useEffect(() => {
    if (features.length === 0) return;

    const allPoints: [number, number][] = [];
    features.forEach((f) => {
      f.coordinates.forEach((line) => {
        line.forEach((pt) => allPoints.push(pt));
      });
    });

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [features, map]);

  return null;
};

const CivMap: React.FC<CivMapProps> = ({ elements, className = 'h-96 w-full' }) => {
  const [features, setFeatures] = useState<CivFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingCivs, setMissingCivs] = useState<string[]>([]);

  // Obtener CIVs únicos de los elementos del corredor
  const uniqueCivs = useMemo(() => {
    const set = new Set(elements.map((e) => e.civ));
    return Array.from(set);
  }, [elements]);

  // Mapa de CIV -> info del corredor (para los popups)
  const civInfoMap = useMemo(() => {
    const map = new Map<string, CorredorVialElement>();
    elements.forEach((el) => {
      if (!map.has(el.civ)) map.set(el.civ, el);
    });
    return map;
  }, [elements]);

  // Asignar un color por CIV
  const civColorMap = useMemo(() => {
    const map = new Map<number, string>();
    uniqueCivs.forEach((civ, i) => {
      map.set(Number(civ), COLORS[i % COLORS.length]);
    });
    return map;
  }, [uniqueCivs]);

  const fetchGeometry = useCallback(async () => {
    if (uniqueCivs.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setMissingCivs([]);

    try {
      const civNumbers = uniqueCivs.map((c) => Number(c)).filter((n) => !isNaN(n));
      if (civNumbers.length === 0) {
        setLoading(false);
        return;
      }

      const whereClause = `MVICIV IN (${civNumbers.join(',')})`;
      const params = new URLSearchParams({
        where: whereClause,
        outFields: 'MVICIV,MVINOMBRE,MVIETIQUET,MVITIPO',
        f: 'geojson',
        outSR: '4326',
      });

      const response = await fetch(`${ARCGIS_BASE_URL}?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        setError('No se encontraron geometrías para los CIVs del proyecto.');
        setMissingCivs(uniqueCivs);
        setLoading(false);
        return;
      }

      // Agrupar features por CIV
      const civFeaturesMap = new Map<number, CivFeature>();

      for (const feature of data.features) {
        const civCode = feature.properties.MVICIV;
        const label = feature.properties.MVIETIQUET || '';
        const tipo = feature.properties.MVITIPO || '';
        const geom = feature.geometry;

        // Convertir coordenadas GeoJSON [lng, lat] -> Leaflet [lat, lng]
        let lines: [number, number][][] = [];

        if (geom.type === 'LineString') {
          lines = [geom.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number])];
        } else if (geom.type === 'MultiLineString') {
          lines = geom.coordinates.map((line: number[][]) =>
            line.map((c: number[]) => [c[1], c[0]] as [number, number])
          );
        }

        const existing = civFeaturesMap.get(civCode);
        if (existing) {
          existing.coordinates.push(...lines);
        } else {
          civFeaturesMap.set(civCode, { civCode, label, tipo, coordinates: lines });
        }
      }

      setFeatures(Array.from(civFeaturesMap.values()));

      // Detectar CIVs que no se encontraron en la API
      const foundCivs = new Set(Array.from(civFeaturesMap.keys()).map(String));
      const missing = uniqueCivs.filter((c) => !foundCivs.has(c));
      if (missing.length > 0) {
        setMissingCivs(missing);
      }
    } catch (err) {
      console.error('Error fetching malla vial:', err);
      setError('Error al consultar la malla vial de Bogotá.');
    } finally {
      setLoading(false);
    }
  }, [uniqueCivs]);

  useEffect(() => {
    fetchGeometry();
  }, [fetchGeometry]);

  // Centro por defecto de Bogotá
  const defaultCenter: [number, number] = [4.65, -74.1];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="relative flex-1 rounded-t-lg overflow-hidden border border-gray-300">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
              <span className="text-sm text-gray-500">Cargando malla vial...</span>
            </div>
          </div>
        )}
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds features={features} />
          {features.map((f) =>
            f.coordinates.map((line, lineIdx) => (
              <Polyline
                key={`${f.civCode}-${lineIdx}`}
                positions={line}
                pathOptions={{
                  color: civColorMap.get(f.civCode) || '#2563EB',
                  weight: 6,
                  opacity: 0.8,
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <p className="font-bold text-base">CIV: {f.civCode}</p>
                    {f.label && <p className="text-gray-700">{f.label}</p>}
                    {f.tipo && (
                      <p className="text-gray-500 text-xs mt-1">Tipo: {f.tipo}</p>
                    )}
                    {civInfoMap.has(String(f.civCode)) && (
                      <p className="text-gray-600 mt-1">
                        {civInfoMap.get(String(f.civCode))?.ubicacion}
                      </p>
                    )}
                  </div>
                </Popup>
              </Polyline>
            ))
          )}
        </MapContainer>
      </div>
      {!loading && features.length > 0 && (
        <div className="bg-gray-50 px-3 py-2 border border-t-0 border-gray-300 rounded-b-lg">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {features.map((f) => (
              <div key={f.civCode} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-4 h-1 rounded"
                  style={{ backgroundColor: civColorMap.get(f.civCode) || '#2563EB' }}
                />
                <span className="text-gray-600 font-medium">
                  CIV {f.civCode}
                  {f.label ? ` — ${f.label}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && (
        <div className="bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-t-0 border-amber-200 rounded-b-lg flex items-center gap-1.5">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}
      {!loading && missingCivs.length > 0 && (
        <div className="bg-amber-50 px-3 py-2 text-xs text-amber-700 border border-t-0 border-amber-200 rounded-b-lg flex items-center gap-1.5 mt-0">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
          CIVs no encontrados en la malla vial: {missingCivs.join(', ')}
        </div>
      )}
    </div>
  );
};

export default CivMap;
