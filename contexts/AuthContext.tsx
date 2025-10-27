import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User } from "../types";
import { api } from "../src/services/api";

const MIN_PASSWORD_LENGTH = 8;
const UPPERCASE_REGEX = /[A-ZÁÉÍÓÚÑ]/u;
const LOWERCASE_REGEX = /[a-záéíóúñ]/u;
const DIGIT_REGEX = /[0-9]/u;

const ensurePasswordStrength = (password: string) => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    );
  }

  if (
    !UPPERCASE_REGEX.test(password) ||
    !LOWERCASE_REGEX.test(password) ||
    !DIGIT_REGEX.test(password)
  ) {
    throw new Error(
      "La contraseña debe incluir mayúsculas, minúsculas y números."
    );
  }
};

interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  projectRole: string;
  appRole: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  verificationEmailSent: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    payload: RegisterPayload
  ) => Promise<{ user: User; verificationEmailSent: boolean }>;
  verifyEmail: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
  acknowledgeVerificationEmail: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const isAuthenticated = !!user;

  const clearError = useCallback(() => setError(null), []);
  const acknowledgeVerificationEmail = useCallback(
    () => setVerificationEmailSent(false),
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (logoutError) {
      console.error("AuthProvider: Error durante el logout:", logoutError);
    } finally {
      setUser(null);
      setError(null);
      setVerificationEmailSent(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await api.auth.getProfile();
      setUser(profile);
      setVerificationEmailSent(false);
    } catch (profileError) {
      console.error(
        "AuthProvider: Error al obtener el perfil del usuario",
        profileError
      );
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await loadProfile();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const handleLogoutEvent = () => {
      logout();
    };

    window.addEventListener("auth:logout", handleLogoutEvent);
    return () => {
      window.removeEventListener("auth:logout", handleLogoutEvent);
    };
  }, [loadProfile, logout]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    setVerificationEmailSent(false);

    try {
      const result = await api.auth.login(email, password);
      setUser(result.user);
    } catch (loginError: any) {
      console.error("AuthProvider: Error durante el login:", loginError);
      setUser(null);
      const message =
        loginError?.message || "Error desconocido durante el inicio de sesión.";
      setError(message);
      throw loginError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      setError(null);
      setIsLoading(true);

      try {
        ensurePasswordStrength(payload.password);
        const response = await api.auth.register(payload);
        const {
          verificationEmailSent: verificationFlag = false,
          ...userData
        } = response as User & { verificationEmailSent?: boolean };

        setVerificationEmailSent(Boolean(verificationFlag));

        return {
          user: userData,
          verificationEmailSent: Boolean(verificationFlag),
        };
      } catch (registerError: any) {
        console.error("AuthProvider: Error durante el registro:", registerError);
        const message =
          registerError?.message || "No fue posible crear la cuenta.";
        setError(message);
        setUser(null);
        throw registerError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      setError(null);
      setIsLoading(true);
      try {
        await api.auth.verifyEmail(token);
        await loadProfile();
      } catch (verifyError: any) {
        console.error("AuthProvider: Error al verificar el correo:", verifyError);
        const message =
          verifyError?.message ||
          "No fue posible verificar el correo electrónico.";
        setError(message);
        throw verifyError;
      } finally {
        setIsLoading(false);
      }
    },
    [loadProfile]
  );

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await api.auth.forgotPassword(email);
    } catch (forgotError: any) {
      console.error(
        "AuthProvider: Error al solicitar restablecimiento:",
        forgotError
      );
      const message =
        forgotError?.message ||
        "No fue posible procesar la solicitud de restablecimiento.";
      setError(message);
      throw forgotError;
    }
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    setError(null);
    try {
      ensurePasswordStrength(newPassword);
      await api.auth.resetPassword(token, newPassword);
    } catch (resetError: any) {
      console.error("AuthProvider: Error al restablecer la contraseña:", resetError);
      const message =
        resetError?.message ||
        "No fue posible restablecer la contraseña. Intenta nuevamente.";
      setError(message);
      throw resetError;
    }
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      setError(null);

      if (oldPassword === newPassword) {
        const message =
          "La nueva contraseña debe ser diferente a la actual.";
        setError(message);
        throw new Error(message);
      }

      try {
        ensurePasswordStrength(newPassword);
        await api.auth.changePassword(oldPassword, newPassword);
      } catch (changeError: any) {
        console.error("AuthProvider: Error al cambiar la contraseña:", changeError);
        const message =
          changeError?.message ||
          "No fue posible cambiar la contraseña en este momento.";
        setError(message);
        throw changeError;
      }
    },
    []
  );

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    error,
    verificationEmailSent,
    login,
    logout,
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    refreshProfile: loadProfile,
    clearError,
    acknowledgeVerificationEmail,
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
