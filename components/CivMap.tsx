import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CorredorVialElement } from '../types';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet with Vite/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface CivMapProps {
  elements: CorredorVialElement[];
  className?: string;
}

// Coordenadas REALES obtenidas de Google Maps
// CIV 10010528 (TV 112 B Bis A e/ CL 63 y 64): Segmento Norte-Sur
// CIV 10004446 (CL 63 e/ Cr 112 y TV 112 B Bis A): Segmento Este-Oeste (Av Mutis)

const CIV_COORDINATES: Record<string, [number, number][]> = {
  // CIV 10010528: TV 112 B Bis A (Vertical - Norte/Sur)
  // Desde Cl 63 hacia Cl 64
  '10010528': [
    [4.70457, -74.13699], // Intersección approx Cl 63 con TV 112b Bis A
    [4.70501, -74.13640]  // Hacia Cl 64 / Kr 112 Bis
  ],
  // CIV 10004446: Calle 63 (Horizontal - Este/Oeste)
  // Desde TV 112B Bis A hacia Cr 112
  '10004446': [
    [4.70457, -74.13699], // Intersección TV 112b Bis A
    [4.70350, -74.13500]  // Hacia el este por Calle 63
  ]
};

const COLORS = [
  '#FF0000', // Rojo
  '#0000FF', // Azul
  '#008000', // Verde
  '#FFA500', // Naranja
  '#800080', // Morado
];

const CivMap: React.FC<CivMapProps> = ({ elements, className = "h-96 w-full" }) => {
  // Center map on the real project location
  const center: [number, number] = [4.7048, -74.1365]; 
  const zoom = 17; // Zoom más cercano para ver mejor los segmentos

  // Agrupar elementos por CIV para dibujar una sola línea por CIV (aunque tengan varios PKs/lados)
  const civsToDraw = useMemo(() => {
    const uniqueCivs = new Set(elements.map(e => e.civ));
    return Array.from(uniqueCivs).map((civId, index) => {
      const elementInfo = elements.find(e => e.civ === civId);
      const coordinates = CIV_COORDINATES[civId];
      
      if (!coordinates) return null;

      return {
        id: civId,
        name: elementInfo?.ubicacion || `CIV ${civId}`,
        coordinates,
        color: COLORS[index % COLORS.length]
      };
    }).filter(Boolean); // Filtrar los que no tienen coordenadas definidas
  }, [elements]);

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-300 ${className}`}>
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {civsToDraw.map((civ) => (
                civ && (
                    <Polyline 
                        key={civ.id} 
                        positions={civ.coordinates} 
                        pathOptions={{ color: civ.color, weight: 6, opacity: 0.7 }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <p className="font-bold">CIV: {civ.id}</p>
                                <p>{civ.name}</p>
                            </div>
                        </Popup>
                    </Polyline>
                )
            ))}
            <Marker position={[4.70457, -74.13699]}>
                <Popup>
                   TV 112b Bis A - Punto de Referencia
                </Popup>
            </Marker>
        </MapContainer>
        <div className="bg-gray-50 p-2 text-xs text-gray-500 border-t">
            * Las líneas representan la ubicación aproximada de los CIVs.
        </div>
    </div>
  );
};

export default CivMap;
