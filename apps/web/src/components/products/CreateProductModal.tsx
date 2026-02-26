"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

interface CreateProductModalProps {
  categories: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateProductModal({
  categories,
  onClose,
  onCreated,
}: CreateProductModalProps) {
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    categoryId: categories[0]?.id ?? "",
    unitOfMeasure: "UN",
    unitOfOrder: "UN",
    conversionFactor: 1,
    minStock: 0,
    maxStock: 0,
    wastagePercent: 0,
    unitCost: 0,
    supplier: "",
    deliveryDay: "",
  });

  function setField(field: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.code.trim() || !form.name.trim()) {
      showError("Codigo y nombre son obligatorios.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/products", {
        code: form.code.trim(),
        name: form.name.trim(),
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
      });

      success("Producto creado correctamente");
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al crear el producto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Nuevo producto" size="lg">
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
              placeholder="PROD-001"
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
              placeholder="Nombre del producto"
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

        {/* Cost, supplier, delivery day */}
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

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Creando..." : "Crear producto"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
