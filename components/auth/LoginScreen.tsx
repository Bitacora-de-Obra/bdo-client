import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { User } from "../../types";
import api from "../../src/services/api";

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [sampleUsers, setSampleUsers] = useState<User[]>([]);
  const { login, error: contextError, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const fetchSampleUsers = async () => {
      try {
        const users = await api.users.getAll();
        if (isMounted && Array.isArray(users)) {
          setSampleUsers(users.filter((u) => u.status === "active"));
        }
      } catch (err) {
        console.error("LoginScreen: No se pudo cargar la lista de usuarios de prueba", err);
      }
    };

    fetchSampleUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      RESIDENT: "Residente de Obra",
      SUPERVISOR: "Supervisor",
      CONTRACTOR_REP: "Representante Contratista",
      ADMIN: "Administrador IDU",
    };
    return roleMap[role] || role;
  };

  // Si el usuario ya está autenticado, no mostramos el formulario de login
  if (isAuthenticated) {
    console.log("LoginScreen: Usuario ya autenticado, redirigiendo...");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    if (isLoading) {
      console.log("LoginScreen: Intento de login mientras isLoading=true");
      return;
    }

    try {
      console.log("LoginScreen: Iniciando login con email:", email);
      await login(email, password);
      console.log("LoginScreen: Login exitoso");
    } catch (error: any) {
      console.error("LoginScreen: Error durante el login:", error);
      setLocalError(error.message || "Error al iniciar sesión. Por favor, intente nuevamente.");
    }
  };

  const handleQuickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("password123");
  };

  const error = localError || contextError;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img
            src="https://www.idu.gov.co/sites/default/files/2022-10/logo-bogota.png"
            className="h-12 mx-auto"
            alt="Bogota Logo"
          />
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Bitácora Digital de Obra
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Inicia sesión para acceder a tu proyecto
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Correo Electrónico"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </p>
          )}

          <div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Ingresando..." : "Iniciar Sesión"}
            </Button>
          </div>
        </form>

        <div className="p-4 bg-gray-50 rounded-lg border">
          <h4 className="text-sm font-semibold text-gray-700">
            Accesos de Prueba
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            La contraseña para todos es: `password123`
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sampleUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleQuickLogin(user.email!)}
                className="text-xs text-left p-2 bg-white border rounded hover:bg-gray-100"
              >
                <p className="font-bold truncate">
                  {user.fullName.split("(")[0]}
                </p>
                <p className="text-gray-600">{formatRole(user.projectRole)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
