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

// Coordenadas aproximadas basadas en el punto del proyecto (4.705, -74.12)
// CIV 10010528 (TV 112 B Bis A e/ CL 63 y 64): Segmento Norte-Sur aprox.
// CIV 10004446 (CL 63 e/ Cr 112 y TV 112 B Bis A): Segmento Este-Oeste aprox (Av Mutis).

// Definimos geometrías aproximadas
const CIV_COORDINATES: Record<string, [number, number][]> = {
  // CIV 10010528: TV 112 B Bis A (Vertical)
  // Desde Cl 63 (4.705, -74.12) hacia el norte a Cl 64
  '10010528': [
    [4.7050, -74.1200], // Intersección Cl 63
    [4.7065, -74.1205]  // Intersección Cl 64 (Aprox 150m norte ligeramente oeste)
  ],
  // CIV 10004446: Calle 63 (Horizontal)
  // Desde TV 112B Bis A (4.705, -74.12) hacia Cr 112 (Oeste/Este?)
  // Cr 112 suele estar al este o oeste dependiendo de la numeración. En esta zona (Engativá), la carrera aumenta hacia el oeste.
  // Así que Cr 112 estaría al este de Tv 112B Bis A? No, Transversal suele ser diagonal.
  // Asumiremos un segmento horizontal sobre la Av Mutis (Cl 63).
  '10004446': [
    [4.7050, -74.1200], // Intersección Tv 112B Bis A
    [4.7048, -74.1180]  // Intersección Cr 112 (Aprox 200m este)
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
  // Center map on the project anchor
  const center: [number, number] = [4.705, -74.119]; 
  const zoom = 16;

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
            <Marker position={[4.705, -74.12]}>
                <Popup>
                   Punto de Referencia del Proyecto
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
