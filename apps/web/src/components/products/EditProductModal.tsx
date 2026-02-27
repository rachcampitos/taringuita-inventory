"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const UNIT_OPTIONS = [
  "KG", "LT", "UN", "GR", "ML", "PORCIONES", "BANDEJAS", "BOLSAS",
  "CAJAS", "BIDONES", "LATAS", "PAQUETES", "BOTELLAS", "SOBRES",
  "ROLLOS", "FRASCOS", "POTES", "TARROS", "MALLAS", "SACOS",
];

const DELIVERY_DAYS = [
  { value: "", label: "Sin asignar" },
  { value: "LUNES", label: "Lunes" },
  { value: "MARTES", label: "Martes" },
  { value: "MIERCOLES", label: "Miercoles" },
  { value: "JUEVES", label: "Jueves" },
  { value: "VIERNES", label: "Viernes" },
];

interface ProductFull {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string };
  unitOfMeasure: string;
  unitOfOrder: string;
  conversionFactor: number;
  minStock: number | null;
  maxStock: number | null;
  wastagePercent: number;
  unitCost: number | null;
  supplier: string | null;
  deliveryDay: string | null;
  isActive: boolean;
}

interface EditProductModalProps {
  product: ProductFull | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditProductModal({
  product,
  categories,
  onClose,
  onSaved,
}: EditProductModalProps) {
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);

  // Price history
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [priceHistory, setPriceHistory] = useState<
    { id: string; unitCost: number; notes: string | null; changedAt: string }[]
  >([]);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    categoryId: "",
    unitOfMeasure: "UN",
    unitOfOrder: "UN",
    conversionFactor: 1,
    minStock: 0,
    maxStock: 0,
    wastagePercent: 0,
    unitCost: 0,
    supplier: "",
    deliveryDay: "",
    isActive: true,
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        code: product.code,
        categoryId: product.categoryId,
        unitOfMeasure: product.unitOfMeasure,
        unitOfOrder: product.unitOfOrder,
        conversionFactor: Number(product.conversionFactor) || 1,
        minStock: Number(product.minStock) || 0,
        maxStock: Number(product.maxStock) || 0,
        wastagePercent: Number(product.wastagePercent) || 0,
        unitCost: Number(product.unitCost) || 0,
        supplier: product.supplier ?? "",
        deliveryDay: product.deliveryDay ?? "",
        isActive: product.isActive,
      });
    }
  }, [product]);

  async function fetchPriceHistory() {
    if (!product) return;
    setLoadingPriceHistory(true);
    try {
      const { data } = await api.get<
        { id: string; unitCost: number; notes: string | null; changedAt: string }[]
      >(`/products/${product.id}/price-history?limit=10`);
      setPriceHistory(data);
    } catch {
      // silently fail
    } finally {
      setLoadingPriceHistory(false);
    }
  }

  function handleTogglePriceHistory() {
    const next = !priceHistoryOpen;
    setPriceHistoryOpen(next);
    if (next && priceHistory.length === 0) {
      fetchPriceHistory();
    }
  }

  if (!product) return null;

  function setField(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // Update product
      await api.patch(`/products/${product!.id}`, {
        name: form.name,
        code: form.code,
        categoryId: form.categoryId,
        unitOfMeasure: form.unitOfMeasure,
        unitOfOrder: form.unitOfOrder,
        conversionFactor: form.conversionFactor,
        minStock: form.minStock || null,
        maxStock: form.maxStock || null,
        wastagePercent: form.wastagePercent,
        unitCost: form.unitCost || null,
        supplier: form.supplier || null,
        deliveryDay: form.deliveryDay || null,
        isActive: form.isActive,
      });

      // If price changed, also update price history
      const originalCost = Number(product!.unitCost) || 0;
      if (form.unitCost > 0 && form.unitCost !== originalCost) {
        await api.patch(`/products/${product!.id}/price`, {
          unitCost: form.unitCost,
          notes: `Actualizado desde edicion de producto`,
        });
      }

      success("Producto actualizado correctamente");
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al guardar el producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Editar producto" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row: Code + Name */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Codigo
            </label>
            <Input
              value={form.code}
              onChange={(e) => setField("code", e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Nombre
            </label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            Categoria
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => setField("categoryId", e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Units row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Unidad inventario
            </label>
            <select
              value={form.unitOfMeasure}
              onChange={(e) => setField("unitOfMeasure", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Unidad pedido
            </label>
            <select
              value={form.unitOfOrder}
              onChange={(e) => setField("unitOfOrder", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {UNIT_OPTIONS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Factor conversion
            </label>
            <Input
              type="number"
              step="0.0001"
              min="0.0001"
              value={form.conversionFactor}
              onChange={(e) => setField("conversionFactor", Number(e.target.value))}
            />
          </div>
        </div>

        {/* Stock row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Stock minimo
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.minStock}
              onChange={(e) => setField("minStock", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Stock maximo
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.maxStock}
              onChange={(e) => setField("maxStock", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Merma %
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.wastagePercent}
              onChange={(e) => setField("wastagePercent", Number(e.target.value))}
            />
          </div>
        </div>

        {/* New fields: cost, supplier, delivery day */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Costo unitario
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.unitCost}
              onChange={(e) => setField("unitCost", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Proveedor
            </label>
            <Input
              value={form.supplier}
              onChange={(e) => setField("supplier", e.target.value)}
              placeholder="Nombre del proveedor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Dia de entrega
            </label>
            <select
              value={form.deliveryDay}
              onChange={(e) => setField("deliveryDay", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {DELIVERY_DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Price history */}
        <div>
          <button
            type="button"
            onClick={handleTogglePriceHistory}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {priceHistoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            Historial de precios
          </button>
          {priceHistoryOpen && (
            <Card padding="sm" className="mt-2">
              {loadingPriceHistory ? (
                <div className="animate-pulse space-y-2 py-2">
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              ) : priceHistory.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-slate-500 py-2">
                  Sin historial de precios
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {priceHistory.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="text-gray-500 dark:text-slate-400">
                        {new Date(entry.changedAt).toLocaleDateString("es-CL", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        ${Number(entry.unitCost).toLocaleString("es-CL")}
                      </span>
                      {entry.notes && (
                        <span className="text-gray-400 dark:text-slate-500 truncate max-w-[120px]">
                          {entry.notes}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setField("isActive", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-300 peer-checked:bg-emerald-600 rounded-full transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
          </label>
          <span className="text-sm text-gray-700 dark:text-slate-300">
            Producto activo
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
