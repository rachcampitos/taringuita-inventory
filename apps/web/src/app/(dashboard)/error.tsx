"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950 mb-5">
        <AlertTriangle size={28} className="text-red-600 dark:text-red-400" />
      </div>

      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">
        Error en la pagina
      </h2>

      <p className="text-sm text-gray-500 dark:text-slate-400 text-center max-w-sm mb-6">
        No se pudo cargar esta seccion. Intenta nuevamente o vuelve al inicio.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <Home size={16} />
          Inicio
        </Link>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <RotateCcw size={16} />
          Reintentar
        </button>
      </div>
    </div>
  );
}
