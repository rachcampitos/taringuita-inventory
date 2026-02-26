"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChartCard } from "@/components/charts/ChartCard";

type TabKey = "consumo" | "costos" | "tendencias";

interface Station {
  id: string;
  name: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
}

interface ConsumptionRow {
  productId: string;
  productName: string;
  productCode: string;
  date: string;
  previousCount: number;
  production: number;
  currentCount: number;
  consumption: number;
  wastagePercent: number;
}

interface CostSummary {
  totalCost: number;
  byCategory: { categoryName: string; totalCost: number; productCount: number }[];
  weeklyTrend: { weekStart: string; totalCost: number }[];
}

interface TrendData {
  productId: string;
  productName: string;
  productCode: string;
  from: string;
  to: string;
  trend: {
    date: string;
    counts: { stationId: string; stationName: string; quantity: number }[];
    totalQuantity: number;
  }[];
}

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default function ReportsPage() {
  const { error: showError } = useToast();
  const [tab, setTab] = useState<TabKey>("consumo");
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // Shared data
  const [stations, setStations] = useState<Station[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Consumo tab
  const [selectedStation, setSelectedStation] = useState("");
  const [consumptionRows, setConsumptionRows] = useState<ConsumptionRow[]>([]);
  const [loadingConsumption, setLoadingConsumption] = useState(false);

  // Costos tab
  const [costData, setCostData] = useState<CostSummary | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);

  // Tendencias tab
  const [selectedProduct, setSelectedProduct] = useState("");
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);

  // Load stations and products on mount
  useEffect(() => {
    api.get<Station[]>("/stations").then(({ data }) => {
      setStations(data);
      if (data.length > 0) setSelectedStation(data[0].id);
    }).catch(() => {});

    api.get<{ data: Product[] }>("/products?limit=100").then(({ data: res }) => {
      setProducts(res.data);
      if (res.data.length > 0) setSelectedProduct(res.data[0].id);
    }).catch(() => {});
  }, []);

  // Load consumption
  const loadConsumption = useCallback(async () => {
    if (!selectedStation) return;
    setLoadingConsumption(true);
    try {
      const params = new URLSearchParams({
        stationId: selectedStation,
        from: dateRange.from,
        to: dateRange.to,
      });
      const { data } = await api.get<{
        rows: ConsumptionRow[];
      }>(`/reports/consumption?${params}`);
      setConsumptionRows(data.rows);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cargar datos de consumo");
    } finally {
      setLoadingConsumption(false);
    }
  }, [selectedStation, dateRange]);

  // Load costs
  const loadCosts = useCallback(async () => {
    setLoadingCost(true);
    try {
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
      });
      const { data } = await api.get<CostSummary>(`/reports/cost-summary?${params}`);
      setCostData(data);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cargar datos de costos");
    } finally {
      setLoadingCost(false);
    }
  }, [dateRange]);

  // Load trends
  const loadTrends = useCallback(async () => {
    if (!selectedProduct) return;
    setLoadingTrend(true);
    try {
      const params = new URLSearchParams({
        productId: selectedProduct,
        from: dateRange.from,
        to: dateRange.to,
      });
      const { data } = await api.get<TrendData>(`/reports/trends?${params}`);
      setTrendData(data);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cargar tendencias");
    } finally {
      setLoadingTrend(false);
    }
  }, [selectedProduct, dateRange]);

  // Auto-load on tab change
  useEffect(() => {
    if (tab === "consumo") loadConsumption();
    else if (tab === "costos") loadCosts();
    else if (tab === "tendencias") loadTrends();
  }, [tab, loadConsumption, loadCosts, loadTrends]);

  const tabs: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
    { key: "consumo", label: "Consumo", icon: ClipboardList },
    { key: "costos", label: "Costos", icon: BarChart3 },
    { key: "tendencias", label: "Tendencias", icon: TrendingUp },
  ];

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Reportes
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Analisis de consumo, costos y tendencias
          </p>
        </div>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm text-gray-500 dark:text-slate-400">Desde</label>
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))}
          className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <label className="text-sm text-gray-500 dark:text-slate-400">Hasta</label>
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))}
          className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-1 mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300",
              ].join(" ")}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Consumo */}
      {tab === "consumo" && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={loadConsumption} loading={loadingConsumption}>
              <RefreshCw size={14} /> Actualizar
            </Button>
          </div>

          {loadingConsumption ? (
            <Card padding="lg">
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </Card>
          ) : consumptionRows.length === 0 ? (
            <Card padding="lg">
              <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-8">
                No hay datos de consumo para el rango seleccionado.
              </p>
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Producto</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Fecha</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Stock ant.</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Produccion</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Stock act.</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Consumo</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Merma %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {consumptionRows.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-900 dark:text-slate-100 font-medium">{row.productName}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-slate-400">{row.date}</td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{row.previousCount}</td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{row.production}</td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{row.currentCount}</td>
                        <td className={[
                          "px-3 py-2 text-right font-medium",
                          row.consumption > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500",
                        ].join(" ")}>{row.consumption}</td>
                        <td className="px-3 py-2 text-right text-gray-500 dark:text-slate-400">{row.wastagePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Costos */}
      {tab === "costos" && (
        <div className="space-y-4">
          {loadingCost ? (
            <Card padding="lg">
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </Card>
          ) : !costData ? (
            <Card padding="lg">
              <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-8">
                No hay datos de costos disponibles.
              </p>
            </Card>
          ) : (
            <>
              {/* Total card */}
              <Card padding="md">
                <p className="text-sm text-gray-500 dark:text-slate-400">Costo total del periodo</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-slate-100 mt-1">
                  ${costData.totalCost.toLocaleString("es-CL")}
                </p>
              </Card>

              {/* Bar chart - by category */}
              {costData.byCategory.length > 0 && (
                <ChartCard title="Costo por categoria" subtitle="Distribucion de costos">
                  <BarChart data={costData.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="categoryName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString("es-CL")}`, "Costo"]} />
                    <Bar dataKey="totalCost" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartCard>
              )}

              {/* Line chart - weekly trend */}
              {costData.weeklyTrend.length > 0 && (
                <ChartCard title="Tendencia semanal de costos" subtitle="Evolucion en el tiempo">
                  <LineChart data={costData.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="weekStart" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString("es-CL")}`, "Costo semanal"]} />
                    <Line type="monotone" dataKey="totalCost" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartCard>
              )}
            </>
          )}
        </div>
      )}

      {/* Tab: Tendencias */}
      {tab === "tendencias" && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-xs"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={loadTrends} loading={loadingTrend}>
              <RefreshCw size={14} /> Actualizar
            </Button>
          </div>

          {loadingTrend ? (
            <Card padding="lg">
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            </Card>
          ) : !trendData || trendData.trend.length === 0 ? (
            <Card padding="lg">
              <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-8">
                No hay datos de tendencia para el producto seleccionado.
              </p>
            </Card>
          ) : (
            <ChartCard
              title={`Tendencia: ${trendData.productName}`}
              subtitle={`${trendData.productCode} - Stock por estacion`}
              height={350}
            >
              <LineChart data={trendData.trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalQuantity"
                  stroke="#059669"
                  strokeWidth={2}
                  name="Stock total"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}
