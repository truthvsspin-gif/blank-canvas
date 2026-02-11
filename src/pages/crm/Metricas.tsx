import { useState, useEffect, useMemo } from "react";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type MetricView = "orders" | "customers";
type PeriodType = "month" | "week";

const MONTHS_ES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Metricas() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const [view, setView] = useState<MetricView>("orders");
  const [period, setPeriod] = useState<PeriodType>("month");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  // Data
  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) return;
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    Promise.all([
      supabase.from("bookings").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("customers").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("work_orders").select("*").eq("business_id", businessId).gte("created_at", startDate).lte("created_at", endDate),
      supabase.from("services").select("*").eq("business_id", businessId),
    ]).then(([bRes, cRes, wRes, sRes]) => {
      setBookings(bRes.data || []);
      setCustomers(cRes.data || []);
      setWorkOrders(wRes.data || []);
      setServices(sRes.data || []);
    });
  }, [businessId, year, month]);

  const monthLabel = isEs ? MONTHS_ES[month] : MONTHS_EN[month];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Stats
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const absent = bookings.filter((b) => b.status === "no_show").length;
  const requests = bookings.filter((b) => b.validation_status === "pending").length;

  // Chart data (orders per day)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const chartData = useMemo(() => {
    const days: { day: number; count: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const count = workOrders.filter((wo) => {
        const dt = new Date(wo.created_at);
        return dt.getDate() === d;
      }).length;
      days.push({ day: d, count });
    }
    return days;
  }, [workOrders, daysInMonth]);

  // Customer sources
  const sources = [
    { label: "Chatbot IA", color: "bg-purple-400", count: 0 },
    { label: isEs ? "Página de Reservas" : "Booking Page", color: "bg-pink-400", count: 0 },
    { label: "Instagram", color: "bg-yellow-400", count: 0 },
    { label: "WhatsApp", color: "bg-blue-400", count: 0 },
    { label: isEs ? "Teléfono" : "Phone", color: "bg-orange-400", count: 0 },
    { label: isEs ? "Presencial" : "Walk-in", color: "bg-emerald-400", count: 0 },
  ];

  // Recurring customers
  const recurring = 0;

  // Top services
  const topServices = services.slice(0, 5);

  const statCards = [
    { label: isEs ? "Confirmadas" : "Confirmed", value: confirmed },
    { label: isEs ? "Canceladas" : "Cancelled", value: cancelled },
    { label: isEs ? "Ausencias" : "No-shows", value: absent },
    { label: isEs ? "Solicitudes" : "Requests", value: requests },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {isEs ? "Métricas" : "Metrics"}
          </h1>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as MetricView)}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="orders">{isEs ? "Órdenes" : "Orders"}</option>
            <option value="customers">{isEs ? "Clientes" : "Customers"}</option>
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
            className="ml-2 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="month">{isEs ? "Mes" : "Month"}</option>
            <option value="week">{isEs ? "Semana" : "Week"}</option>
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-foreground">{card.value}</span>
              <span className="text-xs text-muted-foreground">{isEs ? "Igual" : "Same"}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Orders Chart (left 3 cols) */}
        <div className="md:col-span-3 space-y-6">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                {isEs ? "Resumen órdenes" : "Order Summary"}
              </h3>
              <span className="text-sm text-muted-foreground">
                TOTAL: <span className="text-2xl font-bold text-foreground ml-1">{workOrders.length}</span>
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(160, 60%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-6">
          {/* New Customers */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                {isEs ? "Clientes Nuevos" : "New Customers"}
              </h3>
              <span className="text-sm text-muted-foreground">
                TOTAL: <span className="text-2xl font-bold text-foreground ml-1">{customers.length}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sources.map((src) => (
                <div key={src.label} className="flex items-center gap-2">
                  <div className={cn("h-2.5 w-2.5 rounded-full", src.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{src.label}</p>
                    <p className="text-xs text-muted-foreground">{src.count} {isEs ? "clientes" : "clients"}</p>
                  </div>
                  <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Recurring */}
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{isEs ? "Clientes recurrentes" : "Recurring customers"}</p>
            <div className="flex items-end justify-between mt-2">
              <span className="text-3xl font-bold text-foreground">{recurring}</span>
              <span className="text-xs text-muted-foreground">{isEs ? "Igual" : "Same"}</span>
            </div>
          </div>

          {/* Top Services */}
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-3">
              {isEs ? "Top Servicios realizados" : "Top Services"}
            </h3>
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isEs
                  ? "Todavía no has realizado ningún servicio en este periodo"
                  : "No services performed in this period yet"}
              </p>
            ) : (
              <div className="space-y-2">
                {topServices.map((s: any) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{s.base_price ? `€${s.base_price}` : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
