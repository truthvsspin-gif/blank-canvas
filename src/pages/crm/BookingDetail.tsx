import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CalendarDays, Car, Clock, DollarSign, Loader2, Save, User, Wrench, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { Booking, Customer, Service, Vehicle } from "@/types/crm"
import { NotesPanel } from "@/components/crm/notes-panel"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

const statusOptions = [
  { value: "new", labelEs: "Nuevo", labelEn: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "pending", labelEs: "Pendiente", labelEn: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "confirmed", labelEs: "Confirmado", labelEn: "Confirmed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "completed", labelEs: "Completado", labelEn: "Completed", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "cancelled", labelEs: "Cancelado", labelEn: "Cancelled", color: "bg-rose-100 text-rose-700 border-rose-200" },
]

const sourceOptions = [
  { value: "manual", labelEs: "Manual", labelEn: "Manual" },
  { value: "chatbot", labelEs: "Chatbot", labelEn: "Chatbot" },
  { value: "reservation-page", labelEs: "Página de reserva", labelEn: "Reservation page" },
]

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { businessId } = useCurrentBusiness()
  const { user } = useAuth()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const timeZone =
    typeof user?.user_metadata?.timezone === "string" && user.user_metadata.timezone.length > 0
      ? user.user_metadata.timezone
      : "Europe/Madrid"
  const [booking, setBooking] = useState<Booking | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const copy = isEs
    ? {
        title: "Detalle de Reserva",
        back: "Volver a reservas",
        loading: "Cargando...",
        notFound: "No se encontró la reserva.",
        cardTitle: "Información de la Reserva",
        cardDesc: "Actualiza estado, fecha, precio, vehículo o servicio.",
        customer: "Cliente",
        vehicle: "Vehículo",
        service: "Servicio",
        price: "Precio",
        date: "Fecha y hora",
        status: "Estado",
        source: "Origen",
        selectCustomer: "Selecciona cliente",
        selectVehicle: "Selecciona vehículo",
        vehicleNone: "Sin vehículos disponibles",
        selectService: "Selecciona servicio",
        save: "Guardar cambios",
        invalidId: "ID de reserva inválida.",
        success: "Cambios guardados correctamente.",
        delete: "Eliminar",
        deleteTitle: "¿Eliminar reserva?",
        deleteDesc: "Esta acción no se puede deshacer.",
        cancelDelete: "Cancelar",
        confirm: "Eliminar",
        customerSection: "Información del Cliente",
        serviceSection: "Servicio y Precio",
        scheduleSection: "Programación",
        createdAt: "Creada el",
      }
    : {
        title: "Booking Details",
        back: "Back to bookings",
        loading: "Loading...",
        notFound: "Booking not found.",
        cardTitle: "Booking Information",
        cardDesc: "Update status, date, price, vehicle, or service.",
        customer: "Customer",
        vehicle: "Vehicle",
        service: "Service",
        price: "Price",
        date: "Date and time",
        status: "Status",
        source: "Source",
        selectCustomer: "Select customer",
        selectVehicle: "Select vehicle",
        vehicleNone: "No vehicles available",
        selectService: "Select service",
        save: "Save changes",
        invalidId: "Invalid booking ID.",
        success: "Changes saved successfully.",
        delete: "Delete",
        deleteTitle: "Delete booking?",
        deleteDesc: "This action cannot be undone.",
        cancelDelete: "Cancel",
        confirm: "Delete",
        customerSection: "Customer Information",
        serviceSection: "Service & Pricing",
        scheduleSection: "Scheduling",
        createdAt: "Created on",
      }

  const isUuid = (value: string) => /^[0-9a-fA-F-]{36}$/.test(value)

  const getTimeZoneOffsetMinutes = (date: Date, tz: string) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]))
    const asUtc = Date.UTC(
      Number(lookup.year),
      Number(lookup.month) - 1,
      Number(lookup.day),
      Number(lookup.hour),
      Number(lookup.minute),
      Number(lookup.second)
    )
    return (asUtc - date.getTime()) / 60000
  }

  const toUtcISOString = (localValue: string) => {
    const [datePart, timePart] = localValue.split("T")
    if (!datePart || !timePart) return null
    const [year, month, day] = datePart.split("-").map(Number)
    const [hour, minute] = timePart.split(":").map(Number)
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
    const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone)
    const adjusted = new Date(utcGuess.getTime() - offsetMinutes * 60000)
    return adjusted.toISOString()
  }

  const toLocalInputValue = (value: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]))
    return `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}`
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat(isEs ? "es-ES" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date))
  }

  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      if (!id || !isUuid(id)) {
        setError(copy.invalidId)
        setBooking(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      const [{ data: bookingData, error: bookingErr }] = await Promise.all([
        supabase.from("bookings").select("*").eq("business_id", businessId).eq("id", id).single(),
      ])
      const [{ data: custData }, { data: servData }] = await Promise.all([
        supabase.from("customers").select("id, full_name").eq("business_id", businessId),
        supabase.from("services").select("*").eq("business_id", businessId),
      ])
      if (bookingErr) {
        setError(bookingErr.message)
        setBooking(null)
      } else {
        setBooking(bookingData as Booking)
        setSelectedCustomerId((bookingData as Booking).customer_id ?? "")
      }
      setCustomers((custData as Customer[]) || [])
      setServices((servData as Service[]) || [])
      setLoading(false)
    }
    fetchData()
  }, [businessId, copy.invalidId, id])

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!businessId || !selectedCustomerId) {
        setVehicles([])
        return
      }
      const { data, error: vehiclesErr } = await supabase
        .from("vehicles")
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_id", selectedCustomerId)
        .order("created_at", { ascending: false })
      if (vehiclesErr) {
        setVehicles([])
      } else {
        setVehicles((data as Vehicle[]) || [])
      }
    }
    fetchVehicles()
  }, [businessId, selectedCustomerId])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!businessId || !booking) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    const form = new FormData(e.currentTarget)
    const payload = {
      service_name: (form.get("service_name") as string) || booking.service_name,
      status: (form.get("status") as string) || booking.status,
      price: form.get("price") ? Number(form.get("price")) : booking.price,
      scheduled_at: (() => {
        const localValue = (form.get("scheduled_at") as string) || ""
        if (!localValue) return booking.scheduled_at
        return toUtcISOString(localValue) ?? booking.scheduled_at
      })(),
      source: (form.get("source") as string) || booking.source,
      customer_id: (form.get("customer_id") as string) || booking.customer_id,
      vehicle_id: (form.get("vehicle_id") as string) || booking.vehicle_id,
    }
    const { data, error: err } = await supabase
      .from("bookings")
      .update(payload)
      .eq("business_id", businessId)
      .eq("id", booking.id)
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setBooking(data as Booking)
      setSuccess(true)
    }
  }

  const handleDelete = async () => {
    if (!businessId || !booking) return
    setDeleting(true)
    const { error: err } = await supabase
      .from("bookings")
      .delete()
      .eq("business_id", businessId)
      .eq("id", booking.id)
    setDeleting(false)
    if (err) {
      setError(err.message)
    } else {
      window.location.href = "/crm/bookings"
    }
  }

  const getStatusConfig = (value: string) => {
    return statusOptions.find((s) => s.value === value) || statusOptions[0]
  }

  const currentCustomer = customers.find((c) => c.id === booking?.customer_id)
  const statusConfig = booking ? getStatusConfig(booking.status) : statusOptions[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>{copy.loading}</span>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={copy.title}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/bookings">
                <ArrowLeft className="mr-2 size-4" />
                {copy.back}
              </Link>
            </Button>
          }
        />
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error || copy.notFound}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="border-slate-200">
              <Link to="/crm/bookings">
                <ArrowLeft className="mr-2 size-4" />
                {copy.back}
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 size-4" />
              {copy.delete}
            </Button>
          </div>
        }
      />

      {/* Booking Header Card */}
      <Card className="shadow-lg shadow-black/5 border-0 bg-gradient-to-r from-rose-50 via-white to-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-500/30">
              <CalendarDays className="h-10 w-10" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{booking.service_name}</h2>
                <Badge variant="outline" className={cn("text-sm", statusConfig.color)}>
                  {isEs ? statusConfig.labelEs : statusConfig.labelEn}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {currentCustomer && (
                  <Link to={`/crm/customers/${currentCustomer.id}`} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <User className="h-4 w-4" />
                    {currentCustomer.full_name}
                  </Link>
                )}
                {booking.scheduled_at && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatDate(booking.scheduled_at)}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {copy.createdAt} {formatDate(booking.created_at)}
                </div>
              </div>
            </div>
            {booking.price != null && (
              <div className="flex flex-col items-center gap-1 rounded-xl bg-rose-100 px-6 py-4">
                <span className="text-3xl font-bold text-rose-700">${booking.price.toFixed(2)}</span>
                <span className="text-xs text-rose-600">{copy.price}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg shadow-black/5 border-0 bg-card overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                  <Wrench className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{copy.cardTitle}</CardTitle>
                  <CardDescription>{copy.cardDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {error && (
                <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  Error: {error}
                </div>
              )}
              {success && (
                <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {copy.success}
                </div>
              )}

              <form className="space-y-8" onSubmit={handleSave}>
                {/* Customer Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <User className="h-4 w-4 text-rose-600" />
                    {copy.customerSection}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{copy.customer}</label>
                      <select
                        name="customer_id"
                        defaultValue={booking.customer_id ?? ""}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      >
                        <option value="" disabled>{copy.selectCustomer}</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Car className="h-3.5 w-3.5 text-muted-foreground" />
                        {copy.vehicle}
                      </label>
                      <select
                        name="vehicle_id"
                        defaultValue={booking.vehicle_id ?? ""}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all disabled:opacity-50"
                        disabled={!selectedCustomerId || vehicles.length === 0}
                      >
                        <option value="">{vehicles.length === 0 ? copy.vehicleNone : copy.selectVehicle}</option>
                        {vehicles.map((vehicle) => {
                          const label = [vehicle.brand, vehicle.model, vehicle.license_plate].filter(Boolean).join(" ")
                          return <option key={vehicle.id} value={vehicle.id}>{label || vehicle.id}</option>
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Service Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wrench className="h-4 w-4 text-rose-600" />
                    {copy.serviceSection}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{copy.service}</label>
                      <select
                        name="service_name"
                        defaultValue={booking.service_name}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      >
                        <option value="" disabled>{copy.selectService}</option>
                        {services.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        {copy.price}
                      </label>
                      <input
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={booking.price ?? ""}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Clock className="h-4 w-4 text-rose-600" />
                    {copy.scheduleSection}
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{copy.date}</label>
                      <input
                        name="scheduled_at"
                        type="datetime-local"
                        defaultValue={toLocalInputValue(booking.scheduled_at)}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{copy.status}</label>
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map((s) => (
                          <label key={s.value} className="cursor-pointer">
                            <input
                              type="radio"
                              name="status"
                              value={s.value}
                              defaultChecked={s.value === booking.status}
                              className="peer sr-only"
                            />
                            <span className={cn(
                              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                              "peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-rose-500/50",
                              s.color
                            )}>
                              {isEs ? s.labelEs : s.labelEn}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{copy.source}</label>
                      <select
                        name="source"
                        defaultValue={booking.source ?? "manual"}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      >
                        {sourceOptions.map((s) => (
                          <option key={s.value} value={s.value}>{isEs ? s.labelEs : s.labelEn}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    className="bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-500/20"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                    {copy.save}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Notes */}
        <div>
          <NotesPanel entityId={booking.id} entityType="booking" />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl border">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{copy.deleteTitle}</h2>
                <p className="text-sm text-muted-foreground">{copy.deleteDesc}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                {copy.cancelDelete}
              </Button>
              <Button
                className="bg-rose-600 text-white hover:bg-rose-500"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
                {copy.confirm}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
