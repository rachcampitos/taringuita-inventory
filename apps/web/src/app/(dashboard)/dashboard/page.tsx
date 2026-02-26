"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface StationStatus {
  id: string;
  name: string;
  reported: boolean;
  reportedAt?: string;
  operator?: string;
}

interface LowStockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

interface DashboardData {
  stationsReportedToday: number;
  totalStations: number;
  productsCountedToday: number;
  lowStockAlerts: number;
  stations: StationStatus[];
  lowStockItems: LowStockItem[];
  lastUpdated: string;
}

function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconClass,
  cardClass,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: typeof CheckCircle2;
  iconClass: string;
  cardClass?: string;
}) {
  return (
    <Card
      className={cardClass}
      padding="md"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">
            {value}
          </p>
          {sublabel && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{sublabel}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${iconClass}`}>
          <Icon size={22} />
        </div>
      </div>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 md:p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-2" />
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16" />
        </div>
        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: dashboardData } = await api.get<DashboardData>(
        "/reports/dashboard"
      );
      setData(dashboardData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo cargar el dashboard.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Resumen del dia
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchData}
          loading={isLoading && !!data}
          disabled={isLoading && !data}
        >
          <RefreshCw size={14} />
          Actualizar
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        {isLoading && !data ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Estaciones reportadas"
              value={
                data
                  ? `${data.stationsReportedToday}/${data.totalStations}`
                  : "—"
              }
              sublabel="hoy"
              icon={CheckCircle2}
              iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
            />
            <StatCard
              label="Productos contados"
              value={data?.productsCountedToday ?? "—"}
              sublabel="registros hoy"
              icon={Package}
              iconClass="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            />
            <StatCard
              label="Alertas de stock"
              value={data?.lowStockAlerts ?? "—"}
              sublabel="bajo minimo"
              icon={AlertTriangle}
              iconClass={
                (data?.lowStockAlerts ?? 0) > 0
                  ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                  : "bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-slate-500"
              }
              cardClass={
                (data?.lowStockAlerts ?? 0) > 0
                  ? "border-amber-200 dark:border-amber-800"
                  : ""
              }
            />
          </>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Station status */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 text-base">
              Estado de estaciones
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Reportes de hoy
            </p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {isLoading && !data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="px-5 py-3.5 flex items-center gap-3 animate-pulse"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-700" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-28 mb-1" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-20" />
                  </div>
                </div>
              ))
            ) : data?.stations.length ? (
              data.stations.map((station) => (
                <div
                  key={station.id}
                  className="px-5 py-3.5 flex items-center gap-3"
                >
                  {station.reported ? (
                    <CheckCircle2
                      size={20}
                      className="text-emerald-500 shrink-0"
                    />
                  ) : (
                    <Clock
                      size={20}
                      className="text-gray-300 dark:text-slate-600 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                      {station.name}
                    </p>
                    {station.reported && station.reportedAt ? (
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Reportado a las {formatTime(station.reportedAt)}
                        {station.operator ? ` por ${station.operator}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Pendiente
                      </p>
                    )}
                  </div>
                  <span
                    className={[
                      "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
                      station.reported
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400",
                    ].join(" ")}
                  >
                    {station.reported ? "Listo" : "Pendiente"}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-slate-500">
                No hay estaciones configuradas.
              </div>
            )}
          </div>
        </Card>

        {/* Low stock alerts */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 text-base flex items-center gap-2">
              <TrendingDown size={18} className="text-amber-500" />
              Alertas de stock bajo
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Productos por debajo del minimo
            </p>
          </div>

          {isLoading && !data ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-1" />
                  <div className="h-3 bg-gray-100 dark:bg-slate-700/50 rounded w-24" />
                </div>
              ))}
            </div>
          ) : data?.lowStockItems.length ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {data.lowStockItems.map((item) => {
                const pct = Math.round(
                  (item.currentStock / item.minStock) * 100
                );
                return (
                  <div key={item.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {item.code} · {item.category}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                          {item.currentStock} {item.unit}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          min: {item.minStock}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 dark:bg-amber-500 rounded-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-slate-500">
                Todos los productos en niveles correctos.
              </p>
            </div>
          )}
        </Card>
      </div>

      {data?.lastUpdated && (
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 text-right">
          Ultima actualizacion: {new Date(data.lastUpdated).toLocaleTimeString("es-PE")}
        </p>
      )}
    </div>
  );
}
