"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarDays, Filter, Loader2, Plus, Search } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { Booking } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"

const statusOptions = [
  { value: "new", labelEs: "Nuevo", labelEn: "New" },
  { value: "pending", labelEs: "Pendiente", labelEn: "Pending" },
  { value: "confirmed", labelEs: "Confirmado", labelEn: "Confirmed" },
  { value: "completed", labelEs: "Completado", labelEn: "Completed" },
  { value: "cancelled", labelEs: "Cancelado", labelEn: "Cancelled" },
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

  const copy = isEs
    ? {
        title: "Reservas",
        description: "Agenda y gestiona bookings por cliente y servicio.",
        newBooking: "Nueva reserva",
        cardTitle: "Bookings",
        cardDesc: "Filtra por estado, fecha y servicio.",
        searchPlaceholder: "Buscar por servicio",
        allStatuses: "Todos los estados",
        loading: "Cargando bookings...",
        empty: "No hay bookings para los filtros seleccionados.",
        customer: "Cliente",
        service: "Servicio",
        date: "Fecha",
        status: "Estado",
        price: "Precio",
        source: "Origen",
        actions: "Acciones",
        view: "Ver",
        calendar: "Calendario",
        calendarDesc: "Vista mensual/semanal para agendar.",
        calendarPlaceholder: "Integrar calendario o heatmap de citas.",
      }
    : {
        title: "Bookings",
        description: "Schedule and manage bookings by customer and service.",
        newBooking: "New booking",
        cardTitle: "Bookings",
        cardDesc: "Filter by status, date, and service.",
        searchPlaceholder: "Search by service",
        allStatuses: "All statuses",
        loading: "Loading bookings...",
        empty: "No bookings match the selected filters.",
        customer: "Customer",
        service: "Service",
        date: "Date",
        status: "Status",
        price: "Price",
        source: "Source",
        actions: "Actions",
        view: "View",
        calendar: "Calendar",
        calendarDesc: "Monthly/weekly view to schedule.",
        calendarPlaceholder: "Integrate a calendar or appointment heatmap.",
      }

  useEffect(() => {
    const fetchBookings = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)
      let query = supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })

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

      const { data, error: err } = await query
      if (err) {
        setError(err.message)
        setBookings([])
      } else {
        setBookings((data as Booking[]) || [])
      }
      setLoading(false)
    }
    fetchBookings()
  }, [businessId, statusFilter, search])

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

  const resolveStatusLabel = (value: string) => {
    const match = statusOptions.find((s) => s.value === value)
    if (!match) return value
    return isEs ? match.labelEs : match.labelEn
  }

  const formatBookingTime = (value: string | null) => {
    if (!value) return "N/A"
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button asChild className="bg-rose-600 text-white hover:bg-rose-500">
            <Link href="/crm/bookings/new">
              <Plus className="mr-2 size-4" />
              {copy.newBooking}
            </Link>
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>{copy.cardTitle}</CardTitle>
            <CardDescription>{copy.cardDesc}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-xs md:w-auto">
              <Search className="size-4 text-slate-400" />
              <input
                placeholder={copy.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700"
              onClick={() => setStatusFilter(null)}
            >
              <Filter className="mr-2 size-4" />
              {statusFilter ? `${copy.status}: ${resolveStatusLabel(statusFilter)}` : copy.allStatuses}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((s) => (
              <Button
                key={s.value}
                variant={statusFilter === s.value ? "default" : "outline"}
                size="sm"
                className={statusFilter === s.value ? "bg-slate-900 text-white" : "border-slate-200 text-slate-700"}
                onClick={() => setStatusFilter(statusFilter === s.value ? null : s.value)}
              >
                {isEs ? s.labelEs : s.labelEn}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-slate-700">
              <Loader2 className="size-4 animate-spin" />
              {copy.loading}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Error: {error}</div>
          ) : bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
              {copy.empty}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">{copy.customer}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.service}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.date}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.status}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.price}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.source}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-4 py-3 text-slate-900">
                        {booking.customer_id ? customerMap.get(booking.customer_id) || "—" : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-900">{booking.service_name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatBookingTime(booking.scheduled_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold capitalize text-slate-700">
                          {resolveStatusLabel(booking.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {booking.price != null ? `$${booking.price.toFixed(2)}` : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 capitalize">{booking.source || "manual"}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="text-rose-700 hover:bg-rose-50" asChild>
                          <Link href={`/crm/bookings/${booking.id}`}>{copy.view}</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{copy.calendar}</CardTitle>
          <CardDescription>{copy.calendarDesc}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-sm text-muted-foreground">
          <CalendarDays className="mr-2 size-5 text-slate-500" />
          {copy.calendarPlaceholder}
        </CardContent>
      </Card>
    </div>
  )
}
