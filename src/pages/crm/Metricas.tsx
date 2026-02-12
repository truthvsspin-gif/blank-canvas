import { useMemo, useState, useEffect } from "react";
import { CrmGettingStarted } from "@/components/crm/crm-getting-started";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type ViewType = "orders" | "financial" | "workers";

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Metricas() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const [view, setView] = useState<ViewType>("orders");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [stockPurchases, setStockPurchases] = useState<any[]>([]);
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!businessId) return;
    const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0)).toISOString();
    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();

    Promise.all([
      supabase.from("bookings").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("customers").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("work_orders").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("documents").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("stock_purchases").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("stock_fixed_costs").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
    ]).then(async ([bRes, cRes, wRes, dRes, pRes, fRes]) => {
      const workRows = wRes.data || [];
      setBookings(bRes.data || []);
      setCustomers(cRes.data || []);
      setWorkOrders(workRows);
      setDocuments(dRes.data || []);
      setStockPurchases(pRes.data || []);
      setFixedCosts(fRes.data || []);

      const assigneeIds = Array.from(new Set(workRows.map((row: any) => row.assigned_to).filter(Boolean))) as string[];
      if (assigneeIds.length > 0) {
        const { data: users } = await supabase.from("users").select("id, full_name, email").in("id", assigneeIds);
        setUsersMap(new Map((users || []).map((u) => [u.id, u.full_name || u.email || u.id])));
      } else {
        setUsersMap(new Map());
      }
    });
  }, [businessId, year, month]);

  const monthLabel = isEs ? MONTHS_ES[month] : MONTHS_EN[month];
  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((prev) => prev - 1);
    } else setMonth((prev) => prev - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((prev) => prev + 1);
    } else setMonth((prev) => prev + 1);
  };

  const confirmed = bookings.filter((row) => row.status === "confirmed").length;
  const cancelled = bookings.filter((row) => row.status === "cancelled").length;
  const absent = bookings.filter((row) => row.status === "no_show").length;
  const requests = bookings.filter((row) => row.validation_status === "pending").length;

  const topServicesMap = useMemo(() => {
    const map: Record<string, number> = {};
    workOrders.forEach((row) => {
      const key = row.service_name || (isEs ? "Servicio" : "Service");
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [workOrders, isEs]);

  const revenuePaid = useMemo(
    () =>
      documents
        .filter((row) => row.doc_type === "invoice" && row.status === "paid")
        .reduce((acc, row) => acc + Number(row.total || 0), 0),
    [documents]
  );
  const revenuePending = useMemo(
    () =>
      documents
        .filter((row) => row.doc_type === "invoice" && row.status !== "paid")
        .reduce((acc, row) => acc + Number(row.total || 0), 0),
    [documents]
  );
  const costs = useMemo(
    () =>
      stockPurchases.reduce((acc, row) => acc + Number(row.total || 0), 0) +
      fixedCosts.reduce((acc, row) => acc + Number(row.total || 0), 0),
    [stockPurchases, fixedCosts]
  );
  const margin = revenuePaid - costs;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const ordersChart = useMemo(() => {
    const out: { day: number; count: number }[] = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      out.push({
        day: d,
        count: workOrders.filter((row) => new Date(row.created_at).getDate() === d).length,
      });
    }
    return out;
  }, [daysInMonth, workOrders]);

  const financialChart = useMemo(() => {
    const out: { day: number; revenue: number; cost: number }[] = [];
    for (let d = 1; d <= daysInMonth; d += 1) {
      const revenue = documents
        .filter((row) => new Date(row.created_at).getDate() === d && row.doc_type === "invoice")
        .reduce((acc, row) => acc + Number(row.total || 0), 0);
      const cost =
        stockPurchases
          .filter((row) => new Date(row.created_at).getDate() === d)
          .reduce((acc, row) => acc + Number(row.total || 0), 0) +
        fixedCosts
          .filter((row) => new Date(row.created_at).getDate() === d)
          .reduce((acc, row) => acc + Number(row.total || 0), 0);
      out.push({ day: d, revenue, cost });
    }
    return out;
  }, [daysInMonth, documents, stockPurchases, fixedCosts]);

  const workersRows = useMemo(() => {
    const grouped = new Map<string, { assigned: number; completed: number; inProgress: number }>();
    workOrders.forEach((row) => {
      const key = row.assigned_to || "unassigned";
      const prev = grouped.get(key) || { assigned: 0, completed: 0, inProgress: 0 };
      prev.assigned += 1;
      if (row.status === "completed") prev.completed += 1;
      if (row.status === "in_progress") prev.inProgress += 1;
      grouped.set(key, prev);
    });

    return Array.from(grouped.entries()).map(([assignee, values]) => ({
      assignee,
      name:
        assignee === "unassigned"
          ? isEs
            ? "Sin asignar"
            : "Unassigned"
          : usersMap.get(assignee) || assignee,
      ...values,
    }));
  }, [workOrders, usersMap, isEs]);

  return (
    <div className="space-y-6">
      <CrmGettingStarted
        titleEs="¿Cómo usar Métricas?"
        titleEn="How to use Metrics?"
        storageKey="crm-tips-metricas"
        steps={[
          { emoji: "1️⃣", textEs: "Selecciona la vista: Órdenes, Finanzas o Trabajadores.", textEn: "Select the view: Orders, Financial or Workers." },
          { emoji: "2️⃣", textEs: "Usa las flechas para navegar entre meses y comparar períodos.", textEn: "Use the arrows to navigate between months and compare periods." },
          { emoji: "3️⃣", textEs: "Las métricas se calculan automáticamente desde tus datos reales.", textEn: "Metrics are calculated automatically from your real data." },
          { emoji: "💡", textEs: "Crea órdenes, facturas y completa trabajos para ver tus métricas crecer.", textEn: "Create orders, invoices and complete jobs to see your metrics grow." },
        ]}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{isEs ? "Metricas" : "Metrics"}</h1>
          <select
            value={view}
            onChange={(event) => setView(event.target.value as ViewType)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="orders">{isEs ? "Ordenes" : "Orders"}</option>
            <option value="financial">{isEs ? "Finanzas" : "Financial"}</option>
            <option value="workers">{isEs ? "Trabajadores" : "Workers"}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[120px] text-center text-sm font-medium">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {view === "orders" && (
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label={isEs ? "Confirmadas" : "Confirmed"} value={confirmed} />
              <StatCard label={isEs ? "Canceladas" : "Cancelled"} value={cancelled} />
              <StatCard label={isEs ? "Ausencias" : "No-shows"} value={absent} />
              <StatCard label={isEs ? "Solicitudes" : "Requests"} value={requests} />
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 font-semibold text-muted-foreground">{isEs ? "Resumen ordenes" : "Order summary"}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ordersChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">{isEs ? "Clientes nuevos" : "New customers"}</p>
              <p className="mt-2 text-3xl font-bold">{customers.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 font-semibold">{isEs ? "Top servicios" : "Top services"}</h3>
              {topServicesMap.length === 0 ? (
                <p className="text-sm text-muted-foreground">{isEs ? "Sin servicios en este periodo." : "No services this period."}</p>
              ) : (
                <div className="space-y-2">
                  {topServicesMap.map(([name, count]) => (
                    <div key={name} className="flex justify-between text-sm">
                      <span>{name}</span>
                      <span className="text-muted-foreground">{count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === "financial" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={isEs ? "Ingresos cobrados" : "Collected revenue"} value={revenuePaid} money />
            <StatCard label={isEs ? "Ingresos pendientes" : "Pending revenue"} value={revenuePending} money />
            <StatCard label={isEs ? "Costes" : "Costs"} value={costs} money />
            <StatCard label={isEs ? "Margen" : "Margin"} value={margin} money accent={margin >= 0} />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-semibold text-muted-foreground">{isEs ? "Flujo diario" : "Daily flow"}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={financialChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {view === "workers" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{isEs ? "Trabajador" : "Worker"}</span>
            <span>{isEs ? "Asignadas" : "Assigned"}</span>
            <span>{isEs ? "En curso" : "In progress"}</span>
            <span>{isEs ? "Completadas" : "Completed"}</span>
          </div>
          {workersRows.length === 0 ? (
            <div className="px-4 py-16 text-sm text-muted-foreground text-center">
              {isEs ? "Sin actividad de trabajadores en este periodo." : "No worker activity in this period."}
            </div>
          ) : (
            workersRows.map((row) => (
              <div key={row.assignee} className="grid grid-cols-4 gap-2 border-t px-4 py-3 text-sm">
                <span className="font-medium">{row.name}</span>
                <span>{row.assigned}</span>
                <span className={cn(row.inProgress > 0 ? "text-blue-600 font-medium" : "text-muted-foreground")}>{row.inProgress}</span>
                <span className={cn(row.completed > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground")}>{row.completed}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, money = false, accent }: { label: string; value: number; money?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-4 flex items-end justify-between">
        <span className={cn("text-3xl font-bold", accent === undefined ? "text-foreground" : accent ? "text-emerald-600" : "text-red-600")}>
          {money ? `€${value.toFixed(2)}` : value}
        </span>
      </div>
    </div>
  );
}
