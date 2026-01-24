import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Filter,
  Funnel,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users,
  Handshake,
  Target,
  AlertCircle,
  CheckCircle2,
  Zap,
  Clock,
  AlertTriangle,
  Activity,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from "recharts";

// State machine states from DetaPRO spec
const STATE_LABELS = {
  STATE_0_OPENING: { en: "Opening", es: "Apertura", step: 0 },
  STATE_1_VEHICLE: { en: "Vehicle ID", es: "Vehículo", step: 1 },
  STATE_2_BENEFIT: { en: "Intent Discovery", es: "Descubrimiento", step: 2 },
  STATE_3_USAGE: { en: "Usage Context", es: "Contexto", step: 3 },
  STATE_4_PRESCRIPTION: { en: "Recommendation", es: "Recomendación", step: 4 },
  STATE_5_ACTION: { en: "Soft Close", es: "Cierre Suave", step: 5 },
  STATE_6_HANDOFF: { en: "Human Handoff", es: "Traspaso", step: 6 },
};

type StateKey = keyof typeof STATE_LABELS;

type FunnelMetrics = {
  stateCounts: Record<StateKey, number>;
  totalConversations: number;
  qualifiedLeads: number;
  handoffRequired: number;
  completedFunnels: number;
  // API Quality metrics
  avgResponseTimeMs: number;
  fallbackCount: number;
  fallbackRate: number;
  p95ResponseTimeMs: number;
};

const STATE_COLORS: Record<StateKey, string> = {
  STATE_0_OPENING: "#6366f1",
  STATE_1_VEHICLE: "#8b5cf6",
  STATE_2_BENEFIT: "#a855f7",
  STATE_3_USAGE: "#d946ef",
  STATE_4_PRESCRIPTION: "#ec4899",
  STATE_5_ACTION: "#f43f5e",
  STATE_6_HANDOFF: "#10b981",
};

export default function SalesAnalytics() {
  const { businessId } = useCurrentBusiness();
  const { lang } = useLanguage();
  const isEs = lang === "es";

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FunnelMetrics>({
    stateCounts: {
      STATE_0_OPENING: 0,
      STATE_1_VEHICLE: 0,
      STATE_2_BENEFIT: 0,
      STATE_3_USAGE: 0,
      STATE_4_PRESCRIPTION: 0,
      STATE_5_ACTION: 0,
      STATE_6_HANDOFF: 0,
    },
    totalConversations: 0,
    qualifiedLeads: 0,
    handoffRequired: 0,
    completedFunnels: 0,
    avgResponseTimeMs: 0,
    fallbackCount: 0,
    fallbackRate: 0,
    p95ResponseTimeMs: 0,
  });
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  const copy = isEs
    ? {
        title: "Analíticas de Ventas",
        description: "Métricas de conversión del embudo de ventas consultivo.",
        totalConversations: "Conversaciones Totales",
        qualifiedLeads: "Leads Calificados",
        handoffRate: "Tasa de Traspaso",
        qualificationRate: "Tasa de Calificación",
        conversionFunnel: "Embudo de Conversión",
        stateDistribution: "Distribución por Estado",
        funnelProgress: "Progreso del Embudo",
        reachedState: "llegaron a",
        ofTotal: "del total",
        last7Days: "Últimos 7 días",
        last30Days: "Últimos 30 días",
        last90Days: "Últimos 90 días",
        noData: "No hay datos de conversaciones aún",
        startChatbot: "Inicia conversaciones para ver métricas",
        completedHandoffs: "Traspasos Completados",
        dropOffAnalysis: "Análisis de Abandono",
        highestDropOff: "Mayor abandono en",
        // API Quality
        apiQuality: "Calidad de Respuesta AI",
        avgLatency: "Latencia Promedio",
        p95Latency: "P95 Latencia",
        fallbackRate: "Tasa de Fallback",
        fallbacks: "Respuestas Fallback",
        apiHealthy: "API Saludable",
        apiDegraded: "API Degradada",
        apiUnhealthy: "API No Saludable",
        ms: "ms",
      }
    : {
        title: "Sales Analytics",
        description: "Conversion metrics for the consultative sales funnel.",
        totalConversations: "Total Conversations",
        qualifiedLeads: "Qualified Leads",
        handoffRate: "Handoff Rate",
        qualificationRate: "Qualification Rate",
        conversionFunnel: "Conversion Funnel",
        stateDistribution: "State Distribution",
        funnelProgress: "Funnel Progress",
        reachedState: "reached",
        ofTotal: "of total",
        last7Days: "Last 7 days",
        last30Days: "Last 30 days",
        last90Days: "Last 90 days",
        noData: "No conversation data yet",
        startChatbot: "Start conversations to see metrics",
        completedHandoffs: "Completed Handoffs",
        dropOffAnalysis: "Drop-off Analysis",
        highestDropOff: "Highest drop-off at",
        // API Quality
        apiQuality: "AI Response Quality",
        avgLatency: "Avg Latency",
        p95Latency: "P95 Latency",
        fallbackRate: "Fallback Rate",
        fallbacks: "Fallback Responses",
        apiHealthy: "API Healthy",
        apiDegraded: "API Degraded",
        apiUnhealthy: "API Unhealthy",
        ms: "ms",
      };

  useEffect(() => {
    if (!businessId) return;

    const fetchMetrics = async () => {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      const daysAgo = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("id, current_state, lead_qualified, handoff_required, created_at, response_time_ms, is_fallback, ai_model")
        .eq("business_id", businessId)
        .gte("created_at", startDate.toISOString());

      if (error) {
        console.error("Error fetching conversations:", error);
        setLoading(false);
        return;
      }

      // Calculate metrics
      const stateCounts: Record<StateKey, number> = {
        STATE_0_OPENING: 0,
        STATE_1_VEHICLE: 0,
        STATE_2_BENEFIT: 0,
        STATE_3_USAGE: 0,
        STATE_4_PRESCRIPTION: 0,
        STATE_5_ACTION: 0,
        STATE_6_HANDOFF: 0,
      };

      let qualifiedLeads = 0;
      let handoffRequired = 0;
      
      // API Quality tracking
      const responseTimes: number[] = [];
      let fallbackCount = 0;

      conversations?.forEach((conv) => {
        const state = conv.current_state as StateKey;
        if (state && stateCounts.hasOwnProperty(state)) {
          stateCounts[state]++;
        }
        if (conv.lead_qualified) qualifiedLeads++;
        if (conv.handoff_required) handoffRequired++;
        
        // Track API performance
        if (typeof conv.response_time_ms === "number" && conv.response_time_ms > 0) {
          responseTimes.push(conv.response_time_ms);
        }
        if (conv.is_fallback === true) {
          fallbackCount++;
        }
      });

      // Calculate API quality metrics
      const totalWithResponseTime = responseTimes.length;
      const avgResponseTimeMs = totalWithResponseTime > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / totalWithResponseTime)
        : 0;
      
      // P95 calculation
      const sortedTimes = [...responseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95ResponseTimeMs = sortedTimes[p95Index] || 0;
      
      const fallbackRate = conversations?.length > 0
        ? Math.round((fallbackCount / conversations.length) * 100)
        : 0;

      setMetrics({
        stateCounts,
        totalConversations: conversations?.length || 0,
        qualifiedLeads,
        handoffRequired,
        completedFunnels: stateCounts.STATE_6_HANDOFF,
        avgResponseTimeMs,
        fallbackCount,
        fallbackRate,
        p95ResponseTimeMs,
      });

      setLoading(false);
    };

    fetchMetrics();
  }, [businessId, dateRange]);

  // Prepare funnel data
  const funnelData = Object.entries(STATE_LABELS).map(([key, label]) => ({
    name: isEs ? label.es : label.en,
    value: metrics.stateCounts[key as StateKey],
    fill: STATE_COLORS[key as StateKey],
    step: label.step,
  }));

  // Calculate cumulative funnel (conversations that reached each state)
  const cumulativeFunnel = funnelData.map((item, idx) => {
    const reachedThisState = funnelData
      .filter((f) => f.step >= item.step)
      .reduce((sum, f) => sum + f.value, 0);
    return {
      ...item,
      reached: reachedThisState,
      percentage: metrics.totalConversations > 0
        ? Math.round((reachedThisState / metrics.totalConversations) * 100)
        : 0,
    };
  });

  // Calculate drop-off between states
  const dropOffData = cumulativeFunnel.slice(0, -1).map((item, idx) => {
    const nextItem = cumulativeFunnel[idx + 1];
    const dropOff = item.reached - nextItem.reached;
    const dropOffRate = item.reached > 0 ? Math.round((dropOff / item.reached) * 100) : 0;
    return {
      from: item.name,
      to: nextItem.name,
      dropOff,
      dropOffRate,
    };
  });

  const highestDropOff = dropOffData.reduce((max, curr) =>
    curr.dropOffRate > max.dropOffRate ? curr : max,
    dropOffData[0] || { from: "", dropOffRate: 0 }
  );

  // Pie chart data for state distribution
  const pieData = funnelData.filter((d) => d.value > 0);

  const qualificationRate = metrics.totalConversations > 0
    ? Math.round((metrics.qualifiedLeads / metrics.totalConversations) * 100)
    : 0;

  const handoffRate = metrics.totalConversations > 0
    ? Math.round((metrics.handoffRequired / metrics.totalConversations) * 100)
    : 0;

  const statCards = [
    {
      label: copy.totalConversations,
      value: metrics.totalConversations,
      icon: MessageSquare,
      gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
      iconColor: "text-blue-500",
    },
    {
      label: copy.qualifiedLeads,
      value: metrics.qualifiedLeads,
      subValue: `${qualificationRate}%`,
      icon: UserCheck,
      gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
      iconColor: "text-emerald-500",
    },
    {
      label: copy.completedHandoffs,
      value: metrics.handoffRequired,
      subValue: `${handoffRate}%`,
      icon: Handshake,
      gradient: "from-purple-500/20 via-purple-500/10 to-transparent",
      iconColor: "text-purple-500",
    },
    {
      label: copy.qualificationRate,
      value: `${qualificationRate}%`,
      icon: Target,
      gradient: "from-accent/20 via-accent/10 to-transparent",
      iconColor: "text-accent",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
              {(["7d", "30d", "90d"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    dateRange === range
                      ? "bg-accent text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range === "7d" ? copy.last7Days : range === "30d" ? copy.last30Days : copy.last90Days}
                </button>
              ))}
            </div>
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
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60`} />
            <CardContent className="relative p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {card.label}
                  </p>
                  {loading ? (
                    <div className="mt-2 h-9 w-16 animate-pulse rounded bg-muted" />
                  ) : (
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold tracking-tight">{card.value}</span>
                      {card.subValue && (
                        <span className="text-sm text-muted-foreground">({card.subValue})</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-xl bg-background/80 p-3">
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Response Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            {copy.apiQuality}
          </CardTitle>
          <CardDescription>
            {isEs ? "Monitoreo de rendimiento del API de Groq" : "Groq API performance monitoring"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Avg Latency */}
              <div className="rounded-lg border bg-gradient-to-br from-blue-500/10 to-transparent p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{copy.avgLatency}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{metrics.avgResponseTimeMs}</span>
                  <span className="text-sm text-muted-foreground">{copy.ms}</span>
                </div>
                <div className="mt-1">
                  <Badge 
                    variant="outline"
                    className={
                      metrics.avgResponseTimeMs < 500 
                        ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10" 
                        : metrics.avgResponseTimeMs < 1000 
                          ? "border-yellow-500/50 text-yellow-600 bg-yellow-500/10" 
                          : "border-destructive/50 text-destructive bg-destructive/10"
                    }
                  >
                    {metrics.avgResponseTimeMs < 500 
                      ? copy.apiHealthy 
                      : metrics.avgResponseTimeMs < 1000 
                        ? copy.apiDegraded 
                        : copy.apiUnhealthy}
                  </Badge>
                </div>
              </div>

              {/* P95 Latency */}
              <div className="rounded-lg border bg-gradient-to-br from-purple-500/10 to-transparent p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{copy.p95Latency}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{metrics.p95ResponseTimeMs}</span>
                  <span className="text-sm text-muted-foreground">{copy.ms}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEs ? "95% de las respuestas son más rápidas" : "95% of responses are faster"}
                </p>
              </div>

              {/* Fallback Rate */}
              <div className="rounded-lg border bg-gradient-to-br from-orange-500/10 to-transparent p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{copy.fallbackRate}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{metrics.fallbackRate}</span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <div className="mt-1">
                  <Badge 
                    variant="outline"
                    className={
                      metrics.fallbackRate < 5 
                        ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10" 
                        : metrics.fallbackRate < 15 
                          ? "border-yellow-500/50 text-yellow-600 bg-yellow-500/10" 
                          : "border-destructive/50 text-destructive bg-destructive/10"
                    }
                  >
                    {metrics.fallbackRate < 5 
                      ? (isEs ? "Excelente" : "Excellent")
                      : metrics.fallbackRate < 15 
                        ? (isEs ? "Aceptable" : "Acceptable")
                        : (isEs ? "Necesita atención" : "Needs attention")}
                  </Badge>
                </div>
              </div>

              {/* Fallback Count */}
              <div className="rounded-lg border bg-gradient-to-br from-red-500/10 to-transparent p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase">{copy.fallbacks}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{metrics.fallbackCount}</span>
                  <span className="text-sm text-muted-foreground">
                    / {metrics.totalConversations}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isEs ? "Respuestas usando scripted fallback" : "Responses using scripted fallback"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {metrics.totalConversations === 0 && !loading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-lg font-medium">{copy.noData}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.startChatbot}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Funnel Visualization */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-accent" />
                  {copy.conversionFunnel}
                </CardTitle>
                <CardDescription>
                  {copy.funnelProgress}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : (
                  cumulativeFunnel.map((item, idx) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          {item.reached} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="relative h-8 overflow-hidden rounded-lg bg-muted">
                        <div
                          className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.fill,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {item.percentage > 10 && (
                            <span className={item.percentage > 50 ? "text-white" : "text-foreground"}>
                              {item.reached} {copy.reachedState}
                            </span>
                          )}
                        </div>
                      </div>
                      {idx < cumulativeFunnel.length - 1 && (
                        <div className="flex justify-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-accent" />
                  {copy.stateDistribution}
                </CardTitle>
                <CardDescription>
                  {isEs ? "Conversaciones actuales por estado" : "Current conversations by state"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 animate-pulse rounded bg-muted" />
                ) : pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-64 items-center justify-center text-muted-foreground">
                    {copy.noData}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Drop-off Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                {copy.dropOffAnalysis}
              </CardTitle>
              {highestDropOff && highestDropOff.dropOffRate > 0 && (
                <CardDescription className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  {copy.highestDropOff} <strong>{highestDropOff.from}</strong> ({highestDropOff.dropOffRate}%)
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 animate-pulse rounded bg-muted" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dropOffData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" unit="%" />
                    <YAxis
                      dataKey="from"
                      type="category"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value) => [`${value}%`, isEs ? "Abandono" : "Drop-off"]}
                    />
                    <Bar dataKey="dropOffRate" radius={[0, 4, 4, 0]}>
                      {dropOffData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.dropOffRate > 50 ? "hsl(var(--destructive))" : entry.dropOffRate > 25 ? "hsl(var(--accent))" : "hsl(142 76% 36%)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* State Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>{isEs ? "Detalle por Estado" : "State Details"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 text-left font-medium">{isEs ? "Estado" : "State"}</th>
                      <th className="py-3 text-right font-medium">{isEs ? "Conversaciones" : "Conversations"}</th>
                      <th className="py-3 text-right font-medium">{isEs ? "% del Total" : "% of Total"}</th>
                      <th className="py-3 text-right font-medium">{isEs ? "Estado" : "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {funnelData.map((item) => {
                      const percentage = metrics.totalConversations > 0
                        ? Math.round((item.value / metrics.totalConversations) * 100)
                        : 0;
                      return (
                        <tr key={item.name} className="hover:bg-muted/50">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: item.fill }}
                              />
                              {item.name}
                            </div>
                          </td>
                          <td className="py-3 text-right font-medium">{item.value}</td>
                          <td className="py-3 text-right text-muted-foreground">{percentage}%</td>
                          <td className="py-3 text-right">
                            {item.value > 0 ? (
                              <Badge className="bg-primary/10 text-primary border-0">
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                {isEs ? "Activo" : "Active"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                {isEs ? "Sin datos" : "No data"}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
