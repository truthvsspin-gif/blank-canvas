"use client"

import { useEffect, useState } from "react"
import { ArrowUpRight, DollarSign, Globe2, MoreHorizontal, Users2 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLanguage } from "@/components/providers/language-provider"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/components/providers/auth-provider"

const kpis = [
  {
    title: { es: "Miembros online", en: "Members online" },
    value: "10,468",
    subtitle: { es: "Uso en vivo", en: "Live usage" },
    color: "from-sky-500 to-sky-400",
  },
  {
    title: { es: "Leads activos", en: "Active leads" },
    value: "2,314",
    subtitle: { es: "Ultimos 7 dias", en: "Last 7 days" },
    color: "from-sky-600 to-sky-500",
  },
  {
    title: { es: "Ingresos recurrentes", en: "Recurring revenue" },
    value: "$64,820",
    subtitle: { es: "Mes actual", en: "Current month" },
    color: "from-amber-500 to-amber-400",
  },
  {
    title: { es: "Alertas abiertas", en: "Open alerts" },
    value: "28",
    subtitle: { es: "Pendientes", en: "Pending" },
    color: "from-rose-400 to-rose-500",
  },
]

const socialCards = [
  { title: "Facebook", value: "40k friends", detail: "450 feeds", color: "bg-indigo-500" },
  { title: "Twitter", value: "30k friends", detail: "450 tweets", color: "bg-sky-500" },
  { title: "LinkedIn", value: "40+ contacts", detail: "250 feeds", color: "bg-indigo-700" },
  { title: "Google+", value: "94k followers", detail: "92 circles", color: "bg-rose-500" },
]

const stats = [
  {
    labelEs: "Ganancia total",
    labelEn: "Total profit",
    value: "1,012",
    icon: DollarSign,
    tone: "text-emerald-600 bg-emerald-50",
  },
  {
    labelEs: "Nuevos clientes",
    labelEn: "New customers",
    value: "961",
    icon: Users2,
    tone: "text-blue-600 bg-blue-50",
  },
  {
    labelEs: "Proyectos activos",
    labelEn: "Active projects",
    value: "770",
    icon: Globe2,
    tone: "text-amber-600 bg-amber-50",
  },
]

export default function AdminPage() {
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const { businessId } = useCurrentBusiness()
  const { user } = useAuth()
  const [role, setRole] = useState<string | null>(null)
  const [seedLoading, setSeedLoading] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)
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
  })
  const [autoReplySaving, setAutoReplySaving] = useState(false)
  const [autoReplyMessage, setAutoReplyMessage] = useState<string | null>(null)
  const [autoReplyError, setAutoReplyError] = useState<string | null>(null)
  const [aiReplyEnabled, setAiReplyEnabled] = useState(false)
  const [whatsAppLoading, setWhatsAppLoading] = useState(false)
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null)
  const [whatsAppThreads, setWhatsAppThreads] = useState<
    {
      id: string
      contactName: string
      contactHandle: string
      lastMessage: string
      lastMessageAt: string
      lastIntent: string | null
      unreadCount: number
    }[]
  >([])
  const [whatsAppStats, setWhatsAppStats] = useState({
    conversations: 0,
    qualifiedLeads: 0,
    bookingHandoffs: 0,
  })

  const copy = isEs
    ? {
        title: "Admin",
        description: "Panel colorido de control con KPIs, sociales y trafico.",
        alert: "Leiste este mensaje de alerta importante.",
        success: "Exito",
        controlBadge: "Control",
        seedTitle: "Seed demo",
        seedDesc: "Genera datos demo para el CRM en este negocio.",
        seedButton: "Sembrar demo",
        seeding: "Sembrando...",
        traffic: "Trafico",
        trafficPeriod: "Octubre 2017",
        day: "Dia",
        month: "Mes",
        year: "Ano",
        visits: "Visitas",
        unique: "Unicos",
        pageviews: "Pageviews",
        newUsers: "Nuevos usuarios",
        manager: "Project Manager",
        viewProfile: "Ver perfil",
        tweets: "Tweets",
        following: "Siguiendo",
        followers: "Seguidores",
        whatsappTitle: "Actividad de WhatsApp",
        whatsappDesc: "Conversaciones recientes y conversiones del mes.",
        whatsappRecent: "Conversaciones recientes",
        whatsappConversations: "Conversaciones activas",
        whatsappQualified: "Leads calificados",
        whatsappHandoffs: "Derivaciones de reserva",
        whatsappHandoffsHint: "Intento de reserva detectado",
        whatsappEmpty: "No hay conversaciones recientes.",
      }
    : {
        title: "Admin",
        description: "Colorful control panel with KPIs, social, and traffic.",
        alert: "You successfully read this important alert message.",
        success: "Success",
        controlBadge: "Control",
        seedTitle: "Seed demo",
        seedDesc: "Generate demo data for the CRM in this business.",
        seedButton: "Seed demo",
        seeding: "Seeding...",
        traffic: "Traffic",
        trafficPeriod: "October 2017",
        day: "Day",
        month: "Month",
        year: "Year",
        visits: "Visits",
        unique: "Unique",
        pageviews: "Pageviews",
        newUsers: "New users",
        manager: "Project Manager",
        viewProfile: "View profile",
        tweets: "Tweets",
        following: "Following",
        followers: "Followers",
        whatsappTitle: "WhatsApp activity",
        whatsappDesc: "Recent conversations and month-to-date conversion stats.",
        whatsappRecent: "Recent conversations",
        whatsappConversations: "Active conversations",
        whatsappQualified: "Qualified leads",
        whatsappHandoffs: "Booking handoffs",
        whatsappHandoffsHint: "Booking intent detected",
        whatsappEmpty: "No recent conversations yet.",
      }

  const autoCopy = isEs
    ? {
        title: "Respuestas automaticas",
        description: "Configura saludos y respuestas fuera de horario para WhatsApp.",
        enabled: "Activar reglas",
        greetingEnabled: "Saludo inicial",
        greetingText: "Texto de saludo",
        oooEnabled: "Fuera de horario",
        oooText: "Texto fuera de horario",
        timezone: "Zona horaria",
        hoursStart: "Inicio",
        hoursEnd: "Fin",
        days: "Dias (0=Dom, 6=Sab)",
        fallbackText: "Respuesta fallback",
        aiEnabled: "Activar respuestas AI",
        save: "Guardar reglas",
        saving: "Guardando...",
        saved: "Reglas guardadas.",
        error: "No se pudieron guardar las reglas.",
      }
    : {
        title: "Auto replies",
        description: "Configure greetings and out-of-office replies for WhatsApp.",
        enabled: "Enable rules",
        greetingEnabled: "Greeting on first message",
        greetingText: "Greeting text",
        oooEnabled: "Out of office",
        oooText: "Out-of-office text",
        timezone: "Timezone",
        hoursStart: "Start",
        hoursEnd: "End",
        days: "Days (0=Sun, 6=Sat)",
        fallbackText: "Fallback reply",
        aiEnabled: "Enable AI replies",
        save: "Save rules",
        saving: "Saving...",
        saved: "Rules saved.",
        error: "Failed to save rules.",
      }

  useEffect(() => {
    const loadAutoReply = async () => {
      if (!businessId) return
      const { data } = await supabase
        .from("businesses")
        .select("auto_reply_rules, ai_reply_enabled")
        .eq("id", businessId)
        .maybeSingle()
      const rules = (data?.auto_reply_rules ?? {}) as Record<string, any>
      setAiReplyEnabled(Boolean(data?.ai_reply_enabled))
      const hours = rules?.out_of_office?.hours ?? {}
      const days = Array.isArray(hours?.days) ? hours.days.join(",") : "1,2,3,4,5"
      setAutoReply({
        enabled: rules.enabled ?? true,
        greetingEnabled: rules.greeting?.enabled ?? true,
        greetingText: rules.greeting?.text ?? "",
        oooEnabled: rules.out_of_office?.enabled ?? true,
        oooText: rules.out_of_office?.text ?? "",
        timezone: rules.out_of_office?.timezone ?? rules.timezone ?? "UTC",
        start: hours?.start ?? "09:00",
        end: hours?.end ?? "18:00",
        days,
        fallbackText: rules.fallback?.text ?? "",
      })
    }
    loadAutoReply()
  }, [businessId])

  useEffect(() => {
    const loadRole = async () => {
      if (!businessId || !user) return
      const { data, error } = await supabase
        .from("memberships")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", user.id)
        .single()
      if (error) {
        setRole(null)
        return
      }
      setRole(data?.role ?? null)
    }
    loadRole()
  }, [businessId, user])

  useEffect(() => {
    const loadWhatsApp = async () => {
      if (!businessId) return
      setWhatsAppLoading(true)
      setWhatsAppError(null)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const threadsQuery = supabase
        .from("inbox_threads")
        .select("id, contact_name, contact_handle, last_message_text, last_message_at, last_intent, unread_count")
        .eq("business_id", businessId)
        .eq("channel", "whatsapp")
        .order("last_message_at", { ascending: false })
        .limit(6)

      const conversationsQuery = supabase
        .from("inbox_threads")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("channel", "whatsapp")
        .gte("updated_at", startOfMonth.toISOString())

      const qualifiedQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("source", "whatsapp")
        .eq("stage", "qualified")
        .gte("created_at", startOfMonth.toISOString())

      const handoffQuery = supabase
        .from("inbox_threads")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("channel", "whatsapp")
        .eq("last_intent", "booking")
        .gte("updated_at", startOfMonth.toISOString())

      const [threadsRes, conversationsRes, qualifiedRes, handoffRes] = await Promise.all([
        threadsQuery,
        conversationsQuery,
        qualifiedQuery,
        handoffQuery,
      ])

      if (threadsRes.error || conversationsRes.error || qualifiedRes.error || handoffRes.error) {
        const errorMessage =
          threadsRes.error?.message ||
          conversationsRes.error?.message ||
          qualifiedRes.error?.message ||
          handoffRes.error?.message
        setWhatsAppError(errorMessage || "Failed to load WhatsApp activity.")
      }

      const mappedThreads = (threadsRes.data ?? []).map((thread) => ({
        id: thread.id,
        contactName: thread.contact_name || (isEs ? "Sin nombre" : "Unnamed"),
        contactHandle: thread.contact_handle || "",
        lastMessage: thread.last_message_text || "",
        lastMessageAt: thread.last_message_at || "",
        lastIntent: thread.last_intent ?? null,
        unreadCount: thread.unread_count ?? 0,
      }))

      setWhatsAppThreads(mappedThreads)
      setWhatsAppStats({
        conversations: conversationsRes.count ?? 0,
        qualifiedLeads: qualifiedRes.count ?? 0,
        bookingHandoffs: handoffRes.count ?? 0,
      })
      setWhatsAppLoading(false)
    }

    loadWhatsApp()
  }, [businessId, isEs])

  const handleSaveAutoReply = async () => {
    if (!businessId) {
      setAutoReplyError(autoCopy.error)
      return
    }
    setAutoReplySaving(true)
    setAutoReplyMessage(null)
    setAutoReplyError(null)
    const days = autoReply.days
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 6)
    const payload = {
      enabled: autoReply.enabled,
      greeting: {
        enabled: autoReply.greetingEnabled,
        text: autoReply.greetingText.trim() || undefined,
      },
      out_of_office: {
        enabled: autoReply.oooEnabled,
        text: autoReply.oooText.trim() || undefined,
        timezone: autoReply.timezone.trim() || "UTC",
        hours: {
          start: autoReply.start.trim() || undefined,
          end: autoReply.end.trim() || undefined,
          days,
        },
      },
      fallback: {
        text: autoReply.fallbackText.trim() || undefined,
      },
      timezone: autoReply.timezone.trim() || "UTC",
    }
    const { error } = await supabase
      .from("businesses")
      .update({ auto_reply_rules: payload, ai_reply_enabled: aiReplyEnabled })
      .eq("id", businessId)
    if (error) {
      setAutoReplyError(autoCopy.error)
      setAutoReplySaving(false)
      return
    }
    setAutoReplyMessage(autoCopy.saved)
    setAutoReplySaving(false)
  }

  const handleSeed = async () => {
    if (!businessId) {
      setSeedError(isEs ? "No hay business_id activo." : "No active business_id.")
      return
    }
    setSeedLoading(true)
    setSeedMessage(null)
    setSeedError(null)
    const response = await fetch("/api/seed-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setSeedError(payload?.error || (isEs ? "Error al sembrar datos." : "Failed to seed data."))
      setSeedLoading(false)
      return
    }
    setSeedMessage(payload?.message || (isEs ? "Seed completado." : "Seed completed."))
    setSeedLoading(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={<Badge variant="secondary">{copy.controlBadge}</Badge>}
      />

      <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm">
        <span className="font-semibold">{copy.success}:</span> {copy.alert}
      </div>

      {role === "owner" ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{autoCopy.title}</CardTitle>
            <CardDescription>{autoCopy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoReply.enabled}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, enabled: event.target.checked }))
                  }
                />
                {autoCopy.enabled}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={aiReplyEnabled}
                  onChange={(event) => setAiReplyEnabled(event.target.checked)}
                />
                {autoCopy.aiEnabled}
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">{autoCopy.greetingText}</span>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={autoReply.greetingText}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, greetingText: event.target.value }))
                  }
                  placeholder="Hi! Thanks for reaching out."
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">{autoCopy.fallbackText}</span>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={autoReply.fallbackText}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, fallbackText: event.target.value }))
                  }
                  placeholder="Thanks for your message."
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">{autoCopy.timezone}</span>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={autoReply.timezone}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, timezone: event.target.value }))
                  }
                  placeholder="Europe/Madrid"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">{autoCopy.hoursStart}</span>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={autoReply.start}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, start: event.target.value }))
                  }
                  placeholder="09:00"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">{autoCopy.hoursEnd}</span>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={autoReply.end}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, end: event.target.value }))
                  }
                  placeholder="18:00"
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">{autoCopy.days}</span>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={autoReply.days}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, days: event.target.value }))
                  }
                  placeholder="1,2,3,4,5"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">{autoCopy.oooText}</span>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm"
                  value={autoReply.oooText}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, oooText: event.target.value }))
                  }
                  placeholder="We are currently closed."
                />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoReply.greetingEnabled}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, greetingEnabled: event.target.checked }))
                  }
                />
                {autoCopy.greetingEnabled}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoReply.oooEnabled}
                  onChange={(event) =>
                    setAutoReply((prev) => ({ ...prev, oooEnabled: event.target.checked }))
                  }
                />
                {autoCopy.oooEnabled}
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleSaveAutoReply}
                disabled={autoReplySaving}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {autoReplySaving ? autoCopy.saving : autoCopy.save}
              </Button>
              {autoReplyMessage ? (
                <span className="text-sm text-emerald-600">{autoReplyMessage}</span>
              ) : null}
              {autoReplyError ? (
                <span className="text-sm text-rose-600">{autoReplyError}</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}


      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{copy.whatsappTitle}</CardTitle>
          <CardDescription>{copy.whatsappDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase text-slate-500">{copy.whatsappConversations}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {whatsAppLoading ? "..." : whatsAppStats.conversations}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase text-slate-500">{copy.whatsappQualified}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {whatsAppLoading ? "..." : whatsAppStats.qualifiedLeads}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase text-slate-500">{copy.whatsappHandoffs}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {whatsAppLoading ? "..." : whatsAppStats.bookingHandoffs}
              </p>
              <p className="text-xs text-slate-500">{copy.whatsappHandoffsHint}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-slate-500">{copy.whatsappRecent}</p>
            {whatsAppError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {whatsAppError}
              </div>
            ) : null}
            {whatsAppLoading ? (
              <div className="text-sm text-slate-500">...</div>
            ) : whatsAppThreads.length === 0 ? (
              <div className="text-sm text-slate-500">{copy.whatsappEmpty}</div>
            ) : (
              <div className="space-y-2">
                {whatsAppThreads.map((thread) => (
                  <div key={thread.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{thread.contactName}</p>
                        {thread.contactHandle ? (
                          <p className="text-xs text-slate-500">{thread.contactHandle}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {thread.lastIntent ? (
                          <Badge variant="secondary">{thread.lastIntent}</Badge>
                        ) : null}
                        {thread.lastMessageAt ? (
                          <span>
                            {new Date(thread.lastMessageAt).toLocaleString(
                              isEs ? "es-ES" : "en-US",
                              { dateStyle: "medium", timeStyle: "short" }
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {thread.lastMessage ? (
                      <p className="mt-2 text-sm text-slate-600">{thread.lastMessage}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {role === "owner" ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{copy.seedTitle}</CardTitle>
            <CardDescription>{copy.seedDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <Button onClick={handleSeed} disabled={seedLoading} className="bg-rose-600 text-white hover:bg-rose-500">
              {seedLoading ? copy.seeding : copy.seedButton}
            </Button>
            {seedMessage ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                {seedMessage}
              </div>
            ) : null}
            {seedError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {seedError}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item, idx) => (
          <Card key={idx} className={`bg-gradient-to-br ${item.color} text-white shadow-lg`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {isEs ? item.title.es : item.title.en}
              </CardTitle>
              <CardDescription className="text-white/80">
                {isEs ? item.subtitle.es : item.subtitle.en}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-3xl font-bold">{item.value}</p>
              <Button size="icon" variant="ghost" className="text-white hover:bg-white/10">
                <MoreHorizontal className="size-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {socialCards.map((card) => (
          <Card key={card.title} className={`${card.color} text-white shadow-md`}>
            <CardContent className="space-y-1 p-4">
              <p className="text-lg font-semibold">{card.title}</p>
              <div className="text-sm text-white/80">
                <div>{card.value}</div>
                <div>{card.detail}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{copy.traffic}</CardTitle>
              <CardDescription>{copy.trafficPeriod}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="border-slate-200">
                {copy.day}
              </Button>
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
                {copy.month}
              </Button>
              <Button size="sm" variant="outline" className="border-slate-200">
                {copy.year}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-48 rounded-lg bg-gradient-to-b from-slate-50 to-white border border-slate-200" />
            <div className="grid grid-cols-4 gap-3 text-xs text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">{copy.visits}</p>
                <p>29,703 Users (40%)</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{copy.unique}</p>
                <p>24,093 Users (20%)</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{copy.pageviews}</p>
                <p>78,706 Views (60%)</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{copy.newUsers}</p>
                <p>22,123 Users (80%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-sky-500 to-sky-400 text-white shadow-lg">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Jim Doe</p>
                  <p className="text-sm text-white/80">{copy.manager}</p>
                </div>
                <Badge className="bg-white text-sky-600">
                  <ArrowUpRight className="size-4" />
                  {copy.viewProfile}
                </Badge>
              </div>
              <div className="grid grid-cols-3 text-center text-sm">
                <div>
                  <p className="font-semibold">750</p>
                  <p className="text-white/80">{copy.tweets}</p>
                </div>
                <div>
                  <p className="font-semibold">865</p>
                  <p className="text-white/80">{copy.following}</p>
                </div>
                <div>
                  <p className="font-semibold">3645</p>
                  <p className="text-white/80">{copy.followers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="space-y-3 p-4">
              {stats.map((item) => (
                <div
                  key={item.labelEn}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className={`grid size-10 place-items-center rounded-full ${item.tone}`}>
                    <item.icon className="size-5" />
                  </div>
                  <div className="flex-1 px-3 text-sm">
                    <p className="text-slate-600">{isEs ? item.labelEs : item.labelEn}</p>
                    <p className="text-lg font-semibold text-slate-900">{item.value}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-rose-600">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
