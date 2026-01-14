import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Download,
  Filter,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
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
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/lib/supabaseClient";

type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  qualification_reason: string | null;
  source: string | null;
  stage: LeadStage;
  created_at: string;
};

const stageConfig: Record<LeadStage, { labelEs: string; labelEn: string; color: string; bg: string; icon: typeof UserPlus }> = {
  new: { labelEs: "Nuevo", labelEn: "New", color: "text-blue-600", bg: "bg-blue-100", icon: UserPlus },
  contacted: { labelEs: "Contactado", labelEn: "Contacted", color: "text-purple-600", bg: "bg-purple-100", icon: Phone },
  qualified: { labelEs: "Calificado", labelEn: "Qualified", color: "text-emerald-600", bg: "bg-emerald-100", icon: UserCheck },
  proposal: { labelEs: "Propuesta", labelEn: "Proposal", color: "text-amber-600", bg: "bg-amber-100", icon: Target },
  negotiation: { labelEs: "Negociación", labelEn: "Negotiation", color: "text-orange-600", bg: "bg-orange-100", icon: TrendingUp },
  won: { labelEs: "Ganado", labelEn: "Won", color: "text-green-600", bg: "bg-green-100", icon: Sparkles },
  lost: { labelEs: "Perdido", labelEn: "Lost", color: "text-red-600", bg: "bg-red-100", icon: Users },
};

export default function CrmLeadsPage() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<LeadStage | "all">("all");
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    qualified: 0,
    won: 0,
  });

  const copy = isEs
    ? {
        title: "Gestión de Leads",
        description: "Rastrea y convierte tus oportunidades de venta.",
        searchPlaceholder: "Buscar leads...",
        allStages: "Todas las etapas",
        export: "Exportar",
        newLead: "Nuevo Lead",
        totalLeads: "Total Leads",
        newLeads: "Nuevos",
        qualifiedLeads: "Calificados",
        wonLeads: "Ganados",
        noLeads: "No hay leads que coincidan con tu búsqueda",
        addFirst: "Agrega tu primer lead",
        conversionRate: "Tasa de Conversión",
        recentLeads: "Leads Recientes",
        viewAll: "Ver Todo",
        unknown: "Desconocido",
        noEmail: "Sin email",
        noPhone: "Sin teléfono",
      }
    : {
        title: "Lead Management",
        description: "Track and convert your sales opportunities.",
        searchPlaceholder: "Search leads...",
        allStages: "All stages",
        export: "Export",
        newLead: "New Lead",
        totalLeads: "Total Leads",
        newLeads: "New",
        qualifiedLeads: "Qualified",
        wonLeads: "Won",
        noLeads: "No leads match your search",
        addFirst: "Add your first lead",
        conversionRate: "Conversion Rate",
        recentLeads: "Recent Leads",
        viewAll: "View All",
        unknown: "Unknown",
        noEmail: "No email",
        noPhone: "No phone",
      };

  useEffect(() => {
    if (!businessId) return;
    
    const loadLeads = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, email, phone, qualification_reason, source, stage, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLeads(data as Lead[]);
        
        // Calculate stats
        const total = data.length;
        const newCount = data.filter((l) => l.stage === "new").length;
        const qualifiedCount = data.filter((l) => l.stage === "qualified").length;
        const wonCount = data.filter((l) => l.stage === "won").length;
        
        setStats({ total, new: newCount, qualified: qualifiedCount, won: wonCount });
      }
      setLoading(false);
    };

    loadLeads();
  }, [businessId]);

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchTerm ||
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const conversionRate = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return isEs ? "Hoy" : "Today";
    if (days === 1) return isEs ? "Ayer" : "Yesterday";
    if (days < 7) return isEs ? `Hace ${days} días` : `${days} days ago`;
    
    return date.toLocaleDateString(isEs ? "es-ES" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const statCards = [
    {
      label: copy.totalLeads,
      value: stats.total,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-500/20",
    },
    {
      label: copy.newLeads,
      value: stats.new,
      icon: UserPlus,
      gradient: "from-purple-500 to-purple-600",
      iconBg: "bg-purple-500/20",
    },
    {
      label: copy.qualifiedLeads,
      value: stats.qualified,
      icon: UserCheck,
      gradient: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-500/20",
    },
    {
      label: copy.conversionRate,
      value: `${conversionRate}%`,
      icon: TrendingUp,
      gradient: "from-accent to-accent/80",
      iconBg: "bg-accent/20",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              {copy.export}
            </Button>
            <Button className="bg-accent text-white hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" />
              {copy.newLead}
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => (
          <Card
            key={card.label}
            className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-muted/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 transition-opacity group-hover:opacity-5`} />
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
                  <card.icon className="h-5 w-5" style={{ color: card.gradient.includes('accent') ? 'hsl(var(--accent))' : card.gradient.includes('blue') ? '#3b82f6' : card.gradient.includes('purple') ? '#a855f7' : '#10b981' }} />
                </div>
              </div>
            </CardContent>
          </Card>
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
              onClick={() => setStageFilter("all")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                stageFilter === "all"
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {copy.allStages}
            </button>
            {(["new", "qualified", "won"] as LeadStage[]).map((stage) => {
              const config = stageConfig[stage];
              return (
                <button
                  key={stage}
                  onClick={() => setStageFilter(stage)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    stageFilter === stage
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

      {/* Leads List */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                {copy.recentLeads}
              </CardTitle>
              <CardDescription>
                {filteredLeads.length} {isEs ? "leads encontrados" : "leads found"}
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
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4">
                <UserPlus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">{leads.length === 0 ? copy.addFirst : copy.noLeads}</p>
              {leads.length === 0 && (
                <Button className="mt-4 bg-accent text-white hover:bg-accent/90">
                  <Plus className="mr-2 h-4 w-4" />
                  {copy.newLead}
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredLeads.map((lead, idx) => {
                const config = stageConfig[lead.stage] || stageConfig.new;
                const Icon = config.icon;
                
                return (
                  <div
                    key={lead.id}
                    className="group flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Avatar */}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${config.bg}`}>
                      <User className={`h-6 w-6 ${config.color}`} />
                    </div>

                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {lead.name || copy.unknown}
                        </p>
                        <Badge className={`${config.bg} ${config.color} border-0`}>
                          {isEs ? config.labelEs : config.labelEn}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3.5 w-3.5" />
                          {lead.email || copy.noEmail}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {lead.phone || copy.noPhone}
                        </span>
                      </div>
                    </div>

                    {/* Source & Date */}
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      {lead.source && (
                        <Badge variant="outline" className="text-xs">
                          {lead.source}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(lead.created_at)}
                      </span>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
