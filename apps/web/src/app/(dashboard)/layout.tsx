"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Utensils,
  Package,
  Settings,
  LogOut,
  UtensilsCrossed,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

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
          <div className="ml-auto">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav - Mobile */}
      <nav
        aria-label="Navegacion principal"
        className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 flex"
      >
        {visibleItems.slice(0, 4).map((item) => {
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
      </nav>
    </div>
  );
}
