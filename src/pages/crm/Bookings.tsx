import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarDays, Clock, DollarSign, Filter, Loader2, Plus, Search, User, Wrench, ChevronLeft, ChevronRight } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { Booking } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

const statusOptions = [
  { value: "new", labelEs: "Nuevo", labelEn: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "pending", labelEs: "Pendiente", labelEn: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "confirmed", labelEs: "Confirmado", labelEn: "Confirmed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "completed", labelEs: "Completado", labelEn: "Completed", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "cancelled", labelEs: "Cancelado", labelEn: "Cancelled", color: "bg-rose-100 text-rose-700 border-rose-200" },
]

export default function BookingsPage() {
  const { businessId } = useCurrentBusiness()
  const { user } = useAuth()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const locale = lang === "es" ? "es-ES" : "en-US"
  const timeZone =
    typeof user?.user_metadata?.timezone === "string" && user.user_metadata.timezone.length > 0
      ? user.user_metadata.timezone
      : "Europe/Madrid"
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [customerMap, setCustomerMap] = useState<Map<string, string>>(new Map())
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const copy = isEs
    ? {
        title: "Reservas",
        description: "Agenda y gestiona citas por cliente y servicio.",
        newBooking: "Nueva reserva",
        cardTitle: "Gestión de Reservas",
        cardDesc: "Filtra por estado, busca y administra tus citas.",
        searchPlaceholder: "Buscar por servicio...",
        allStatuses: "Todos",
        loading: "Cargando reservas...",
        empty: "No hay reservas para mostrar.",
        customer: "Cliente",
        service: "Servicio",
        date: "Fecha",
        status: "Estado",
        price: "Precio",
        source: "Origen",
        actions: "Acciones",
        view: "Ver detalles",
        totalBookings: "reservas en total",
        pageLabel: "Mostrando",
        of: "de",
      }
    : {
        title: "Bookings",
        description: "Schedule and manage appointments by customer and service.",
        newBooking: "New booking",
        cardTitle: "Booking Management",
        cardDesc: "Filter by status, search, and manage your appointments.",
        searchPlaceholder: "Search by service...",
        allStatuses: "All",
        loading: "Loading bookings...",
        empty: "No bookings to display.",
        customer: "Customer",
        service: "Service",
        date: "Date",
        status: "Status",
        price: "Price",
        source: "Source",
        actions: "Actions",
        view: "View details",
        totalBookings: "total bookings",
        pageLabel: "Showing",
        of: "of",
      }

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
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (statusFilter) {
        if (statusFilter === "new") {
          query = query.in("status", ["new", "pending"])
        } else {
          query = query.eq("status", statusFilter)
        }
      }
      const text = search.trim()
      if (text) {
        query = query.ilike("service_name", `%${text}%`)
      }

      const { data, error: err, count } = await query
      if (err) {
        setError(err.message)
        setBookings([])
      } else {
        setBookings((data as Booking[]) || [])
        setTotal(count || 0)
      }
      setLoading(false)
    }
    fetchBookings()
  }, [businessId, statusFilter, search, page])

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!businessId || bookings.length === 0) {
        setCustomerMap(new Map())
        return
      }
      const customerIds = Array.from(
        new Set(bookings.map((booking) => booking.customer_id).filter(Boolean))
      ) as string[]
      if (customerIds.length === 0) {
        setCustomerMap(new Map())
        return
      }
      const { data, error: err } = await supabase
        .from("customers")
        .select("id, full_name")
        .eq("business_id", businessId)
        .in("id", customerIds)
      if (err || !data) {
        setCustomerMap(new Map())
        return
      }
      const mapped = new Map<string, string>()
      data.forEach((customer) => {
        mapped.set(customer.id, customer.full_name ?? "")
      })
      setCustomerMap(mapped)
    }
    fetchCustomers()
  }, [businessId, bookings])

  const getStatusConfig = (value: string) => {
    return statusOptions.find((s) => s.value === value) || statusOptions[0]
  }

  const formatBookingTime = (value: string | null) => {
    if (!value) return "—"
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
      }).format(new Date(value))
    } catch {
      return new Date(value).toLocaleString(locale)
    }
  }

  const hasPrev = page > 1
  const hasNext = page * PAGE_SIZE < total

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button asChild className="bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-500/20">
            <Link to="/crm/bookings/new">
              <Plus className="mr-2 size-4" />
              {copy.newBooking}
            </Link>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-rose-50 to-white border-rose-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                <CalendarDays className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-700">{total}</p>
                <p className="text-xs text-rose-600/70">{copy.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg shadow-black/5 border-0 bg-card">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b bg-muted/30 rounded-t-xl">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{copy.cardTitle}</CardTitle>
            <CardDescription>{copy.cardDesc}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full md:w-56 pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === null ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full transition-all",
                statusFilter === null 
                  ? "bg-slate-900 text-white hover:bg-slate-800" 
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
              onClick={() => {
                setStatusFilter(null)
                setPage(1)
              }}
            >
              <Filter className="mr-1.5 size-3.5" />
              {copy.allStatuses}
            </Button>
            {statusOptions.map((s) => (
              <Button
                key={s.value}
                variant="outline"
                size="sm"
                className={cn(
                  "rounded-full border transition-all",
                  statusFilter === s.value ? s.color : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                onClick={() => {
                  setStatusFilter(statusFilter === s.value ? null : s.value)
                  setPage(1)
                }}
              >
                {isEs ? s.labelEs : s.labelEn}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>{copy.loading}</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Error: {error}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                <CalendarDays className="h-8 w-8 text-rose-600" />
              </div>
              <p className="text-muted-foreground mb-4">{copy.empty}</p>
              <Button asChild variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50">
                <Link to="/crm/bookings/new">
                  <Plus className="mr-2 size-4" />
                  {copy.newBooking}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.customer}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.service}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.date}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.status}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.price}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.source}</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">{copy.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((booking, idx) => {
                      const statusConfig = getStatusConfig(booking.status)
                      const customerName = booking.customer_id ? customerMap.get(booking.customer_id) : null
                      return (
                        <tr 
                          key={booking.id} 
                          className={cn(
                            "hover:bg-muted/50 transition-colors",
                            idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-white font-medium text-sm">
                                {customerName ? customerName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                              </div>
                              <span className="font-medium text-foreground">{customerName || "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-foreground">
                              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                              {booking.service_name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {formatBookingTime(booking.scheduled_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                              {isEs ? statusConfig.labelEs : statusConfig.labelEn}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-foreground font-medium">
                              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                              {booking.price != null ? booking.price.toFixed(2) : "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground capitalize">{booking.source || "manual"}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              asChild 
                              className="text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                            >
                              <Link to={`/crm/bookings/${booking.id}`}>{copy.view}</Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">
                  {copy.pageLabel} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} {copy.of} {total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 py-1 text-sm font-medium bg-background border rounded-lg">
                    {page}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
