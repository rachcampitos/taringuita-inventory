"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Search,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Save,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Station {
  id: string;
  name: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
}

interface CountEntry {
  productId: string;
  quantity: number | "";
}

type CountMap = Record<string, number | "">;

const categoryOrder = [
  "Carnes",
  "Aves",
  "Pescados y Mariscos",
  "Lacteos",
  "Verduras",
  "Frutas",
  "Granos y Cereales",
  "Aceites y Condimentos",
  "Bebidas",
  "Otros",
];

function groupByCategory(products: Product[]): Record<string, Product[]> {
  const grouped: Record<string, Product[]> = {};
  for (const product of products) {
    if (!grouped[product.category]) {
      grouped[product.category] = [];
    }
    grouped[product.category].push(product);
  }
  return grouped;
}

function sortCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<CountMap>({});
  const [search, setSearch] = useState("");
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Load stations
  useEffect(() => {
    const load = async () => {
      try {
        // If user has pre-assigned stations, use those
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

  // Load products when station changes
  useEffect(() => {
    if (!selectedStation) {
      setProducts([]);
      setCounts({});
      return;
    }

    const load = async () => {
      setIsLoadingProducts(true);
      setCounts({});
      setSavedSuccessfully(false);

      try {
        const { data } = await api.get<Product[]>(
          `/stations/${selectedStation}/products`
        );
        setProducts(data);
        // Initialize counts to empty
        const initial: CountMap = {};
        data.forEach((p) => {
          initial[p.id] = "";
        });
        setCounts(initial);
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

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, search]);

  const grouped = useMemo(
    () => groupByCategory(filteredProducts),
    [filteredProducts]
  );

  const sortedCategories = useMemo(
    () => sortCategories(Object.keys(grouped)),
    [grouped]
  );

  const countedProducts = useMemo(
    () => Object.values(counts).filter((v) => v !== "").length,
    [counts]
  );

  const handleCountChange = (productId: string, value: string) => {
    const num = value === "" ? "" : Number(value);
    if (num !== "" && (isNaN(num as number) || (num as number) < 0)) return;
    setCounts((prev) => ({ ...prev, [productId]: num }));
  };

  const handleSave = async () => {
    if (!selectedStation) return;

    const entries: CountEntry[] = Object.entries(counts)
      .filter(([, qty]) => qty !== "")
      .map(([productId, quantity]) => ({
        productId,
        quantity: quantity as number,
      }));

    if (entries.length === 0) {
      showError("Ingresa al menos una cantidad antes de guardar.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/inventory/count/bulk", {
        stationId: selectedStation,
        counts: entries,
        countedAt: new Date().toISOString(),
      });
      setSavedSuccessfully(true);
      success(`Conteo guardado: ${entries.length} productos registrados.`, 5000);
    } catch (err) {
      if (err instanceof ApiError) {
        showError(err.message);
      } else {
        showError("No se pudo guardar el conteo. Intenta nuevamente.");
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
      <div className="sticky top-0 md:top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            Conteo de inventario
          </h1>
          {savedSuccessfully && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 size={14} />
              Guardado
            </span>
          )}
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

        {selectedStation && (
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
              Elige la estacion para comenzar el conteo.
            </p>
          </div>
        )}

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

        {!isLoadingProducts && selectedStation && products.length > 0 && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-4 text-sm">
              <span className="text-gray-500 dark:text-slate-400">
                Estacion: <strong className="text-gray-900 dark:text-slate-100">{stationName}</strong>
              </span>
              <span className="text-gray-500 dark:text-slate-400">
                <strong className="text-emerald-600 dark:text-emerald-400">{countedProducts}</strong>
                /{filteredProducts.length} contados
              </span>
            </div>

            {sortedCategories.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">
                No se encontraron productos con "{search}".
              </div>
            ) : (
              <div className="space-y-6 pb-28">
                {sortedCategories.map((category) => (
                  <section key={category}>
                    <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                      {category}
                    </h2>
                    <div className="space-y-2">
                      {grouped[category].map((product) => {
                        const qty = counts[product.id];
                        const hasValue = qty !== "";
                        const isLow =
                          hasValue && (qty as number) < product.minStock;

                        return (
                          <div
                            key={product.id}
                            className={[
                              "flex items-center gap-3 rounded-xl border px-4 py-3",
                              "bg-white dark:bg-slate-800 transition-colors",
                              hasValue
                                ? isLow
                                  ? "border-amber-300 dark:border-amber-700"
                                  : "border-emerald-300 dark:border-emerald-700"
                                : "border-gray-200 dark:border-slate-700",
                            ].join(" ")}
                          >
                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-slate-500">
                                {product.code} · min: {product.minStock} {product.unit}
                              </p>
                            </div>

                            {/* Status icon */}
                            {hasValue && (
                              <div className="shrink-0">
                                {isLow ? (
                                  <AlertTriangle
                                    size={16}
                                    className="text-amber-500"
                                    aria-label="Stock bajo minimo"
                                  />
                                ) : (
                                  <CheckCircle2
                                    size={16}
                                    className="text-emerald-500"
                                    aria-label="Stock OK"
                                  />
                                )}
                              </div>
                            )}

                            {/* Quantity input */}
                            <div className="flex items-center gap-2 shrink-0">
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                value={qty}
                                onChange={(e) =>
                                  handleCountChange(product.id, e.target.value)
                                }
                                placeholder="0"
                                aria-label={`Cantidad de ${product.name}`}
                                className={[
                                  "w-20 rounded-lg border px-3 py-1.5 text-right text-sm font-medium",
                                  "bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-slate-100",
                                  "focus:outline-none focus:ring-2 focus:ring-emerald-500",
                                  "placeholder:text-gray-300 dark:placeholder:text-slate-600",
                                  hasValue && isLow
                                    ? "border-amber-400 dark:border-amber-600"
                                    : hasValue
                                    ? "border-emerald-400 dark:border-emerald-600"
                                    : "border-gray-300 dark:border-slate-600",
                                ].join(" ")}
                              />
                              <span className="text-xs text-gray-400 dark:text-slate-500 w-8">
                                {product.unit}
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

        {!isLoadingProducts && selectedStation && products.length === 0 && (
          <div className="text-center py-12 text-sm text-gray-400 dark:text-slate-500">
            No hay productos asignados a esta estacion.
          </div>
        )}
      </div>

      {/* Fixed save button */}
      {selectedStation && products.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 px-4 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 z-10">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex-1 text-sm text-gray-500 dark:text-slate-400">
              {countedProducts > 0 ? (
                <span>
                  <strong className="text-gray-900 dark:text-slate-100">
                    {countedProducts}
                  </strong>{" "}
                  de {filteredProducts.length} productos
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
              disabled={countedProducts === 0}
            >
              <Save size={16} />
              Guardar conteo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
