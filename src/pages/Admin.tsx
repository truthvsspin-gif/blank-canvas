import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cog,
  Database,
  Globe,
  MessageCircle,
  MessageSquare,
  Moon,
  MoreHorizontal,
  Phone,
  Power,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useAuth } from "@/components/providers/auth-provider";

export default function AdminPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auto-reply state
  const [autoReply, setAutoReply] = useState({
    enabled: true,
    greetingEnabled: true,
    greetingText: "",
    oooEnabled: true,
    oooText: "",
    timezone: "UTC",
    start: "09:00",
    end: "18:00",
    days: "1,2,3,4,5",
    fallbackText: "",
  });
  const [autoReplySaving, setAutoReplySaving] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState<string | null>(null);
  const [autoReplyError, setAutoReplyError] = useState<string | null>(null);
  const [aiReplyEnabled, setAiReplyEnabled] = useState(false);
  
  // Seed demo state
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  
  // WhatsApp state
  const [whatsAppLoading, setWhatsAppLoading] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);
  const [whatsAppThreads, setWhatsAppThreads] = useState<
    {
      id: string;
      contactName: string;
      contactHandle: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }[]
  >([]);
  const [whatsAppStats, setWhatsAppStats] = useState({
    conversations: 0,
    qualifiedLeads: 0,
    bookingHandoffs: 0,
  });
  
  // System stats
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeConversations: 0,
    pendingBookings: 0,
    monthlyLeads: 0,
  });

  const copy = isEs
    ? {
        title: "Panel de Control",
        description: "Centro de administración y configuración del sistema.",
        systemHealth: "Estado del Sistema",
        allSystemsOperational: "Todos los sistemas operativos",
        quickSettings: "Configuración Rápida",
        automationHub: "Centro de Automatización",
        automationDesc: "Gestiona respuestas automáticas e IA",
        whatsappActivity: "Actividad WhatsApp",
        whatsappDesc: "Conversaciones y estadísticas del mes",
        recentConversations: "Conversaciones Recientes",
        activeConversations: "Conversaciones",
        qualifiedLeads: "Leads Calificados",
        bookingHandoffs: "Reservas",
        noConversations: "No hay conversaciones recientes",
        seedDemo: "Datos Demo",
        seedDesc: "Genera datos de demostración",
        seedButton: "Sembrar Datos",
        seeding: "Generando...",
        autoReplies: "Respuestas Automáticas",
        aiReplies: "Respuestas IA",
        greeting: "Saludo Inicial",
        outOfOffice: "Fuera de Horario",
        timezone: "Zona Horaria",
        hours: "Horario",
        days: "Días Laborales",
        fallback: "Respuesta Fallback",
        save: "Guardar",
        saving: "Guardando...",
        saved: "Guardado correctamente",
        enabled: "Activado",
        disabled: "Desactivado",
        analytics: "Analíticas",
        users: "Usuarios",
        leads: "Leads",
        pending: "Pendientes",
      }
    : {
        title: "Control Panel",
        description: "System administration and configuration center.",
        systemHealth: "System Health",
        allSystemsOperational: "All systems operational",
        quickSettings: "Quick Settings",
        automationHub: "Automation Hub",
        automationDesc: "Manage auto-replies and AI settings",
        whatsappActivity: "WhatsApp Activity",
        whatsappDesc: "Conversations and monthly statistics",
        recentConversations: "Recent Conversations",
        activeConversations: "Conversations",
        qualifiedLeads: "Qualified Leads",
        bookingHandoffs: "Bookings",
        noConversations: "No recent conversations",
        seedDemo: "Demo Data",
        seedDesc: "Generate demonstration data",
        seedButton: "Seed Data",
        seeding: "Generating...",
        autoReplies: "Auto Replies",
        aiReplies: "AI Replies",
        greeting: "Initial Greeting",
        outOfOffice: "Out of Office",
        timezone: "Timezone",
        hours: "Hours",
        days: "Working Days",
        fallback: "Fallback Reply",
        save: "Save",
        saving: "Saving...",
        saved: "Saved successfully",
        enabled: "Enabled",
        disabled: "Disabled",
        analytics: "Analytics",
        users: "Users",
        leads: "Leads",
        pending: "Pending",
      };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        businessRes,
        usersRes,
        conversationsRes,
        bookingsRes,
        leadsRes,
      ] = await Promise.all([
        supabase
          .from("businesses")
          .select("auto_reply_rules, ai_reply_enabled")
          .eq("id", businessId)
          .maybeSingle(),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "open"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "pending"),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", startOfMonth.toISOString()),
      ]);

      // Set auto-reply settings
      if (businessRes.data) {
        const rules = (businessRes.data.auto_reply_rules ?? {}) as Record<string, unknown>;
        setAiReplyEnabled(Boolean(businessRes.data.ai_reply_enabled));
        const hours = (rules?.out_of_office as Record<string, unknown>)?.hours as Record<string, unknown> ?? {};
        const days = Array.isArray(hours?.days) ? (hours.days as number[]).join(",") : "1,2,3,4,5";
        setAutoReply({
          enabled: (rules.enabled as boolean) ?? true,
          greetingEnabled: ((rules.greeting as Record<string, unknown>)?.enabled as boolean) ?? true,
          greetingText: ((rules.greeting as Record<string, unknown>)?.text as string) ?? "",
          oooEnabled: ((rules.out_of_office as Record<string, unknown>)?.enabled as boolean) ?? true,
          oooText: ((rules.out_of_office as Record<string, unknown>)?.text as string) ?? "",
          timezone: ((rules.out_of_office as Record<string, unknown>)?.timezone as string) ?? (rules.timezone as string) ?? "UTC",
          start: (hours?.start as string) ?? "09:00",
          end: (hours?.end as string) ?? "18:00",
          days,
          fallbackText: ((rules.fallback as Record<string, unknown>)?.text as string) ?? "",
        });
      }

      setSystemStats({
        totalUsers: usersRes.count ?? 0,
        activeConversations: conversationsRes.count ?? 0,
        pendingBookings: bookingsRes.count ?? 0,
        monthlyLeads: leadsRes.count ?? 0,
      });

      setLoading(false);
    };

    loadData();
  }, [businessId]);

  // Load role
  useEffect(() => {
    const loadRole = async () => {
      if (!businessId || !user) return;
      const { data } = await supabase
        .from("memberships")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .single();
      setRole(data?.role ?? null);
    };
    loadRole();
  }, [businessId, user]);

  // Load WhatsApp data
  useEffect(() => {
    const loadWhatsApp = async () => {
      if (!businessId) return;
      setWhatsAppLoading(true);
      setWhatsAppError(null);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [threadsRes, conversationsRes, qualifiedRes, handoffRes] = await Promise.all([
        supabase
          .from("inbox_threads")
          .select("id, contact_name, contact_handle, last_message_text, last_message_at, unread_count")
          .eq("business_id", businessId)
          .eq("channel", "whatsapp")
          .order("last_message_at", { ascending: false })
          .limit(5),
        supabase
          .from("inbox_threads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("channel", "whatsapp")
          .gte("updated_at", startOfMonth.toISOString()),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("source", "whatsapp")
          .eq("stage", "qualified")
          .gte("created_at", startOfMonth.toISOString()),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("channel", "whatsapp")
          .eq("intent", "booking")
          .gte("updated_at", startOfMonth.toISOString()),
      ]);

      if (threadsRes.error) {
        setWhatsAppError(threadsRes.error.message);
      }

      setWhatsAppThreads(
        (threadsRes.data ?? []).map((t) => ({
          id: t.id,
          contactName: t.contact_name || (isEs ? "Sin nombre" : "Unnamed"),
          contactHandle: t.contact_handle || "",
          lastMessage: t.last_message_text || "",
          lastMessageAt: t.last_message_at || "",
          unreadCount: t.unread_count ?? 0,
        }))
      );

      setWhatsAppStats({
        conversations: conversationsRes.count ?? 0,
        qualifiedLeads: qualifiedRes.count ?? 0,
        bookingHandoffs: handoffRes.count ?? 0,
      });

      setWhatsAppLoading(false);
    };

    loadWhatsApp();
  }, [businessId, isEs]);

  const handleSaveAutoReply = async () => {
    if (!businessId) {
      setAutoReplyError(isEs ? "Error al guardar" : "Failed to save");
      return;
    }
    setAutoReplySaving(true);
    setAutoReplyMessage(null);
    setAutoReplyError(null);

    const days = autoReply.days
      .split(",")
      .map((v) => Number.parseInt(v.trim(), 10))
      .filter((v) => Number.isFinite(v) && v >= 0 && v <= 6);

    const payload = {
      enabled: autoReply.enabled,
      greeting: { enabled: autoReply.greetingEnabled, text: autoReply.greetingText.trim() || undefined },
      out_of_office: {
        enabled: autoReply.oooEnabled,
        text: autoReply.oooText.trim() || undefined,
        timezone: autoReply.timezone.trim() || "UTC",
        hours: { start: autoReply.start.trim(), end: autoReply.end.trim(), days },
      },
      fallback: { text: autoReply.fallbackText.trim() || undefined },
      timezone: autoReply.timezone.trim() || "UTC",
    };

    const { error } = await supabase
      .from("businesses")
      .update({ auto_reply_rules: payload, ai_reply_enabled: aiReplyEnabled })
      .eq("id", businessId);

    if (error) {
      setAutoReplyError(isEs ? "Error al guardar" : "Failed to save");
    } else {
      setAutoReplyMessage(copy.saved);
    }
    setAutoReplySaving(false);
  };

  const handleSeed = async () => {
    if (!businessId) {
      setSeedError(isEs ? "No hay negocio activo" : "No active business");
      return;
    }
    setSeedLoading(true);
    setSeedMessage(null);
    setSeedError(null);

    const response = await fetch("/api/seed-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setSeedError(payload?.error || (isEs ? "Error" : "Failed"));
    } else {
      setSeedMessage(payload?.message || (isEs ? "Completado" : "Completed"));
    }
    setSeedLoading(false);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return isEs ? "Ahora" : "Now";
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const systemCards = [
    {
      label: copy.users,
      value: systemStats.totalUsers,
      icon: Users,
      color: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-500/20",
    },
    {
      label: copy.activeConversations,
      value: systemStats.activeConversations,
      icon: MessageSquare,
      color: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-500/20",
    },
    {
      label: copy.leads,
      value: systemStats.monthlyLeads,
      icon: TrendingUp,
      color: "from-purple-500 to-purple-600",
      iconBg: "bg-purple-500/20",
    },
    {
      label: copy.pending,
      value: systemStats.pendingBookings,
      icon: Clock,
      color: "from-amber-500 to-amber-600",
      iconBg: "bg-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {copy.allSystemsOperational}
            </Badge>
          </div>
        }
      />

      {/* System Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {systemCards.map((card, idx) => (
          <Card
            key={card.label}
            className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-muted/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 transition-opacity group-hover:opacity-5`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  {loading ? (
                    <div className="mt-2 h-9 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="mt-2 text-3xl font-bold tracking-tight">{card.value}</p>
                  )}
                </div>
                <div className={`rounded-xl p-3 ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 bg-gradient-to-br ${card.color} bg-clip-text text-transparent`} style={{ color: card.color.includes('blue') ? '#3b82f6' : card.color.includes('emerald') ? '#10b981' : card.color.includes('purple') ? '#a855f7' : '#f59e0b' }} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600">+12%</span>
                <span>{isEs ? "vs. mes anterior" : "vs. last month"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Automation Hub - Owner Only */}
        {role === "owner" && (
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-accent/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-accent/10 p-2">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle>{copy.automationHub}</CardTitle>
                  <CardDescription>{copy.automationDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Toggle Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Auto Replies Toggle */}
                <div
                  className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer ${
                    autoReply.enabled
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => setAutoReply((p) => ({ ...p, enabled: !p.enabled }))}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${autoReply.enabled ? "bg-accent/20" : "bg-muted"}`}>
                        <MessageCircle className={`h-5 w-5 ${autoReply.enabled ? "text-accent" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{copy.autoReplies}</p>
                        <p className="text-xs text-muted-foreground">
                          {autoReply.enabled ? copy.enabled : copy.disabled}
                        </p>
                      </div>
                    </div>
                    <div className={`h-6 w-11 rounded-full transition-colors ${autoReply.enabled ? "bg-accent" : "bg-muted"}`}>
                      <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${autoReply.enabled ? "translate-x-5 ml-0.5" : "translate-x-0.5"}`} />
                    </div>
                  </div>
                </div>

                {/* AI Replies Toggle */}
                <div
                  className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer ${
                    aiReplyEnabled
                      ? "border-purple-500 bg-purple-50"
                      : "border-border hover:border-purple-300"
                  }`}
                  onClick={() => setAiReplyEnabled(!aiReplyEnabled)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-lg p-2 ${aiReplyEnabled ? "bg-purple-100" : "bg-muted"}`}>
                        <Sparkles className={`h-5 w-5 ${aiReplyEnabled ? "text-purple-600" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{copy.aiReplies}</p>
                        <p className="text-xs text-muted-foreground">
                          {aiReplyEnabled ? copy.enabled : copy.disabled}
                        </p>
                      </div>
                    </div>
                    <div className={`h-6 w-11 rounded-full transition-colors ${aiReplyEnabled ? "bg-purple-500" : "bg-muted"}`}>
                      <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${aiReplyEnabled ? "translate-x-5 ml-0.5" : "translate-x-0.5"}`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {copy.greeting}
                  </label>
                  <input
                    type="text"
                    value={autoReply.greetingText}
                    onChange={(e) => setAutoReply((p) => ({ ...p, greetingText: e.target.value }))}
                    placeholder={isEs ? "¡Hola! Gracias por escribirnos." : "Hi! Thanks for reaching out."}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {copy.outOfOffice}
                  </label>
                  <input
                    type="text"
                    value={autoReply.oooText}
                    onChange={(e) => setAutoReply((p) => ({ ...p, oooText: e.target.value }))}
                    placeholder={isEs ? "Estamos cerrados, te responderemos pronto." : "We're closed, we'll respond soon."}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {copy.hours}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={autoReply.start}
                      onChange={(e) => setAutoReply((p) => ({ ...p, start: e.target.value }))}
                      placeholder="09:00"
                      className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <span className="flex items-center text-muted-foreground">→</span>
                    <input
                      type="text"
                      value={autoReply.end}
                      onChange={(e) => setAutoReply((p) => ({ ...p, end: e.target.value }))}
                      placeholder="18:00"
                      className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {copy.timezone}
                  </label>
                  <input
                    type="text"
                    value={autoReply.timezone}
                    onChange={(e) => setAutoReply((p) => ({ ...p, timezone: e.target.value }))}
                    placeholder="Europe/Madrid"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveAutoReply}
                  disabled={autoReplySaving}
                  className="bg-accent text-white hover:bg-accent/90"
                >
                  {autoReplySaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      {copy.saving}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {copy.save}
                    </>
                  )}
                </Button>
                {autoReplyMessage && (
                  <span className="text-sm text-emerald-600 animate-fade-in">{autoReplyMessage}</span>
                )}
                {autoReplyError && (
                  <span className="text-sm text-red-600 animate-fade-in">{autoReplyError}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Activity */}
        <Card className={role === "owner" ? "" : "lg:col-span-2"}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Phone className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>{copy.whatsappActivity}</CardTitle>
                <CardDescription>{copy.whatsappDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: copy.activeConversations, value: whatsAppStats.conversations, color: "text-emerald-600" },
                { label: copy.qualifiedLeads, value: whatsAppStats.qualifiedLeads, color: "text-blue-600" },
                { label: copy.bookingHandoffs, value: whatsAppStats.bookingHandoffs, color: "text-purple-600" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {whatsAppLoading ? "..." : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Threads */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {copy.recentConversations}
              </p>
              {whatsAppError ? (
                <p className="text-sm text-red-600">{whatsAppError}</p>
              ) : whatsAppLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : whatsAppThreads.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">{copy.noConversations}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {whatsAppThreads.map((thread) => (
                    <div
                      key={thread.id}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="rounded-full bg-emerald-100 p-2">
                        <Users className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium truncate">{thread.contactName}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(thread.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{thread.lastMessage}</p>
                      </div>
                      {thread.unreadCount > 0 && (
                        <Badge className="bg-accent text-white">{thread.unreadCount}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Owner Only */}
        {role === "owner" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2">
                  <Database className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle>{copy.seedDemo}</CardTitle>
                  <CardDescription>{copy.seedDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSeed}
                disabled={seedLoading}
                variant="outline"
                className="w-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                {seedLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    {copy.seeding}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {copy.seedButton}
                  </>
                )}
              </Button>
              {seedMessage && (
                <p className="mt-3 text-sm text-emerald-600 animate-fade-in">{seedMessage}</p>
              )}
              {seedError && (
                <p className="mt-3 text-sm text-red-600 animate-fade-in">{seedError}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
