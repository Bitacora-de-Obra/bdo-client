import React from 'react';
import { SocialTramoData } from '../types';

interface SocialTramoViewerProps {
  tramos: SocialTramoData[];
}

const SocialTramoViewer: React.FC<SocialTramoViewerProps> = ({ tramos }) => {
  if (!tramos || tramos.length === 0) {
    return (
      <div className="p-3 bg-gray-100 rounded-lg text-gray-500 text-sm">
        No hay registros de tramos para esta bitácora social.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-2 bg-purple-100 rounded text-purple-800 text-sm font-medium">
        📍 Se visitaron {tramos.length} tramo(s)
      </div>
      
      {tramos.map((tramo, idx) => (
        <div key={idx} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
          <h5 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
            <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-sm">
              Tramo {idx + 1}
            </span>
            {tramo.tramoName}
          </h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* PQRSD */}
            <div className="bg-white p-3 rounded border">
              <h6 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <span className="bg-blue-100 px-2 py-0.5 rounded text-xs">1</span>
                PQRSD Recibidas
              </h6>
              {tramo.pqrsds.length === 0 ? (
                <span className="text-gray-500">Sin PQRSD</span>
              ) : (
                <ul className="space-y-1">
                  {tramo.pqrsds.map((p, i) => (
                    <li key={i} className="flex justify-between items-center">
                      <span>
                        <span className={`px-1 py-0.5 rounded text-xs ${p.origin === 'CAMPO' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {p.origin}
                        </span>
                        {' '}{p.quantity}x - {p.subject}
                      </span>
                      <span className={`text-xs font-medium ${p.status === 'ABIERTA' ? 'text-yellow-600' : 'text-green-600'}`}>
                        {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Acta Compromiso */}
            <div className="bg-white p-3 rounded border">
              <h6 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <span className="bg-green-100 px-2 py-0.5 rounded text-xs">2</span>
                Acta de Compromiso
              </h6>
              {tramo.actaCompromiso.required ? (
                <div>
                  <span className="text-green-600 font-medium">✅ Sí</span>
                  <div className="mt-1 text-gray-600">
                    No. {tramo.actaCompromiso.actaNumber || 'N/A'} - {tramo.actaCompromiso.subject || 'Sin asunto'}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">No se requirió</span>
              )}
            </div>
            
            {/* Articulación */}
            <div className="bg-white p-3 rounded border">
              <h6 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <span className="bg-yellow-100 px-2 py-0.5 rounded text-xs">3</span>
                Articulación Interinstitucional
              </h6>
              {tramo.articulacion.performed ? (
                <div>
                  <span className="text-green-600 font-medium">✅ Sí</span>
                  <div className="mt-1 text-gray-600">
                    {tramo.articulacion.entity || 'N/A'} - {tramo.articulacion.subject || 'Sin asunto'}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">No se realizó</span>
              )}
            </div>
            
            {/* Vallas */}
            <div className="bg-white p-3 rounded border">
              <h6 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                <span className="bg-orange-100 px-2 py-0.5 rounded text-xs">4</span>
                Vallas Móviles
              </h6>
              {tramo.vallasMobiles ? (
                <span className="text-green-600 font-medium">✅ Sí, hay presencia</span>
              ) : (
                <span className="text-gray-500">No hay presencia</span>
              )}
            </div>
            
            {/* Volantes */}
            <div className="bg-white p-3 rounded border">
              <h6 className="font-semibold text-pink-800 mb-2 flex items-center gap-2">
                <span className="bg-pink-100 px-2 py-0.5 rounded text-xs">5</span>
                Volantes
              </h6>
              {tramo.volantes.delivered ? (
                <div>
                  <span className="text-green-600 font-medium">✅ Entregados</span>
                  <div className="mt-1 text-gray-600">
                    No. {tramo.volantes.number || 'N/A'} - {tramo.volantes.type || 'N/A'} ({tramo.volantes.quantity || 0})
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">No se entregaron</span>
              )}
            </div>
            
            {/* PSI */}
            <div className="bg-white p-3 rounded border">
              <h6 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                <span className="bg-indigo-100 px-2 py-0.5 rounded text-xs">6</span>
                PSI
              </h6>
              {tramo.psi.installed ? (
                <div>
                  <span className="text-green-600 font-medium">✅ Instalado/Actualizado</span>
                  <div className="mt-1 text-gray-600">
                    {tramo.psi.location && <div>Ubicación: {tramo.psi.location}</div>}
                    {tramo.psi.piece && <div>Pieza: {tramo.psi.piece}</div>}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">No se instaló/actualizó</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SocialTramoViewer;
