"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Plus,
  DollarSign,
  Save,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RecipeIngredientRow, type IngredientData } from "./RecipeIngredientRow";

interface RecipeData {
  id: string;
  name: string;
  outputProductId: string;
  outputProduct: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
  };
  outputQuantity: number;
  instructions: string | null;
  ingredients: IngredientData[];
}

interface CostBreakdown {
  recipeId: string;
  recipeName: string;
  outputQuantity: number;
  totalCost: number;
  costPerUnit: number;
  breakdown: {
    ingredientId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    lineCost: number;
  }[];
}

interface ProductOption {
  id: string;
  code: string;
  name: string;
}

interface RecipeDetailProps {
  recipe: RecipeData;
  products: ProductOption[];
  onBack: () => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

export function RecipeDetail({
  recipe,
  products,
  onBack,
  onRefresh,
  onDelete,
  isAdmin,
}: RecipeDetailProps) {
  const { success, error: showError } = useToast();

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(recipe.name);
  const [editInstructions, setEditInstructions] = useState(recipe.instructions ?? "");
  const [editOutputQty, setEditOutputQty] = useState(String(Number(recipe.outputQuantity)));
  const [saving, setSaving] = useState(false);

  // Add ingredient
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newQty, setNewQty] = useState("");
  const [addingIngredient, setAddingIngredient] = useState(false);

  // Cost
  const [costData, setCostData] = useState<CostBreakdown | null>(null);
  const [loadingCost, setLoadingCost] = useState(false);

  const totalCostEstimate = useMemo(() => {
    return recipe.ingredients.reduce((sum, ing) => {
      const cost = ing.product.unitCost ? Number(ing.product.unitCost) : 0;
      return sum + cost * Number(ing.quantity);
    }, 0);
  }, [recipe.ingredients]);

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await api.patch(`/recipes/${recipe.id}`, {
        name: editName,
        instructions: editInstructions || null,
        outputQuantity: parseFloat(editOutputQty),
      });
      success("Receta actualizada");
      setEditMode(false);
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al actualizar receta");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateIngredientQty(ingredientId: string, qty: number) {
    try {
      await api.patch(`/recipes/${recipe.id}/ingredients/${ingredientId}`, {
        quantity: qty,
      });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al actualizar ingrediente");
    }
  }

  async function handleDeleteIngredient(ingredientId: string) {
    try {
      await api.delete(`/recipes/${recipe.id}/ingredients/${ingredientId}`);
      success("Ingrediente eliminado");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al eliminar ingrediente");
    }
  }

  async function handleAddIngredient(e: React.FormEvent) {
    e.preventDefault();
    setAddingIngredient(true);
    try {
      await api.post(`/recipes/${recipe.id}/ingredients`, {
        productId: newProductId,
        quantity: parseFloat(newQty),
      });
      success("Ingrediente agregado");
      setShowAddIngredient(false);
      setNewProductId("");
      setNewQty("");
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al agregar ingrediente");
    } finally {
      setAddingIngredient(false);
    }
  }

  async function handleLoadCost() {
    setLoadingCost(true);
    try {
      const { data } = await api.get<CostBreakdown>(`/recipes/${recipe.id}/cost`);
      setCostData(data);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al calcular costo");
    } finally {
      setLoadingCost(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={onBack}
          className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-slate-300 dark:hover:bg-slate-700"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          {editMode ? (
            <div className="space-y-3">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xl font-bold rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-slate-400">Cant. producida:</label>
                <input
                  type="number"
                  value={editOutputQty}
                  onChange={(e) => setEditOutputQty(e.target.value)}
                  className="w-24 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                rows={3}
                placeholder="Instrucciones de preparacion..."
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleSaveEdit} loading={saving}>
                  <Save size={14} /> Guardar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                  <X size={14} /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {recipe.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                Produce: {Number(recipe.outputQuantity)} {recipe.outputProduct.unitOfMeasure} de {recipe.outputProduct.name}
                {" "} - {recipe.ingredients.length} ingredientes
              </p>
              {recipe.instructions && (
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 italic">
                  {recipe.instructions}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {isAdmin && !editMode && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="secondary" size="sm" onClick={() => setEditMode(true)}>
            <Edit3 size={14} /> Editar
          </Button>
          <Button variant="secondary" size="sm" onClick={handleLoadCost} loading={loadingCost}>
            <DollarSign size={14} /> Calcular costo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(recipe.id)}
          >
            <Trash2 size={14} /> Eliminar
          </Button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <p className="text-xs text-gray-500 dark:text-slate-400">Ingredientes</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{recipe.ingredients.length}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 dark:text-slate-400">Produccion</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {Number(recipe.outputQuantity)} {recipe.outputProduct.unitOfMeasure}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 dark:text-slate-400">Costo estimado</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
            ${totalCostEstimate.toLocaleString("es-CL")}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 dark:text-slate-400">Costo/unidad</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
            ${Number(recipe.outputQuantity) > 0
              ? Math.round(totalCostEstimate / Number(recipe.outputQuantity)).toLocaleString("es-CL")
              : "0"}
          </p>
        </Card>
      </div>

      {/* Cost breakdown */}
      {costData && (
        <Card padding="md" className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">
            Desglose de costos
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Costo total</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                ${costData.totalCost.toLocaleString("es-CL")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-400">Costo por unidad</p>
              <p className="font-bold text-emerald-700 dark:text-emerald-300">
                ${costData.costPerUnit.toLocaleString("es-CL", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Ingredients table */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">
          Ingredientes
        </h3>
        {isAdmin && (
          <Button variant="secondary" size="sm" onClick={() => setShowAddIngredient(true)}>
            <Plus size={14} /> Agregar
          </Button>
        )}
      </div>

      {/* Add ingredient form */}
      {showAddIngredient && (
        <Card padding="md" className="mb-4">
          <form onSubmit={handleAddIngredient} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Producto</label>
              <select
                value={newProductId}
                onChange={(e) => setNewProductId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Seleccionar producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Cantidad</label>
              <input
                type="number"
                min="0.0001"
                step="0.1"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <Button type="submit" variant="primary" size="sm" loading={addingIngredient}>
              Agregar
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddIngredient(false)}>
              Cancelar
            </Button>
          </form>
        </Card>
      )}

      {recipe.ingredients.length === 0 ? (
        <Card padding="lg">
          <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-4">
            Esta receta no tiene ingredientes.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Codigo</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Ingrediente</th>
                  <th className="text-center px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Unidad</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Cantidad</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Costo unit.</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Subtotal</th>
                  {isAdmin && <th className="px-3 py-2 w-10" />}
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((ing) => (
                  <RecipeIngredientRow
                    key={ing.id}
                    ingredient={ing}
                    editable={isAdmin}
                    onUpdateQty={handleUpdateIngredientQty}
                    onDelete={handleDeleteIngredient}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
