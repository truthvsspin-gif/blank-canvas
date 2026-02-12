import { useState, useEffect, useCallback } from "react";
import { CrmGettingStarted } from "@/components/crm/crm-getting-started";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Plus, X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

type DrawerType = "order" | "vehicle" | "customer" | null;

type DatosStats = {
  customersTotal: number;
  vehiclesTotal: number;
  workOrdersTotal: number;
  openWorkOrders: number;
  requestsTotal: number;
  pendingRequests: number;
};

export default function Datos() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const [activeTab, setActiveTab] = useState<TabKey>("orders");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState<DrawerType>(null);
  const [saving, setSaving] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<DatosStats>({
    customersTotal: 0,
    vehiclesTotal: 0,
    workOrdersTotal: 0,
    openWorkOrders: 0,
    requestsTotal: 0,
    pendingRequests: 0,
  });

  // Form options
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Order form
  const [orderForm, setOrderForm] = useState({
    customer_id: "", vehicle_id: "", service_name: "", scheduled_at: "", notes: "",
  });
  // Vehicle form
  const [vehicleForm, setVehicleForm] = useState({
    customer_id: "", brand: "", model: "", license_plate: "", color: "", size: "", condition_notes: "",
  });
  // Customer form
  const [customerForm, setCustomerForm] = useState({
    full_name: "", phone: "", email: "", notes: "",
  });

  const fetchData = useCallback(async () => {
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
        .select("*, customers(full_name, phone), vehicles(brand, model, license_plate)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      result = data || [];
    }
    setData(result);
    setLoading(false);
  }, [businessId, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!businessId || !statsOpen) return;
    const loadStats = async () => {
      setStatsLoading(true);
      const [customersRes, vehiclesRes, ordersRes, openOrdersRes, requestsRes, pendingRequestsRes] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("work_orders").select("id", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["open", "in_progress"]),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId).in("status", ["requested", "pending"]),
      ]);

      setStats({
        customersTotal: customersRes.count || 0,
        vehiclesTotal: vehiclesRes.count || 0,
        workOrdersTotal: ordersRes.count || 0,
        openWorkOrders: openOrdersRes.count || 0,
        requestsTotal: requestsRes.count || 0,
        pendingRequests: pendingRequestsRes.count || 0,
      });
      setStatsLoading(false);
    };
    loadStats();
  }, [businessId, statsOpen]);

  // Load form options when any drawer opens
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

  const filteredVehicles = orderForm.customer_id
    ? vehicles.filter((v) => v.customer_id === orderForm.customer_id)
    : vehicles;

  const handleCreateOrder = async () => {
    if (!businessId || !orderForm.service_name) return;
    setSaving(true);
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        customer_id: orderForm.customer_id || null,
        vehicle_id: orderForm.vehicle_id || null,
        service_name: orderForm.service_name,
        scheduled_at: orderForm.scheduled_at || null,
        status: "confirmed",
        source: "crm",
      })
      .select("id")
      .single();
    if (bookingErr || !booking) { setSaving(false); return; }
    await supabase.from("work_orders").insert({
      business_id: businessId,
      booking_id: booking.id,
      customer_id: orderForm.customer_id || null,
      vehicle_id: orderForm.vehicle_id || null,
      service_name: orderForm.service_name,
      scheduled_at: orderForm.scheduled_at || null,
      notes: orderForm.notes || null,
      status: "open",
    });
    setSaving(false);
    setDrawerOpen(null);
    setOrderForm({ customer_id: "", vehicle_id: "", service_name: "", scheduled_at: "", notes: "" });
    fetchData();
  };

  const handleCreateVehicle = async () => {
    if (!businessId || !vehicleForm.customer_id) return;
    setSaving(true);
    await supabase.from("vehicles").insert({
      business_id: businessId,
      customer_id: vehicleForm.customer_id,
      brand: vehicleForm.brand || null,
      model: vehicleForm.model || null,
      license_plate: vehicleForm.license_plate || null,
      color: vehicleForm.color || null,
      size: vehicleForm.size || null,
      condition_notes: vehicleForm.condition_notes || null,
    });
    setSaving(false);
    setDrawerOpen(null);
    setVehicleForm({ customer_id: "", brand: "", model: "", license_plate: "", color: "", size: "", condition_notes: "" });
    fetchData();
  };

  const handleCreateCustomer = async () => {
    if (!businessId || !customerForm.full_name.trim()) return;
    setSaving(true);
    await supabase.from("customers").insert({
      business_id: businessId,
      full_name: customerForm.full_name.trim(),
      phone: customerForm.phone || null,
      email: customerForm.email || null,
      notes: customerForm.notes || null,
    });
    setSaving(false);
    setDrawerOpen(null);
    setCustomerForm({ full_name: "", phone: "", email: "", notes: "" });
    fetchData();
  };

  const filtered = data.filter((item) => {
    if (!search) return true;
    return JSON.stringify(item).toLowerCase().includes(search.toLowerCase());
  });

  // Tab-specific config
  const tabConfig: Record<TabKey, {
    columns: { key: string; label: { en: string; es: string } }[];
    createLabel: { en: string; es: string } | null;
    drawerType: DrawerType;
    emptyLabel: { en: string; es: string };
    showSearch: boolean;
  }> = {
    orders: {
      columns: [
        { key: "#", label: { en: "#", es: "#" } },
        { key: "cliente", label: { en: "CUSTOMER", es: "CLIENTE" } },
        { key: "telefono", label: { en: "PHONE", es: "TELÉFONO" } },
        { key: "vehiculo", label: { en: "VEHICLE", es: "VEHÍCULO" } },
        { key: "fechas", label: { en: "DATES", es: "FECHAS" } },
        { key: "estado", label: { en: "STATUS", es: "ESTADO" } },
        { key: "factura", label: { en: "INVOICE", es: "FACTURA" } },
      ],
      createLabel: { en: "Order", es: "Orden" },
      drawerType: "order",
      emptyLabel: { en: "No orders created yet", es: "Aún no hay ningún Orden creado" },
      showSearch: true,
    },
    vehicles: {
      columns: [
        { key: "matricula", label: { en: "PLATE/VIN", es: "MATRÍCULA/BASTIDOR" } },
        { key: "marca", label: { en: "BRAND", es: "MARCA" } },
        { key: "modelo", label: { en: "MODEL", es: "MODELO" } },
        { key: "cliente", label: { en: "CUSTOMER", es: "CLIENTE" } },
      ],
      createLabel: { en: "Vehicle", es: "Vehículo" },
      drawerType: "vehicle",
      emptyLabel: { en: "No vehicles created yet", es: "Aún no hay ningún Vehículo creado" },
      showSearch: true,
    },
    customers: {
      columns: [
        { key: "nombre", label: { en: "NAME", es: "NOMBRE" } },
        { key: "nif", label: { en: "ID/NIF", es: "NIF / CIF" } },
        { key: "telefono", label: { en: "PHONE", es: "TELÉFONO" } },
        { key: "email", label: { en: "EMAIL", es: "EMAIL" } },
        { key: "fuente", label: { en: "SOURCE", es: "FUENTE" } },
        { key: "direccion", label: { en: "ADDRESS", es: "DIRECCIÓN" } },
        { key: "consentimiento", label: { en: "CONSENT", es: "CONSENTIMIENTO" } },
      ],
      createLabel: { en: "Customer", es: "Cliente" },
      drawerType: "customer",
      emptyLabel: { en: "No customers created yet", es: "Aún no hay ningún Cliente creado" },
      showSearch: true,
    },
    requests: {
      columns: [
        { key: "#", label: { en: "#", es: "#" } },
        { key: "orden", label: { en: "ORDER", es: "ORDEN" } },
        { key: "nombre", label: { en: "NAME", es: "NOMBRE" } },
        { key: "email", label: { en: "EMAIL", es: "EMAIL" } },
        { key: "telefono", label: { en: "PHONE", es: "TELÉFONO" } },
        { key: "coche", label: { en: "CAR", es: "COCHE" } },
        { key: "servicios", label: { en: "SERVICES", es: "SERVICIOS" } },
        { key: "estado", label: { en: "STATUS", es: "ESTADO" } },
        { key: "motivo", label: { en: "REASON", es: "MOTIVO" } },
        { key: "solicitada", label: { en: "REQUESTED", es: "SOLICITADA" } },
        { key: "caduca", label: { en: "EXPIRES", es: "CADUCA" } },
      ],
      createLabel: null,
      drawerType: null,
      emptyLabel: { en: "No work requests created yet", es: "Aún no hay ningún Solicitud de trabajo creado" },
      showSearch: false,
    },
  };

  const cfg = tabConfig[activeTab];

  const renderRow = (item: any, idx: number) => {
    if (activeTab === "orders") {
      return (
        <>
          <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
          <td className="px-4 py-3 font-medium">{item.customers?.full_name || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.customers?.phone || "—"}</td>
          <td className="px-4 py-3">{item.vehicles ? `${item.vehicles.brand || ""} ${item.vehicles.model || ""}`.trim() || "—" : "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">{item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString() : "—"}</td>
          <td className="px-4 py-3"><Badge variant="outline" className={cn("text-xs capitalize border", STATUS_COLORS[item.status] || "")}>{item.status}</Badge></td>
          <td className="px-4 py-3 text-muted-foreground">—</td>
          <td className="px-4 py-3" />
        </>
      );
    }
    if (activeTab === "vehicles") {
      return (
        <>
          <td className="px-4 py-3 font-medium">{item.license_plate || "—"}</td>
          <td className="px-4 py-3">{item.brand || "—"}</td>
          <td className="px-4 py-3">{item.model || "—"}</td>
          <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
          <td className="px-4 py-3" />
        </>
      );
    }
    if (activeTab === "customers") {
      return (
        <>
          <td className="px-4 py-3 font-medium">{item.full_name}</td>
          <td className="px-4 py-3 text-muted-foreground">—</td>
          <td className="px-4 py-3">{item.phone || "—"}</td>
          <td className="px-4 py-3">{item.email || "—"}</td>
          <td className="px-4 py-3 text-muted-foreground">—</td>
          <td className="px-4 py-3 text-muted-foreground">—</td>
          <td className="px-4 py-3 text-muted-foreground">—</td>
          <td className="px-4 py-3" />
        </>
      );
    }
    // requests
    return (
      <>
        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
        <td className="px-4 py-3 font-medium">{item.work_order_no || "—"}</td>
        <td className="px-4 py-3">{item.customers?.full_name || "—"}</td>
        <td className="px-4 py-3 text-muted-foreground">—</td>
        <td className="px-4 py-3">{item.customers?.phone || "—"}</td>
        <td className="px-4 py-3">{item.vehicles ? `${item.vehicles.brand || ""} ${item.vehicles.model || ""}`.trim() || "—" : "—"}</td>
        <td className="px-4 py-3">{item.service_name}</td>
        <td className="px-4 py-3"><Badge variant="outline" className={cn("text-xs capitalize border", STATUS_COLORS[item.status] || "")}>{item.status}</Badge></td>
        <td className="px-4 py-3 text-muted-foreground">—</td>
        <td className="px-4 py-3 text-muted-foreground">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td>
        <td className="px-4 py-3 text-muted-foreground">—</td>
      </>
    );
  };

  return (
    <div className="space-y-6">
      <CrmGettingStarted
        titleEs="¿Cómo usar Datos?"
        titleEn="How to use Data?"
        storageKey="crm-tips-datos"
        steps={[
          { emoji: "1️⃣", textEs: "Crea un cliente primero en la pestaña 'Clientes'.", textEn: "Create a customer first in the 'Customers' tab." },
          { emoji: "2️⃣", textEs: "Agrega un vehículo vinculado a ese cliente.", textEn: "Add a vehicle linked to that customer." },
          { emoji: "3️⃣", textEs: "Crea una orden con el botón '+ Orden' para registrar un trabajo.", textEn: "Create an order with the '+ Order' button to register a job." },
          { emoji: "💡", textEs: "Las solicitudes se crean automáticamente desde el chatbot o reservas.", textEn: "Requests are created automatically from the chatbot or bookings." },
        ]}
        ctaLabelEs="+ Cliente"
        ctaLabelEn="+ Customer"
        onCtaClick={() => setDrawerOpen("customer")}
      />
      {/* Tabs + Stats link */}
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(""); }}
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
        <button
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 pb-2"
          onClick={() => setStatsOpen(true)}
          type="button"
        >
          <BarChart3 className="h-4 w-4" />
          {isEs ? "Ver Estadísticas" : "View Stats"}
        </button>
      </div>

      {/* Search bar (when applicable) */}
      {cfg.showSearch && (
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
          {activeTab === "orders" && (
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
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {cfg.columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                    {col.label[lang]}
                  </th>
                ))}
                {cfg.createLabel && (
                  <th className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4 gap-1"
                      onClick={() => setDrawerOpen(cfg.drawerType)}
                    >
                      <Plus className="h-4 w-4" />
                      {cfg.createLabel[lang]}
                    </Button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={cfg.columns.length + 1} className="px-4 py-16 text-center text-muted-foreground">
                    {isEs ? "Cargando..." : "Loading..."}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={cfg.columns.length + 1} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-5xl">{activeTab === "customers" ? "👥" : activeTab === "vehicles" ? "🚗" : "📋"}</div>
                      <p className="text-muted-foreground font-medium">{cfg.emptyLabel[lang]}</p>
                      {cfg.createLabel && (
                        <p className="text-sm text-muted-foreground">
                          {isEs ? "Haz click en " : "Click "}
                          <button
                            onClick={() => setDrawerOpen(cfg.drawerType)}
                            className="text-emerald-600 font-semibold hover:underline"
                          >
                            + {cfg.createLabel[lang]}
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
                    {renderRow(item, idx)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {statsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setStatsOpen(false)} />
          <div className="relative w-full max-w-3xl rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">{isEs ? "Estadísticas de datos" : "Data stats"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setStatsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              {statsLoading ? (
                <p className="text-sm text-muted-foreground">{isEs ? "Cargando..." : "Loading..."}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatsCard label={isEs ? "Clientes totales" : "Total customers"} value={stats.customersTotal} />
                  <StatsCard label={isEs ? "Vehículos totales" : "Total vehicles"} value={stats.vehiclesTotal} />
                  <StatsCard label={isEs ? "Órdenes totales" : "Total work orders"} value={stats.workOrdersTotal} />
                  <StatsCard label={isEs ? "Órdenes abiertas" : "Open work orders"} value={stats.openWorkOrders} />
                  <StatsCard label={isEs ? "Solicitudes totales" : "Total requests"} value={stats.requestsTotal} />
                  <StatsCard label={isEs ? "Solicitudes pendientes" : "Pending requests"} value={stats.pendingRequests} />
                  <StatsCard label={isEs ? "Registros en esta pestaña" : "Rows in this tab"} value={filtered.length} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---- DRAWERS ---- */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(null)} />
          <div className="relative w-full max-w-md bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">
                {drawerOpen === "order" && (isEs ? "Crear nueva Orden" : "Create new Order")}
                {drawerOpen === "vehicle" && (isEs ? "Crear nuevo Vehículo" : "Create new Vehicle")}
                {drawerOpen === "customer" && (isEs ? "Crear nuevo Cliente" : "Create new Customer")}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* ORDER FORM */}
              {drawerOpen === "order" && (
                <>
                  <Field label={isEs ? "Cliente" : "Customer"}>
                    <select value={orderForm.customer_id} onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value, vehicle_id: "" })} className="input-field">
                      <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                  </Field>
                  <Field label={isEs ? "Vehículo" : "Vehicle"}>
                    <select value={orderForm.vehicle_id} onChange={(e) => setOrderForm({ ...orderForm, vehicle_id: e.target.value })} className="input-field">
                      <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                      {filteredVehicles.map((v) => <option key={v.id} value={v.id}>{[v.brand, v.model, v.license_plate].filter(Boolean).join(" — ")}</option>)}
                    </select>
                  </Field>
                  <Field label={`${isEs ? "Servicio" : "Service"} *`}>
                    <select value={form_service_in_list(orderForm.service_name, services) ? orderForm.service_name : ""} onChange={(e) => setOrderForm({ ...orderForm, service_name: e.target.value })} className="input-field">
                      <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                      {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <input type="text" placeholder={isEs ? "O escribe un servicio..." : "Or type a service..."} value={form_service_in_list(orderForm.service_name, services) ? "" : orderForm.service_name} onChange={(e) => setOrderForm({ ...orderForm, service_name: e.target.value })} className="input-field mt-1.5" />
                  </Field>
                  <Field label={isEs ? "Fecha programada" : "Scheduled date"}>
                    <input type="datetime-local" value={orderForm.scheduled_at} onChange={(e) => setOrderForm({ ...orderForm, scheduled_at: e.target.value })} className="input-field" />
                  </Field>
                  <Field label={isEs ? "Notas" : "Notes"}>
                    <textarea value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} rows={3} placeholder={isEs ? "Notas adicionales..." : "Additional notes..."} className="input-field resize-none" />
                  </Field>
                </>
              )}

              {/* VEHICLE FORM */}
              {drawerOpen === "vehicle" && (
                <>
                  <Field label={`${isEs ? "Cliente (propietario)" : "Customer (owner)"} *`}>
                    <select value={vehicleForm.customer_id} onChange={(e) => setVehicleForm({ ...vehicleForm, customer_id: e.target.value })} className="input-field">
                      <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>
                  </Field>
                  <Field label={isEs ? "Matrícula / Bastidor" : "Plate / VIN"}>
                    <input type="text" value={vehicleForm.license_plate} onChange={(e) => setVehicleForm({ ...vehicleForm, license_plate: e.target.value })} className="input-field" />
                  </Field>
                  <Field label={isEs ? "Marca" : "Brand"}>
                    <input type="text" value={vehicleForm.brand} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} className="input-field" />
                  </Field>
                  <Field label={isEs ? "Modelo" : "Model"}>
                    <input type="text" value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} className="input-field" />
                  </Field>
                  <Field label={isEs ? "Color" : "Color"}>
                    <input type="text" value={vehicleForm.color} onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })} className="input-field" />
                  </Field>
                  <Field label={isEs ? "Tamaño" : "Size"}>
                    <select value={vehicleForm.size} onChange={(e) => setVehicleForm({ ...vehicleForm, size: e.target.value })} className="input-field">
                      <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                      <option value="small">{isEs ? "Pequeño" : "Small"}</option>
                      <option value="medium">{isEs ? "Mediano" : "Medium"}</option>
                      <option value="large">{isEs ? "Grande" : "Large"}</option>
                      <option value="suv">SUV</option>
                    </select>
                  </Field>
                  <Field label={isEs ? "Notas de condición" : "Condition notes"}>
                    <textarea value={vehicleForm.condition_notes} onChange={(e) => setVehicleForm({ ...vehicleForm, condition_notes: e.target.value })} rows={3} className="input-field resize-none" />
                  </Field>
                </>
              )}

              {/* CUSTOMER FORM */}
              {drawerOpen === "customer" && (
                <>
                  <Field label={`${isEs ? "Nombre completo" : "Full name"} *`}>
                    <input type="text" value={customerForm.full_name} onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })} className="input-field" />
                  </Field>
                  <Field label={isEs ? "Teléfono" : "Phone"}>
                    <input type="tel" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} className="input-field" />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} className="input-field" />
                  </Field>
                  <Field label={isEs ? "Notas" : "Notes"}>
                    <textarea value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} rows={3} className="input-field resize-none" />
                  </Field>
                </>
              )}
            </div>

            <div className="border-t px-6 py-4">
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={saving || (drawerOpen === "order" && !orderForm.service_name) || (drawerOpen === "vehicle" && !vehicleForm.customer_id) || (drawerOpen === "customer" && !customerForm.full_name.trim())}
                onClick={() => {
                  if (drawerOpen === "order") handleCreateOrder();
                  else if (drawerOpen === "vehicle") handleCreateVehicle();
                  else if (drawerOpen === "customer") handleCreateCustomer();
                }}
              >
                {saving
                  ? (isEs ? "Creando..." : "Creating...")
                  : (isEs ? "Crear" : "Create")}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function StatsCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function form_service_in_list(name: string, services: any[]) {
  return services.some((s) => s.name === name);
}
