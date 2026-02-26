"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShoppingCart,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { OrderDetail } from "@/components/orders/OrderDetail";

interface OrderSummary {
  id: string;
  location: { id: string; name: string };
  requestDate: string;
  deliveryDay: string;
  status: string;
  generatedBy: { id: string; name: string };
  notes: string | null;
  _count: { items: number };
  createdAt: string;
}

interface OrderFull {
  id: string;
  location: { id: string; name: string };
  requestDate: string;
  deliveryDay: string;
  status: string;
  generatedBy: { id: string; name: string };
  notes: string | null;
  items: any[];
}

interface LocationOption {
  id: string;
  name: string;
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

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const isAdmin = user?.role === "admin";

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Generate modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [genLocationId, setGenLocationId] = useState("");
  const [genDeliveryDay, setGenDeliveryDay] = useState("VIERNES");
  const [genNotes, setGenNotes] = useState("");
  const [generating, setGenerating] = useState(false);

  // Detail view
  const [selectedOrder, setSelectedOrder] = useState<OrderFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      const { data: response } = await api.get<{
        data: OrderSummary[];
        meta: { total: number; page: number; limit: number; lastPage: number };
      }>(`/orders?${params.toString()}`);
      setOrders(response.data);
      setTotal(response.meta.total);
      setTotalPages(response.meta.lastPage);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cargar pedidos");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Load locations for generate modal
  useEffect(() => {
    api.get<LocationOption[]>("/locations").then(({ data }) => {
      setLocations(data);
      if (data.length > 0 && !genLocationId) setGenLocationId(data[0].id);
    }).catch(() => {});
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    try {
      const { data: order } = await api.post<OrderFull>("/orders/generate", {
        locationId: genLocationId,
        deliveryDay: genDeliveryDay,
        notes: genNotes || null,
      });
      success(`Pedido generado con ${order.items.length} items`);
      setShowGenerate(false);
      setGenNotes("");
      setSelectedOrder(order);
      fetchOrders();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al generar pedido");
    } finally {
      setGenerating(false);
    }
  }

  async function viewOrder(orderId: string) {
    setLoadingDetail(true);
    try {
      const { data } = await api.get<OrderFull>(`/orders/${orderId}`);
      setSelectedOrder(data);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cargar detalle");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function refreshDetail() {
    if (!selectedOrder) return;
    try {
      const { data } = await api.get<OrderFull>(`/orders/${selectedOrder.id}`);
      setSelectedOrder(data);
    } catch {
      showError("Error al refrescar pedido");
    }
  }

  // If viewing detail, show OrderDetail component
  if (selectedOrder) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <OrderDetail
          order={selectedOrder}
          onBack={() => { setSelectedOrder(null); fetchOrders(); }}
          onRefresh={refreshDetail}
          isAdmin={isAdmin}
        />
      </div>
    );
  }

  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Pedidos
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Gestion de pedidos a proveedores
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setShowGenerate(true)}>
          <Plus size={16} /> Generar pedido
        </Button>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-500 dark:text-slate-400">
        <span>
          {isLoading
            ? "Cargando..."
            : total === 0
            ? "No hay pedidos"
            : `Mostrando ${from}-${to} de ${total} pedidos`}
        </span>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="animate-pulse space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card padding="lg">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ShoppingCart size={36} className="text-gray-300 dark:text-slate-600 mb-3" />
            <p className="font-medium text-gray-700 dark:text-slate-300 mb-1">
              No hay pedidos todavia
            </p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mb-4">
              Genera tu primer pedido automatico basado en el consumo semanal.
            </p>
            <Button variant="primary" size="md" onClick={() => setShowGenerate(true)}>
              <Plus size={16} /> Generar primer pedido
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: "bg-gray-100 text-gray-700" };
            return (
              <Card key={order.id} padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                        {order.location.name}
                      </h3>
                      <span className={["text-xs px-2 py-0.5 rounded-full", statusInfo.color].join(" ")}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {new Date(order.requestDate).toLocaleDateString("es-CL")}
                      {" "} - Entrega: {DELIVERY_LABELS[order.deliveryDay] ?? order.deliveryDay}
                      {" "} - {order._count.items} items
                      {" "} - por {order.generatedBy.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => viewOrder(order.id)}
                    disabled={loadingDetail}
                  >
                    <Eye size={16} /> Ver
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} /> Anterior
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Generate Order Modal */}
      {showGenerate && (
        <Modal isOpen={true} onClose={() => setShowGenerate(false)} title="Generar pedido" size="sm">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Local
              </label>
              <select
                value={genLocationId}
                onChange={(e) => setGenLocationId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Dia de entrega
              </label>
              <select
                value={genDeliveryDay}
                onChange={(e) => setGenDeliveryDay(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="LUNES">Lunes</option>
                <option value="MARTES">Martes</option>
                <option value="MIERCOLES">Miercoles</option>
                <option value="JUEVES">Jueves</option>
                <option value="VIERNES">Viernes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={genNotes}
                onChange={(e) => setGenNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Pedido semanal normal..."
              />
            </div>

            <p className="text-xs text-gray-400 dark:text-slate-500">
              El sistema calculara automaticamente las cantidades basandose en
              el inventario actual y el consumo promedio de las ultimas 4 semanas.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
              <Button type="button" variant="secondary" onClick={() => setShowGenerate(false)} disabled={generating}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={generating}>
                {generating ? "Generando..." : "Generar pedido"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
