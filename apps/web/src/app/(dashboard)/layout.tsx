"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Utensils,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  UtensilsCrossed,
  ChevronRight,
  BookOpen,
  BarChart3,
  MoreHorizontal,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useOnlineStatus } from "@/lib/use-online-status";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: true },
  { href: "/inventory", label: "Inventario", icon: ClipboardList },
  { href: "/production", label: "Produccion", icon: Utensils },
  { href: "/products", label: "Productos", icon: Package, adminOnly: true },
  { href: "/recipes", label: "Recetas", icon: BookOpen, adminOnly: true },
  { href: "/orders", label: "Pedidos", icon: ShoppingCart, adminOnly: true },
  { href: "/reports", label: "Reportes", icon: BarChart3, adminOnly: true },
  { href: "/settings", label: "Configuracion", icon: Settings, adminOnly: true },
];

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  operator: "Operador",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isOnline = useOnlineStatus();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === "admin" || user?.role === "supervisor"
  );

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 shrink-0 fixed inset-y-0 left-0 z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600">
            <UtensilsCrossed size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-slate-100 text-sm leading-tight">
              Taringuita
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500">Inventario</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  "transition-colors duration-150 group",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={18}
                  className={
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 group-hover:text-gray-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                  }
                />
                {item.label}
                {isActive && (
                  <ChevronRight size={14} className="ml-auto text-emerald-500" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-slate-700">
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              Sin conexion
            </div>
          )}
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                {roleLabels[user?.role ?? ""] ?? user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950 dark:hover:text-red-300 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600">
            <UtensilsCrossed size={16} className="text-white" />
          </div>
          <h1 className="font-bold text-gray-900 dark:text-slate-100 text-sm">
            Taringuita Inventory
          </h1>
          {!isOnline && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Offline
            </span>
          )}
          <div className="ml-auto">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
          </div>
        </header>

        <UpdatePrompt />

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav - Mobile */}
      {(() => {
        const mainItems = visibleItems.length > 5 ? visibleItems.slice(0, 4) : visibleItems.slice(0, 5);
        const overflowItems = visibleItems.length > 5 ? visibleItems.slice(4) : [];
        const overflowActive = overflowItems.some(
          (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
        );

        return (
          <>
            <nav
              aria-label="Navegacion principal"
              className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex"
            >
              {mainItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex-1 flex flex-col items-center justify-center py-2.5 gap-1",
                      "text-xs font-medium transition-colors duration-150",
                      isActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-gray-400 dark:text-slate-500",
                    ].join(" ")}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={22} />
                    <span className="text-[10px] leading-none">{item.label}</span>
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute bottom-0 h-0.5 w-8 bg-emerald-600 rounded-t-full"
                      />
                    )}
                  </Link>
                );
              })}

              {overflowItems.length > 0 && (
                <button
                  onClick={() => setShowMoreMenu((v) => !v)}
                  className={[
                    "flex-1 flex flex-col items-center justify-center py-2.5 gap-1",
                    "text-xs font-medium transition-colors duration-150",
                    overflowActive || showMoreMenu
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-400 dark:text-slate-500",
                  ].join(" ")}
                >
                  <MoreHorizontal size={22} />
                  <span className="text-[10px] leading-none">Mas</span>
                </button>
              )}
            </nav>

            {/* Overflow "More" menu */}
            {showMoreMenu && overflowItems.length > 0 && (
              <>
                <div
                  className="md:hidden fixed inset-0 bg-black/30 z-20"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="md:hidden fixed bottom-[60px] inset-x-0 z-30 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 rounded-t-2xl shadow-xl px-2 py-3 animate-[slideUp_0.2s_ease-out]">
                  <div className="flex items-center justify-between px-3 mb-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Mas opciones
                    </p>
                    <button
                      onClick={() => setShowMoreMenu(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {overflowItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMoreMenu(false)}
                        className={[
                          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium",
                          "transition-colors duration-150",
                          isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700",
                        ].join(" ")}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon size={20} />
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="border-t border-gray-200 dark:border-slate-700 mt-2 pt-2">
                    <button
                      onClick={() => { setShowMoreMenu(false); handleLogout(); }}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-colors"
                    >
                      <LogOut size={20} />
                      Cerrar sesion
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        );
      })()}
    </div>
  );
}
