"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950 mb-6">
        <AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
      </div>

      <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
        Algo salio mal
      </h1>

      <p className="text-sm text-gray-500 dark:text-slate-400 text-center max-w-sm mb-6">
        Ocurrio un error inesperado. Por favor intenta de nuevo.
      </p>

      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
      >
        <RotateCcw size={16} />
        Reintentar
      </button>
    </div>
  );
}
