import React, { useState } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ui/ToastProvider';
import { XMarkIcon } from './icons/Icon';
import { getFullRoleName } from '../src/utils/roleDisplay';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, changePassword } = useAuth();
  const { showToast } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son requeridos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setIsChanging(true);
      await changePassword(oldPassword, newPassword);
      
      showToast({
        variant: 'success',
        title: 'Contraseña actualizada',
        message: 'Tu contraseña ha sido actualizada correctamente.',
      });

      // Limpiar formulario
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      
      // Cerrar modal después de un breve delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      const message = err?.message || 'No se pudo cambiar la contraseña. Verifica que la contraseña actual sea correcta.';
      setError(message);
      showToast({
        variant: 'error',
        title: 'Error',
        message,
      });
    } finally {
      setIsChanging(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mi Perfil" size="md">
      <div className="space-y-6">
        {/* Información del usuario */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Información Personal</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700">Nombre:</span>{' '}
              <span className="text-gray-600">{user.fullName}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Email:</span>{' '}
              <span className="text-gray-600">{user.email}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Rol de Proyecto:</span>{' '}
              <span className="text-gray-600">{getFullRoleName(user.projectRole, user.entity)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Rol de Aplicación:</span>{' '}
              <span className="text-gray-600 capitalize">{user.appRole}</span>
            </div>
          </div>
        </div>

        {/* Formulario de cambio de contraseña */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cambiar Contraseña</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Contraseña Actual"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
              disabled={isChanging}
            />
            <Input
              label="Nueva Contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={isChanging}
              helperText="Mínimo 6 caracteres. Si la seguridad está habilitada, debe incluir mayúsculas, minúsculas y números."
            />
            <Input
              label="Confirmar Nueva Contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isChanging}
            />

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isChanging}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isChanging}>
                {isChanging ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default UserProfileModal;

