"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  MapPin,
  Layers,
  Plus,
  Edit2,
  UserX,
  UserCheck,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

type Tab = "usuarios" | "locales" | "estaciones";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  locationId: string | null;
  location: { id: string; name: string } | null;
  isActive: boolean;
  stations: { station: { id: string; name: string; locationId: string } }[];
}

interface LocationData {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  brands: string[];
}

interface StationData {
  id: string;
  name: string;
  locationId: string;
  location?: { id: string; name: string };
}

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "HEAD_CHEF", label: "Jefe de cocina" },
  { value: "SOUS_CHEF", label: "Sous Chef" },
];

const roleLabels: Record<string, string> = {
  ADMIN: "Administrador",
  HEAD_CHEF: "Jefe de cocina",
  SOUS_CHEF: "Sous Chef",
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<Tab>("usuarios");

  // ---- Users state ----
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);

  // ---- Locations state ----
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationData | null>(null);
  const [creatingLocation, setCreatingLocation] = useState(false);

  // ---- Stations state ----
  const [stations, setStations] = useState<StationData[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationFilter, setStationFilter] = useState("");

  // ---- Fetchers ----
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get<UserData[]>("/users");
      setUsers(data);
    } catch {
      showError("Error al cargar usuarios");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const { data } = await api.get<LocationData[]>("/locations");
      setLocations(data);
    } catch {
      showError("Error al cargar locales");
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const fetchStations = useCallback(async () => {
    setLoadingStations(true);
    try {
      const { data } = await api.get<StationData[]>("/stations");
      setStations(data);
    } catch {
      showError("Error al cargar estaciones");
    } finally {
      setLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "usuarios") fetchUsers();
    else if (tab === "locales") fetchLocations();
    else if (tab === "estaciones") {
      fetchStations();
      if (locations.length === 0) fetchLocations();
    }
  }, [tab]);

  // ---- Toggle user active ----
  async function toggleUserActive(u: UserData) {
    try {
      if (u.isActive) {
        await api.delete(`/users/${u.id}`);
        success(`${u.name} desactivado`);
      } else {
        await api.patch(`/users/${u.id}`, { isActive: true });
        success(`${u.name} reactivado`);
      }
      fetchUsers();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al cambiar estado del usuario");
    }
  }

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "usuarios", label: "Usuarios", icon: Users },
    { key: "locales", label: "Locales", icon: MapPin },
    { key: "estaciones", label: "Estaciones", icon: Layers },
  ];

  const filteredStations = stationFilter
    ? stations.filter((s) => s.locationId === stationFilter)
    : stations;

  return (
    <div className="px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Configuracion
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Usuarios, locales y estaciones
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300",
              ].join(" ")}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========== USUARIOS TAB ========== */}
      {tab === "usuarios" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {users.length} usuarios
            </span>
            <Button variant="primary" size="sm" onClick={() => setCreatingUser(true)}>
              <Plus size={16} /> Nuevo usuario
            </Button>
          </div>

          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300 hidden sm:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">Rol</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-slate-300 hidden md:table-cell">Local</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">Estado</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-slate-300">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-slate-700 animate-pulse">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className={["border-b border-gray-100 dark:border-slate-700 last:border-0", !u.isActive ? "opacity-50" : ""].join(" ")}>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">
                          {u.name}
                          <p className="text-xs text-gray-400 sm:hidden">{u.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400 hidden sm:table-cell">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {roleLabels[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-slate-400 hidden md:table-cell">
                          {u.location?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={["text-xs px-2 py-0.5 rounded-full", u.isActive ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"].join(" ")}>
                            {u.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-950 transition-colors"
                              aria-label={`Editar ${u.name}`}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleUserActive(u)}
                              className={["p-1.5 rounded-lg transition-colors", u.isActive ? "text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950" : "text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-950"].join(" ")}
                              aria-label={u.isActive ? `Desactivar ${u.name}` : `Reactivar ${u.name}`}
                            >
                              {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========== LOCALES TAB ========== */}
      {tab === "locales" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {locations.length} locales
            </span>
          </div>

          <div className="grid gap-3">
            {loadingLocations ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} padding="md">
                  <div className="animate-pulse space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
                  </div>
                </Card>
              ))
            ) : (
              locations.map((loc) => (
                <Card key={loc.id} padding="md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-slate-100">{loc.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{loc.address ?? "Sin direccion"}</p>
                      {loc.brands.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {loc.brands.map((b) => (
                            <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={["text-xs px-2 py-0.5 rounded-full", loc.isActive ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"].join(" ")}>
                      {loc.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========== ESTACIONES TAB ========== */}
      {tab === "estaciones" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {filteredStations.length} estaciones
            </span>
            <div className="sm:ml-auto">
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="w-full sm:w-48 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todos los locales</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {loadingStations ? (
              Array.from({ length: 7 }).map((_, i) => (
                <Card key={i} padding="md">
                  <div className="animate-pulse h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                </Card>
              ))
            ) : (
              filteredStations.map((s) => (
                <Card key={s.id} padding="md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-slate-100 capitalize">{s.name}</h3>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {locations.find((l) => l.id === s.locationId)?.name ?? s.locationId}
                      </p>
                    </div>
                    <Layers size={16} className="text-gray-300 dark:text-slate-600" />
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========== USER MODAL (Create / Edit) ========== */}
      {(creatingUser || editingUser) && (
        <UserModal
          user={editingUser}
          locations={locations}
          stations={stations}
          onClose={() => { setCreatingUser(false); setEditingUser(null); }}
          onSaved={() => { setCreatingUser(false); setEditingUser(null); fetchUsers(); }}
          organizationId={user?.organizationId ?? ""}
        />
      )}
    </div>
  );
}

// ========== User Modal Component ==========

function UserModal({
  user: editUser,
  locations,
  stations,
  onClose,
  onSaved,
  organizationId,
}: {
  user: UserData | null;
  locations: LocationData[];
  stations: StationData[];
  onClose: () => void;
  onSaved: () => void;
  organizationId: string;
}) {
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const isEditing = !!editUser;

  const [form, setForm] = useState({
    name: editUser?.name ?? "",
    email: editUser?.email ?? "",
    password: "",
    role: editUser?.role ?? "SOUS_CHEF",
    locationId: editUser?.locationId ?? "",
    stationIds: editUser?.stations?.map((s) => s.station.id) ?? [] as string[],
  });

  function setField(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleStation(stationId: string) {
    setForm((prev) => ({
      ...prev,
      stationIds: prev.stationIds.includes(stationId)
        ? prev.stationIds.filter((id) => id !== stationId)
        : [...prev.stationIds, stationId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEditing) {
        const updateData: Record<string, unknown> = {
          name: form.name,
          role: form.role,
          locationId: form.locationId || null,
        };
        if (form.password) updateData.password = form.password;
        await api.patch(`/users/${editUser!.id}`, updateData);
        await api.patch(`/users/${editUser!.id}/stations`, { stationIds: form.stationIds });
        success("Usuario actualizado");
      } else {
        const { data: newUser } = await api.post<{ id: string }>("/users", {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          organizationId,
          locationId: form.locationId || null,
        });
        if (form.stationIds.length > 0) {
          await api.patch(`/users/${newUser.id}/stations`, { stationIds: form.stationIds });
        }
        success("Usuario creado");
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) showError(err.message);
      else showError("Error al guardar usuario");
    } finally {
      setSaving(false);
    }
  }

  // Filter stations by selected location
  const locationStations = form.locationId
    ? stations.filter((s) => s.locationId === form.locationId)
    : stations;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? "Editar usuario" : "Nuevo usuario"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre</label>
          <Input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
        </div>

        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            {isEditing ? "Nueva contrasena (dejar vacio para no cambiar)" : "Contrasena"}
          </label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            required={!isEditing}
            minLength={6}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setField("role", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Local</label>
            <select
              value={form.locationId}
              onChange={(e) => setField("locationId", e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Sin asignar</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Station assignment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Estaciones asignadas
          </label>
          <div className="grid grid-cols-2 gap-2">
            {locationStations.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.stationIds.includes(s.id)}
                  onChange={() => toggleStation(s.id)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="capitalize">{s.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
