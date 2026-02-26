"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Search,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
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
  category: { id: string; name: string };
}

interface ProductionItem {
  id: string;
  productId: string;
  quantity: number | "";
  notes: string;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function createEmptyItem(): ProductionItem {
  return {
    id: generateId(),
    productId: "",
    quantity: "",
    notes: "",
  };
}

export default function ProductionPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ProductionItem[]>([createEmptyItem()]);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openDropdown]);

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
          if (data.length === 1) setSelectedStation(data[0].id);
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
      return;
    }

    const load = async () => {
      setIsLoadingProducts(true);
      try {
        const { data } = await api.get<{ stationId: string; stationName: string; products: Product[] }>(
          `/products/by-station/${selectedStation}`
        );
        setProducts(data.products);
      } catch (err) {
        if (err instanceof ApiError) showError(err.message);
        else showError("No se pudieron cargar los productos.");
      } finally {
        setIsLoadingProducts(false);
      }
    };

    load();
  }, [selectedStation]);

  const filteredProductsFor = (itemId: string): Product[] => {
    const q = (productSearch[itemId] ?? "").toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    );
  };

  const updateItem = (id: string, field: keyof ProductionItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const selectProduct = (itemId: string, product: Product) => {
    updateItem(itemId, "productId", product.id);
    setProductSearch((prev) => ({ ...prev, [itemId]: product.name }));
    setOpenDropdown(null);
  };

  const validItems = useMemo(
    () =>
      items.filter(
        (item) => item.productId && item.quantity !== "" && (item.quantity as number) > 0
      ),
    [items]
  );

  useUnsavedChanges(validItems.length > 0);

  const handleSave = async () => {
    if (!selectedStation) return;

    if (validItems.length === 0) {
      showError("Agrega al menos un producto con cantidad valida.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/production/log/bulk", {
        stationId: selectedStation,
        date: new Date().toISOString().slice(0, 10),
        items: validItems.map((item) => ({
          productId: item.productId,
          quantityProduced: item.quantity,
          notes: item.notes.trim() || undefined,
        })),
      });
      success(`Produccion registrada: ${validItems.length} items.`, 5000);
      setItems([createEmptyItem()]);
      setProductSearch({});
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("No se pudo guardar la produccion.");
    } finally {
      setIsSaving(false);
    }
  };

  const getProductName = (productId: string): string => {
    return products.find((p) => p.id === productId)?.name ?? "";
  };

  const getProductUnit = (productId: string): string => {
    return products.find((p) => p.id === productId)?.unitOfMeasure ?? "";
  };

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Registro de produccion
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Registra los productos elaborados hoy.
        </p>
      </div>

      {/* Station selector */}
      {!isLoadingStations && stations.length > 1 && (
        <div className="mb-5 relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
            Estacion
          </label>
          <div className="relative">
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 pr-10 text-sm font-medium text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
        </div>
      )}

      {/* Station badge if only one */}
      {!isLoadingStations && stations.length === 1 && selectedStation && (
        <div className="mb-4">
          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {stations[0].name}
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoadingProducts && (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Items list */}
      {selectedStation && !isLoadingProducts && (
        <>
          <div ref={dropdownContainerRef} className="space-y-3 mb-4">
            {items.map((item, index) => {
              const productName = item.productId
                ? getProductName(item.productId)
                : "";
              const unit = item.productId ? getProductUnit(item.productId) : "";
              const filtered = filteredProductsFor(item.id);
              const isDropdownOpen = openDropdown === item.id;

              return (
                <Card key={item.id} padding="sm" className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-400 dark:text-slate-500 w-5">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                      {productName || "Producto " + (index + 1)}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label="Eliminar item"
                        className="text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Product selector with search */}
                  <div className="mb-3 relative">
                    <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                      Producto
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar producto..."
                        value={productSearch[item.id] ?? ""}
                        onChange={(e) => {
                          setProductSearch((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }));
                          setOpenDropdown(item.id);
                          if (!e.target.value && item.productId) {
                            updateItem(item.id, "productId", "");
                          }
                        }}
                        onFocus={() => setOpenDropdown(item.id)}
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 pl-9 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <Search
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      {productSearch[item.id] && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearch((prev) => ({
                              ...prev,
                              [item.id]: "",
                            }));
                            updateItem(item.id, "productId", "");
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Dropdown */}
                    {isDropdownOpen && filtered.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg">
                        {filtered.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => selectProduct(item.id, product)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors border-b border-gray-100 dark:border-slate-600 last:border-0"
                          >
                            <p className="font-medium text-gray-900 dark:text-slate-100">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              {product.code} · {product.unitOfMeasure} · {product.category.name}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Cantidad {unit && `(${unit})`}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            item.id,
                            "quantity",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Notas (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Observaciones..."
                        value={item.notes}
                        onChange={(e) =>
                          updateItem(item.id, "notes", e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Add item button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={addItem}
            className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-600 mb-6"
          >
            <Plus size={16} />
            Agregar otro producto
          </Button>

          {/* Save button */}
          <div className="fixed bottom-16 md:bottom-0 inset-x-0 px-4 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 z-10">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <div className="flex-1 text-sm text-gray-500 dark:text-slate-400">
                {validItems.length > 0 ? (
                  <span>
                    <strong className="text-gray-900 dark:text-slate-100">
                      {validItems.length}
                    </strong>{" "}
                    items listos para guardar
                  </span>
                ) : (
                  "Completa al menos un item"
                )}
              </div>
              <Button
                variant="primary"
                size="md"
                loading={isSaving}
                onClick={handleSave}
                disabled={validItems.length === 0}
              >
                <Save size={16} />
                Guardar produccion
              </Button>
            </div>
          </div>
        </>
      )}

      {!isLoadingStations && !selectedStation && stations.length > 1 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="font-medium text-gray-700 dark:text-slate-300 mb-1">
            Selecciona una estacion
          </p>
          <p className="text-sm text-gray-400 dark:text-slate-500">
            Elige la estacion de produccion para continuar.
          </p>
        </div>
      )}
    </div>
  );
}
