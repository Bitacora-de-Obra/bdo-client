import React, { useState, useEffect, useMemo } from 'react';
import { WorkActa, ContractItem, WorkActaStatus } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Select from './ui/Select';
import WorkActaStatusBadge from './WorkActaStatusBadge';
import AttachmentItem from './AttachmentItem';

interface WorkActaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  acta: WorkActa;
  contractItems: ContractItem[];
  onUpdate: (updatedActa: WorkActa) => void;
}

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
);

const WorkActaDetailModal: React.FC<WorkActaDetailModalProps> = ({ isOpen, onClose, acta, contractItems, onUpdate }) => {
    const [editedActa, setEditedActa] = useState<WorkActa>(acta);

    useEffect(() => {
        setEditedActa(acta);
    }, [acta, isOpen]);

    const contractItemMap = useMemo(() => {
        return new Map(contractItems.map(item => [item.id, item]));
    }, [contractItems]);

    const handleStatusChange = (newStatus: WorkActaStatus) => {
        setEditedActa(prev => ({ ...prev, status: newStatus }));
    };

    const handleSaveChanges = () => {
        onUpdate(editedActa);
        onClose();
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(value);
    };

    const totalActaValue = useMemo(() => {
        return acta.items.reduce((sum, item) => {
            const contractItem = contractItemMap.get(item.contractItemId);
            return sum + (contractItem ? item.quantity * contractItem.unitPrice : 0);
        }, 0);
    }, [acta, contractItemMap]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalle Acta de Avance - ${acta.number}`} size="2xl">
            <div className="space-y-6">
                <div className="pb-4 border-b">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-gray-900">{acta.number}</h3>
                        <WorkActaStatusBadge status={editedActa.status} />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Periodo: {acta.period} - Fecha: {new Date(acta.date).toLocaleDateString('es-CO')}</p>
                </div>

                <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Ítems de Avance del Periodo</h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ítem</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Vlr. Unitario</th>
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {acta.items.map(item => {
                                    const contractItem = contractItemMap.get(item.contractItemId);
                                    if (!contractItem) return null;
                                    const subtotal = item.quantity * contractItem.unitPrice;
                                    return (
                                        <tr key={item.contractItemId}>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contractItem.itemCode}</td>
                                            <td className="px-4 py-4 whitespace-normal text-sm text-gray-500">{contractItem.description}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity.toLocaleString('es-CO')} {contractItem.unit}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(contractItem.unitPrice)}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(subtotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Total del Periodo</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(totalActaValue)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Documentos Soporte</h4>
                    {(acta.attachments || []).length > 0 ? (
                        <ul className="space-y-2">
                            {(acta.attachments || []).map((attachment) => (
                                <AttachmentItem key={attachment.id} attachment={attachment} />
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">Este acta no tiene adjuntos cargados.</p>
                    )}
                </div>

                <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Actualizar Estado</h4>
                    <Select
                        id="status"
                        value={editedActa.status}
                        onChange={(e) => handleStatusChange(e.target.value as WorkActaStatus)}
                    >
                        {Object.values(WorkActaStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                <Button variant="primary" onClick={handleSaveChanges}>Guardar Cambios</Button>
            </div>
        </Modal>
    );
};

export default WorkActaDetailModal;
