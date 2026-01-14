import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  CalendarClock,
  Car,
  Filter,
  MoreHorizontal,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"

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
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabaseClient"

const revenuePoints = [32, 38, 36, 44, 46, 52, 56, 60, 58, 66, 74, 81]

const services = [
  { labelEs: "Pulido Completo", labelEn: "Full Polish", value: 32, color: "bg-rose-500", hex: "#f43f5e" },
  { labelEs: "Ceramic Coating", labelEn: "Ceramic Coating", value: 24, color: "bg-emerald-500", hex: "#10b981" },
  { labelEs: "PPF", labelEn: "PPF", value: 18, color: "bg-amber-500", hex: "#f59e0b" },
  { labelEs: "Interior", labelEn: "Interior", value: 14, color: "bg-sky-500", hex: "#0ea5e9" },
  { labelEs: "Otros", labelEn: "Other", value: 12, color: "bg-violet-500", hex: "#8b5cf6" },
]

const statusMeta = {
  new: { labelEs: "Nueva", labelEn: "New", tone: "bg-slate-100 text-slate-700" },
  confirmed: { labelEs: "Confirmada", labelEn: "Confirmed", tone: "bg-blue-100 text-blue-800" },
  completed: { labelEs: "Completada", labelEn: "Completed", tone: "bg-emerald-100 text-emerald-800" },
  cancelled: { labelEs: "Cancelada", labelEn: "Cancelled", tone: "bg-rose-100 text-rose-700" },
  in_progress: { labelEs: "En curso", labelEn: "In progress", tone: "bg-amber-100 text-amber-800" },
}

const copy = {
  es: {
    title: "Dashboard",
    description: "Bienvenido de vuelta, Juan. Tu operacion diaria y rendimiento a simple vista.",
    actions: { newAppt: "Nueva cita", newClient: "Nuevo cliente", viewClients: "Ver clientes" },
    metricLabels: {
      customers: "Clientes totales",
      weekBookings: "Bookings esta semana",
      upcoming: "Proximas 7 dias",
      completed: "Completadas este mes",
    },
    usageTitle: "Uso del chatbot",
    usageDesc: "Conteos mensuales por conversaciones y leads.",
    usageConversations: "Conversaciones (ventana 24h)",
    usageQualified: "Leads calificados",
    revenueTitle: "Ingresos Anuales",
    revenueDesc: "Resumen de ingreso por mes",
    revenueFilter: "Este ano",
    trend: "Tendencia positiva",
    servicesTitle: "Servicios por Tipo",
    servicesDesc: "Distribucion de servicios este mes",
    appointmentsTitle: "Citas de Hoy",
    appointmentsDesc: "Gestiona las citas programadas",
    addAppt: "Nueva reserva",
    viewAllBookings: "Ver reservas",
    tableHeaders: ["Cliente", "Vehiculo", "Servicio", "Fecha y hora", "Estado"],
    noAppointments: "No hay citas para hoy.",
    unknownCustomer: "Cliente sin nombre",
    unknownVehicle: "Sin vehiculo",
    noDate: "Sin fecha",
  },
  en: {
    title: "Dashboard",
    description: "Welcome back, Juan. Your daily operations and performance at a glance.",
    actions: { newAppt: "New appointment", newClient: "New client", viewClients: "View clients" },
    metricLabels: {
      customers: "Total customers",
      weekBookings: "Bookings this week",
      upcoming: "Next 7 days",
      completed: "Completed this month",
    },
    usageTitle: "Chatbot usage",
    usageDesc: "Monthly counts for conversations and qualified leads.",
    usageConversations: "Conversations (24h window)",
    usageQualified: "Qualified leads",
    revenueTitle: "Annual revenue",
    revenueDesc: "Monthly revenue summary",
    revenueFilter: "This year",
    trend: "Upward trend",
    servicesTitle: "Services by type",
    servicesDesc: "Service distribution this month",
    appointmentsTitle: "Today's appointments",
    appointmentsDesc: "Manage scheduled appointments",
    addAppt: "New booking",
    viewAllBookings: "View bookings",
    tableHeaders: ["Client", "Vehicle", "Service", "Date & time", "Status"],
    noAppointments: "No appointments scheduled for today.",
    unknownCustomer: "Unnamed customer",
    unknownVehicle: "No vehicle",
    noDate: "No date",
  },
}

export default function DashboardPage() {
  const { businessId } = useCurrentBusiness()
  const { user } = useAuth()
  const { lang } = useLanguage()
  const text = copy[lang]
  const locale = lang === "es" ? "es-ES" : "en-US"
  const timeZone =
    typeof user?.user_metadata?.timezone === "string" && user.user_metadata.timezone.length > 0
      ? user.user_metadata.timezone
      : "Europe/Madrid"
  const [metricError, setMetricError] = useState<string | null>(null)
  const [usageError, setUsageError] = useState<string | null>(null)
  const [usageStats, setUsageStats] = useState({
    conversations: { value: 0, loading: true },
    qualifiedLeads: { value: 0, loading: true },
  })
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null)
  const [appointmentsToday, setAppointmentsToday] = useState<
    {
      id: string
      client: string
      vehicle: string
      service: string
      scheduledAt: string
      status: string
      tone: string
    }[]
  >([])
  const [metrics, setMetrics] = useState({
    customers: { value: 0, loading: true },
    weekBookings: { value: 0, loading: true },
    upcoming: { value: 0, loading: true },
    completedMonth: { value: 0, loading: true },
  })

  const formatAppointmentTime = useCallback(
    (value: string | null) => {
      if (!value) return text.noDate
      try {
        return new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone,
        }).format(new Date(value))
      } catch {
        return new Date(value).toLocaleString(locale)
      }
    },
    [locale, text.noDate, timeZone]
  )

  useEffect(() => {
    const loadMetrics = async () => {
      if (!businessId) return
      setMetricError(null)
      const now = new Date()
      const startOfWeek = new Date(now)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      startOfWeek.setHours(0, 0, 0, 0)

      const startOfNextWeek = new Date(startOfWeek)
      startOfNextWeek.setDate(startOfNextWeek.getDate() + 7)

      const next7 = new Date(now)
      next7.setDate(next7.getDate() + 7)

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const queries = [
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("scheduled_at", startOfWeek.toISOString())
          .lt("scheduled_at", startOfNextWeek.toISOString()),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("scheduled_at", now.toISOString())
          .lt("scheduled_at", next7.toISOString()),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "completed")
          .gte("scheduled_at", startOfMonth.toISOString()),
      ]

      const [cust, week, upcoming, completed] = await Promise.all(queries)

      const err =
        cust.error || week.error || upcoming.error || completed.error
          ? (cust.error || week.error || upcoming.error || completed.error)?.message
          : null

      if (err) {
        setMetricError(err)
      }

      setMetrics({
        customers: { value: cust.count ?? 0, loading: false },
        weekBookings: { value: week.count ?? 0, loading: false },
        upcoming: { value: upcoming.count ?? 0, loading: false },
        completedMonth: { value: completed.count ?? 0, loading: false },
      })
    }
    loadMetrics()
  }, [businessId])
  useEffect(() => {
    const loadUsage = async () => {
      if (!businessId) return
      setUsageError(null)
      setUsageStats({
        conversations: { value: 0, loading: true },
        qualifiedLeads: { value: 0, loading: true },
      })

      const now = new Date()
      const year = now.getUTCFullYear()
      const month = String(now.getUTCMonth() + 1).padStart(2, "0")
      const period = `${year}-${month}`

      const { data, error } = await supabase
        .from("usage_monthly")
        .select("metric, value")
        .eq("business_id", businessId)
        .eq("period", period)

      if (error) {
        setUsageError(error.message)
        setUsageStats({
          conversations: { value: 0, loading: false },
          qualifiedLeads: { value: 0, loading: false },
        })
        return
      }

      const rows = data ?? []
      const conversations = rows.find((row) => row.metric === "conversations_24h")
      const qualifiedLeads = rows.find((row) => row.metric === "qualified_leads")
      setUsageStats({
        conversations: { value: Number(conversations?.value ?? 0), loading: false },
        qualifiedLeads: { value: Number(qualifiedLeads?.value ?? 0), loading: false },
      })
    }

    loadUsage()
  }, [businessId])


  useEffect(() => {
    const loadAppointments = async () => {
      if (!businessId) return
      setAppointmentsLoading(true)
      setAppointmentsError(null)
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      const { data, error } = await supabase
        .from("bookings")
        .select("id, customer_id, vehicle_id, service_name, status, scheduled_at")
        .eq("business_id", businessId)
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at", { ascending: true })

      if (error) {
        setAppointmentsError(error.message)
        setAppointmentsToday([])
        setAppointmentsLoading(false)
        return
      }

      const bookingRows = data ?? []
      const customerIds = Array.from(
        new Set(bookingRows.map((row) => row.customer_id).filter(Boolean))
      ) as string[]
      const vehicleIds = Array.from(
        new Set(bookingRows.map((row) => row.vehicle_id).filter(Boolean))
      ) as string[]

      const customerMap = new Map<string, { full_name: string | null; vehicle_info: string | null }>()
      if (customerIds.length > 0) {
        const { data: customers, error: customersError } = await supabase
          .from("customers")
          .select("id, full_name, vehicle_info")
          .eq("business_id", businessId)
          .in("id", customerIds)
        if (!customersError && customers) {
          customers.forEach((customer) => {
            customerMap.set(customer.id, {
              full_name: customer.full_name ?? null,
              vehicle_info: customer.vehicle_info ?? null,
            })
          })
        }
      }

      const vehicleMap = new Map<string, string>()
      if (vehicleIds.length > 0) {
        const { data: vehicles, error: vehiclesError } = await supabase
          .from("vehicles")
          .select("id, customer_id, brand, model, color, license_plate, size, created_at")
          .eq("business_id", businessId)
          .in("id", vehicleIds)
          .order("created_at", { ascending: false })
        if (!vehiclesError && vehicles) {
          vehicles.forEach((vehicle) => {
            const mainLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ")
            const colorLabel = vehicle.color ? ` - ${vehicle.color}` : ""
            const plateLabel = vehicle.license_plate ? ` (${vehicle.license_plate})` : ""
            const sizeLabel = vehicle.size ? ` - ${vehicle.size}` : ""
            const label = `${mainLabel}${colorLabel}${plateLabel}${sizeLabel}`.trim()
            if (vehicle.id) {
              vehicleMap.set(vehicle.id, label)
            }
          })
        }
      }

      const mapped = bookingRows.map((row) => {
        const meta = statusMeta[row.status as keyof typeof statusMeta]
        const customer = row.customer_id ? customerMap.get(row.customer_id) : null
        const vehicleLabel = row.vehicle_id ? vehicleMap.get(row.vehicle_id) : null
        return {
          id: row.id,
          client: customer?.full_name || text.unknownCustomer,
          vehicle: vehicleLabel || customer?.vehicle_info || text.unknownVehicle,
          service: row.service_name || "N/A",
          scheduledAt: formatAppointmentTime(row.scheduled_at),
          status: meta ? (lang === "es" ? meta.labelEs : meta.labelEn) : row.status,
          tone: meta ? meta.tone : "bg-slate-100 text-slate-700",
        }
      })

      setAppointmentsToday(mapped)
      setAppointmentsLoading(false)
    }

    loadAppointments()
  }, [businessId, formatAppointmentTime, lang, text.noDate, text.unknownCustomer, text.unknownVehicle])

  const metricCards = [
    {
      label: text.metricLabels.customers,
      value: metrics.customers.value,
      loading: metrics.customers.loading,
      tone: "from-rose-50 to-rose-100 text-rose-700",
      icon: <Users className="size-5" />,
    },
    {
      label: text.metricLabels.weekBookings,
      value: metrics.weekBookings.value,
      loading: metrics.weekBookings.loading,
      tone: "from-emerald-50 to-emerald-100 text-emerald-700",
      icon: <CalendarClock className="size-5" />,
    },
    {
      label: text.metricLabels.upcoming,
      value: metrics.upcoming.value,
      loading: metrics.upcoming.loading,
      tone: "from-amber-50 to-amber-100 text-amber-700",
      icon: <Car className="size-5" />,
    },
    {
      label: text.metricLabels.completed,
      value: metrics.completedMonth.value,
      loading: metrics.completedMonth.loading,
      tone: "from-slate-50 to-slate-100 text-slate-700",
      icon: <Wallet className="size-5" />,
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title={text.title}
        description={text.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button className="bg-rose-600 text-white hover:bg-rose-500" asChild>
              <Link to="/crm/bookings/new">{text.actions.newAppt}</Link>
            </Button>
            <Button variant="outline" className="border-slate-200" asChild>
              <Link to="/crm/customers/new">{text.actions.newClient}</Link>
            </Button>
            <Button variant="outline" className="border-slate-200" asChild>
              <Link to="/crm/customers">{text.actions.viewClients}</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((stat) => (
          <Card key={stat.label} className={`border-0 bg-gradient-to-br ${stat.tone} shadow-sm`}>
            <CardContent className="flex items-start justify-between p-4">
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{stat.label}</p>
                <p className="text-3xl font-semibold text-slate-900">
                  {stat.loading ? "..." : stat.value}
                </p>
                {metricError ? (
                  <p className="text-xs text-rose-700">{metricError}</p>
                ) : (
                  <p className="text-sm font-medium text-emerald-700">&nbsp;</p>
                )}
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-white/70 text-lg text-slate-900">
                {stat.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>{text.usageTitle}</CardTitle>
          <CardDescription>{text.usageDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">{text.usageConversations}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {usageStats.conversations.loading ? "..." : usageStats.conversations.value}
            </p>
            {usageError ? <p className="text-xs text-rose-600">{usageError}</p> : null}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase text-slate-500">{text.usageQualified}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {usageStats.qualifiedLeads.loading ? "..." : usageStats.qualifiedLeads.value}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">

        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle>{text.revenueTitle}</CardTitle>
              <CardDescription>{text.revenueDesc}</CardDescription>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to="/crm/bookings" className="flex items-center">
                <Filter className="mr-2 size-4" />
                {text.revenueFilter}
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50 to-white p-4">
              <div className="absolute inset-x-0 top-4 flex justify-between px-6 text-xs text-rose-500">
                <span>$0k</span>
                <span>$50k</span>
                <span>$100k</span>
              </div>
              <div className="mt-8 grid grid-cols-12 gap-1">
                {revenuePoints.map((point, idx) => (
                  <div key={idx} className="flex h-40 items-end">
                    <div
                      className="w-full rounded-full bg-gradient-to-t from-rose-500/60 via-rose-400/70 to-rose-300"
                      style={{ height: `${point}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-rose-600">
                <TrendingUp className="size-4" />
                {text.trend}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <CardTitle>{text.servicesTitle}</CardTitle>
              <CardDescription>{text.servicesDesc}</CardDescription>
            </div>
            <Button size="icon" variant="ghost" asChild>
              <Link to="/crm/services" aria-label="View services">
                <MoreHorizontal className="size-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr]">
            <div className="relative mx-auto h-48 w-48 rounded-full bg-slate-50">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundImage: `conic-gradient(
                    ${services
                      .map((slice, idx) => {
                        const start = services.slice(0, idx).reduce((sum, s) => sum + s.value, 0)
                        const end = start + slice.value
                        return `${slice.hex} ${start}%, ${slice.hex} ${end}%`
                      })
                      .join(", ")}
                  )`,
                }}
              />
              <div className="absolute inset-10 rounded-full bg-white shadow-inner" />
            </div>
            <div className="space-y-2">
              {services.map((service) => (
                <div key={service.labelEs} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`size-3 rounded-full ${service.color}`} />
                    <span>{lang === "es" ? service.labelEs : service.labelEn}</span>
                  </div>
                  <span className="font-semibold">{service.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>{text.appointmentsTitle}</CardTitle>
            <CardDescription>{text.appointmentsDesc}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="border-slate-200" asChild>
              <Link to="/crm/bookings">{text.viewAllBookings}</Link>
            </Button>
            <Button size="sm" variant="outline" className="border-slate-200" asChild>
              <Link to="/crm/bookings/new" className="flex items-center gap-2">
                <Plus className="size-4" />
                {text.addAppt}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-full divide-y divide-slate-100 text-sm">
            <div className="grid grid-cols-5 gap-4 px-2 pb-3 font-semibold text-slate-700">
              {text.tableHeaders.map((header) => (
                <span key={header}>{header}</span>
              ))}
            </div>
            {appointmentsLoading ? (
              <div className="px-2 py-4 text-sm text-slate-600">...</div>
            ) : appointmentsError ? (
              <div className="px-2 py-4 text-sm text-rose-700">{appointmentsError}</div>
            ) : appointmentsToday.length === 0 ? (
              <div className="px-2 py-4 text-sm text-slate-600">{text.noAppointments}</div>
            ) : (
              appointmentsToday.map((appt) => (
                <div key={appt.id} className="grid grid-cols-5 gap-4 px-2 py-3">
                  <span className="font-medium text-slate-900">{appt.client}</span>
                  <span className="text-slate-700">{appt.vehicle}</span>
                  <span className="text-slate-700">{appt.service}</span>
                  <span className="text-slate-700">{appt.scheduledAt}</span>
                  <Badge className={`${appt.tone} border-transparent`}>{appt.status}</Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

