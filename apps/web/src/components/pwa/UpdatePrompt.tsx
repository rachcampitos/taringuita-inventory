"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setShowUpdate(true);
            setRegistration(reg);
          }
        });
      });
    });
  }, []);

  function handleUpdate() {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    setShowUpdate(false);
    window.location.reload();
  }

  if (!showUpdate) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 p-3 md:p-0 md:top-3 md:right-3 md:left-auto md:max-w-sm">
      <div className="bg-emerald-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
        <RefreshCw size={18} className="shrink-0" />
        <p className="text-sm flex-1">Nueva version disponible</p>
        <button
          onClick={handleUpdate}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
        >
          Actualizar
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
