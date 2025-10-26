import React, { useState } from 'react';
import Card from '../ui/Card';
import { useAdminApi } from '../../src/hooks/useAdminApi';
import { AppSettings, User } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import EmptyState from '../ui/EmptyState';
import { ShieldCheckIcon, UserCircleIcon } from '../icons/Icon';
import Modal from '../ui/Modal';


const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { id: 'users', label: 'Usuarios y Permisos' },
        { id: 'audit', label: 'Registro de Auditoría' },
        { id: 'settings', label: 'Configuración' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <div className="bg-idu-blue/10 p-3 rounded-lg">
                    <ShieldCheckIcon className="h-8 w-8 text-idu-blue" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Panel de Administración</h2>
                    <p className="text-sm text-gray-500">Gestiona usuarios, permisos y configuraciones globales de la aplicación.</p>
                </div>
            </div>

            <div>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${
                                    activeTab === tab.id
                                        ? 'border-brand-primary text-brand-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-6">
                    {activeTab === 'users' && <UsersView />}
                    {activeTab === 'audit' && <AuditLogView />}
                    {activeTab === 'settings' && <SettingsView />}
                </div>
            </div>
        </div>
    );
};

const UsersView: React.FC = () => {
    const { users, isLoading, error, inviteUser, updateUser } = useAdminApi();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    if (isLoading) return <div>Cargando usuarios...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={() => setIsInviteModalOpen(true)}>Invitar Usuario</Button>
            </div>
            <Card>
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nombre Completo</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Rol</th>
                            <th scope="col" className="px-6 py-3">Estado</th>
                            <th scope="col" className="px-6 py-3">Último Acceso</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{user.fullName}</td>
                                <td className="px-6 py-4">{user.email}</td>
                                <td className="px-6 py-4 capitalize">{user.appRole}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {user.status === 'active' ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('es-CO') : 'Nunca'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            <InviteUserModal 
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onInvite={inviteUser}
            />
        </div>
    );
};

const AuditLogView: React.FC = () => {
    const { auditLogs, isLoading, error } = useAdminApi();

    if (isLoading) return <div>Cargando registros...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <Card>
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3">Fecha</th>
                        <th scope="col" className="px-6 py-3">Actor</th>
                        <th scope="col" className="px-6 py-3">Acción</th>
                        <th scope="col" className="px-6 py-3">Detalle</th>
                    </tr>
                </thead>
                <tbody>
                    {auditLogs.map(log => (
                        <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4">{new Date(log.timestamp).toLocaleString('es-CO')}</td>
                            <td className="px-6 py-4">{log.actorEmail}</td>
                            <td className="px-6 py-4">{log.action}</td>
                            <td className="px-6 py-4 text-xs font-mono">{log.diff ? JSON.stringify(log.diff) : `ID: ${log.entityId}`}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Card>
    );
}

const SettingsView: React.FC = () => {
    const { settings, isLoading, error, updateSettings } = useAdminApi();
    const [formState, setFormState] = useState<Partial<AppSettings>>({});

    React.useEffect(() => {
        if (settings) {
            setFormState(settings);
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = (e.target as HTMLInputElement).checked;
        
        setFormState(prev => ({
            ...prev,
            [name]: isCheckbox ? checked : value
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateSettings(formState);
        alert('Configuración guardada!');
    };

    if (isLoading) return <div>Cargando configuración...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <form onSubmit={handleSave}>
            <Card>
                <div className="p-5">
                    <h3 className="text-lg font-semibold">Configuración General</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Nombre de la Compañía" name="companyName" value={formState.companyName || ''} onChange={handleChange} />
                        <Input label="Zona Horaria" name="timezone" value={formState.timezone || ''} onChange={handleChange} />
                        <Select label="Idioma" name="locale" value={formState.locale || 'es-ES'} onChange={handleChange}>
                            <option value="es-ES">Español</option>
                            <option value="en-US">English</option>
                        </Select>
                    </div>
                </div>
                <div className="p-5 border-t">
                    <h3 className="text-lg font-semibold">Flujos de Trabajo</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                         <Input label="Cadencia de Fotos de Obra (días)" type="number" name="photoIntervalDays" value={formState.photoIntervalDays || 3} onChange={handleChange} />
                    </div>
                </div>
                <div className="p-5 bg-gray-50 flex justify-end">
                    <Button type="submit">Guardar Cambios</Button>
                </div>
            </Card>
        </form>
    );
};

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (data: { fullName: string; email: string; appRole: 'admin' | 'editor' | 'viewer' }) => Promise<User | undefined>;
}
const InviteUserModal: React.FC<InviteUserModalProps> = ({ isOpen, onClose, onInvite }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [appRole, setAppRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onInvite({ fullName, email, appRole });
        onClose();
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Invitar Nuevo Usuario">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre Completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Select label="Rol de Aplicación" value={appRole} onChange={(e) => setAppRole(e.target.value as any)}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                </Select>
                 <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">Enviar Invitación</Button>
                </div>
            </form>
        </Modal>
    );
}

export default AdminDashboard;
