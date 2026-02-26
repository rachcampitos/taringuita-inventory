"use client";

import { WifiOff, UtensilsCrossed } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 mb-6">
        <UtensilsCrossed size={32} className="text-white" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <WifiOff size={20} className="text-gray-400 dark:text-slate-500" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          Sin conexion
        </h1>
      </div>

      <p className="text-sm text-gray-500 dark:text-slate-400 text-center max-w-sm mb-6">
        No tienes conexion a internet. Algunas funciones no estan disponibles.
        Los conteos guardados se sincronizaran automaticamente cuando vuelvas a tener conexion.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
