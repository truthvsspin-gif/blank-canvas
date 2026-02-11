import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns"
import { es, enUS, type Locale } from "date-fns/locale"
import { cn } from "@/lib/utils"

import { useLanguage } from "@/components/providers/language-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"

type CalendarView = "day" | "week" | "month"

type BookingEvent = {
  id: string
  service_name: string
  status: string
  scheduled_at: string | null
  customer_name?: string
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8:00 - 20:00

export default function Dashboard() {
  const navigate = useNavigate()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const locale = isEs ? es : enUS
  const { businessId, loading: bizLoading } = useCurrentBusiness()

  const [calendarView, setCalendarView] = useState<CalendarView>("day")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<BookingEvent[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) { setLoading(false); return }
    const fetchData = async () => {
      setLoading(true)
      const [bookingsRes, pendingRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, service_name, status, scheduled_at, customer_id")
          .eq("business_id", businessId)
          .order("scheduled_at", { ascending: true }),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .in("status", ["requested", "pending", "new"]),
      ])
      if (bookingsRes.data) setBookings(bookingsRes.data)
      setPendingCount(pendingRes.count ?? 0)
      setLoading(false)
    }
    fetchData()
  }, [businessId])

  const navigateDate = (dir: "prev" | "next" | "today" | "prevFar" | "nextFar") => {
    if (dir === "today") return setCurrentDate(new Date())
    const delta = calendarView === "month" ? 1 : calendarView === "week" ? 7 : 1
    if (dir === "prev") setCurrentDate(d => calendarView === "month" ? subMonths(d, 1) : subDays(d, delta))
    if (dir === "next") setCurrentDate(d => calendarView === "month" ? addMonths(d, 1) : addDays(d, delta))
    if (dir === "prevFar") setCurrentDate(d => calendarView === "month" ? subMonths(d, 3) : subDays(d, 7))
    if (dir === "nextFar") setCurrentDate(d => calendarView === "month" ? addMonths(d, 3) : addDays(d, 7))
  }

  const dateLabel = useMemo(() => {
    if (calendarView === "day") return format(currentDate, "EEEE d 'de' MMMM", { locale })
    if (calendarView === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 })
      const end = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(start, "d MMM", { locale })} – ${format(end, "d MMM yyyy", { locale })}`
    }
    return format(currentDate, "MMMM yyyy", { locale })
  }, [currentDate, calendarView, locale])

  const eventsForDate = (date: Date) =>
    bookings.filter(b => b.scheduled_at && isSameDay(new Date(b.scheduled_at), date))

  const getEventHour = (event: BookingEvent) => {
    if (!event.scheduled_at) return null
    return new Date(event.scheduled_at).getHours()
  }

  const statusColor = (status: string) => {
    if (["confirmed", "in_progress"].includes(status)) return "bg-blue-100 text-blue-800 border-blue-200"
    if (status === "completed") return "bg-emerald-100 text-emerald-800 border-emerald-200"
    if (["cancelled", "no_show"].includes(status)) return "bg-red-100 text-red-800 border-red-200"
    return "bg-amber-100 text-amber-800 border-amber-200"
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-100px)]">
      {/* Left panel: Solicitudes de trabajo */}
      <div className="w-[340px] shrink-0 flex flex-col gap-6">
        {/* Solicitudes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-foreground">
              {isEs ? "Solicitudes de trabajo" : "Work requests"}
            </h2>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="rounded-full text-xs bg-primary text-primary-foreground">
                {pendingCount}
              </Badge>
            )}
          </div>
          {loading ? (
            <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
          ) : pendingCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              🔥{isEs ? "¡Pronto recibirás nuevas citas!" : "You'll receive new appointments soon!"}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {pendingCount} {isEs ? "citas pendientes" : "pending appointments"}
            </p>
          )}
        </div>

        {/* Últimas órdenes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">
              {isEs ? "Últimas órdenes" : "Latest orders"}
            </h2>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigate("/ordenes")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isEs ? "Crea tu primera orden de trabajo" : "Create your first work order"}
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
              {bookings.slice(0, 8).map(b => (
                <button
                  key={b.id}
                  onClick={() => navigate(`/ordenes/${b.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.service_name}</p>
                    {b.scheduled_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(b.scheduled_at), "d MMM, HH:mm", { locale })}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={statusColor(b.status)}>
                    {b.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateDate("today")}>
              {isEs ? "Hoy" : "Today"}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate("prevFar")}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate("nextFar")}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-base font-semibold text-foreground capitalize">{dateLabel}</p>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5">
            {(["day", "week", "month"] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setCalendarView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  calendarView === v
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {v === "day" ? (isEs ? "Día" : "Day") : v === "week" ? (isEs ? "Semana" : "Week") : (isEs ? "Mes" : "Month")}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar body */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card scrollbar-thin">
          {calendarView === "day" && (
            <DayView
              date={currentDate}
              events={eventsForDate(currentDate)}
              getEventHour={getEventHour}
              statusColor={statusColor}
              onEventClick={(id) => navigate(`/ordenes/${id}`)}
            />
          )}
          {calendarView === "week" && (
            <WeekView
              date={currentDate}
              bookings={bookings}
              locale={locale}
              statusColor={statusColor}
              onEventClick={(id) => navigate(`/ordenes/${id}`)}
            />
          )}
          {calendarView === "month" && (
            <MonthView
              date={currentDate}
              bookings={bookings}
              locale={locale}
              currentDate={currentDate}
              statusColor={statusColor}
              onEventClick={(id) => navigate(`/ordenes/${id}`)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Day View ---------- */
function DayView({
  date, events, getEventHour, statusColor, onEventClick
}: {
  date: Date
  events: BookingEvent[]
  getEventHour: (e: BookingEvent) => number | null
  statusColor: (s: string) => string
  onEventClick: (id: string) => void
}) {
  return (
    <div className="divide-y divide-border">
      {HOURS.map(hour => {
        const hourEvents = events.filter(e => getEventHour(e) === hour)
        return (
          <div key={hour} className="flex min-h-[52px]">
            <div className="w-16 shrink-0 py-2 pr-3 text-right text-sm text-muted-foreground">
              {`${hour}:00`}
            </div>
            <div className="flex-1 border-l border-border py-1 px-2">
              {hourEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev.id)}
                  className={cn(
                    "mb-1 w-full rounded px-2 py-1 text-left text-xs font-medium border",
                    statusColor(ev.status)
                  )}
                >
                  {ev.service_name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Week View ---------- */
function WeekView({
  date, bookings, locale, statusColor, onEventClick
}: {
  date: Date
  bookings: BookingEvent[]
  locale: Locale
  statusColor: (s: string) => string
  onEventClick: (id: string) => void
}) {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end: endOfWeek(date, { weekStartsOn: 1 }) })

  return (
    <div className="grid grid-cols-7 divide-x divide-border">
      {days.map(day => {
        const dayEvents = bookings.filter(b => b.scheduled_at && isSameDay(new Date(b.scheduled_at), day))
        const isToday = isSameDay(day, new Date())
        return (
          <div key={day.toISOString()} className="min-h-[400px]">
            <div className={cn(
              "sticky top-0 border-b border-border bg-muted/50 px-2 py-2 text-center text-xs font-medium",
              isToday && "bg-primary/10 text-primary"
            )}>
              <div className="capitalize">{format(day, "EEE", { locale })}</div>
              <div className={cn("text-lg font-bold", isToday && "text-primary")}>{format(day, "d")}</div>
            </div>
            <div className="p-1 space-y-1">
              {dayEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev.id)}
                  className={cn(
                    "w-full rounded px-1.5 py-1 text-left text-[10px] font-medium border truncate",
                    statusColor(ev.status)
                  )}
                >
                  {ev.scheduled_at && format(new Date(ev.scheduled_at), "HH:mm")} {ev.service_name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Month View ---------- */
function MonthView({
  date, bookings, locale, currentDate, statusColor, onEventClick
}: {
  date: Date
  bookings: BookingEvent[]
  locale: Locale
  currentDate: Date
  statusColor: (s: string) => string
  onEventClick: (id: string) => void
}) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd })
  const dayNames = eachDayOfInterval({ start: calStart, end: addDays(calStart, 6) })

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map(d => (
          <div key={d.toISOString()} className="py-2 text-center text-xs font-medium text-muted-foreground capitalize">
            {format(d, "EEE", { locale })}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-border">
        {allDays.map(day => {
          const isCurrentMonth = day.getMonth() === date.getMonth()
          const isToday = isSameDay(day, new Date())
          const dayEvents = bookings.filter(b => b.scheduled_at && isSameDay(new Date(b.scheduled_at), day))
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[80px] border-b border-border p-1",
                !isCurrentMonth && "bg-muted/30"
              )}
            >
              <div className={cn(
                "mb-1 text-xs font-medium",
                isToday ? "text-primary font-bold" : !isCurrentMonth ? "text-muted-foreground/50" : "text-foreground"
              )}>
                {format(day, "d")}
              </div>
              {dayEvents.slice(0, 2).map(ev => (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev.id)}
                  className={cn(
                    "mb-0.5 w-full rounded px-1 py-0.5 text-left text-[9px] font-medium border truncate",
                    statusColor(ev.status)
                  )}
                >
                  {ev.service_name}
                </button>
              ))}
              {dayEvents.length > 2 && (
                <p className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 2}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
