"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 dark:bg-slate-900">
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-600"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Error critico
          </h1>

          <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
            La aplicacion encontro un error critico. Por favor recarga la pagina.
          </p>

          <button
            onClick={reset}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  );
}
