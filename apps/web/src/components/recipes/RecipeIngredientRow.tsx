"use client";

import { useState } from "react";
import { Check, X, Trash2 } from "lucide-react";

export interface IngredientData {
  id: string;
  productId: string;
  product: {
    id: string;
    code: string;
    name: string;
    unitOfMeasure: string;
    unitCost: number | null;
  };
  quantity: number;
}

interface RecipeIngredientRowProps {
  ingredient: IngredientData;
  editable: boolean;
  onUpdateQty: (ingredientId: string, qty: number) => void;
  onDelete: (ingredientId: string) => void;
}

export function RecipeIngredientRow({
  ingredient,
  editable,
  onUpdateQty,
  onDelete,
}: RecipeIngredientRowProps) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(Number(ingredient.quantity)));

  const unitCost = ingredient.product.unitCost ? Number(ingredient.product.unitCost) : 0;
  const lineCost = unitCost * Number(ingredient.quantity);

  function handleSave() {
    const val = parseFloat(qty);
    if (!isNaN(val) && val > 0) {
      onUpdateQty(ingredient.id, val);
    }
    setEditing(false);
  }

  return (
    <tr className="border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <td className="px-3 py-2">
        <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
          {ingredient.product.code}
        </span>
      </td>
      <td className="px-3 py-2">
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
          {ingredient.product.name}
        </p>
      </td>
      <td className="px-3 py-2 text-center text-sm text-gray-500 dark:text-slate-400">
        {ingredient.product.unitOfMeasure}
      </td>
      <td className="px-3 py-2 text-right">
        {editable && editing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              min="0.0001"
              step="0.1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20 text-right rounded border border-emerald-400 bg-white dark:bg-slate-800 px-1.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <button onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
              <Check size={14} />
            </button>
            <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => editable && setEditing(true)}
            className={[
              "text-sm font-medium",
              editable ? "cursor-pointer hover:underline text-emerald-700 dark:text-emerald-300" : "cursor-default text-gray-600 dark:text-slate-400",
            ].join(" ")}
          >
            {Number(ingredient.quantity)}
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-slate-400">
        {unitCost > 0 ? `$${unitCost.toLocaleString("es-CL")}` : "-"}
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-slate-100">
        {lineCost > 0 ? `$${lineCost.toLocaleString("es-CL")}` : "-"}
      </td>
      {editable && (
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => onDelete(ingredient.id)}
            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </td>
      )}
    </tr>
  );
}
