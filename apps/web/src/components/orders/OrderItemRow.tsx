"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

interface OrderItemData {
  id: string;
  productId: string;
  product: {
    code: string;
    name: string;
    category: { name: string };
    unitOfMeasure: string;
    unitOfOrder: string;
  };
  currentStock: number;
  weeklyAvgConsumption: number;
  suggestedQty: number;
  confirmedQty: number | null;
  unitOfOrder: string;
  conversionFactor: number;
  unitCost: number | null;
}

interface OrderItemRowProps {
  item: OrderItemData;
  editable: boolean;
  onConfirmQty: (itemId: string, qty: number) => void;
}

export function OrderItemRow({ item, editable, onConfirmQty }: OrderItemRowProps) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(Number(item.confirmedQty ?? item.suggestedQty)));

  const displayQty = Number(item.confirmedQty ?? item.suggestedQty);
  const cost = item.unitCost ? Number(item.unitCost) * displayQty : null;

  function handleSave() {
    const val = parseFloat(qty);
    if (!isNaN(val) && val >= 0) {
      onConfirmQty(item.id, val);
    }
    setEditing(false);
  }

  return (
    <tr className="border-b border-gray-100 dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
      <td className="px-3 py-2">
        <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
          {item.product.code}
        </span>
      </td>
      <td className="px-3 py-2">
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.product.name}</p>
        <p className="text-xs text-gray-400">{item.product.category.name}</p>
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-slate-400">
        {Number(item.currentStock).toFixed(1)} {item.product.unitOfMeasure}
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-slate-400">
        {Number(item.weeklyAvgConsumption).toFixed(1)}
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-slate-400">
        {Number(item.suggestedQty)} {item.unitOfOrder}
      </td>
      <td className="px-3 py-2 text-right">
        {editable && editing ? (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              min="0"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-16 text-right rounded border border-emerald-400 bg-white dark:bg-slate-800 px-1.5 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
              item.confirmedQty !== null
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-gray-600 dark:text-slate-400",
              editable ? "cursor-pointer hover:underline" : "cursor-default",
            ].join(" ")}
          >
            {displayQty} {item.unitOfOrder}
          </button>
        )}
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-slate-400 hidden lg:table-cell">
        {cost !== null ? `$${cost.toLocaleString("es-CL")}` : "—"}
      </td>
    </tr>
  );
}

export type { OrderItemData };
