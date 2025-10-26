import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredProjectRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredProjectRoles = [],
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-semibold">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Guardar la ubicación actual para redirigir después del login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar roles de aplicación si se requieren
  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.appRole || '')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl font-semibold text-red-600">Acceso Denegado</div>
        <p className="mt-2 text-gray-600">
          No tiene los permisos necesarios para acceder a esta página.
        </p>
      </div>
    );
  }

  // Verificar roles de proyecto si se requieren
  if (requiredProjectRoles.length > 0 && !requiredProjectRoles.includes(user?.projectRole || '')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-xl font-semibold text-red-600">Acceso Denegado</div>
        <p className="mt-2 text-gray-600">
          No tiene los permisos necesarios en el proyecto para acceder a esta página.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};


