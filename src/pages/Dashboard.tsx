import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Calendar, 
  UserPlus,
  ArrowUpRight, 
  Clock,
  CheckCircle2,
  DollarSign,
  Wrench,
  ChevronRight,
  Plus,
} from "lucide-react";

import { useLanguage } from "@/components/providers/language-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentBusiness } from "@/hooks/use-current-business";

type Metrics = {
  customers: number;
  bookings: number;
  pendingBookings: number;
  completedBookings: number;
  pendingPayments: number;
  todayAppointments: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId, loading: bizLoading } = useCurrentBusiness();

  const [metrics, setMetrics] = useState<Metrics>({
    customers: 0,
    bookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    pendingPayments: 0,
    todayAppointments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const [
        customersRes,
        bookingsRes,
        pendingRes,
        completedRes,
        todayRes,
        pendingPayRes,
        recentBookingsRes,
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
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("status", ["requested", "pending", "new"]),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "completed"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("scheduled_at", startOfDay)
          .lt("scheduled_at", endOfDay),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "completed")
          .not("confirmation_notes", "ilike", "%payment:paid%"),
        supabase
          .from("bookings")
          .select("id, service_name, status, scheduled_at, price")
          .eq("business_id", businessId)
          .order("scheduled_at", { ascending: false })
          .limit(5),
      ]);

      setMetrics({
        customers: customersRes.count ?? 0,
        bookings: bookingsRes.count ?? 0,
        pendingBookings: pendingRes.count ?? 0,
        completedBookings: completedRes.count ?? 0,
        todayAppointments: todayRes.count ?? 0,
        pendingPayments: pendingPayRes.count ?? 0,
      });

      if (recentBookingsRes.data) {
        setRecentBookings(recentBookingsRes.data);
      }

      setLoading(false);
    };

    fetchData();
  }, [businessId]);

  const stats = [
    {
      title: isEs ? "Citas Hoy" : "Today's Appointments",
      value: metrics.todayAppointments,
      icon: Calendar,
      description: isEs ? "programadas para hoy" : "scheduled for today",
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconGradient: "from-emerald-500 to-teal-500",
      borderColor: "border-emerald-200",
    },
    {
      title: isEs ? "Pendientes" : "Pending Orders",
      value: metrics.pendingBookings,
      icon: Clock,
      description: isEs ? "por confirmar" : "awaiting confirmation",
      gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
      iconGradient: "from-amber-500 to-orange-500",
      borderColor: "border-amber-200",
    },
    {
      title: isEs ? "Completadas" : "Completed",
      value: metrics.completedBookings,
      icon: CheckCircle2,
      description: isEs ? "órdenes finalizadas" : "orders finished",
      gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
      iconGradient: "from-blue-500 to-indigo-500",
      borderColor: "border-blue-200",
    },
    {
      title: isEs ? "Clientes" : "Customers",
      value: metrics.customers,
      icon: Users,
      description: isEs ? "registrados" : "registered",
      gradient: "from-rose-500/20 via-rose-500/10 to-transparent",
      iconGradient: "from-rose-500 to-pink-500",
      borderColor: "border-rose-200",
    },
  ];

  const quickActions = [
    {
      title: isEs ? "Nueva Reserva" : "New Booking",
      description: isEs ? "Agenda un servicio" : "Schedule a service",
      icon: Calendar,
      gradient: "from-emerald-500 to-teal-500",
      href: "/crm/bookings/new",
    },
    {
      title: isEs ? "Nuevo Cliente" : "New Customer",
      description: isEs ? "Añadir contacto" : "Add contact",
      icon: UserPlus,
      gradient: "from-rose-500 to-pink-500",
      href: "/crm/customers/new",
    },
    {
      title: isEs ? "Ver Órdenes" : "View Orders",
      description: isEs ? "Tablero de trabajo" : "Work board",
      icon: Wrench,
      gradient: "from-amber-500 to-orange-500",
      href: "/crm/work-orders",
    },
  ];

  const isLoading = bizLoading || loading;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      requested: "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200",
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
            ? "Tu operación diaria a simple vista."
            : "Your daily operations at a glance."
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
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
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
      <div className="grid gap-4 md:grid-cols-3">
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

      {/* Recent Bookings */}
      <Card className="overflow-hidden rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 shadow-lg shadow-emerald-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isEs ? "Últimas Reservas" : "Recent Bookings"}
              </CardTitle>
              <CardDescription>
                {isEs ? "Últimas 5 reservas registradas" : "Last 5 bookings registered"}
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
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 shadow-md transition-transform duration-300 group-hover:scale-105">
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
                  <div className="flex items-center gap-3">
                    {booking.price && (
                      <span className="text-sm font-semibold text-foreground">
                        ${booking.price}
                      </span>
                    )}
                    <Badge className={`${getStatusBadge(booking.status)} border rounded-full px-3 py-1 text-xs font-medium`}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Calendar className="h-12 w-12 text-muted-foreground/30" />
              <p>{isEs ? "No hay reservas recientes" : "No recent bookings"}</p>
              <button
                onClick={() => navigate("/crm/bookings/new")}
                className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {isEs ? "Crear primera reserva" : "Create first booking"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}