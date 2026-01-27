import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  CalendarIcon,
  Check,
  ChevronDown,
  Clock,
  Filter,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Star,
  X,
  XCircle,
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
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/lib/supabaseClient";

type FollowUpStatus = "pending" | "sent" | "cancelled" | "failed";

type FollowUp = {
  id: string;
  conversation_id: string;
  follow_up_type: string;
  scheduled_for: string;
  status: FollowUpStatus;
  message_sent: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
};

type Stats = {
  pending: number;
  sent: number;
  cancelled: number;
  failed: number;
};

const statusConfig: Record<FollowUpStatus, { labelEs: string; labelEn: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: { labelEs: "Pendiente", labelEn: "Pending", color: "text-amber-600", bg: "bg-amber-100", icon: Clock },
  sent: { labelEs: "Enviado", labelEn: "Sent", color: "text-emerald-600", bg: "bg-emerald-100", icon: Check },
  cancelled: { labelEs: "Cancelado", labelEn: "Cancelled", color: "text-slate-600", bg: "bg-slate-100", icon: X },
  failed: { labelEs: "Fallido", labelEn: "Failed", color: "text-red-600", bg: "bg-red-100", icon: XCircle },
};

const typeLabels: Record<string, { en: string; es: string }> = {
  "24h": { en: "24 Hours", es: "24 Horas" },
  "48h": { en: "48 Hours", es: "48 Horas" },
  "5d": { en: "5 Days", es: "5 Días" },
  "7d": { en: "7 Days", es: "7 Días" },
};

export default function FollowUpsPage() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | "all">("all");
  const [stats, setStats] = useState<Stats>({ pending: 0, sent: 0, cancelled: 0, failed: 0 });

  const copy = isEs
    ? {
        title: "Cola de Seguimientos",
        description: "Gestiona los mensajes de seguimiento automáticos.",
        searchPlaceholder: "Buscar por conversación...",
        allStatuses: "Todos",
        refresh: "Actualizar",
        noFollowUps: "No hay seguimientos que coincidan",
        noData: "Sin seguimientos programados",
        scheduledFor: "Programado para",
        sentAt: "Enviado",
        conversation: "Conversación",
        type: "Tipo",
        status: "Estado",
        message: "Mensaje",
        error: "Error",
        pending: "Pendientes",
        sent: "Enviados",
        cancelled: "Cancelados",
        failed: "Fallidos",
      }
    : {
        title: "Follow-up Queue",
        description: "Manage automated follow-up messages.",
        searchPlaceholder: "Search by conversation...",
        allStatuses: "All",
        refresh: "Refresh",
        noFollowUps: "No follow-ups match your search",
        noData: "No follow-ups scheduled",
        scheduledFor: "Scheduled for",
        sentAt: "Sent",
        conversation: "Conversation",
        type: "Type",
        status: "Status",
        message: "Message",
        error: "Error",
        pending: "Pending",
        sent: "Sent",
        cancelled: "Cancelled",
        failed: "Failed",
      };

  const loadFollowUps = async () => {
    if (!businessId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("follow_up_queue")
      .select("*")
      .eq("business_id", businessId)
      .order("scheduled_for", { ascending: false });

    if (!error && data) {
      setFollowUps(data as FollowUp[]);

      // Calculate stats
      const statsCalc: Stats = { pending: 0, sent: 0, cancelled: 0, failed: 0 };
      data.forEach((f) => {
        if (f.status in statsCalc) {
          statsCalc[f.status as FollowUpStatus]++;
        }
      });
      setStats(statsCalc);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFollowUps();
  }, [businessId]);

  const filteredFollowUps = followUps.filter((f) => {
    const matchesSearch =
      !searchTerm || f.conversation_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, isEs ? "dd MMM yyyy HH:mm" : "MMM dd, yyyy HH:mm");
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (diff < 0) {
      const pastHours = Math.abs(hours);
      const pastDays = Math.floor(pastHours / 24);
      if (pastDays > 0) return isEs ? `Hace ${pastDays}d` : `${pastDays}d ago`;
      if (pastHours > 0) return isEs ? `Hace ${pastHours}h` : `${pastHours}h ago`;
      return isEs ? "Hace poco" : "Just now";
    }

    if (days > 0) return isEs ? `En ${days}d` : `In ${days}d`;
    if (hours > 0) return isEs ? `En ${hours}h` : `In ${hours}h`;
    return isEs ? "Pronto" : "Soon";
  };

  const statCards = [
    {
      label: copy.pending,
      value: stats.pending,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
      status: "pending" as FollowUpStatus,
    },
    {
      label: copy.sent,
      value: stats.sent,
      icon: Check,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      status: "sent" as FollowUpStatus,
    },
    {
      label: copy.cancelled,
      value: stats.cancelled,
      icon: X,
      gradient: "from-slate-500 to-gray-500",
      bgGradient: "from-slate-50 to-gray-50",
      status: "cancelled" as FollowUpStatus,
    },
    {
      label: copy.failed,
      value: stats.failed,
      icon: XCircle,
      gradient: "from-red-500 to-rose-500",
      bgGradient: "from-red-50 to-rose-50",
      status: "failed" as FollowUpStatus,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={loadFollowUps}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {copy.refresh}
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => setStatusFilter(statusFilter === card.status ? "all" : card.status)}
            className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
              statusFilter === card.status ? "ring-2 ring-accent" : "border-border/50"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-50`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                {loading ? (
                  <div className="mt-2 h-9 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <p className={`mt-2 text-3xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                    {card.value}
                  </p>
                )}
              </div>
              <div className={`rounded-xl bg-gradient-to-br ${card.gradient} p-3 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="w-full rounded-lg border bg-background py-2.5 pl-10 pr-4 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {copy.allStatuses}
            </button>
            {(["pending", "sent", "cancelled"] as FollowUpStatus[]).map((status) => {
              const config = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? `${config.bg} ${config.color}`
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isEs ? config.labelEs : config.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Follow-ups List */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-accent" />
                {copy.title}
              </CardTitle>
              <CardDescription>
                {filteredFollowUps.length} {isEs ? "seguimientos encontrados" : "follow-ups found"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filteredFollowUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">
                {followUps.length === 0 ? copy.noData : copy.noFollowUps}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredFollowUps.map((followUp, idx) => {
                const config = statusConfig[followUp.status] || statusConfig.pending;
                const Icon = config.icon;
                const typeLabel = typeLabels[followUp.follow_up_type] || { en: followUp.follow_up_type, es: followUp.follow_up_type };

                return (
                  <div
                    key={followUp.id}
                    className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                  >
                    {/* Status Icon */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${config.bg}`}>
                      <Icon className={`h-6 w-6 ${config.color}`} />
                    </div>

                    {/* Follow-up Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${config.bg} ${config.color} border-0`}>
                          {isEs ? config.labelEs : config.labelEn}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {isEs ? typeLabel.es : typeLabel.en}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {followUp.conversation_id.slice(0, 20)}...
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(followUp.scheduled_for)}
                        </span>
                      </div>
                      {followUp.message_sent && (
                        <p className="mt-1 text-xs text-muted-foreground truncate max-w-md">
                          "{followUp.message_sent.slice(0, 80)}..."
                        </p>
                      )}
                      {followUp.error_message && (
                        <p className="mt-1 text-xs text-red-600 truncate max-w-md">
                          ⚠️ {followUp.error_message}
                        </p>
                      )}
                    </div>

                    {/* Timing */}
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <span className={`text-sm font-medium ${
                        followUp.status === "pending" ? "text-amber-600" : "text-muted-foreground"
                      }`}>
                        {followUp.status === "pending"
                          ? formatRelativeTime(followUp.scheduled_for)
                          : followUp.sent_at
                          ? formatDate(followUp.sent_at)
                          : formatDate(followUp.created_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {followUp.status === "pending"
                          ? copy.scheduledFor
                          : copy.sentAt}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
