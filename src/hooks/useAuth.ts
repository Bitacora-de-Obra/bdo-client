import { useState, useEffect, useCallback, createContext, useContext, createElement, ReactNode } from 'react';
import { User } from '../../types';
import api from '../services/api';
import { useLoadingState } from './useLoadingState';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    fullName: string;
    projectRole: string;
    appRole: string;
  }) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  updateProfile: (profileData: {
    fullName?: string;
    email?: string;
    avatarUrl?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const { isLoading, error, retry: refreshUser } = useLoadingState(api.auth.getProfile);

  // Verificar el token al iniciar y refrescarlo periódicamente
  useEffect(() => {
    let refreshAttempts = 0;
    const MAX_REFRESH_ATTEMPTS = 3;

    const refreshToken = async () => {
      try {
        const response = await api.auth.refreshToken();
        
        // Guardar el nuevo accessToken en localStorage
        if (response.accessToken) {
          localStorage.setItem("accessToken", response.accessToken);
        }
        
        // Actualizar el usuario
        if (response.user) {
          setUser(response.user);
        }
        
        // Resetear contador de intentos en caso de éxito
        refreshAttempts = 0;
      } catch (err) {
        refreshAttempts++;
        console.warn(`Intento de refresh fallido (${refreshAttempts}/${MAX_REFRESH_ATTEMPTS}):`, err);
        
        // Solo cerrar sesión después de múltiples intentos fallidos
        if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
          console.error("Múltiples intentos de refresh fallaron, cerrando sesión");
          setUser(null);
          localStorage.removeItem("accessToken");
        }
        // Si es el primer o segundo intento, no cerrar sesión todavía
      }
    };

    refreshToken();

    // Refrescar el token cada 10 minutos (el token expira en 15, así que tenemos margen)
    // Reducido de 14 a 10 minutos para tener más margen de seguridad
    const interval = setInterval(refreshToken, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Cargar el perfil del usuario al iniciar
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await api.auth.getProfile();
        setUser(profile);
      } catch (err) {
        setUser(null);
      }
    };

    loadProfile();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
  }, []);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    fullName: string;
    projectRole: string;
    appRole: string;
  }) => {
    const response = await api.auth.register(userData);
    const { verificationEmailSent: _verificationFlag, ...registeredUser } = response;
    setUser(registeredUser);
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    await api.auth.verifyEmail(token);
    await refreshUser();
  }, [refreshUser]);

  const forgotPassword = useCallback(async (email: string) => {
    await api.auth.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    await api.auth.resetPassword(token, newPassword);
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    await api.auth.changePassword(oldPassword, newPassword);
  }, []);

  const updateProfile = useCallback(async (profileData: {
    fullName?: string;
    email?: string;
    avatarUrl?: string;
  }) => {
    const updatedUser = await api.auth.updateProfile(profileData);
    setUser(updatedUser);
  }, []);

  const value = {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
  };

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
