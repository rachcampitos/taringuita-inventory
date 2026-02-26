"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  XCircle,
  FileText,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { OrderItemRow, type OrderItemData } from "./OrderItemRow";

interface OrderData {
  id: string;
  location: { id: string; name: string };
  requestDate: string;
  deliveryDay: string;
  status: string;
  generatedBy: { id: string; name: string };
  notes: string | null;
  items: OrderItemData[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  CONFIRMED: { label: "Confirmado", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  SENT: { label: "Enviado", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  RECEIVED: { label: "Recibido", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

const DELIVERY_LABELS: Record<string, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miercoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
};

interface OrderDetailProps {
  order: OrderData;
  onBack: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
}

export function OrderDetail({ order, onBack, onRefresh, isAdmin }: OrderDetailProps) {
  const { success, error: showError } = useToast();
  const [updating, setUpdating] = useState(false);

  const isDraft = order.status === "DRAFT";
  const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };

  // Group items by category
  const grouped = useMemo(() => {
    const map: Record<string, OrderItemData[]> = {};
    for (const item of order.items) {
      const cat = item.product.category.name;
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [order.items]);

  // Total estimated cost
  const totalEstimated = useMemo(() => {
    return order.items.reduce((sum, item) => {
      const qty = Number(item.confirmedQty ?? item.suggestedQty);
      const cost = item.unitCost ? Number(item.unitCost) : 0;
      return sum + qty * cost;
    }, 0);
  }, [order.items]);

  async function handleConfirmQty(itemId: string, qty: number) {
    try {
      await api.patch(`/orders/${order.id}/items/${itemId}`, { confirmedQty: qty });
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al actualizar cantidad");
    }
  }

  async function handleStatusChange(newStatus: string) {
    setUpdating(true);
    try {
      await api.patch(`/orders/${order.id}/status`, { status: newStatus });
      success(
        newStatus === "CONFIRMED" ? "Pedido confirmado" :
        newStatus === "SENT" ? "Pedido enviado al bodeguero" :
        newStatus === "CANCELLED" ? "Pedido cancelado" :
        "Estado actualizado"
      );
      onRefresh();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cambiar estado");
    } finally {
      setUpdating(false);
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
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
              Pedido - {order.location.name}
            </h2>
            <span className={["text-xs px-2.5 py-1 rounded-full font-medium", statusInfo.color].join(" ")}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {new Date(order.requestDate).toLocaleDateString("es-CL")} - Entrega: {DELIVERY_LABELS[order.deliveryDay] ?? order.deliveryDay}
            {" "} - {order.items.length} items
            {order.notes && ` - ${order.notes}`}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 mb-4">
          {isDraft && (
            <Button variant="primary" size="sm" onClick={() => handleStatusChange("CONFIRMED")} disabled={updating}>
              <CheckCircle2 size={16} /> Confirmar pedido
            </Button>
          )}
          {order.status === "CONFIRMED" && (
            <Button variant="primary" size="sm" onClick={() => handleStatusChange("SENT")} disabled={updating}>
              <Send size={16} /> Enviar al bodeguero
            </Button>
          )}
          {(isDraft || order.status === "CONFIRMED") && (
            <Button variant="ghost" size="sm" onClick={() => handleStatusChange("CANCELLED")} disabled={updating}>
              <XCircle size={16} /> Cancelar
            </Button>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <p className="text-xs text-gray-500 dark:text-slate-400">Items</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{order.items.length}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 dark:text-slate-400">Categorias</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{grouped.length}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 dark:text-slate-400">Costo estimado</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
            ${totalEstimated.toLocaleString("es-CL")}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-gray-500 dark:text-slate-400">Generado por</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{order.generatedBy.name}</p>
        </Card>
      </div>

      {/* Items table grouped by category */}
      {grouped.map(([category, items]) => (
        <div key={category} className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2 px-1">
            {category}
            <span className="text-gray-400 dark:text-slate-500 font-normal ml-2">
              ({items.length} items)
            </span>
          </h3>
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Codigo</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Producto</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Stock</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Consumo/sem</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Sugerido</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs">Confirmado</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600 dark:text-slate-300 text-xs hidden lg:table-cell">Costo est.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <OrderItemRow
                      key={item.id}
                      item={item}
                      editable={isDraft && isAdmin}
                      onConfirmQty={handleConfirmQty}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
