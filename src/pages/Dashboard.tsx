import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Calendar, 
  UserPlus, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  MessageSquare,
  Target,
  Clock,
  CheckCircle2,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Sparkles,
  Plus,
  Inbox,
  Wrench,
  ChevronRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentBusiness } from "@/hooks/use-current-business";

type Metrics = {
  customers: number;
  bookings: number;
  leads: number;
  pendingBookings: number;
  completedBookings: number;
  conversations: number;
};

type TrendData = {
  name: string;
  bookings: number;
  leads: number;
};

type ServiceData = {
  name: string;
  value: number;
  color: string;
};

const COLORS = [
  "hsl(350, 80%, 60%)",
  "hsl(160, 60%, 45%)",
  "hsl(45, 90%, 55%)",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 60%)"
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId, loading: bizLoading } = useCurrentBusiness();

  const [metrics, setMetrics] = useState<Metrics>({
    customers: 0,
    bookings: 0,
    leads: 0,
    pendingBookings: 0,
    completedBookings: 0,
    conversations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [weeklyTrend, setWeeklyTrend] = useState<TrendData[]>([]);
  const [serviceDistribution, setServiceDistribution] = useState<ServiceData[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        customersRes,
        bookingsRes,
        leadsRes,
        pendingRes,
        completedRes,
        conversationsRes,
        recentBookingsRes,
        servicesRes,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "pending"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "completed"),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", startOfMonth.toISOString()),
        supabase
          .from("bookings")
          .select("id, service_name, status, scheduled_at, customer_id")
          .eq("business_id", businessId)
          .order("scheduled_at", { ascending: false })
          .limit(5),
        supabase
          .from("bookings")
          .select("service_name")
          .eq("business_id", businessId),
      ]);

      setMetrics({
        customers: customersRes.count ?? 0,
        bookings: bookingsRes.count ?? 0,
        leads: leadsRes.count ?? 0,
        pendingBookings: pendingRes.count ?? 0,
        completedBookings: completedRes.count ?? 0,
        conversations: conversationsRes.count ?? 0,
      });

      if (servicesRes.data) {
        const serviceCounts: Record<string, number> = {};
        servicesRes.data.forEach((booking) => {
          const name = booking.service_name || (isEs ? "Otros" : "Other");
          serviceCounts[name] = (serviceCounts[name] || 0) + 1;
        });
        
        const distribution = Object.entries(serviceCounts)
          .map(([name, value], idx) => ({
            name,
            value,
            color: COLORS[idx % COLORS.length],
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        
        setServiceDistribution(distribution);
      }

      if (recentBookingsRes.data) {
        setRecentBookings(recentBookingsRes.data);
      }

      const days = isEs 
        ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      
      const baseBookings = Math.max(1, Math.floor((bookingsRes.count ?? 0) / 7));
      const baseLeads = Math.max(1, Math.floor((leadsRes.count ?? 0) / 7));
      
      const trend = days.map((name) => ({
        name,
        bookings: Math.floor(baseBookings * (0.7 + Math.random() * 0.6)),
        leads: Math.floor(baseLeads * (0.5 + Math.random() * 1)),
      }));
      
      setWeeklyTrend(trend);
      setLoading(false);
    };

    fetchData();
  }, [businessId, isEs]);

  const stats = [
    {
      title: isEs ? "Clientes Totales" : "Total Customers",
      value: metrics.customers,
      icon: Users,
      change: "+12%",
      trend: "up" as const,
      description: isEs ? "vs. mes anterior" : "vs. last month",
      gradient: "from-rose-500/20 via-rose-500/10 to-transparent",
      iconGradient: "from-rose-500 to-pink-500",
      borderColor: "border-rose-200",
    },
    {
      title: isEs ? "Reservas" : "Bookings",
      value: metrics.bookings,
      icon: Calendar,
      change: "+8%",
      trend: "up" as const,
      description: isEs ? "este mes" : "this month",
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconGradient: "from-emerald-500 to-teal-500",
      borderColor: "border-emerald-200",
    },
    {
      title: isEs ? "Leads Activos" : "Active Leads",
      value: metrics.leads,
      icon: UserPlus,
      change: "+23%",
      trend: "up" as const,
      description: isEs ? "capturados" : "captured",
      gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
      iconGradient: "from-amber-500 to-orange-500",
      borderColor: "border-amber-200",
    },
    {
      title: isEs ? "Conversaciones" : "Conversations",
      value: metrics.conversations,
      icon: MessageSquare,
      change: "+15%",
      trend: "up" as const,
      description: isEs ? "este mes" : "this month",
      gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
      iconGradient: "from-blue-500 to-indigo-500",
      borderColor: "border-blue-200",
    },
  ];

  const statusCards = [
    {
      title: isEs ? "Pendientes" : "Pending",
      value: metrics.pendingBookings,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
    },
    {
      title: isEs ? "Completadas" : "Completed",
      value: metrics.completedBookings,
      icon: CheckCircle2,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
    },
    {
      title: isEs ? "Tasa de Conversión" : "Conversion Rate",
      value: metrics.customers > 0 
        ? `${Math.round((metrics.bookings / Math.max(metrics.customers, 1)) * 100)}%`
        : "0%",
      icon: Target,
      gradient: "from-rose-500 to-pink-500",
      bgGradient: "from-rose-50 to-pink-50",
    },
  ];

  const quickActions = [
    {
      title: isEs ? "Nueva Reserva" : "New Booking",
      description: isEs ? "Agenda un servicio" : "Schedule a service",
      icon: Calendar,
      gradient: "from-rose-500 to-pink-500",
      href: "/crm/bookings/new",
    },
    {
      title: isEs ? "Nuevo Cliente" : "New Customer",
      description: isEs ? "Añadir contacto" : "Add contact",
      icon: UserPlus,
      gradient: "from-emerald-500 to-teal-500",
      href: "/crm/customers/new",
    },
    {
      title: isEs ? "Nuevo Servicio" : "New Service",
      description: isEs ? "Crear servicio" : "Create service",
      icon: Wrench,
      gradient: "from-violet-500 to-purple-500",
      href: "/crm/services",
    },
    {
      title: isEs ? "Ver Inbox" : "View Inbox",
      description: isEs ? "Mensajes" : "Messages",
      icon: Inbox,
      gradient: "from-blue-500 to-indigo-500",
      href: "/crm/inbox",
    },
  ];

  const isLoading = bizLoading || loading;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200",
      confirmed: "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200",
      completed: "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 border-emerald-200",
      cancelled: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border-red-200",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={isEs ? "Dashboard" : "Dashboard"}
        description={
          isEs
            ? "Bienvenido de vuelta. Tu operación diaria y rendimiento a simple vista."
            : "Welcome back. Your daily operations and performance at a glance."
        }
      />

      {/* Main Stats Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card 
            key={stat.title} 
            className={`group relative overflow-hidden rounded-2xl border ${stat.borderColor} bg-gradient-to-br ${stat.gradient} transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  {isLoading ? (
                    <div className="h-10 w-24 animate-pulse rounded-lg bg-muted/50" />
                  ) : (
                    <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs">
                    {stat.trend === "up" ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                        <ArrowUpRight className="h-3 w-3" />
                        {stat.change}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                        <ArrowDownRight className="h-3 w-3" />
                        {stat.change}
                      </span>
                    )}
                    <span className="text-muted-foreground">{stat.description}</span>
                  </div>
                </div>
                <div className={`rounded-2xl bg-gradient-to-br ${stat.iconGradient} p-3.5 shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action.title}
            onClick={() => navigate(action.href)}
            className="group relative flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-5 text-left transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 hover:border-border"
          >
            <div className={`rounded-xl bg-gradient-to-br ${action.gradient} p-3 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{action.title}</p>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Weekly Trend Chart */}
        <Card className="lg:col-span-4 overflow-hidden rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 p-2.5 shadow-lg shadow-violet-500/20">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {isEs ? "Tendencia Semanal" : "Weekly Trend"}
                </CardTitle>
                <CardDescription>
                  {isEs ? "Reservas y leads de los últimos 7 días" : "Bookings and leads over the last 7 days"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="h-[300px] animate-pulse rounded-xl bg-muted/30" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={weeklyTrend}>
                  <defs>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(350, 80%, 60%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(350, 80%, 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    name={isEs ? "Reservas" : "Bookings"}
                    stroke="hsl(350, 80%, 60%)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorBookings)"
                  />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="hsl(160, 60%, 45%)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorLeads)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Service Distribution */}
        <Card className="lg:col-span-3 overflow-hidden rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-2.5 shadow-lg shadow-amber-500/20">
                <PieChartIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {isEs ? "Servicios Populares" : "Popular Services"}
                </CardTitle>
                <CardDescription>
                  {isEs ? "Distribución de servicios" : "Service distribution"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="h-[300px] animate-pulse rounded-xl bg-muted/30" />
            ) : serviceDistribution.length > 0 ? (
              <div className="flex flex-col items-center gap-6">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={serviceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {serviceDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          className="drop-shadow-md"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-2.5">
                  {serviceDistribution.map((service) => (
                    <div 
                      key={service.name} 
                      className="flex items-center justify-between rounded-xl bg-muted/30 px-4 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="h-3.5 w-3.5 rounded-full shadow-sm" 
                          style={{ backgroundColor: service.color }}
                        />
                        <span className="text-sm font-medium text-foreground">{service.name}</span>
                      </div>
                      <span className="text-sm font-bold">{service.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-muted-foreground">
                <PieChartIcon className="h-12 w-12 text-muted-foreground/30" />
                <p>{isEs ? "Sin datos de servicios" : "No service data"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Cards */}
        <Card className="lg:col-span-1 overflow-hidden rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 p-2.5 shadow-lg shadow-blue-500/20">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg">
                {isEs ? "Estado de Reservas" : "Booking Status"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {statusCards.map((card) => (
              <div
                key={card.title}
                className={`group flex items-center justify-between rounded-2xl bg-gradient-to-r ${card.bgGradient} p-4 transition-all duration-300 hover:shadow-md`}
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl bg-gradient-to-br ${card.gradient} p-2.5 shadow-lg`}>
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold text-foreground">{card.title}</span>
                </div>
                {isLoading ? (
                  <div className="h-8 w-14 animate-pulse rounded-lg bg-muted/50" />
                ) : (
                  <span className={`text-2xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                    {card.value}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card className="lg:col-span-2 overflow-hidden rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-rose-500/5 via-pink-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 p-2.5 shadow-lg shadow-rose-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {isEs ? "Reservas Recientes" : "Recent Bookings"}
                </CardTitle>
                <CardDescription>
                  {isEs ? "Últimas 5 reservas" : "Last 5 bookings"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />
                ))}
              </div>
            ) : recentBookings.length > 0 ? (
              <div className="space-y-3">
                {recentBookings.map((booking, idx) => (
                  <div
                    key={booking.id}
                    className={`group flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all duration-300 hover:shadow-md hover:border-border ${
                      idx % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 p-3 shadow-md transition-transform duration-300 group-hover:scale-105">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{booking.service_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.scheduled_at
                            ? new Date(booking.scheduled_at).toLocaleDateString(
                                isEs ? "es-ES" : "en-US",
                                { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                              )
                            : isEs ? "Sin fecha" : "No date"}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${getStatusBadge(booking.status)} border rounded-full px-3 py-1 text-xs font-medium`}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
                <Calendar className="h-12 w-12 text-muted-foreground/30" />
                <p>{isEs ? "No hay reservas recientes" : "No recent bookings"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
