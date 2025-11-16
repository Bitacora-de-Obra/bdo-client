import React, { useState, useEffect, useMemo } from "react";
import { Project, CostActa, Attachment, CostActaStatus } from "../types";
import api from "../src/services/api";
import Button from "./ui/Button";
import { PlusIcon, DocumentChartBarIcon } from "./icons/Icon";
import EmptyState from "./ui/EmptyState";
import Card from "./ui/Card";
import CostActaStatusBadge from "./CostActaStatusBadge";
import CostActaDetailModal from "./CostActaDetailModal";
import CostActaFormModal from "./CostActaFormModal";
// Importamos el valor del contrato mock, ya que aún no tenemos un endpoint para obtenerlo
import { MOCK_TOTAL_CONTRACT_VALUE } from "../src/services/mockData";
import { useAuth } from "../contexts/AuthContext"; // Importa useAuth si necesitas el usuario

interface CostDashboardProps {
  project: Project; // Mantenemos project por ahora
  // Se elimina la prop 'api'
}

const CostDashboard: React.FC<CostDashboardProps> = ({ project }) => {
  const { user } = useAuth(); // Obtén el usuario si es necesario para observaciones, etc.

  // --- Estado local para datos reales ---
  const [costActas, setCostActas] = useState<CostActa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // ------------------------------------

  const [selectedActa, setSelectedActa] = useState<CostActa | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  useEffect(() => {
    const fetchCostActas = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.costActas.getAll();
        setCostActas(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar las actas de costo.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCostActas();
  }, []);

  const handleOpenDetail = (acta: CostActa) => {
    setSelectedActa(acta);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedActa(null);
  };

  const handleOpenForm = () => {
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
  };

  // --- Implementación de handleSaveActa con subida de archivos ---
  const handleSaveActa = async (
    newActaData: Omit<CostActa, "id" | "observations" | "attachments">,
    files: File[]
  ) => {
    if (!user) return; // Guarda de seguridad
    setIsLoading(true); // Opcional: mostrar un indicador mientras se guarda
    setError(null);

    try {
      const uploadedAttachments: Attachment[] = [];
      if (files.length > 0) {
        const uploadResults = await Promise.all(
          files.map((file) => api.upload.uploadFile(file, "document"))
        );
        uploadedAttachments.push(...uploadResults);
      }

      const createdActa = await api.costActas.create({
        ...newActaData,
        attachments: uploadedAttachments,
      });

      setCostActas((prev) => [createdActa, ...prev]);
      handleCloseForm();

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el acta de costo.");
    } finally {
       setIsLoading(false); // Asegúrate de quitar el indicador de carga
    }
  };
  // -------------------------------------------------------------

  // --- Implementaremos esta después ---
  const handleUpdateActa = async (updatedActa: CostActa) => {
    try {
      const updatedActaFromServer = await api.costActas.update(updatedActa.id, {
        status: updatedActa.status,
        relatedProgress: updatedActa.relatedProgress,
      });

      setCostActas((prev) =>
        prev.map((acta) => (acta.id === updatedActaFromServer.id ? updatedActaFromServer : acta))
      );
      if (selectedActa && selectedActa.id === updatedActaFromServer.id) {
        setSelectedActa(updatedActaFromServer);
      }
      handleCloseDetail();
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al actualizar el acta de costo.');
    }
  };
  // ------------------------------------

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calcular balance financiero
  const financialBalance = useMemo(() => {
    if (costActas.length === 0) {
      return null;
    }

    // Obtener valores del contrato (del primer acta o usar valores por defecto)
    const firstActa = costActas[0];
    const totalContractValue = firstActa?.totalContractValue || MOCK_TOTAL_CONTRACT_VALUE;

    // Separar actas por fase según su descripción
    const preliminarActas = costActas.filter((acta) =>
      acta.relatedProgress?.toLowerCase().includes('preliminar') ||
      acta.relatedProgress?.toLowerCase().includes('saldo fase preliminar')
    );
    const ejecucionActas = costActas.filter((acta) =>
      (acta.relatedProgress?.toLowerCase().includes('fase de obra') ||
      acta.relatedProgress?.toLowerCase().includes('ejecución')) &&
      !acta.relatedProgress?.toLowerCase().includes('preliminar')
    );

    // Calcular totales facturados
    const totalPreliminarBilled = preliminarActas.reduce(
      (sum, acta) => sum + acta.billedAmount,
      0
    );
    const totalEjecucionBilled = ejecucionActas.reduce(
      (sum, acta) => sum + acta.billedAmount,
      0
    );

    // Valores de fases del contrato de obra
    const preliminaryPhaseValue = 248487308; // $ 248.487.308,00
    const executionPhaseValue = 9491081407.50; // $ 9.491.081.407,50 (no es total - preliminar, es un valor específico)
    const saldoPorEjecutar = executionPhaseValue - totalEjecucionBilled;

    return {
      totalContractValue,
      preliminaryPhaseValue,
      executionPhaseValue,
      totalPreliminarBilled,
      totalEjecucionBilled,
      saldoPorEjecutar,
      totalBilled: totalPreliminarBilled + totalEjecucionBilled,
    };
  }, [costActas]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Seguimiento de Actas de Costos
          </h2>
          <p className="text-sm text-gray-500">
            Contrato de Interventoría: {project.contractId}
          </p>
        </div>
        <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
          Registrar Acta de Cobro
        </Button>
      </div>

      {/* Indicadores de Carga y Error */}
      {isLoading && (
        <div className="text-center p-8">Cargando actas de costos...</div>
      )}
      {error && <div className="text-center p-8 text-red-500">{error}</div>}

      {/* Balance Financiero */}
      {!isLoading && !error && financialBalance && (
        <Card>
          <div className="p-5 border-b">
            <h3 className="text-lg font-semibold text-gray-800">
              Control Financiero Contrato de Obra No. {project.contractId}
            </h3>
          </div>
          <div className="p-6">
            <table className="w-full text-sm text-left text-gray-600">
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700 w-1/2">
                    Valor del contrato de obra
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-right">
                    {formatCurrency(financialBalance.totalContractValue)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">
                    Valor fase preliminar
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-right">
                    {formatCurrency(financialBalance.preliminaryPhaseValue)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">
                    Valor fase de ejecución
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 text-right">
                    {formatCurrency(financialBalance.executionPhaseValue)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 bg-blue-50 border-t border-gray-200">
                  <td className="px-4 py-3 font-medium text-blue-700">
                    Valor ejecutado fase preliminar
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-900 text-right">
                    {formatCurrency(financialBalance.totalPreliminarBilled)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 bg-green-50">
                  <td className="px-4 py-3 font-medium text-green-700">
                    Valor ejecutado fase de ejecución
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-900 text-right">
                    {formatCurrency(financialBalance.totalEjecucionBilled)}
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 bg-amber-50 border-t-2 border-amber-200">
                  <td className="px-4 py-4 font-bold text-amber-800">
                    Saldo por ejecutar fase de ejecución
                  </td>
                  <td className="px-4 py-4 font-bold text-amber-900 text-right text-lg">
                    {formatCurrency(financialBalance.saldoPorEjecutar)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tabla o EmptyState */}
      {!isLoading && !error && (
        <Card className="overflow-x-auto">
          {costActas.length > 0 ? (
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">N° Acta</th>
                  <th scope="col" className="px-6 py-3">Periodo</th>
                  <th scope="col" className="px-6 py-3">Fecha Radicación</th>
                  <th scope="col" className="px-6 py-3">Valor Facturado</th>
                  <th scope="col" className="px-6 py-3">% Contrato</th>
                  <th scope="col" className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {costActas.map((acta) => (
                  <tr
                    key={acta.id}
                    className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleOpenDetail(acta)}
                  >
                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{acta.number}</th>
                    <td className="px-6 py-4">{acta.period}</td>
                    <td className="px-6 py-4">{new Date(acta.submissionDate).toLocaleDateString("es-CO")}</td>
                    <td className="px-6 py-4 font-semibold">{formatCurrency(acta.billedAmount)}</td>
                    <td className="px-6 py-4">
                      {((acta.billedAmount / acta.totalContractValue) * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4"><CostActaStatusBadge status={acta.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<DocumentChartBarIcon />}
              title="No hay actas de costos registradas"
              message="Registra la primera acta de cobro para iniciar el seguimiento financiero del contrato de interventoría."
              actionButton={
                <Button onClick={handleOpenForm} leftIcon={<PlusIcon />}>
                  Registrar Primera Acta
                </Button>
              }
            />
          )}
        </Card>
      )}

      {/* Modals */}
      {selectedActa && (
        <CostActaDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          acta={selectedActa}
          onUpdate={handleUpdateActa} // Función aún por implementar completamente
        />
      )}

      <CostActaFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseForm}
        onSave={handleSaveActa} // Conectado al backend con subida de archivos
        totalContractValue={MOCK_TOTAL_CONTRACT_VALUE} // Aún usamos el valor mock
      />
    </div>
  );
};

export default CostDashboard;
