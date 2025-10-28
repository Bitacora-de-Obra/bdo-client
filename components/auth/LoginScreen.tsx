import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { AppRole, User, UserRole } from "../../types";
import api from "../../src/services/api";
import { useToast } from "../ui/ToastProvider";

type AuthMode = "login" | "forgot" | "reset" | "register" | "verify";

type VerifyStatus = "idle" | "processing" | "success" | "error";

type RegisterFormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  projectRole: UserRole;
  appRole: AppRole;
};

const PROJECT_ROLE_OPTIONS = Object.values(UserRole);
const APP_ROLE_OPTIONS: AppRole[] = ["viewer", "editor", "admin"];
const INITIAL_REGISTER_FORM: RegisterFormState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  projectRole: UserRole.RESIDENT,
  appRole: "viewer",
};

const LoginScreen: React.FC = () => {
  const {
    login,
    forgotPassword,
    resetPassword,
    register,
    verifyEmail,
    error: contextError,
    isLoading,
    isAuthenticated,
    verificationEmailSent,
    acknowledgeVerificationEmail,
    clearError,
  } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<AuthMode>("login");
  const [sampleUsers, setSampleUsers] = useState<User[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const [registerForm, setRegisterForm] = useState<RegisterFormState>(
    INITIAL_REGISTER_FORM
  );
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  const [resetToken, setResetToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyMessage, setVerifyMessage] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      try {
        const users = await api.users.getAll();
        if (mounted && Array.isArray(users)) {
          setSampleUsers(users.filter((u) => u.status === "active"));
        }
      } catch (error) {
        console.error(
          "LoginScreen: No se pudo obtener la lista de accesos de prueba",
          error
        );
      }
    };
    loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (verificationEmailSent) {
      setSuccessMessage(
        "Hemos enviado un enlace de verificación a tu correo electrónico."
      );
      acknowledgeVerificationEmail();
    }
  }, [verificationEmailSent, acknowledgeVerificationEmail]);

  const switchMode = useCallback(
    (nextMode: AuthMode, options: { preserveSuccess?: boolean } = {}) => {
      setFormError(null);
      clearError();

      if (!options.preserveSuccess) {
        setSuccessMessage(null);
      }

      setMode((previous) => {
        if (previous === nextMode) {
          return previous;
        }
        return nextMode;
      });
    },
    [clearError]
  );

  useEffect(() => {
    const { pathname, search } = window.location;
    const params = new URLSearchParams(search);

    if (pathname.startsWith("/auth/reset-password")) {
      const token = params.get("token") || "";
      setResetToken(token);
      setMode("reset");
      if (!token) {
        setFormError("El enlace de restablecimiento no es válido o expiró.");
      }
    } else if (pathname.startsWith("/auth/verify-email")) {
      const token = params.get("token");
      setVerifyToken(token);
      setMode("verify");
      if (!token) {
        setVerifyStatus("error");
        setVerifyMessage("El enlace de verificación no es válido.");
      }
    } else {
      setMode("login");
    }
  }, []);

  useEffect(() => {
    if (mode !== "verify" || !verifyToken || verifyStatus !== "idle") {
      return;
    }

    let cancelled = false;
    const cleanupUrl = () => {
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, "/");
      }
    };

    const runVerification = async () => {
      try {
        setVerifyStatus("processing");
        await verifyEmail(verifyToken);
        if (cancelled) return;
        setVerifyStatus("success");
        setVerifyMessage("Tu correo fue verificado correctamente.");
        showToast({
          variant: "success",
          title: "Correo verificado",
          message: "Ahora puedes iniciar sesión con tu cuenta.",
        });
        cleanupUrl();
        setTimeout(() => {
          if (!cancelled) {
            setSuccessMessage(
              "Correo verificado. Inicia sesión para continuar."
            );
            switchMode("login", { preserveSuccess: true });
          }
        }, 1500);
      } catch (error: any) {
        if (cancelled) return;
        console.error("LoginScreen: Error al verificar correo", error);
        setVerifyStatus("error");
        setVerifyMessage(
          error?.message || "No se pudo verificar el correo electrónico."
        );
        cleanupUrl();
      }
    };

    runVerification();

    return () => {
      cancelled = true;
    };
  }, [mode, verifyToken, verifyStatus, verifyEmail, showToast, switchMode]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }
    clearError();
  }, [clearError, isAuthenticated]);

  if (isAuthenticated) {
    return null;
  }

  const displayError = useMemo(() => {
    if (mode === "login" && contextError) {
      return contextError;
    }
    return formError;
  }, [mode, contextError, formError]);

  const modeCopy = useMemo(() => {
    switch (mode) {
      case "register":
        return {
          title: "Crear cuenta",
          subtitle: "Completa los datos para solicitar acceso.",
        };
      case "forgot":
        return {
          title: "Recuperar acceso",
          subtitle:
            "Ingresa tu correo y te enviaremos instrucciones para restablecer la contraseña.",
        };
      case "reset":
        return {
          title: "Restablecer contraseña",
          subtitle: "Define una nueva contraseña segura para tu cuenta.",
        };
      case "verify":
        return {
          title: "Verificando correo",
          subtitle:
            "Estamos validando tu enlace. Este proceso puede tardar unos segundos.",
        };
      default:
        return {
          title: "Bitácora Digital de Obra",
          subtitle: "Inicia sesión para acceder a tu proyecto",
        };
    }
  }, [mode]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();
    try {
      await login(email, password);
    } catch (error: any) {
      console.error("LoginScreen: Error durante el login", error);
      setFormError(error?.message || "Credenciales inválidas.");
    }
  };

  const handleQuickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("password123");
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setForgotSubmitting(true);
      await forgotPassword(forgotEmail.trim());
      showToast({
        variant: "success",
        title: "Solicitud enviada",
        message:
          "Si el correo está registrado, recibirás instrucciones para restablecer la contraseña.",
      });
      setSuccessMessage(
        "Si el correo está registrado, recibirás un enlace para restablecer la contraseña."
      );
      switchMode("login", { preserveSuccess: true });
      setForgotEmail("");
    } catch (error: any) {
      console.error("LoginScreen: Error en recuperación", error);
      setFormError(
        error?.message ||
          "No se pudo procesar la solicitud. Inténtalo nuevamente más tarde."
      );
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!resetToken) {
      setFormError("El enlace de restablecimiento no es válido.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setResetSubmitting(true);
      await resetPassword(resetToken, newPassword);
      showToast({
        variant: "success",
        title: "Contraseña actualizada",
        message: "Ahora puedes iniciar sesión con tu nueva contraseña.",
      });
      setSuccessMessage(
        "Tu contraseña fue actualizada correctamente. Inicia sesión para continuar."
      );
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
      switchMode("login", { preserveSuccess: true });
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, "/");
      }
    } catch (error: any) {
      console.error("LoginScreen: Error al restablecer contraseña", error);
      setFormError(
        error?.message ||
          "No se pudo restablecer la contraseña. Intenta nuevamente."
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (registerForm.password !== registerForm.confirmPassword) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setRegisterSubmitting(true);
      const payload = await register({
        email: registerForm.email.trim(),
        password: registerForm.password,
        fullName: registerForm.fullName.trim(),
        projectRole: registerForm.projectRole,
        appRole: registerForm.appRole,
      });

      const message = payload.verificationEmailSent
        ? "Enviamos un enlace de verificación a tu correo."
        : "Cuenta creada exitosamente.";

      showToast({
        variant: "success",
        title: "Registro exitoso",
        message,
      });
      acknowledgeVerificationEmail();
      setRegisterForm(INITIAL_REGISTER_FORM);
      setSuccessMessage(`${message} Inicia sesión para continuar.`);
      switchMode("login", { preserveSuccess: true });
    } catch (error: any) {
      console.error("LoginScreen: Error al registrar usuario", error);
      setFormError(error?.message || "No se pudo crear la cuenta.");
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const renderLoginForm = () => (
    <form className="space-y-6" onSubmit={handleLoginSubmit}>
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
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Ingresando..." : "Iniciar Sesión"}
      </Button>
    </form>
  );

  const renderForgotForm = () => (
    <form className="space-y-6" onSubmit={handleForgotSubmit}>
      <Input
        label="Correo Electrónico"
        id="forgot-email"
        type="email"
        value={forgotEmail}
        onChange={(e) => setForgotEmail(e.target.value)}
        required
        placeholder="tucorreo@empresa.com"
      />
      <Button type="submit" className="w-full" disabled={forgotSubmitting}>
        {forgotSubmitting ? "Enviando..." : "Enviar instrucciones"}
      </Button>
    </form>
  );

  const renderResetForm = () => (
    <form className="space-y-6" onSubmit={handleResetSubmit}>
      <Input
        label="Nueva contraseña"
        id="new-password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <Input
        label="Confirmar contraseña"
        id="confirm-password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
      />
      <Button
        type="submit"
        className="w-full"
        disabled={resetSubmitting || !resetToken}
      >
        {resetSubmitting ? "Actualizando..." : "Restablecer contraseña"}
      </Button>
    </form>
  );

  const renderRegisterForm = () => (
    <form className="space-y-6" onSubmit={handleRegisterSubmit}>
      <Input
        label="Nombre completo"
        id="register-fullName"
        value={registerForm.fullName}
        onChange={(e) =>
          setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))
        }
        required
      />
      <Input
        label="Correo corporativo"
        id="register-email"
        type="email"
        value={registerForm.email}
        onChange={(e) =>
          setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
        }
        required
      />
      <Select
        label="Rol en el proyecto"
        id="register-projectRole"
        value={registerForm.projectRole}
        onChange={(e) =>
          setRegisterForm((prev) => ({
            ...prev,
            projectRole: e.target.value as UserRole,
          }))
        }
      >
        {PROJECT_ROLE_OPTIONS.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </Select>
      <Select
        label="Rol en la aplicación"
        id="register-appRole"
        value={registerForm.appRole}
        onChange={(e) =>
          setRegisterForm((prev) => ({
            ...prev,
            appRole: e.target.value as AppRole,
          }))
        }
      >
        {APP_ROLE_OPTIONS.map((role) => (
          <option key={role} value={role}>
            {role === "viewer"
              ? "Lector"
              : role === "editor"
              ? "Editor"
              : "Administrador"}
          </option>
        ))}
      </Select>
      <Input
        label="Contraseña"
        id="register-password"
        type="password"
        value={registerForm.password}
        onChange={(e) =>
          setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
        }
        required
        autoComplete="new-password"
      />
      <Input
        label="Confirmar contraseña"
        id="register-confirm"
        type="password"
        value={registerForm.confirmPassword}
        onChange={(e) =>
          setRegisterForm((prev) => ({
            ...prev,
            confirmPassword: e.target.value,
          }))
        }
        required
        autoComplete="new-password"
      />
      <p className="text-xs text-gray-500">
        La contraseña debe contener al menos 8 caracteres, incluyendo mayúsculas,
        minúsculas y números.
      </p>
      <Button type="submit" className="w-full" disabled={registerSubmitting}>
        {registerSubmitting ? "Registrando..." : "Crear cuenta"}
      </Button>
    </form>
  );

  const renderVerifyState = () => {
    if (verifyStatus === "processing") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Validando tu enlace...
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="animate-spin">⏳</span>
            <span>Esto tomará sólo un momento.</span>
          </div>
        </div>
      );
    }

    if (verifyStatus === "success") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded">
            {verifyMessage || "Tu correo fue verificado correctamente."}
          </p>
          <Button
            type="button"
            className="w-full"
            onClick={() => switchMode("login")}
          >
            Ir al inicio de sesión
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
          {verifyMessage || "El enlace no es válido o ya fue usado."}
        </p>
        <Button
          type="button"
          className="w-full"
          onClick={() => switchMode("login")}
        >
          Volver al inicio de sesión
        </Button>
      </div>
    );
  };

  const renderForm = () => {
    switch (mode) {
      case "forgot":
        return renderForgotForm();
      case "reset":
        return renderResetForm();
      case "register":
        return renderRegisterForm();
      case "verify":
        return renderVerifyState();
      default:
        return renderLoginForm();
    }
  };

  const renderModeLinks = () => {
    switch (mode) {
      case "login":
        return (
          <div className="flex justify-between text-sm text-brand-primary">
            <button
              type="button"
              className="hover:underline"
              onClick={() => switchMode("forgot")}
            >
              ¿Olvidaste tu contraseña?
            </button>
            <button
              type="button"
              className="hover:underline"
              onClick={() => switchMode("register")}
            >
              Crear cuenta
            </button>
          </div>
        );
      case "forgot":
      case "register":
      case "reset":
        return (
          <div className="text-sm text-center text-brand-primary">
            <button
              type="button"
              className="hover:underline"
              onClick={() => switchMode("login")}
            >
              Volver al inicio de sesión
            </button>
          </div>
        );
      case "verify":
        return null;
      default:
        return null;
    }
  };

  const formatRole = (role: string) => {
    const map: Record<string, string> = {
      RESIDENT: "Residente de Obra",
      SUPERVISOR: "Supervisor",
      CONTRACTOR_REP: "Representante Contratista",
      ADMIN: "Administrador IDU",
    };
    return map[role] || role;
  };

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
            {modeCopy.title}
          </h2>
          <p className="mt-2 text-sm text-gray-600">{modeCopy.subtitle}</p>
        </div>

        {successMessage && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded">
            {successMessage}
          </div>
        )}

        {displayError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
            {displayError}
          </div>
        )}

        {renderForm()}

        {renderModeLinks()}

        {mode === "login" && sampleUsers.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-semibold text-gray-700">
              Accesos de Prueba
            </h4>
            <p className="text-xs text-gray-500 mb-2">
              Contraseña por defecto: <code>password123</code>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {sampleUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleQuickLogin(user.email || "")}
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
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
