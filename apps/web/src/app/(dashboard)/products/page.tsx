"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Package,
  Filter,
  X,
  Edit2,
  AlertTriangle,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { EditProductModal } from "@/components/products/EditProductModal";
import { CreateProductModal } from "@/components/products/CreateProductModal";

interface ProductRaw {
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

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  wastagePercent: number;
  isActive: boolean;
  raw: ProductRaw;
}

interface PaginatedResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

const PAGE_SIZE = 20;

function ProductRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-slate-700 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { error: showError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<ProductRaw | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categoryObjects, setCategoryObjects] = useState<{ id: string; name: string }[]>([]);

  const isAdmin = user?.role === "admin" || user?.role === "supervisor";

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedCategory) params.set("category", selectedCategory);

      const { data: response } = await api.get<{ data: ProductRaw[]; meta: { total: number; page: number; limit: number; lastPage: number } }>(
        `/products?${params.toString()}`
      );
      setProducts(
        response.data.map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          category: p.category?.name ?? "",
          unit: p.unitOfMeasure,
          minStock: Number(p.minStock) || 0,
          wastagePercent: Number(p.wastagePercent) || 0,
          isActive: p.isActive,
          raw: p,
        }))
      );
      setTotal(response.meta.total);
      setTotalPages(response.meta.lastPage);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("No se pudieron cargar los productos.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, selectedCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load categories once
  useEffect(() => {
    api
      .get<string[]>("/products/categories")
      .then(({ data }) => setCategories(data))
      .catch(() => {});

    // Also load category objects for the edit modal
    api
      .get<{ data: { id: string; name: string }[] }>("/categories")
      .then(({ data }) => setCategoryObjects(data.data ?? data as any))
      .catch(() => {});
  }, []);

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setPage(1);
  };

  const hasFilters = search || selectedCategory;

  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="px-4 py-6 md:px-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Productos
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Catalogo de ingredientes e insumos
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="md" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Nuevo producto
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar por nombre o codigo..."
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

        <div className="relative sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="w-full appearance-none rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 pl-9 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todas las categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Filter
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="md" onClick={clearFilters}>
            <X size={15} />
            Limpiar
          </Button>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-500 dark:text-slate-400">
        <span>
          {isLoading
            ? "Cargando..."
            : total === 0
            ? "Sin resultados"
            : `Mostrando ${from}-${to} de ${total} productos`}
        </span>
        {hasFilters && (
          <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
            Filtrado
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">
                  Codigo
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300 hidden md:table-cell">
                  Categoria
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300 hidden sm:table-cell">
                  Unidad
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">
                  Stock min.
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-slate-300 hidden lg:table-cell">
                  Merma %
                </th>
                {isAdmin && (
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <ProductRowSkeleton key={i} />
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 7 : 6}
                    className="px-4 py-16 text-center"
                  >
                    <Package
                      size={36}
                      className="text-gray-300 dark:text-slate-600 mx-auto mb-3"
                    />
                    <p className="text-gray-400 dark:text-slate-500 font-medium">
                      {hasFilters
                        ? "No se encontraron productos con ese criterio."
                        : "No hay productos en el catalogo."}
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className={[
                      "border-b border-gray-100 dark:border-slate-700 last:border-0",
                      "hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors",
                      !product.isActive ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded">
                        {product.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 md:hidden">
                        {product.category}
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-slate-400">
                      {product.category}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-slate-400">
                      {product.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={[
                          "font-medium",
                          product.minStock > 0
                            ? "text-gray-900 dark:text-slate-100"
                            : "text-gray-400 dark:text-slate-500",
                        ].join(" ")}
                      >
                        {product.minStock} {product.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-gray-600 dark:text-slate-400">
                      {product.wastagePercent > 0 ? (
                        <span className="flex items-center justify-end gap-1">
                          {product.wastagePercent >= 20 && (
                            <AlertTriangle
                              size={12}
                              className="text-amber-500"
                            />
                          )}
                          {product.wastagePercent}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          aria-label={`Editar ${product.name}`}
                          onClick={() => setEditingProduct(product.raw)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950 transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Pagina {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Pagina anterior"
              >
                <ChevronLeft size={16} />
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Pagina siguiente"
              >
                Siguiente
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          categories={categoryObjects}
          onClose={() => setEditingProduct(null)}
          onSaved={() => {
            setEditingProduct(null);
            fetchProducts();
          }}
        />
      )}

      {/* Create Product Modal */}
      {showCreateModal && (
        <CreateProductModal
          categories={categoryObjects}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
}
