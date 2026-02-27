"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { RecipeDetail } from "@/components/recipes/RecipeDetail";

type RecipeTypeKey = 'PREPARACION' | 'PRODUCCION' | 'SEMIELABORADO' | 'BASE' | 'SALSA' | 'POSTRE';

const RECIPE_TYPE_LABELS: Record<RecipeTypeKey, string> = {
  PREPARACION: 'Preparacion',
  PRODUCCION: 'Produccion',
  SEMIELABORADO: 'Semielaborado',
  BASE: 'Base',
  SALSA: 'Salsa',
  POSTRE: 'Postre',
};

const RECIPE_TYPE_COLORS: Record<RecipeTypeKey, string> = {
  PREPARACION: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  PRODUCCION: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  SEMIELABORADO: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  BASE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SALSA: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  POSTRE: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
};

interface RecipeSummary {
  id: string;
  name: string;
  type: RecipeTypeKey;
  outputProduct: { id: string; code: string; name: string; unitOfMeasure: string };
  outputQuantity: number;
  _count: { ingredients: number };
  createdAt: string;
}

interface RecipeFull {
  id: string;
  name: string;
  outputProductId: string;
  outputProduct: { id: string; code: string; name: string; unitOfMeasure: string };
  outputQuantity: number;
  instructions: string | null;
  ingredients: any[];
}

interface ProductOption {
  id: string;
  code: string;
  name: string;
}

const PAGE_SIZE = 20;

export default function RecipesPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const isAdmin = user?.role === "admin";

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Products for selectors
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createOutputProductId, setCreateOutputProductId] = useState("");
  const [createOutputQty, setCreateOutputQty] = useState("1");
  const [createInstructions, setCreateInstructions] = useState("");
  const [createType, setCreateType] = useState<RecipeTypeKey>("PREPARACION");
  const [creating, setCreating] = useState(false);

  // Detail view
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeFull | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());
      if (typeFilter) params.set("type", typeFilter);

      const { data: response } = await api.get<{
        data: RecipeSummary[];
        meta: { total: number; page: number; limit: number; lastPage: number };
      }>(`/recipes?${params}`);
      setRecipes(response.data);
      setTotal(response.meta.total);
      setTotalPages(response.meta.lastPage);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cargar recetas");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  // Load products for selectors
  useEffect(() => {
    api.get<{ data: ProductOption[] }>("/products?limit=1000").then(({ data: res }) => {
      setProducts(res.data);
      if (res.data.length > 0 && !createOutputProductId) {
        setCreateOutputProductId(res.data[0].id);
      }
    }).catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data: recipe } = await api.post<RecipeFull>("/recipes", {
        name: createName,
        type: createType,
        outputProductId: createOutputProductId,
        outputQuantity: parseFloat(createOutputQty),
        instructions: createInstructions || null,
      });
      success("Receta creada");
      setShowCreate(false);
      setCreateName("");
      setCreateInstructions("");
      setCreateOutputQty("1");
      setCreateType("PREPARACION");
      setSelectedRecipe(recipe);
      fetchRecipes();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al crear receta");
    } finally {
      setCreating(false);
    }
  }

  async function viewRecipe(id: string) {
    setLoadingDetail(true);
    try {
      const { data } = await api.get<RecipeFull>(`/recipes/${id}`);
      setSelectedRecipe(data);
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cargar receta");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function refreshDetail() {
    if (!selectedRecipe) return;
    try {
      const { data } = await api.get<RecipeFull>(`/recipes/${selectedRecipe.id}`);
      setSelectedRecipe(data);
    } catch {
      showError("Error al refrescar receta");
    }
  }

  async function handleDeleteRecipe(id: string) {
    try {
      await api.delete(`/recipes/${id}`);
      success("Receta eliminada");
      setSelectedRecipe(null);
      fetchRecipes();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al eliminar receta");
    }
  }

  // Detail view
  if (selectedRecipe) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <RecipeDetail
          recipe={selectedRecipe}
          products={products}
          onBack={() => { setSelectedRecipe(null); fetchRecipes(); }}
          onRefresh={refreshDetail}
          onDelete={handleDeleteRecipe}
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
            Recetas
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Gestion de recetas e ingredientes
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nueva receta
          </Button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Buscar receta..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search size={16} />}
            rightIcon={
              search ? (
                <button onClick={() => setSearch("")} aria-label="Limpiar">
                  <X size={14} />
                </button>
              ) : null
            }
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-48"
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(RECIPE_TYPE_LABELS) as RecipeTypeKey[]).map((key) => (
            <option key={key} value={key}>{RECIPE_TYPE_LABELS[key]}</option>
          ))}
        </select>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between mb-3 text-sm text-gray-500 dark:text-slate-400">
        <span>
          {isLoading
            ? "Cargando..."
            : total === 0
            ? "No hay recetas"
            : `Mostrando ${from}-${to} de ${total} recetas`}
        </span>
      </div>

      {/* Recipes list */}
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
      ) : recipes.length === 0 ? (
        <Card padding="lg">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen size={36} className="text-gray-300 dark:text-slate-600 mb-3" />
            <p className="font-medium text-gray-700 dark:text-slate-300 mb-1">
              No hay recetas todavia
            </p>
            <p className="text-sm text-gray-400 dark:text-slate-500 mb-4">
              Crea tu primera receta con ingredientes y costos calculados.
            </p>
            {isAdmin && (
              <Button variant="primary" size="md" onClick={() => setShowCreate(true)}>
                <Plus size={16} /> Crear primera receta
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {recipes.map((recipe) => (
            <Card key={recipe.id} padding="md">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                      {recipe.name}
                    </h3>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${RECIPE_TYPE_COLORS[recipe.type] || RECIPE_TYPE_COLORS.PREPARACION}`}>
                      {RECIPE_TYPE_LABELS[recipe.type] || recipe.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Produce: {Number(recipe.outputQuantity)} {recipe.outputProduct.unitOfMeasure} de {recipe.outputProduct.name}
                    {" "} - {recipe._count.ingredients} ingredientes
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => viewRecipe(recipe.id)}
                  disabled={loadingDetail}
                >
                  <Eye size={16} /> Ver
                </Button>
              </div>
            </Card>
          ))}
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

      {/* Create Recipe Modal */}
      {showCreate && (
        <Modal isOpen={true} onClose={() => setShowCreate(false)} title="Nueva receta" size="sm">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Nombre de la receta
              </label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ceviche clasico"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Tipo de receta
              </label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as RecipeTypeKey)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(Object.keys(RECIPE_TYPE_LABELS) as RecipeTypeKey[]).map((key) => (
                  <option key={key} value={key}>{RECIPE_TYPE_LABELS[key]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Producto resultante
              </label>
              <select
                value={createOutputProductId}
                onChange={(e) => setCreateOutputProductId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Cantidad producida
              </label>
              <input
                type="number"
                min="0.01"
                step="0.1"
                value={createOutputQty}
                onChange={(e) => setCreateOutputQty(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Instrucciones (opcional)
              </label>
              <textarea
                value={createInstructions}
                onChange={(e) => setCreateInstructions(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Pasos de preparacion..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? "Creando..." : "Crear receta"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
