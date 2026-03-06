"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Plus,
  Trash2,
  Save,
  Search,
  X,
  Clock,
  ArrowRight,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useOnlineStatus } from "@/lib/use-online-status";
import {
  queueTransformation,
  getTransformationQueue,
  deleteTransformationEntry,
  getTransformationQueueCount,
} from "@/lib/offline-queue";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface Product {
  id: string;
  code: string;
  name: string;
  unitOfMeasure: string;
  category: { id: string; name: string };
}

interface OutputItem {
  id: string;
  outputProductId: string;
  quantity: number | "";
}

interface TransformationRecord {
  id: string;
  inputQuantity: number;
  mermaQuantity: number;
  mermaPercent: number;
  date: string;
  notes: string | null;
  createdAt: string;
  inputProduct: { id: string; code: string; name: string; unitOfMeasure: string };
  recipe: { id: string; name: string } | null;
  user: { id: string; name: string };
  outputs: {
    id: string;
    quantity: number;
    outputProduct: { id: string; code: string; name: string; unitOfMeasure: string };
  }[];
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function createEmptyOutput(): OutputItem {
  return { id: generateId(), outputProductId: "", quantity: "" };
}

type Tab = "registrar" | "historial";

export default function TransformacionesPage() {
  const isOnline = useOnlineStatus();
  const { success, error: showError, info } = useToast();

  const [tab, setTab] = useState<Tab>("registrar");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);

  // Form state
  const [inputProductId, setInputProductId] = useState("");
  const [inputQuantity, setInputQuantity] = useState<number | "">("");
  const [outputs, setOutputs] = useState<OutputItem[]>([createEmptyOutput()]);
  const [notes, setNotes] = useState("");

  // Search states
  const [inputSearch, setInputSearch] = useState("");
  const [outputSearches, setOutputSearches] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  // History state
  const [history, setHistory] = useState<TransformationRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load products
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<{ data: Product[]; meta: unknown }>("/products?limit=1000&isActive=true");
        setProducts(data.data);
      } catch {
        showError("No se pudieron cargar los productos.");
      } finally {
        setIsLoadingProducts(false);
      }
    };
    load();
  }, []);

  // Check pending sync
  useEffect(() => {
    getTransformationQueueCount().then(setPendingSync).catch(() => {});
  }, []);

  // Sync offline queue when coming back online
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;

    async function syncQueue() {
      const queued = await getTransformationQueue();
      if (queued.length === 0 || cancelled) return;

      let synced = 0;
      for (const entry of queued) {
        if (cancelled) break;
        try {
          await api.post("/production/transformation", {
            inputProductId: entry.inputProductId,
            inputQuantity: entry.inputQuantity,
            date: entry.date,
            outputs: entry.outputs,
            recipeId: entry.recipeId,
            notes: entry.notes,
          });
          if (entry.id != null) {
            await deleteTransformationEntry(entry.id);
          }
          synced++;
        } catch {
          break;
        }
      }

      if (synced > 0 && !cancelled) {
        const remaining = await getTransformationQueueCount();
        setPendingSync(remaining);
        success(`Se sincronizaron ${synced} transformacion(es).`, 5000);
      }
    }

    syncQueue().catch(() => {});
    return () => { cancelled = true; };
  }, [isOnline]);

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

  // Load history when tab changes
  useEffect(() => {
    if (tab !== "historial") return;

    const load = async () => {
      setIsLoadingHistory(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await api.get<{ transformations: TransformationRecord[] }>(
          `/production/transformations?date=${today}`
        );
        setHistory(data.transformations);
      } catch {
        showError("No se pudo cargar el historial.");
      } finally {
        setIsLoadingHistory(false);
      }
    };
    load();
  }, [tab]);

  // Calculated values
  const outputSum = useMemo(() => {
    return outputs.reduce((sum, o) => {
      const qty = typeof o.quantity === "number" ? o.quantity : 0;
      return sum + qty;
    }, 0);
  }, [outputs]);

  const inputQty = typeof inputQuantity === "number" ? inputQuantity : 0;
  const mermaQty = Number(Math.max(0, inputQty - outputSum).toFixed(2));
  const mermaPercent = inputQty > 0 ? Number(((mermaQty / inputQty) * 100).toFixed(1)) : 0;

  const mermaColor = mermaPercent < 10
    ? "text-emerald-600 dark:text-emerald-400"
    : mermaPercent <= 20
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const mermaBgColor = mermaPercent < 10
    ? "bg-emerald-50 dark:bg-emerald-950/50"
    : mermaPercent <= 20
      ? "bg-amber-50 dark:bg-amber-950/50"
      : "bg-red-50 dark:bg-red-950/50";

  const rendimientoPercent = inputQty > 0 ? Number(((outputSum / inputQty) * 100).toFixed(1)) : 0;

  // Helpers
  const getProductName = (id: string) => products.find((p) => p.id === id)?.name ?? "";
  const getProductUnit = (id: string) => products.find((p) => p.id === id)?.unitOfMeasure ?? "";

  const filterProducts = useCallback(
    (search: string) => {
      const q = search.toLowerCase().trim();
      if (!q) return products;
      return products.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    },
    [products]
  );

  const addOutput = () => {
    setOutputs((prev) => [...prev, createEmptyOutput()]);
  };

  const removeOutput = (id: string) => {
    setOutputs((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOutput = (id: string, field: keyof OutputItem, value: string | number) => {
    setOutputs((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const selectInputProduct = (product: Product) => {
    setInputProductId(product.id);
    setInputSearch(product.name);
    setOpenDropdown(null);
  };

  const selectOutputProduct = (itemId: string, product: Product) => {
    updateOutput(itemId, "outputProductId", product.id);
    setOutputSearches((prev) => ({ ...prev, [itemId]: product.name }));
    setOpenDropdown(null);
  };

  const validOutputs = useMemo(
    () =>
      outputs.filter(
        (o) => o.outputProductId && o.quantity !== "" && (o.quantity as number) > 0
      ),
    [outputs]
  );

  const canSave = inputProductId && inputQty > 0 && validOutputs.length > 0 && outputSum <= inputQty;

  const resetForm = () => {
    setInputProductId("");
    setInputQuantity("");
    setInputSearch("");
    setOutputs([createEmptyOutput()]);
    setOutputSearches({});
    setNotes("");
  };

  const handleSave = async () => {
    if (!canSave) return;

    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      inputProductId,
      inputQuantity: inputQty,
      date: today,
      outputs: validOutputs.map((o) => ({
        outputProductId: o.outputProductId,
        quantity: o.quantity as number,
      })),
      notes: notes.trim() || undefined,
    };

    if (!isOnline) {
      try {
        await queueTransformation(
          payload.inputProductId,
          payload.inputQuantity,
          payload.date,
          payload.outputs,
          undefined,
          payload.notes
        );
        const count = await getTransformationQueueCount();
        setPendingSync(count);
        info(
          `Transformacion guardada offline (${count} pendiente${count > 1 ? "s" : ""}). Se sincronizara automaticamente.`,
          5000
        );
        resetForm();
      } catch {
        showError("No se pudo guardar la transformacion offline.");
      }
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/production/transformation", payload);
      success("Transformacion registrada correctamente.", 5000);
      resetForm();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("No se pudo guardar la transformacion.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputFilteredProducts = filterProducts(inputSearch);

  return (
    <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Cuarto de Produccion
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Transforma materia prima bruta en productos porcionados.
        </p>
      </div>

      {/* Pending sync badge */}
      {pendingSync > 0 && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-sm font-medium">
          <Clock size={16} />
          {pendingSync} transformacion(es) pendiente(s) de sincronizar
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-slate-700/50 rounded-xl p-1">
        <button
          onClick={() => setTab("registrar")}
          className={[
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
            tab === "registrar"
              ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm"
              : "text-gray-500 dark:text-slate-400",
          ].join(" ")}
        >
          Registrar
        </button>
        <button
          onClick={() => setTab("historial")}
          className={[
            "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
            tab === "historial"
              ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm"
              : "text-gray-500 dark:text-slate-400",
          ].join(" ")}
        >
          Historial
        </button>
      </div>

      {/* Loading */}
      {isLoadingProducts && (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* REGISTRAR TAB */}
      {tab === "registrar" && !isLoadingProducts && (
        <div ref={dropdownContainerRef}>
          {/* Entrada (materia prima) */}
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Entrada (materia prima)
            </h2>
            <Card padding="sm">
              {/* Product search */}
              <div className="mb-3 relative">
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                  Producto de entrada
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={inputSearch}
                    onChange={(e) => {
                      setInputSearch(e.target.value);
                      setOpenDropdown("input");
                      if (!e.target.value && inputProductId) {
                        setInputProductId("");
                      }
                    }}
                    onFocus={() => setOpenDropdown("input")}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 pl-9 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  {inputSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputSearch("");
                        setInputProductId("");
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {openDropdown === "input" && inputFilteredProducts.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg">
                    {inputFilteredProducts.slice(0, 50).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => selectInputProduct(product)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors border-b border-gray-100 dark:border-slate-600 last:border-0"
                      >
                        <p className="font-medium text-gray-900 dark:text-slate-100">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {product.code} - {product.unitOfMeasure} - {product.category.name}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                  Cantidad {inputProductId && `(${getProductUnit(inputProductId)})`}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0"
                  value={inputQuantity}
                  onChange={(e) =>
                    setInputQuantity(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </Card>
          </div>

          {/* Salidas (rendimiento) */}
          <div className="mb-2 mt-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Salidas (rendimiento)
            </h2>
            <div className="space-y-3">
              {outputs.map((item, index) => {
                const unit = item.outputProductId ? getProductUnit(item.outputProductId) : "";
                const filtered = filterProducts(outputSearches[item.id] ?? "");
                const isDropdownOpen = openDropdown === `output-${item.id}`;

                return (
                  <Card key={item.id} padding="sm" className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold text-gray-400 dark:text-slate-500 w-5">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                        {item.outputProductId
                          ? getProductName(item.outputProductId)
                          : `Salida ${index + 1}`}
                      </span>
                      {outputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOutput(item.id)}
                          aria-label="Eliminar salida"
                          className="text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {/* Product selector */}
                    <div className="mb-3 relative">
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Producto de salida
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          value={outputSearches[item.id] ?? ""}
                          onChange={(e) => {
                            setOutputSearches((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }));
                            setOpenDropdown(`output-${item.id}`);
                            if (!e.target.value && item.outputProductId) {
                              updateOutput(item.id, "outputProductId", "");
                            }
                          }}
                          onFocus={() => setOpenDropdown(`output-${item.id}`)}
                          className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 pl-9 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <Search
                          size={14}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        {outputSearches[item.id] && (
                          <button
                            type="button"
                            onClick={() => {
                              setOutputSearches((prev) => ({
                                ...prev,
                                [item.id]: "",
                              }));
                              updateOutput(item.id, "outputProductId", "");
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {isDropdownOpen && filtered.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg">
                          {filtered.slice(0, 50).map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => selectOutputProduct(item.id, product)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors border-b border-gray-100 dark:border-slate-600 last:border-0"
                            >
                              <p className="font-medium text-gray-900 dark:text-slate-100">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-slate-500">
                                {product.code} - {product.unitOfMeasure} - {product.category.name}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                        Cantidad {unit && `(${unit})`}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.01"
                        step="0.01"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) =>
                          updateOutput(
                            item.id,
                            "quantity",
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={addOutput}
              className="w-full mt-3 border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-600"
            >
              <Plus size={16} />
              Agregar salida
            </Button>
          </div>

          {/* Merma (calculated) */}
          {inputQty > 0 && (
            <div className="mt-5 mb-4">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Merma (calculada)
              </h2>
              <Card padding="sm" className={mermaBgColor}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Merma
                  </span>
                  <span className={`text-lg font-bold ${mermaColor}`}>
                    {mermaQty} {inputProductId ? getProductUnit(inputProductId) : ""} ({mermaPercent}%)
                  </span>
                </div>

                {/* Visual bar */}
                <div className="w-full h-3 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-emerald-500 transition-all duration-300"
                      style={{ width: `${rendimientoPercent}%` }}
                    />
                    <div
                      className={[
                        "transition-all duration-300",
                        mermaPercent < 10
                          ? "bg-emerald-300"
                          : mermaPercent <= 20
                            ? "bg-amber-400"
                            : "bg-red-500",
                      ].join(" ")}
                      style={{ width: `${mermaPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                  <span>Rendimiento: {rendimientoPercent}%</span>
                  <span>Merma: {mermaPercent}%</span>
                </div>

                {outputSum > inputQty && (
                  <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    La suma de salidas supera la entrada. Corrige las cantidades.
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* Notes */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
              Notas (opcional)
            </label>
            <input
              type="text"
              placeholder="Observaciones sobre la transformacion..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Save button */}
          <div className="fixed bottom-16 md:bottom-0 inset-x-0 px-4 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-slate-700 z-10">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <div className="flex-1 text-sm text-gray-500 dark:text-slate-400">
                {canSave ? (
                  <span>
                    <strong className="text-gray-900 dark:text-slate-100">
                      {validOutputs.length}
                    </strong>{" "}
                    salida{validOutputs.length !== 1 ? "s" : ""} lista{validOutputs.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  "Completa la entrada y al menos una salida"
                )}
              </div>
              <Button
                variant="primary"
                size="md"
                loading={isSaving}
                onClick={handleSave}
                disabled={!canSave}
              >
                <Save size={16} />
                Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIAL TAB */}
      {tab === "historial" && (
        <div>
          {isLoadingHistory && (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoadingHistory && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-medium text-gray-700 dark:text-slate-300 mb-1">
                Sin transformaciones hoy
              </p>
              <p className="text-sm text-gray-400 dark:text-slate-500">
                Las transformaciones registradas hoy aparaceran aqui.
              </p>
            </div>
          )}

          {!isLoadingHistory && history.length > 0 && (
            <div className="space-y-3">
              {history.map((t) => {
                const tMermaColor =
                  t.mermaPercent < 10
                    ? "text-emerald-600 dark:text-emerald-400"
                    : t.mermaPercent <= 20
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400";

                return (
                  <Card key={t.id} padding="sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                          {t.inputProduct.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {t.inputQuantity} {t.inputProduct.unitOfMeasure} - {t.user.name}
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${tMermaColor}`}>
                        {t.mermaPercent}% merma
                      </span>
                    </div>

                    <div className="space-y-1 mt-2">
                      {t.outputs.map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400"
                        >
                          <ArrowRight size={12} className="text-emerald-500 shrink-0" />
                          <span>
                            {o.outputProduct.name}: <strong>{o.quantity}</strong>{" "}
                            {o.outputProduct.unitOfMeasure}
                          </span>
                        </div>
                      ))}
                    </div>

                    {t.notes && (
                      <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 italic">
                        {t.notes}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
                      {new Date(t.createdAt).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
