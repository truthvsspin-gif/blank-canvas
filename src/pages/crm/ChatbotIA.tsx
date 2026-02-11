import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Bot, Check, Loader2, MessageCircle, Power, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type ChatbotMetrics = {
  totalLeads: number;
  qualifiedLeads: number;
  bookingsFromChatbot: number;
  openConversations: number;
};

export default function ChatbotIA() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [hasWhatsApp, setHasWhatsApp] = useState(false);
  const [hasInstagram, setHasInstagram] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ChatbotMetrics>({
    totalLeads: 0,
    qualifiedLeads: 0,
    bookingsFromChatbot: 0,
    openConversations: 0,
  });

  const copy = isEs
    ? {
        title: "Chatbot IA",
        subtitle: "Controla la automatizacion, la entrada de leads y la reserva automatica desde un unico panel.",
        enabled: "Activo",
        disabled: "Inactivo",
        activate: "Activar Chatbot IA",
        deactivate: "Desactivar Chatbot IA",
        leads: "Leads desde chatbot",
        qualified: "Leads calificados",
        bookings: "Reservas desde chatbot",
        openConversations: "Conversaciones activas",
        setup: "Configuracion",
        setupHint: "Conecta canales y activa respuestas automaticas para que el chatbot pueda trabajar.",
        whatsapp: "WhatsApp conectado",
        instagram: "Instagram conectado",
        integrations: "Ir a Integraciones",
        noBusiness: "No hay negocio seleccionado.",
      }
    : {
        title: "AI Chatbot",
        subtitle: "Manage automation, lead intake, and booking automation from one operational panel.",
        enabled: "Enabled",
        disabled: "Disabled",
        activate: "Enable AI Chatbot",
        deactivate: "Disable AI Chatbot",
        leads: "Leads from chatbot",
        qualified: "Qualified leads",
        bookings: "Bookings from chatbot",
        openConversations: "Active conversations",
        setup: "Setup",
        setupHint: "Connect channels and enable automatic replies so the chatbot can operate.",
        whatsapp: "WhatsApp connected",
        instagram: "Instagram connected",
        integrations: "Open Integrations",
        noBusiness: "No business selected.",
      };

  const benefits = isEs
    ? [
        { title: "Agenda citas en segundos", desc: "Convierte conversaciones en reservas y reduce tareas manuales." },
        { title: "Califica leads automaticamente", desc: "Prioriza prospectos con mayor intencion y contexto completo." },
        { title: "Responde fuera de horario", desc: "Atiende consultas 24/7 con respuestas consistentes." },
      ]
    : [
        { title: "Schedule appointments in seconds", desc: "Turn conversations into bookings and cut manual work." },
        { title: "Auto-qualify leads", desc: "Prioritize prospects with stronger intent and complete context." },
        { title: "Reply after hours", desc: "Handle customer questions 24/7 with consistent responses." },
      ];

  useEffect(() => {
    const load = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      const [businessRes, integrationRes, leadsRes, qualifiedRes, bookingsRes, openConversationsRes] = await Promise.all([
        supabase.from("businesses").select("chatbot_enabled").eq("id", businessId).single(),
        supabase
          .from("business_integrations")
          .select("whatsapp_access_token, whatsapp_phone_number_id, instagram_access_token, instagram_business_id")
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .ilike("source", "%chatbot%"),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .ilike("source", "%chatbot%")
          .eq("stage", "qualified"),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("source", "chatbot"),
        supabase
          .from("inbox_threads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gt("unread_count", 0),
      ]);

      if (businessRes.error) {
        setError(businessRes.error.message);
      } else {
        setChatbotEnabled(!!businessRes.data?.chatbot_enabled);
      }

      if (integrationRes.data) {
        setHasWhatsApp(
          Boolean(integrationRes.data.whatsapp_access_token && integrationRes.data.whatsapp_phone_number_id)
        );
        setHasInstagram(
          Boolean(integrationRes.data.instagram_access_token && integrationRes.data.instagram_business_id)
        );
      } else {
        setHasWhatsApp(false);
        setHasInstagram(false);
      }

      setMetrics({
        totalLeads: leadsRes.count || 0,
        qualifiedLeads: qualifiedRes.count || 0,
        bookingsFromChatbot: bookingsRes.count || 0,
        openConversations: openConversationsRes.count || 0,
      });

      setLoading(false);
    };

    load();
  }, [businessId]);

  const setupReady = useMemo(() => hasWhatsApp || hasInstagram, [hasInstagram, hasWhatsApp]);

  const handleToggle = async () => {
    if (!businessId || saving) return;
    setSaving(true);
    setError(null);
    const nextValue = !chatbotEnabled;
    const { error: updateError } = await supabase
      .from("businesses")
      .update({ chatbot_enabled: nextValue, updated_at: new Date().toISOString() })
      .eq("id", businessId);
    if (updateError) {
      setError(updateError.message);
    } else {
      setChatbotEnabled(nextValue);
    }
    setSaving(false);
  };

  if (!businessId) {
    return <div className="text-sm text-muted-foreground">{copy.noBusiness}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Bot className="h-7 w-7 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
            <Badge className={chatbotEnabled ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
              {chatbotEnabled ? copy.enabled : copy.disabled}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">{copy.subtitle}</p>
        </div>
        <Button
          onClick={handleToggle}
          disabled={saving || loading}
          className={chatbotEnabled ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Power className="mr-2 h-4 w-4" />
          )}
          {chatbotEnabled ? copy.deactivate : copy.activate}
        </Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={copy.leads} value={metrics.totalLeads} icon={MessageCircle} />
        <MetricCard label={copy.qualified} value={metrics.qualifiedLeads} icon={Zap} />
        <MetricCard label={copy.bookings} value={metrics.bookingsFromChatbot} icon={Check} />
        <MetricCard label={copy.openConversations} value={metrics.openConversations} icon={Bot} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{copy.setup}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{copy.setupHint}</p>
            <div className="space-y-2">
              <SetupItem label={copy.whatsapp} ok={hasWhatsApp} />
              <SetupItem label={copy.instagram} ok={hasInstagram} />
            </div>
            <Button asChild variant="outline">
              <Link to="/integrations">{copy.integrations}</Link>
            </Button>
            {!setupReady && <p className="text-xs text-amber-700">Connect at least one channel before enabling automation.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isEs ? "Impacto operativo" : "Operational impact"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{benefit.title}</p>
                  <p className="text-sm text-muted-foreground">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function SetupItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{label}</span>
      <Badge className={ok ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
        {ok ? "OK" : "Missing"}
      </Badge>
    </div>
  );
}
