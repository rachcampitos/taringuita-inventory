"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; bgClass: string; textClass: string; iconClass: string }
> = {
  success: {
    icon: CheckCircle2,
    bgClass: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800",
    textClass: "text-emerald-900 dark:text-emerald-100",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: XCircle,
    bgClass: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    textClass: "text-red-900 dark:text-red-100",
    iconClass: "text-red-600 dark:text-red-400",
  },
  info: {
    icon: Info,
    bgClass: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    textClass: "text-blue-900 dark:text-blue-100",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const config = typeConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);
    const duration = toast.duration ?? 4000;
    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg",
        "transition-all duration-300 max-w-sm w-full",
        config.bgClass,
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0",
      ].join(" ")}
    >
      <Icon size={20} className={`shrink-0 mt-0.5 ${config.iconClass}`} />
      <p className={`flex-1 text-sm font-medium ${config.textClass}`}>
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        aria-label="Cerrar notificacion"
        className={`shrink-0 -mt-0.5 -mr-1 p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity ${config.textClass}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
    },
    []
  );

  const success = useCallback(
    (message: string, duration?: number) => showToast(message, "success", duration),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => showToast(message, "error", duration),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => showToast(message, "info", duration),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div
        aria-label="Notificaciones"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  return useContext(ToastContext);
}
