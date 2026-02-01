import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { AppRole, User, UserRole } from "../../types";
import api from "../../src/services/api";
import { useToast } from "../ui/ToastProvider";
import { LoginInputField } from "./LoginInputField";
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, CheckCircle2, Building2, HardHat, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

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
    const errorToDisplay = formError || (mode === "login" && contextError ? contextError : null);
    
    if (errorToDisplay && mode === "login") {
      const errorLower = errorToDisplay.toLowerCase();
      if (
        errorLower.includes("credenciales") ||
        errorLower.includes("invalid") ||
        errorLower.includes("datos de acceso") ||
        errorLower.includes("revisa tus datos")
      ) {
        return "Revisa tus datos de acceso e intenta nuevamente.";
      }
    }
    
    return errorToDisplay;
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
          title: "Bienvenido",
          subtitle: "Portal de supervisión y control de obra.",
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
      const rawMessage = error?.message || error?.error || "";
      const statusCode = error?.statusCode || error?.status || error?.response?.status;
      const attemptsRemaining = error?.attemptsRemaining;

      const normalized = rawMessage.toLowerCase();
      let finalMessage =
        normalized.includes("credenciales") ||
        normalized.includes("invalid") ||
        statusCode === 401
          ? "Credenciales inválidas. Revisa tu correo y contraseña e inténtalo nuevamente."
          : rawMessage || "Error al iniciar sesión. Intenta nuevamente.";

      if (statusCode === 423) {
        finalMessage =
          rawMessage ||
          "Cuenta bloqueada temporalmente por intentos fallidos. Intenta más tarde o restablece tu contraseña.";
      }

      if (typeof attemptsRemaining === "number") {
        finalMessage += ` Intentos restantes: ${attemptsRemaining}.`;
      }

      clearError();
      setFormError(finalMessage);
      showToast({
        variant: "error",
        title: "Inicio de sesión",
        message: finalMessage,
      });
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      setForgotSubmitting(true);
      await forgotPassword(forgotEmail.trim(), window.location.origin);
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
    <form onSubmit={handleLoginSubmit}>
      <LoginInputField
        id="email"
        label="Correo Corporativo"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="usuario@empresa.com"
        icon={Mail}
        required
        autoComplete="email"
      />
      
      <LoginInputField
        id="password"
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        icon={Lock}
        required
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-slate-300 rounded cursor-pointer"
          />
          <label htmlFor="rememberMe" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
            Recordarme
          </label>
        </div>
        
        <div className="text-sm">
          <button
            type="button"
            onClick={() => switchMode("forgot")}
            className="font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={isLoading}
        className={`
          w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white 
          transition-all duration-300 ease-in-out
          bg-brand-primary hover:bg-brand-primary/90 hover:shadow-brand-primary/30 ring-0 hover:ring-4 hover:ring-brand-primary/20
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-70 disabled:cursor-not-allowed
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
            Validando credenciales...
          </>
        ) : (
          <>
            Ingresar al Sistema
            <ArrowRight className="ml-2 h-4 w-4 opacity-50" />
          </>
        )}
      </motion.button>
    </form>
  );

  const renderForgotForm = () => (
    <form className="space-y-6" onSubmit={handleForgotSubmit}>
      <LoginInputField
        id="forgot-email"
        label="Correo Electrónico"
        type="email"
        value={forgotEmail}
        onChange={(e) => setForgotEmail(e.target.value)}
        placeholder="tucorreo@empresa.com"
        icon={Mail}
        required
      />
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={forgotSubmitting}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-all duration-300 disabled:opacity-70"
      >
        {forgotSubmitting ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
            Enviando...
          </>
        ) : (
          "Enviar instrucciones"
        )}
      </motion.button>
    </form>
  );

  const renderResetForm = () => (
    <form className="space-y-6" onSubmit={handleResetSubmit}>
      <LoginInputField
        id="new-password"
        label="Nueva contraseña"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        icon={Lock}
        required
        autoComplete="new-password"
      />
      <LoginInputField
        id="confirm-password"
        label="Confirmar contraseña"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        icon={Lock}
        required
        autoComplete="new-password"
      />
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={resetSubmitting || !resetToken}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-all duration-300 disabled:opacity-70"
      >
        {resetSubmitting ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
            Actualizando...
          </>
        ) : (
          "Restablecer contraseña"
        )}
      </motion.button>
    </form>
  );

  const renderRegisterForm = () => (
    <form className="space-y-4" onSubmit={handleRegisterSubmit}>
      <LoginInputField
        id="register-fullName"
        label="Nombre completo"
        type="text"
        value={registerForm.fullName}
        onChange={(e) =>
          setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))
        }
        icon={UserIcon}
        required
      />
      <LoginInputField
        id="register-email"
        label="Correo corporativo"
        type="email"
        value={registerForm.email}
        onChange={(e) =>
          setRegisterForm((prev) => ({ ...prev, email: e.target.value }))
        }
        icon={Mail}
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
      <LoginInputField
        id="register-password"
        label="Contraseña"
        type="password"
        value={registerForm.password}
        onChange={(e) =>
          setRegisterForm((prev) => ({ ...prev, password: e.target.value }))
        }
        icon={Lock}
        required
        autoComplete="new-password"
      />
      <LoginInputField
        id="register-confirm"
        label="Confirmar contraseña"
        type="password"
        value={registerForm.confirmPassword}
        onChange={(e) =>
          setRegisterForm((prev) => ({
            ...prev,
            confirmPassword: e.target.value,
          }))
        }
        icon={Lock}
        required
        autoComplete="new-password"
      />
      <p className="text-xs text-gray-500">
        La contraseña debe contener al menos 8 caracteres, incluyendo mayúsculas,
        minúsculas y números.
      </p>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={registerSubmitting}
        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-all duration-300 disabled:opacity-70"
      >
        {registerSubmitting ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
            Registrando...
          </>
        ) : (
          "Crear cuenta"
        )}
      </motion.button>
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
            <Loader2 className="animate-spin h-5 w-5" />
            <span>Esto tomará sólo un momento.</span>
          </div>
        </div>
      );
    }

    if (verifyStatus === "success") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded">
            <CheckCircle2 className="h-5 w-5" />
            <span>{verifyMessage || "Tu correo fue verificado correctamente."}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => switchMode("login")}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-all duration-300"
          >
            Ir al inicio de sesión
          </motion.button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">
          {verifyMessage || "El enlace no es válido o ya fue usado."}
        </p>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => switchMode("login")}
          className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary/90 transition-all duration-300"
        >
          Volver al inicio de sesión
        </motion.button>
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
      case "forgot":
      case "register":
      case "reset":
        return (
          <div className="text-sm text-center mt-6">
            <button
              type="button"
              className="font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
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

  // Logo component
  const LogoSection = () => (
    <div className="flex flex-col items-center justify-center mb-10">
      <div className="relative flex items-center justify-center w-20 h-20 bg-white border-2 border-slate-200 rounded-full shadow-sm mb-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50" />
        <Building2 className="relative z-10 w-10 h-10 text-slate-700" strokeWidth={1.5} />
        <HardHat className="absolute z-20 w-6 h-6 text-yellow-500 fill-yellow-100 bottom-4 right-4 translate-x-1 translate-y-1" strokeWidth={1.5} />
        <Wifi className="absolute top-3 right-3 w-3 h-3 text-brand-primary" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center uppercase">
        Bitácora Digital
      </h1>
      <p className="text-xs font-semibold text-brand-primary uppercase tracking-widest mt-1">
        Control de Obra
      </p>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex bg-slate-50 overflow-hidden">
      
      {/* Left Side: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 lg:p-12 xl:p-20 relative z-10 bg-white shadow-2xl lg:shadow-none">
        
        {/* Center: Main Form Content */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LogoSection />
            
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">{modeCopy.title}</h2>
              <p className="text-slate-500">
                {modeCopy.subtitle}
              </p>
            </div>

            {successMessage && (
              <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                {successMessage}
              </div>
            )}

            {displayError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {displayError}
              </div>
            )}

            {renderForm()}

            {renderModeLinks()}
          </motion.div>
        </div>

        {/* Footer: Credits & Copyright */}
        <div className="mt-8 lg:mt-0 flex items-center justify-between text-xs text-slate-400">
          <span>© 2026 Bitácora Digital de Obra</span>
          <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity cursor-default">
            <span>Desarrollado por</span>
            <span className="font-bold text-slate-600">KATA LAB</span>
          </div>
        </div>
      </div>

      {/* Right Side: Image/Visual (Hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-slate-900">
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <img 
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&h=1600&fit=crop" 
            alt="Construcción moderna"
            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/90 via-brand-primary/60 to-slate-900/40" />
        </motion.div>
        
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-20 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <div className="w-16 h-1 bg-yellow-400 mb-6 rounded-full" />
            <h2 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
              Bitácora de Obra<br/>
            </h2>
            <p className="text-lg text-slate-200 max-w-md leading-relaxed">
              Plataforma integral para el seguimiento de obra, control de calidad y gestión de recursos.
            </p>
            
            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-200 overflow-hidden">
                    <img src={`https://picsum.photos/seed/${i + 50}/100/100`} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-brand-primary/80 flex items-center justify-center text-xs font-bold">
                  +50
                </div>
              </div>
              <div className="text-sm font-medium text-slate-300">
                Equipo Técnico y Administrativo
              </div>
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
};

export default LoginScreen;
