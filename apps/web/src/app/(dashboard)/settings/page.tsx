"use client";

import { Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Configuracion
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Ajustes de la aplicacion
        </p>
      </div>

      <Card padding="lg">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
            <Settings
              size={28}
              className="text-gray-400 dark:text-slate-500"
            />
          </div>
          <p className="font-medium text-gray-700 dark:text-slate-300 mb-1">
            Configuracion en desarrollo
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500">
            Esta seccion estara disponible proximamente.
          </p>
        </div>
      </Card>
    </div>
  );
}
