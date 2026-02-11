import { useState, useEffect, useMemo } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Lock, UsersRound } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";

type PeriodType = "month" | "week";
type ViewType = "orders" | "financial" | "workers";

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Metricas() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const [view, setView] = useState<ViewType>("orders");
  const [period, setPeriod] = useState<PeriodType>("month");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) return;
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    Promise.all([
      supabase.from("bookings").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("customers").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("work_orders").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
    ]).then(([bRes, cRes, wRes]) => {
      setBookings(bRes.data || []);
      setCustomers(cRes.data || []);
      setWorkOrders(wRes.data || []);
    });
  }, [businessId, year, month]);

  const monthLabel = isEs ? MONTHS_ES[month] : MONTHS_EN[month];
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };

  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const absent = bookings.filter((b) => b.status === "no_show").length;
  const requests = bookings.filter((b) => b.validation_status === "pending").length;
  const recurring = 0;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const chartData = useMemo(() => {
    const days: { day: number; count: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const count = workOrders.filter((wo) => new Date(wo.created_at).getDate() === d).length;
      days.push({ day: d, count });
    }
    return days;
  }, [workOrders, daysInMonth]);

  const sources = [
    { label: "Chatbot IA", color: "bg-purple-400", count: 0 },
    { label: isEs ? "Página de Reservas" : "Booking Page", color: "bg-pink-400", count: 0 },
    { label: "Instagram", color: "bg-yellow-400", count: 0 },
    { label: "WhatsApp", color: "bg-cyan-400", count: 0 },
    { label: isEs ? "Teléfono" : "Phone", color: "bg-orange-400", count: 0 },
    { label: isEs ? "Presencial" : "Walk-in", color: "bg-emerald-400", count: 0 },
  ];

  const topServicesMap = useMemo(() => {
    const map: Record<string, number> = {};
    workOrders.forEach((wo) => { map[wo.service_name] = (map[wo.service_name] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [workOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{isEs ? "Métricas" : "Metrics"}</h1>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as ViewType)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="orders">{isEs ? "Órdenes" : "Orders"}</option>
            <option value="financial">{isEs ? "Finanzas" : "Financial"}</option>
            <option value="workers">{isEs ? "Trabajadores" : "Workers"}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium min-w-[120px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="ml-2 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="month">{isEs ? "Mes" : "Month"}</option>
            <option value="week">{isEs ? "Semana" : "Week"}</option>
          </select>
        </div>
      </div>

      {/* VIEW: Orders */}
      {view === "orders" && (
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label={isEs ? "Confirmadas" : "Confirmed"} value={confirmed} delta={isEs ? "Igual" : "Same"} />
              <StatCard label={isEs ? "Canceladas" : "Cancelled"} value={cancelled} delta={isEs ? "Igual" : "Same"} />
              <StatCard label={isEs ? "Ausencias" : "No-shows"} value={absent} delta={isEs ? "Igual" : "Same"} />
              <StatCard label={isEs ? "Solicitudes" : "Requests"} value={requests} delta={isEs ? "Igual" : "Same"} />
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-muted-foreground">{isEs ? "Resumen órdenes" : "Order Summary"}</h3>
                <span className="text-sm text-muted-foreground">
                  TOTAL: <span className="text-2xl font-bold text-foreground ml-1">{workOrders.length}</span>
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">{isEs ? "Clientes Nuevos" : "New Customers"}</h3>
                <span className="text-sm text-muted-foreground">
                  TOTAL: <span className="text-2xl font-bold text-foreground ml-1">{customers.length}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {sources.map((src) => (
                  <div key={src.label} className="flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", src.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{src.label}</p>
                      <p className="text-xs text-muted-foreground">{src.count} {isEs ? "clientes" : "clients"}</p>
                    </div>
                    <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">{isEs ? "Clientes recurrentes" : "Recurring customers"}</p>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-bold text-foreground">{recurring}</span>
                <span className="text-xs text-muted-foreground">{isEs ? "Igual" : "Same"}</span>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold text-foreground mb-3">{isEs ? "Top Servicios realizados" : "Top Services"}</h3>
              {topServicesMap.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isEs ? "Todavía no has realizado ningún servicio en este periodo" : "No services performed in this period yet"}
                </p>
              ) : (
                <div className="space-y-2">
                  {topServicesMap.map(([name, count]) => (
                    <div key={name} className="flex justify-between text-sm">
                      <span className="font-medium">{name}</span>
                      <span className="text-muted-foreground">{count}x</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Finanzas */}
      {view === "financial" && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-7 w-7 text-foreground" />
            <h2 className="text-2xl font-bold text-foreground">{isEs ? "Finanzas" : "Financial"}</h2>
            <span className="text-[10px] font-bold uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded">PRO</span>
          </div>
          <div className="rounded-xl border bg-card p-8 md:p-10 max-w-lg text-center space-y-4">
            <h3 className="text-2xl font-bold text-foreground">
              {isEs
                ? "Todas tus métricas financieras en un solo lugar"
                : "All your financial metrics in one place"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isEs
                ? "Visualiza los ingresos, gastos y beneficios de tu negocio, junto con los datos de Documentos, Stock y Ventas."
                : "View your business income, expenses and profits, along with data from Documents, Stock and Sales."}
            </p>
            <p className="text-sm text-muted-foreground">
              {isEs
                ? "Todo conectado automáticamente para que entiendas tu rentabilidad real."
                : "All connected automatically so you understand your real profitability."}
            </p>
            <Button size="lg" className="w-full mt-4 gap-2">
              <Lock className="h-4 w-4" />
              {isEs ? "Sube a PRO y desbloquea métricas" : "Upgrade to PRO and unlock metrics"}
            </Button>
          </div>
        </div>
      )}

      {/* VIEW: Trabajadores */}
      {view === "workers" && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="h-7 w-7 text-foreground" />
            <h2 className="text-2xl font-bold text-foreground">{isEs ? "Trabajadores" : "Workers"}</h2>
            <span className="text-[10px] font-bold uppercase bg-orange-100 text-orange-600 px-2 py-0.5 rounded">EXTRA</span>
          </div>
          <div className="rounded-xl border bg-card p-8 md:p-10 max-w-lg text-center space-y-4">
            <h3 className="text-2xl font-bold text-foreground">
              {isEs
                ? "Mide el rendimiento de tu equipo en tiempo real"
                : "Measure your team's performance in real time"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isEs
                ? "Descubre cuántas órdenes gestiona cada trabajador, su productividad, los servicios que más realizan y el valor total que genera para tu negocio."
                : "Discover how many orders each worker handles, their productivity, top services, and total value generated for your business."}
            </p>
            <p className="text-xs text-muted-foreground italic">
              {isEs
                ? "*Disponible solo con el módulo de trabajadores."
                : "*Available only with the workers module."}
            </p>
            <Button size="lg" className="w-full mt-4 gap-2 bg-purple-600 hover:bg-purple-700 text-white">
              <Lock className="h-4 w-4" />
              {isEs ? "Módulo Trabajadores" : "Workers Module"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, delta }: { label: string; value: number; delta: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-end justify-between mt-4">
        <span className="text-3xl font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{delta}</span>
      </div>
    </div>
  );
}
