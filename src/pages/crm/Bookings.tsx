import { useEffect, useMemo, useState } from "react"
import { CrmGettingStarted } from "@/components/crm/crm-getting-started"
import { Link } from "react-router-dom"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  User,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { Booking } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import {
  BOOKING_STATUS_OPTIONS,
  BookingStatus,
  getBookingStatusOption,
  getFilterStatuses,
} from "@/lib/crm-bookings"

const PAGE_SIZE = 12

type CalendarView = "list" | "month" | "week" | "day"

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
const addDays = (date: Date, days: number) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}
const addMonths = (date: Date, months: number) => new Date(date.getFullYear(), date.getMonth() + months, 1)
const startOfWeek = (date: Date) => {
  const day = (date.getDay() + 6) % 7
  return startOfDay(addDays(date, -day))
}
const endOfWeek = (date: Date) => endOfDay(addDays(startOfWeek(date), 6))
const toYmd = (date: Date) => date.toISOString().slice(0, 10)

export default function BookingsPage() {
  const { businessId } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const locale = isEs ? "es-ES" : "en-US"

  const [bookings, setBookings] = useState<Booking[]>([])
  const [calendarBookings, setCalendarBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<BookingStatus | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [view, setView] = useState<CalendarView>("list")
  const [focusDate, setFocusDate] = useState(new Date())
  const [customerMap, setCustomerMap] = useState<Map<string, string>>(new Map())
  const [vehicleMap, setVehicleMap] = useState<Map<string, string>>(new Map())
  const [staffMap, setStaffMap] = useState<Map<string, string>>(new Map())
  const [stats, setStats] = useState({
    scheduledWeek: 0,
    confirmedWeek: 0,
    chatbotWeek: 0,
    qualifiedLeadsWeek: 0,
  })

  const copy = isEs
    ? {
        title: "Reservas",
        description: "Gestion de agenda, estados y operacion diaria.",
        newBooking: "Nueva reserva",
        loading: "Cargando reservas...",
        customer: "Cliente",
        vehicle: "Vehiculo",
        service: "Servicio",
        date: "Fecha",
        status: "Estado",
        source: "Origen",
        assignedTo: "Asignado",
        actions: "Acciones",
        view: "Ver",
        allStatuses: "Todos",
        list: "Lista",
        month: "Mes",
        week: "Semana",
        day: "Dia",
        weekScheduled: "Citas esta semana",
        weekConfirmed: "Confirmadas",
        weekChatbot: "Desde chatbot",
        weekQualified: "Leads calificados",
        empty: "No hay reservas para mostrar.",
      }
    : {
        title: "Bookings",
        description: "Manage scheduling, statuses, and daily operations.",
        newBooking: "New booking",
        loading: "Loading bookings...",
        customer: "Customer",
        vehicle: "Vehicle",
        service: "Service",
        date: "Date",
        status: "Status",
        source: "Source",
        assignedTo: "Assigned",
        actions: "Actions",
        view: "View",
        allStatuses: "All",
        list: "List",
        month: "Month",
        week: "Week",
        day: "Day",
        weekScheduled: "Scheduled this week",
        weekConfirmed: "Confirmed",
        weekChatbot: "From chatbot",
        weekQualified: "Qualified leads",
        empty: "No bookings to display.",
      }

  const calendarRange = useMemo(() => {
    if (view === "month") {
      const monthStart = startOfMonth(focusDate)
      return { from: startOfWeek(monthStart), to: endOfWeek(endOfMonth(focusDate)) }
    }
    if (view === "week") {
      return { from: startOfWeek(focusDate), to: endOfWeek(focusDate) }
    }
    return { from: startOfDay(focusDate), to: endOfDay(focusDate) }
  }, [focusDate, view])

  useEffect(() => {
    const fetchBookings = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)

      const offset = (page - 1) * PAGE_SIZE
      let query = supabase
        .from("bookings")
        .select("*", { count: "exact" })
        .eq("business_id", businessId)
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (statusFilter) {
        query = query.in("status", getFilterStatuses(statusFilter))
      }

      const text = search.trim()
      if (text) query = query.ilike("service_name", `%${text}%`)

      const { data, error: queryError, count } = await query
      if (queryError) {
        setError(queryError.message)
        setBookings([])
      } else {
        setBookings((data as Booking[]) || [])
        setTotal(count || 0)
      }
      setLoading(false)
    }
    fetchBookings()
  }, [businessId, page, search, statusFilter])

  useEffect(() => {
    const fetchCalendarBookings = async () => {
      if (!businessId || view === "list") return
      setCalendarLoading(true)

      let query = supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .gte("scheduled_at", calendarRange.from.toISOString())
        .lte("scheduled_at", calendarRange.to.toISOString())
        .order("scheduled_at", { ascending: true })

      if (statusFilter) query = query.in("status", getFilterStatuses(statusFilter))
      const text = search.trim()
      if (text) query = query.ilike("service_name", `%${text}%`)

      const { data } = await query
      setCalendarBookings((data as Booking[]) || [])
      setCalendarLoading(false)
    }
    fetchCalendarBookings()
  }, [businessId, calendarRange.from, calendarRange.to, search, statusFilter, view])

  useEffect(() => {
    const fetchStats = async () => {
      if (!businessId) return
      const weekFrom = startOfWeek(new Date()).toISOString()
      const weekTo = endOfWeek(new Date()).toISOString()

      const [scheduled, confirmed, chatbot, qualified] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("scheduled_at", weekFrom)
          .lte("scheduled_at", weekTo),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("status", ["confirmed", "in_progress", "completed"])
          .gte("scheduled_at", weekFrom)
          .lte("scheduled_at", weekTo),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("source", "chatbot")
          .gte("scheduled_at", weekFrom)
          .lte("scheduled_at", weekTo),
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("stage", "qualified")
          .gte("created_at", weekFrom)
          .lte("created_at", weekTo),
      ])

      setStats({
        scheduledWeek: scheduled.count || 0,
        confirmedWeek: confirmed.count || 0,
        chatbotWeek: chatbot.count || 0,
        qualifiedLeadsWeek: qualified.count || 0,
      })
    }
    fetchStats()
  }, [businessId, bookings.length])

  useEffect(() => {
    const fetchMaps = async () => {
      if (!businessId) return
      const combined = [...bookings, ...calendarBookings]
      const customerIds = Array.from(new Set(combined.map((row) => row.customer_id).filter(Boolean))) as string[]
      const vehicleIds = Array.from(new Set(combined.map((row) => row.vehicle_id).filter(Boolean))) as string[]
      const assigneeIds = Array.from(new Set(combined.map((row) => row.assigned_to).filter(Boolean))) as string[]

      if (customerIds.length) {
        const { data } = await supabase.from("customers").select("id, full_name").eq("business_id", businessId).in("id", customerIds)
        setCustomerMap(new Map((data || []).map((row) => [row.id, row.full_name || ""])))
      } else {
        setCustomerMap(new Map())
      }

      if (vehicleIds.length) {
        const { data } = await supabase.from("vehicles").select("id, brand, model, license_plate").eq("business_id", businessId).in("id", vehicleIds)
        setVehicleMap(
          new Map(
            (data || []).map((row) => [
              row.id,
              [row.brand, row.model, row.license_plate].filter(Boolean).join(" ") || row.id,
            ])
          )
        )
      } else {
        setVehicleMap(new Map())
      }

      if (assigneeIds.length) {
        const { data } = await supabase.from("users").select("id, full_name, email").in("id", assigneeIds)
        setStaffMap(new Map((data || []).map((row) => [row.id, row.full_name || row.email || row.id])))
      } else {
        setStaffMap(new Map())
      }
    }
    fetchMaps()
  }, [businessId, bookings, calendarBookings])

  const formatDateTime = (value: string | null) => {
    if (!value) return "—"
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  }

  const dayBuckets = useMemo(() => {
    const groups = new Map<string, Booking[]>()
    calendarBookings.forEach((booking) => {
      if (!booking.scheduled_at) return
      const key = toYmd(new Date(booking.scheduled_at))
      const list = groups.get(key) || []
      list.push(booking)
      groups.set(key, list)
    })
    return groups
  }, [calendarBookings])

  const hasPrev = page > 1
  const hasNext = page * PAGE_SIZE < total

  const shiftCalendar = (dir: -1 | 1) => {
    if (view === "month") setFocusDate((prev) => addMonths(prev, dir))
    else if (view === "week") setFocusDate((prev) => addDays(prev, dir * 7))
    else setFocusDate((prev) => addDays(prev, dir))
  }

  const renderCalendar = () => {
    if (calendarLoading) return <div className="py-10 text-sm text-muted-foreground">{copy.loading}</div>
    const days: Date[] = []
    for (let cursor = new Date(calendarRange.from); cursor <= calendarRange.to; cursor = addDays(cursor, 1)) {
      days.push(new Date(cursor))
    }

    return (
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((day) => {
            const key = toYmd(day)
            const rows = dayBuckets.get(key) || []
            return (
              <div key={key} className={cn("rounded border p-2", view === "month" && day.getMonth() !== focusDate.getMonth() ? "opacity-50" : "")}>
                <div className="mb-2 text-xs font-semibold">{new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }).format(day)}</div>
                <div className="space-y-1">
                  {rows.slice(0, 4).map((row) => (
                    <Link key={row.id} to={`/crm/bookings/${row.id}`} className="block rounded bg-muted px-2 py-1 text-xs hover:bg-muted/70">
                      <div className="font-medium">{row.service_name}</div>
                      <div>{formatDateTime(row.scheduled_at)}</div>
                    </Link>
                  ))}
                  {rows.length > 4 && <div className="text-[11px] text-muted-foreground">+{rows.length - 4} more</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CrmGettingStarted
        titleEs="¿Cómo usar Reservas?"
        titleEn="How to use Bookings?"
        storageKey="crm-tips-bookings"
        steps={[
          { emoji: "1️⃣", textEs: "Haz click en 'Nueva reserva' para agendar una cita.", textEn: "Click 'New booking' to schedule an appointment." },
          { emoji: "2️⃣", textEs: "Selecciona cliente, vehículo, servicio y fecha.", textEn: "Select customer, vehicle, service and date." },
          { emoji: "3️⃣", textEs: "Cambia entre vista de Lista, Mes, Semana o Día para gestionar tu agenda.", textEn: "Switch between List, Month, Week or Day view to manage your schedule." },
          { emoji: "💡", textEs: "El chatbot también crea reservas automáticamente cuando un cliente agenda.", textEn: "The chatbot also creates bookings automatically when a customer schedules." },
        ]}
      />
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button asChild className="bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400">
            <Link to="/crm/bookings/new">
              <Plus className="mr-2 size-4" />
              {copy.newBooking}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{copy.weekScheduled}</p><p className="text-2xl font-bold">{stats.scheduledWeek}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{copy.weekConfirmed}</p><p className="text-2xl font-bold">{stats.confirmedWeek}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{copy.weekChatbot}</p><p className="text-2xl font-bold">{stats.chatbotWeek}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">{copy.weekQualified}</p><p className="text-2xl font-bold">{stats.qualifiedLeadsWeek}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Search service..." className="rounded border px-9 py-2 text-sm" />
            </div>
            {(["list", "month", "week", "day"] as CalendarView[]).map((mode) => (
              <Button key={mode} size="sm" variant={view === mode ? "default" : "outline"} onClick={() => setView(mode)}>
                {mode === "list" ? copy.list : mode === "month" ? copy.month : mode === "week" ? copy.week : copy.day}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={statusFilter === null ? "default" : "outline"} onClick={() => { setStatusFilter(null); setPage(1) }}>{copy.allStatuses}</Button>
            {BOOKING_STATUS_OPTIONS.map((status) => (
              <Button key={status.value} size="sm" variant={statusFilter === status.value ? "default" : "outline"} onClick={() => { setStatusFilter(status.value); setPage(1) }}>{isEs ? status.labelEs : status.labelEn}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
          {view !== "list" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => shiftCalendar(-1)}><ChevronLeft className="size-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setFocusDate(new Date())}><CalendarDays className="mr-2 size-4" />Today</Button>
              <Button variant="outline" size="sm" onClick={() => shiftCalendar(1)}><ChevronRight className="size-4" /></Button>
            </div>
          )}
          {view === "list" ? (
            loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />{copy.loading}</div>
            ) : bookings.length === 0 ? (
              <div className="text-sm text-muted-foreground">{copy.empty}</div>
            ) : (
              <>
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-2 text-left">{copy.customer}</th>
                        <th className="p-2 text-left">{copy.vehicle}</th>
                        <th className="p-2 text-left">{copy.service}</th>
                        <th className="p-2 text-left">{copy.date}</th>
                        <th className="p-2 text-left">{copy.status}</th>
                        <th className="p-2 text-left">{copy.source}</th>
                        <th className="p-2 text-left">{copy.assignedTo}</th>
                        <th className="p-2 text-right">{copy.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => {
                        const status = getBookingStatusOption(booking.status)
                        return (
                          <tr key={booking.id} className="border-t">
                            <td className="p-2">{customerMap.get(booking.customer_id || "") || "—"}</td>
                            <td className="p-2">{vehicleMap.get(booking.vehicle_id || "") || "—"}</td>
                            <td className="p-2">{booking.service_name}</td>
                            <td className="p-2">{formatDateTime(booking.scheduled_at)}</td>
                            <td className="p-2">
                              <Badge variant="outline" className={cn("text-xs", status.color)}>{isEs ? status.labelEs : status.labelEn}</Badge>
                            </td>
                            <td className="p-2 capitalize">{booking.source || "manual"}</td>
                            <td className="p-2">{staffMap.get(booking.assigned_to || "") || <span className="inline-flex items-center"><User className="mr-1 size-3" />-</span>}</td>
                            <td className="p-2 text-right"><Button variant="ghost" size="sm" asChild><Link to={`/crm/bookings/${booking.id}`}>{copy.view}</Link></Button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} / {total}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => setPage((prev) => Math.max(1, prev - 1))}><ChevronLeft className="size-4" /></Button>
                    <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPage((prev) => prev + 1)}><ChevronRight className="size-4" /></Button>
                  </div>
                </div>
              </>
            )
          ) : (
            renderCalendar()
          )}
        </CardContent>
      </Card>
    </div>
  )
}
