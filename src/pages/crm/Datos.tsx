import { useState, useEffect } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Plus, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type TabKey = "orders" | "vehicles" | "customers" | "requests";

const tabs: { key: TabKey; label: { en: string; es: string } }[] = [
  { key: "orders", label: { en: "Orders", es: "Ordenes" } },
  { key: "vehicles", label: { en: "Vehicles", es: "Vehículos" } },
  { key: "customers", label: { en: "Customers", es: "Clientes" } },
  { key: "requests", label: { en: "Requests", es: "Solicitudes" } },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function Datos() {
  const { businessId } = useCurrentBusiness();
  const { session } = useAuth();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<TabKey>("orders");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for new order
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    vehicle_id: "",
    service_name: "",
    scheduled_at: "",
    notes: "",
  });

  const fetchData = async () => {
    if (!businessId) return;
    setLoading(true);
    let result: any[] = [];
    if (activeTab === "orders") {
      const { data } = await supabase
        .from("work_orders")
        .select("*, customers(full_name, phone), vehicles(brand, model, license_plate)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      result = data || [];
    } else if (activeTab === "vehicles") {
      const { data } = await supabase
        .from("vehicles")
        .select("*, customers(full_name)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      result = data || [];
    } else if (activeTab === "customers") {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      result = data || [];
    } else if (activeTab === "requests") {
      const { data } = await supabase
        .from("bookings")
        .select("*, customers(full_name)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      result = data || [];
    }
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [businessId, activeTab]);

  // Load form options when drawer opens
  useEffect(() => {
    if (!drawerOpen || !businessId) return;
    const load = async () => {
      const [c, v, s] = await Promise.all([
        supabase.from("customers").select("id, full_name").eq("business_id", businessId).order("full_name"),
        supabase.from("vehicles").select("id, brand, model, license_plate, customer_id").eq("business_id", businessId),
        supabase.from("services").select("id, name").eq("business_id", businessId).eq("is_active", true).order("name"),
      ]);
      setCustomers(c.data || []);
      setVehicles(v.data || []);
      setServices(s.data || []);
    };
    load();
  }, [drawerOpen, businessId]);

  // Filter vehicles by selected customer
  const filteredVehicles = form.customer_id
    ? vehicles.filter((v) => v.customer_id === form.customer_id)
    : vehicles;

  const handleCreate = async () => {
    if (!businessId || !form.service_name) return;
    setSaving(true);

    // First create a booking
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        customer_id: form.customer_id || null,
        vehicle_id: form.vehicle_id || null,
        service_name: form.service_name,
        scheduled_at: form.scheduled_at || null,
        status: "confirmed",
        source: "crm",
      })
      .select("id")
      .single();

    if (bookingErr || !booking) {
      setSaving(false);
      return;
    }

    // Then create work order
    const { error: woErr } = await supabase.from("work_orders").insert({
      business_id: businessId,
      booking_id: booking.id,
      customer_id: form.customer_id || null,
      vehicle_id: form.vehicle_id || null,
      service_name: form.service_name,
      scheduled_at: form.scheduled_at || null,
      notes: form.notes || null,
      status: "open",
    });

    setSaving(false);
    if (!woErr) {
      setDrawerOpen(false);
      setForm({ customer_id: "", vehicle_id: "", service_name: "", scheduled_at: "", notes: "" });
      fetchData();
    }
  };

  const filtered = data.filter((item) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return JSON.stringify(item).toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      {/* Tabs + Stats link */}
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label[lang]}
            </button>
          ))}
        </div>
        <button className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 pb-2">
          📊 {isEs ? "Ver Estadísticas" : "View Stats"}
        </button>
      </div>

      {/* Search + Sort + Filter */}
      <div className="flex items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={isEs ? "Escribe para buscar." : "Type to search."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            {isEs ? "Orden" : "Sort"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            {isEs ? "Filtros" : "Filters"}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Table header row with + Orden */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {activeTab === "orders" && (
                  <>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-10">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "CLIENTE" : "CUSTOMER"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "TELÉFONO" : "PHONE"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "VEHÍCULO" : "VEHICLE"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "FECHAS" : "DATES"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "ESTADO" : "STATUS"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "FACTURA" : "INVOICE"}</th>
                    <th className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 gap-1"
                        onClick={() => setDrawerOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        {isEs ? "Orden" : "Order"}
                      </Button>
                    </th>
                  </>
                )}
                {activeTab === "vehicles" && (
                  <>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "MARCA" : "BRAND"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "MODELO" : "MODEL"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "MATRÍCULA" : "PLATE"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "PROPIETARIO" : "OWNER"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "COLOR" : "COLOR"}</th>
                  </>
                )}
                {activeTab === "customers" && (
                  <>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "NOMBRE" : "NAME"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "TELÉFONO" : "PHONE"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">EMAIL</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "ETIQUETAS" : "TAGS"}</th>
                  </>
                )}
                {activeTab === "requests" && (
                  <>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "SERVICIO" : "SERVICE"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "CLIENTE" : "CUSTOMER"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "ESTADO" : "STATUS"}</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">{isEs ? "FECHA" : "DATE"}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                    {isEs ? "Cargando..." : "Loading..."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-5xl">📋</div>
                      <p className="text-muted-foreground font-medium">
                        {activeTab === "orders"
                          ? isEs ? "Aún no hay ningún Orden creado" : "No orders created yet"
                          : isEs ? "Sin resultados" : "No results"}
                      </p>
                      {activeTab === "orders" && (
                        <p className="text-sm text-muted-foreground">
                          {isEs ? "Haz click en " : "Click "}
                          <button
                            onClick={() => setDrawerOpen(true)}
                            className="text-emerald-600 font-semibold hover:underline"
                          >
                            + {isEs ? "Orden" : "Order"}
                          </button>
                          {isEs ? " para crear uno nuevo" : " to create a new one"}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item: any, idx: number) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    {activeTab === "orders" && (
                      <>
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{item.customers?.full_name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.customers?.phone || "—"}</td>
                        <td className="px-4 py-3">
                          {item.vehicles
                            ? `${item.vehicles.brand || ""} ${item.vehicles.model || ""}`.trim() || "—"
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-xs capitalize border", STATUS_COLORS[item.status] || "")}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">—</td>
                        <td className="px-4 py-3" />
                      </>
                    )}
                    {activeTab === "vehicles" && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.brand || "—"}</td>
                        <td className="px-4 py-3">{item.model || "—"}</td>
                        <td className="px-4 py-3">{item.license_plate || "—"}</td>
                        <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
                        <td className="px-4 py-3">{item.color || "—"}</td>
                      </>
                    )}
                    {activeTab === "customers" && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.full_name}</td>
                        <td className="px-4 py-3">{item.phone || "—"}</td>
                        <td className="px-4 py-3">{item.email || "—"}</td>
                        <td className="px-4 py-3">
                          {item.tags?.length
                            ? item.tags.map((t: string) => (
                                <Badge key={t} variant="outline" className="text-xs mr-1">{t}</Badge>
                              ))
                            : "—"}
                        </td>
                      </>
                    )}
                    {activeTab === "requests" && (
                      <>
                        <td className="px-4 py-3 font-medium">{item.service_name}</td>
                        <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={cn("text-xs capitalize border", STATUS_COLORS[item.status] || "")}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Crear nueva Orden" : "Create new Order"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Customer */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Cliente" : "Customer"}</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value, vehicle_id: "" })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">{isEs ? "Seleccionar cliente..." : "Select customer..."}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Vehículo" : "Vehicle"}</label>
                <select
                  value={form.vehicle_id}
                  onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">{isEs ? "Seleccionar vehículo..." : "Select vehicle..."}</option>
                  {filteredVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {[v.brand, v.model, v.license_plate].filter(Boolean).join(" — ") || v.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Servicio" : "Service"} *</label>
                <select
                  value={form.service_name}
                  onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">{isEs ? "Seleccionar servicio..." : "Select service..."}</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                {/* Or type custom */}
                <input
                  type="text"
                  placeholder={isEs ? "O escribe un servicio personalizado..." : "Or type a custom service..."}
                  value={services.some((s) => s.name === form.service_name) ? "" : form.service_name}
                  onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Scheduled date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Fecha programada" : "Scheduled date"}</label>
                <input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{isEs ? "Notas" : "Notes"}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder={isEs ? "Notas adicionales..." : "Additional notes..."}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!form.service_name || saving}
                onClick={handleCreate}
              >
                {saving
                  ? isEs ? "Creando..." : "Creating..."
                  : isEs ? "Crear Orden" : "Create Order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
