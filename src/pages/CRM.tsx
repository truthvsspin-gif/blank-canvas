import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  Inbox,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Sparkles,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { supabase } from "@/lib/supabaseClient";

type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  source: string | null;
  created_at: string;
};

type RecentActivity = {
  id: string;
  type: "booking" | "lead" | "customer" | "conversation";
  title: string;
  subtitle: string;
  time: string;
  status?: string;
};

const stageConfig: Record<LeadStage, { labelEs: string; labelEn: string; color: string; bg: string }> = {
  new: { labelEs: "Nuevo", labelEn: "New", color: "text-blue-700", bg: "bg-blue-100" },
  contacted: { labelEs: "Contactado", labelEn: "Contacted", color: "text-purple-700", bg: "bg-purple-100" },
  qualified: { labelEs: "Calificado", labelEn: "Qualified", color: "text-emerald-700", bg: "bg-emerald-100" },
  proposal: { labelEs: "Propuesta", labelEn: "Proposal", color: "text-amber-700", bg: "bg-amber-100" },
  negotiation: { labelEs: "Negociación", labelEn: "Negotiation", color: "text-orange-700", bg: "bg-orange-100" },
  won: { labelEs: "Ganado", labelEn: "Won", color: "text-green-700", bg: "bg-green-100" },
  lost: { labelEs: "Perdido", labelEn: "Lost", color: "text-red-700", bg: "bg-red-100" },
};

export default function CrmPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId, loading: bizLoading } = useCurrentBusiness();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    customers: 0,
    leads: 0,
    bookings: 0,
    pendingBookings: 0,
    conversations: 0,
    services: 0,
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const copy = isEs
    ? {
        title: "Centro de Gestión",
        subtitle: "Tu centro de comando para clientes, leads y operaciones.",
        customers: "Clientes",
        leads: "Leads",
        bookings: "Reservas",
        pending: "Pendientes",
        conversations: "Conversaciones",
        services: "Servicios",
        quickActions: "Acciones Rápidas",
        newCustomer: "Nuevo Cliente",
        newBooking: "Nueva Reserva",
        newService: "Nuevo Servicio",
        viewAll: "Ver Todo",
        pipeline: "Pipeline de Leads",
        pipelineDesc: "Gestiona tus oportunidades de venta",
        recentActivity: "Actividad Reciente",
        recentActivityDesc: "Últimas actualizaciones en tu negocio",
        noLeads: "No hay leads aún",
        noActivity: "No hay actividad reciente",
        searchPlaceholder: "Buscar en CRM...",
        viewCustomers: "Ver Clientes",
        viewLeads: "Ver Leads",
        viewBookings: "Ver Reservas",
        viewInbox: "Ver Inbox",
        viewServices: "Ver Servicios",
        today: "Hoy",
        thisWeek: "Esta Semana",
        thisMonth: "Este Mes",
      }
    : {
        title: "Command Center",
        subtitle: "Your hub for customers, leads, and operations.",
        customers: "Customers",
        leads: "Leads",
        bookings: "Bookings",
        pending: "Pending",
        conversations: "Conversations",
        services: "Services",
        quickActions: "Quick Actions",
        newCustomer: "New Customer",
        newBooking: "New Booking",
        newService: "New Service",
        viewAll: "View All",
        pipeline: "Lead Pipeline",
        pipelineDesc: "Manage your sales opportunities",
        recentActivity: "Recent Activity",
        recentActivityDesc: "Latest updates in your business",
        noLeads: "No leads yet",
        noActivity: "No recent activity",
        searchPlaceholder: "Search CRM...",
        viewCustomers: "View Customers",
        viewLeads: "View Leads",
        viewBookings: "View Bookings",
        viewInbox: "View Inbox",
        viewServices: "View Services",
        today: "Today",
        thisWeek: "This Week",
        thisMonth: "This Month",
      };

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
        leadsRes,
        bookingsRes,
        pendingRes,
        conversationsRes,
        servicesRes,
        leadsDataRes,
        recentBookingsRes,
        recentCustomersRes,
      ] = await Promise.all([
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "pending"),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("created_at", startOfMonth.toISOString()),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("leads").select("id, name, email, phone, stage, source, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(20),
        supabase.from("bookings").select("id, service_name, status, scheduled_at, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(5),
        supabase.from("customers").select("id, full_name, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(5),
      ]);

      setStats({
        customers: customersRes.count ?? 0,
        leads: leadsRes.count ?? 0,
        bookings: bookingsRes.count ?? 0,
        pendingBookings: pendingRes.count ?? 0,
        conversations: conversationsRes.count ?? 0,
        services: servicesRes.count ?? 0,
      });

      if (leadsDataRes.data) {
        setLeads(leadsDataRes.data as Lead[]);
      }

      // Build recent activity from bookings and customers
      const activity: RecentActivity[] = [];
      
      if (recentBookingsRes.data) {
        recentBookingsRes.data.forEach((b) => {
          activity.push({
            id: `booking-${b.id}`,
            type: "booking",
            title: b.service_name,
            subtitle: isEs ? "Nueva reserva" : "New booking",
            time: b.created_at,
            status: b.status,
          });
        });
      }

      if (recentCustomersRes.data) {
        recentCustomersRes.data.forEach((c) => {
          activity.push({
            id: `customer-${c.id}`,
            type: "customer",
            title: c.full_name,
            subtitle: isEs ? "Nuevo cliente" : "New customer",
            time: c.created_at,
          });
        });
      }

      // Sort by time and take top 8
      activity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivity(activity.slice(0, 8));
      setLoading(false);
    };

    fetchData();
  }, [businessId, isEs]);

  const isLoading = bizLoading || loading;

  // Group leads by stage for pipeline
  const pipelineStages: LeadStage[] = ["new", "contacted", "qualified", "proposal", "negotiation"];
  const leadsByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage);
    return acc;
  }, {} as Record<LeadStage, Lead[]>);

  const filteredLeads = searchTerm
    ? leads.filter(
        (l) =>
          l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.phone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leads;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return isEs ? "Hace un momento" : "Just now";
    if (hours < 24) return isEs ? `Hace ${hours}h` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return isEs ? "Ayer" : "Yesterday";
    return isEs ? `Hace ${days} días` : `${days} days ago`;
  };

  const statCards = [
    {
      label: copy.customers,
      value: stats.customers,
      icon: Users,
      href: "/crm/customers",
      gradient: "from-blue-500/10 to-blue-500/5",
      iconColor: "text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      label: copy.leads,
      value: stats.leads,
      icon: UserPlus,
      href: "/crm/leads",
      gradient: "from-purple-500/10 to-purple-500/5",
      iconColor: "text-purple-600",
      iconBg: "bg-purple-100",
    },
    {
      label: copy.bookings,
      value: stats.bookings,
      icon: Calendar,
      href: "/crm/bookings",
      gradient: "from-emerald-500/10 to-emerald-500/5",
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      label: copy.pending,
      value: stats.pendingBookings,
      icon: Clock,
      href: "/crm/bookings",
      gradient: "from-amber-500/10 to-amber-500/5",
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
    },
    {
      label: copy.conversations,
      value: stats.conversations,
      icon: MessageSquare,
      href: "/crm/inbox",
      gradient: "from-accent/10 to-accent/5",
      iconColor: "text-accent",
      iconBg: "bg-accent/10",
    },
    {
      label: copy.services,
      value: stats.services,
      icon: Wrench,
      href: "/crm/services",
      gradient: "from-slate-500/10 to-slate-500/5",
      iconColor: "text-slate-600",
      iconBg: "bg-slate-100",
    },
  ];

  const quickLinks = [
    { label: copy.viewCustomers, href: "/crm/customers", icon: Users },
    { label: copy.viewLeads, href: "/crm/leads", icon: TrendingUp },
    { label: copy.viewBookings, href: "/crm/bookings", icon: Calendar },
    { label: copy.viewInbox, href: "/crm/inbox", icon: Inbox },
    { label: copy.viewServices, href: "/crm/services", icon: Settings2 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/customers/new">
                <Plus className="mr-2 h-4 w-4" />
                {copy.newCustomer}
              </Link>
            </Button>
            <Button className="bg-accent text-white hover:bg-accent/90" asChild>
              <Link to="/crm/bookings/new">
                <Plus className="mr-2 h-4 w-4" />
                {copy.newBooking}
              </Link>
            </Button>
          </div>
        }
      />

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.href}>
            <Card className={`group relative overflow-hidden border-0 bg-gradient-to-br ${stat.gradient} transition-all hover:shadow-md hover:-translate-y-0.5`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </p>
                    {isLoading ? (
                      <div className="mt-1 h-8 w-12 animate-pulse rounded bg-muted" />
                    ) : (
                      <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                    )}
                  </div>
                  <div className={`rounded-lg p-2 ${stat.iconBg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
                <ChevronRight className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg">{copy.quickActions}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Button key={link.href} variant="outline" size="sm" asChild>
                <Link to={link.href} className="gap-2">
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                {copy.pipeline}
              </CardTitle>
              <CardDescription>{copy.pipelineDesc}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/leads">
                {copy.viewAll}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-sm text-muted-foreground">{copy.noLeads}</p>
                <Button className="mt-4" variant="outline" size="sm" asChild>
                  <Link to="/crm/leads">
                    <Plus className="mr-2 h-4 w-4" />
                    {isEs ? "Agregar Lead" : "Add Lead"}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {pipelineStages.map((stage) => {
                  const config = stageConfig[stage];
                  const stageLeads = leadsByStage[stage] || [];
                  return (
                    <div key={stage} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${config.color}`}>
                          {isEs ? config.labelEs : config.labelEn}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {stageLeads.length}
                        </Badge>
                      </div>
                      <div className="min-h-[160px] space-y-2 rounded-lg border border-dashed border-border/50 bg-muted/30 p-2">
                        {stageLeads.slice(0, 3).map((lead) => (
                          <div
                            key={lead.id}
                            className="rounded-md border bg-card p-2 text-xs shadow-sm transition-shadow hover:shadow-md"
                          >
                            <p className="font-medium truncate">{lead.name}</p>
                            {lead.source && (
                              <p className="text-muted-foreground truncate">{lead.source}</p>
                            )}
                          </div>
                        ))}
                        {stageLeads.length > 3 && (
                          <p className="text-center text-xs text-muted-foreground">
                            +{stageLeads.length - 3} {isEs ? "más" : "more"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              {copy.recentActivity}
            </CardTitle>
            <CardDescription>{copy.recentActivityDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">{copy.noActivity}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className={`rounded-full p-2 ${
                      activity.type === "booking" 
                        ? "bg-emerald-100 text-emerald-600"
                        : activity.type === "customer"
                        ? "bg-blue-100 text-blue-600"
                        : activity.type === "lead"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-amber-100 text-amber-600"
                    }`}>
                      {activity.type === "booking" ? (
                        <Calendar className="h-4 w-4" />
                      ) : activity.type === "customer" ? (
                        <User className="h-4 w-4" />
                      ) : activity.type === "lead" ? (
                        <UserPlus className="h-4 w-4" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{activity.subtitle}</span>
                        {activity.status && (
                          <Badge variant="secondary" className="text-xs">
                            {activity.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(activity.time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
