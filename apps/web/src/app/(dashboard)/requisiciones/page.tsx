"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Save,
  X,
  ArrowRight,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import { useOnlineStatus } from "@/lib/use-online-status";
import {
  queueRequisition,
  getRequisitionQueue,
  deleteRequisitionEntry,
  getRequisitionQueueCount,
} from "@/lib/offline-queue";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

interface Station {
  id: string;
  name: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  unitOfMeasure: string;
  sortOrder: number;
  countedQuantity: number | null;
  notes: string | null;
  countedBy: { id: string; name: string } | null;
}

interface CategoryGroup {
  category: { id: string; name: string };
  products: Product[];
}

interface StationCountsResponse {
  stationId: string;
  stationName: string;
  date: string;
  totalProducts: number;
  countedProducts: number;
  isComplete: boolean;
  categories: CategoryGroup[];
}

interface RequisitionItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    category: { id: string; name: string };
  };
}

interface RequisitionRecord {
  id: string;
  date: string;
  notes: string | null;
  createdAt: string;
  station: { id: string; name: string };
  user: { id: string; name: string };
  items: RequisitionItem[];
}

type CountMap = Record<string, number | "">;

export default function RequisicionesPage() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const { success, error: showError, info } = useToast();

  const [tab, setTab] = useState<"registrar" | "historial">("registrar");
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [counts, setCounts] = useState<CountMap>({});
  const [search, setSearch] = useState("");
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);

  // Historial state
  const [history, setHistory] = useState<RequisitionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const initialCountsRef = useRef<string>("");

  const hasUnsavedChanges = useMemo(() => {
    if (!initialCountsRef.current) return false;
    return JSON.stringify(counts) !== initialCountsRef.current;
  }, [counts]);

  useUnsavedChanges(hasUnsavedChanges);

  // Check pending offline queue on mount
  useEffect(() => {
    getRequisitionQueueCount().then(setPendingSync).catch(() => {});
  }, []);

  // Sync offline queue when coming back online
  useEffect(() => {
    if (!isOnline) return;

    let cancelled = false;

    async function syncQueue() {
      const queued = await getRequisitionQueue();
      if (queued.length === 0 || cancelled) return;

      let synced = 0;
      for (const entry of queued) {
        if (cancelled) break;
        try {
          await api.post("/inventory/requisition", {
            stationId: entry.stationId,
            date: entry.date,
            items: entry.items,
            notes: entry.notes,
          });
          if (entry.id != null) {
            await deleteRequisitionEntry(entry.id);
          }
          synced++;
        } catch {
          break;
        }
      }

      if (synced > 0 && !cancelled) {
        const remaining = await getRequisitionQueueCount();
        setPendingSync(remaining);
        success(`Se sincronizaron ${synced} requisicion(es) pendiente(s).`, 5000);
      }
    }

    syncQueue().catch(() => {});

    return () => { cancelled = true; };
  }, [isOnline]);

  // Load stations
  useEffect(() => {
    const load = async () => {
      try {
        if (user?.stations && user.stations.length > 0) {
          setStations(user.stations);
          if (user.stations.length === 1) {
            setSelectedStation(user.stations[0].id);
          }
        } else {
          const { data } = await api.get<Station[]>("/stations");
          setStations(data);
          if (data.length === 1) {
            setSelectedStation(data[0].id);
          }
        }
      } catch {
        showError("No se pudieron cargar las estaciones.");
      } finally {
        setIsLoadingStations(false);
      }
    };
    load();
  }, [user]);

  // Load products when station changes (get product list only, no pre-populated values)
  useEffect(() => {
    if (!selectedStation) {
      setCategories([]);
      setCounts({});
      setTotalProducts(0);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const load = async () => {
      setIsLoadingProducts(true);
      setCounts({});
      setSavedSuccessfully(false);

      try {
        const { data } = await api.get<StationCountsResponse>(
          `/inventory/station/${selectedStation}?date=${today}`
        );
        setCategories(data.categories);
        setTotalProducts(data.totalProducts);
        // Initialize all counts as empty (not pre-populated from existing counts)
        const initial: CountMap = {};
        for (const cat of data.categories) {
          for (const p of cat.products) {
            initial[p.id] = "";
          }
        }
        setCounts(initial);
        initialCountsRef.current = JSON.stringify(initial);
      } catch (err) {
        if (err instanceof ApiError) {
          showError(err.message);
        } else {
          showError("No se pudieron cargar los productos.");
        }
      } finally {
        setIsLoadingProducts(false);
      }
    };

    load();
  }, [selectedStation]);

  // Load historial when switching to that tab
  useEffect(() => {
    if (tab !== "historial" || !selectedStation) return;

    const today = new Date().toISOString().slice(0, 10);

    const load = async () => {
      setIsLoadingHistory(true);
      try {
        const { data } = await api.get<{
          requisitions: RequisitionRecord[];
        }>(`/inventory/requisitions/${selectedStation}?date=${today}`);
        setHistory(data.requisitions);
      } catch {
        showError("No se pudo cargar el historial de requisiciones.");
      } finally {
        setIsLoadingHistory(false);
      }
    };

    load();
  }, [tab, selectedStation]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            cat.category.name.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, search]);

  const filledProducts = useMemo(
    () => Object.values(counts).filter((v) => v !== "" && v !== undefined && Number(v) > 0).length,
    [counts]
  );

  const allProducts = useMemo(
    () => categories.flatMap((c) => c.products),
    [categories]
  );

  const handleCountChange = (productId: string, value: string) => {
    const num = value === "" ? "" : Number(value);
    if (num !== "" && (isNaN(num as number) || (num as number) < 0 || (num as number) > 9999)) return;
    setCounts((prev) => ({ ...prev, [productId]: num }));
    setSavedSuccessfully(false);
  };

  const handleSave = async () => {
    if (!selectedStation) return;

    const items = Object.entries(counts)
      .filter(([, qty]) => qty !== "" && qty !== undefined && Number(qty) > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity: quantity as number,
      }));

    if (items.length === 0) {
      showError("Ingresa al menos una cantidad antes de guardar.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    if (!isOnline) {
      try {
        await queueRequisition(selectedStation, today, items);
        const count = await getRequisitionQueueCount();
        setPendingSync(count);
        setSavedSuccessfully(true);
        // Reset counts to empty after saving
        const reset: CountMap = {};
        for (const key of Object.keys(counts)) {
          reset[key] = "";
        }
        setCounts(reset);
        initialCountsRef.current = JSON.stringify(reset);
        info(`Requisicion guardada offline (${count} pendiente${count > 1 ? "s" : ""}). Se sincronizara automaticamente.`, 5000);
      } catch {
        showError("No se pudo guardar la requisicion offline.");
      }
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/inventory/requisition", {
        stationId: selectedStation,
        date: today,
        items,
      });
      setSavedSuccessfully(true);
      // Reset counts to empty after saving
      const reset: CountMap = {};
      for (const key of Object.keys(counts)) {
        reset[key] = "";
      }
      setCounts(reset);
      initialCountsRef.current = JSON.stringify(reset);
      success(`Requisicion guardada: ${items.length} productos registrados.`, 5000);
    } catch (err) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else {
        showError("No se pudo guardar la requisicion. Intenta nuevamente.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const stationName =
    stations.find((s) => s.id === selectedStation)?.name ?? "";

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky top bar */}
      <div className="sticky top-[53px] md:top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Requisicion de Almacenamiento
          </h1>
          <div className="flex items-center gap-3">
            {pendingSync > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle size={14} />
                {pendingSync} pendiente{pendingSync > 1 ? "s" : ""}
              </span>
            )}
            {savedSuccessfully && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 size={14} />
                Guardado
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-slate-700 rounded-xl">
          <button
            onClick={() => setTab("registrar")}
            className={[
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === "registrar"
                ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm"
                : "text-gray-500 dark:text-slate-400",
            ].join(" ")}
          >
            Registrar
          </button>
          <button
            onClick={() => setTab("historial")}
            className={[
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === "historial"
                ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm"
                : "text-gray-500 dark:text-slate-400",
            ].join(" ")}
          >
            Historial
          </button>
        </div>

        {/* Station selector */}
        {!isLoadingStations && stations.length > 1 && (
          <div className="relative">
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 pr-10 text-sm font-medium text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Seleccionar estacion"
            >
              <option value="">-- Selecciona una estacion --</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        )}

        {tab === "registrar" && selectedStation && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                ref={searchRef}
                type="search"
                placeholder="Buscar producto o codigo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search size={16} />}
                rightIcon={
                  search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Limpiar busqueda"
                    >
                      <X size={14} />
                    </button>
                  ) : null
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        {isLoadingStations && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoadingStations && !selectedStation && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
              <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="font-medium text-gray-700 dark:text-slate-300 mb-1">
              Selecciona una estacion
            </p>
            <p className="text-sm text-gray-400 dark:text-slate-500">
              Elige la estacion destino para la requisicion.
            </p>
          </div>
        )}

        {/* REGISTRAR TAB */}
        {tab === "registrar" && (
          <>
            {isLoadingProducts && (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, ci) => (
                  <div key={ci} className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-3" />
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-14 bg-gray-100 dark:bg-slate-700/50 rounded-xl"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoadingProducts && selectedStation && allProducts.length > 0 && (
              <>
                {/* Summary bar */}
                <div className="flex items-center justify-between mb-4 text-sm">
                  <span className="text-gray-500 dark:text-slate-400">
                    Estacion: <strong className="text-gray-900 dark:text-slate-100 capitalize">{stationName}</strong>
                  </span>
                  <span className="text-gray-500 dark:text-slate-400">
                    <strong className="text-emerald-600 dark:text-emerald-400">{filledProducts}</strong>
                    {" "}requisitados
                  </span>
                </div>

                {filteredCategories.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">
                    No se encontraron productos con &ldquo;{search}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-6 pb-28">
                    {filteredCategories.map((catGroup) => (
                      <section key={catGroup.category.id}>
                        <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                          {catGroup.category.name}
                        </h2>
                        <div className="space-y-2">
                          {catGroup.products.map((product) => {
                            const qty = counts[product.id];
                            const hasValue = qty !== "" && qty !== undefined && Number(qty) > 0;

                            return (
                              <div
                                key={product.id}
                                className={[
                                  "flex items-center gap-3 rounded-xl border px-4 py-3.5 min-h-[44px]",
                                  "bg-white dark:bg-slate-800 transition-colors",
                                  hasValue
                                    ? "border-emerald-300 dark:border-emerald-700"
                                    : "border-gray-200 dark:border-slate-700",
                                ].join(" ")}
                              >
                                {/* Product info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-slate-500">
                                    {product.code} &middot; {product.unitOfMeasure}
                                  </p>
                                </div>

                                {/* Status icon */}
                                {hasValue && (
                                  <div className="shrink-0">
                                    <CheckCircle2
                                      size={16}
                                      className="text-emerald-500"
                                      aria-label="Requisitado"
                                    />
                                  </div>
                                )}

                                {/* Quantity input */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    max="9999"
                                    step="0.1"
                                    value={qty ?? ""}
                                    onChange={(e) =>
                                      handleCountChange(product.id, e.target.value)
                                    }
                                    placeholder="0"
                                    aria-label={`Cantidad de ${product.name}`}
                                    className={[
                                      "w-20 rounded-lg border px-3 py-2.5 text-right text-sm font-medium min-h-[44px]",
                                      "bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100",
                                      "focus:outline-none focus:ring-2 focus:ring-emerald-500",
                                      "placeholder:text-gray-300 dark:placeholder:text-slate-600",
                                      hasValue
                                        ? "border-emerald-400 dark:border-emerald-600"
                                        : "border-gray-300 dark:border-slate-600",
                                    ].join(" ")}
                                  />
                                  <span className="text-xs text-gray-400 dark:text-slate-500 w-8">
                                    {product.unitOfMeasure}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}

            {!isLoadingProducts && selectedStation && allProducts.length === 0 && (
              <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">
                No hay productos asignados a esta estacion.
              </div>
            )}
          </>
        )}

        {/* HISTORIAL TAB */}
        {tab === "historial" && selectedStation && (
          <div>
            {isLoadingHistory && (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoadingHistory && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Sin requisiciones hoy
                </p>
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  Las requisiciones registradas hoy apareceran aqui.
                </p>
              </div>
            )}

            {!isLoadingHistory && history.length > 0 && (
              <div className="space-y-3">
                {history.map((r) => (
                  <Card key={r.id} padding="sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100 text-sm capitalize">
                          {r.station.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {r.items.length} producto{r.items.length > 1 ? "s" : ""} - {r.user.name}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {new Date(r.createdAt).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="space-y-1 mt-2">
                      {r.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400"
                        >
                          <ArrowRight size={12} className="text-emerald-500 shrink-0" />
                          <span className="flex-1 truncate">{item.product.name}</span>
                          <span className="font-medium">
                            {item.quantity} {item.product.unitOfMeasure}
                          </span>
                        </div>
                      ))}
                    </div>

                    {r.notes && (
                      <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 italic">
                        {r.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed save button */}
      {tab === "registrar" && selectedStation && allProducts.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 px-4 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 z-10">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex-1 text-sm text-gray-500 dark:text-slate-400">
              {filledProducts > 0 ? (
                <span>
                  <strong className="text-gray-900 dark:text-slate-100">
                    {filledProducts}
                  </strong>{" "}
                  producto{filledProducts > 1 ? "s" : ""}
                </span>
              ) : (
                "Ingresa las cantidades"
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              loading={isSaving}
              onClick={handleSave}
              disabled={filledProducts === 0}
            >
              <Save size={16} />
              Guardar requisicion
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
