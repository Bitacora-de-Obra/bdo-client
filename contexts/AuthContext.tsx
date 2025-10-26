import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { User } from "../types";
import { api } from "../src/services/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = !!user;

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Verificando autenticación...');
        const userData = await api.auth.getProfile();
        console.log('AuthProvider: Usuario autenticado:', userData);
        setUser(userData);
      } catch (e) {
        console.error("AuthProvider: Error al obtener el perfil del usuario", e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Escuchar eventos de logout
    const handleLogoutEvent = () => {
      console.log("AuthProvider: Evento auth:logout recibido");
      logout();
    };

    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log("AuthProvider: Iniciando login...");
    setError(null);
    setIsLoading(true);

    try {
      const result = await api.auth.login(email, password);
      console.log("AuthProvider: Login exitoso, guardando usuario:", result.user);
      setUser(result.user);
    } catch (e: any) {
      console.error("AuthProvider: Error durante el login:", e);
      setError(e.message || "Error desconocido durante el login.");
      setUser(null);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("AuthProvider: Iniciando logout...");
      await api.auth.logout();
      console.log("AuthProvider: Logout exitoso");
    } catch (e) {
      console.error("AuthProvider: Error durante el logout:", e);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};