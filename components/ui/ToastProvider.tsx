import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLES: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "✅",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "⚠️",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: "⚠️",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "ℹ️",
  },
};

const DEFAULT_DURATION = 5000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const variant: ToastVariant = toast.variant || "info";
      const duration = toast.duration ?? DEFAULT_DURATION;

      setToasts((prev) => [...prev, { ...toast, id, variant }]);

      if (duration > 0) {
        timers.current[id] = setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
    }),
    [toasts, showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-4 z-[10001] flex flex-col items-center gap-3 px-4 pointer-events-none">
        {toasts.map((toast) => {
          const styles = VARIANT_STYLES[toast.variant ?? "info"];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto w-full max-w-md border ${styles.border} ${styles.bg} shadow-lg rounded-lg p-4`}
            >
              <div className="flex items-start gap-3">
                <div className="text-xl leading-none">{styles.icon}</div>
                <div className="flex-1">
                  {toast.title && (
                    <h4 className="text-sm font-semibold text-gray-800">{toast.title}</h4>
                  )}
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{toast.message}</p>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Cerrar notificación"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
};

export default ToastProvider;
