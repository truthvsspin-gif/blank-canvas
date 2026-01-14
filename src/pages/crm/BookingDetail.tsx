import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useParams } from "react-router-dom"
import { ArrowLeft, Loader2, Save } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { Booking, Customer, Service, Vehicle } from "@/types/crm"
import { NotesPanel } from "@/components/crm/notes-panel"
import { useLanguage } from "@/components/providers/language-provider"

const statusOptions = [
  { value: "new", labelEs: "Nuevo", labelEn: "New" },
  { value: "confirmed", labelEs: "Confirmado", labelEn: "Confirmed" },
  { value: "completed", labelEs: "Completado", labelEn: "Completed" },
  { value: "cancelled", labelEs: "Cancelado", labelEn: "Cancelled" },
]

const sourceOptions = [
  { value: "manual", labelEs: "Manual", labelEn: "Manual" },
  { value: "chatbot", labelEs: "Chatbot", labelEn: "Chatbot" },
  { value: "reservation-page", labelEs: "Pagina de reserva", labelEn: "Reservation page" },
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

  const copy = isEs
    ? {
        title: "Detalle de booking",
        back: "Volver",
        loading: "Cargando booking...",
        notFound: "No se encontro el booking.",
        cardTitle: "Editar booking",
        cardDesc: "Actualiza estado, fecha, precio, vehiculo o servicio.",
        customer: "Cliente",
        vehicle: "Vehiculo",
        service: "Servicio",
        price: "Precio",
        date: "Fecha y hora",
        status: "Estado",
        source: "Origen",
        selectCustomer: "Selecciona cliente",
        selectVehicle: "Selecciona vehiculo",
        vehicleNone: "Sin vehiculos disponibles",
        selectService: "Selecciona servicio",
        save: "Guardar cambios",
        invalidId: "ID de booking invalida.",
      }
    : {
        title: "Booking detail",
        back: "Back",
        loading: "Loading booking...",
        notFound: "Booking not found.",
        cardTitle: "Edit booking",
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
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={`ID: ${id || "N/A"}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/crm/bookings">
              <ArrowLeft className="mr-2 size-4" />
              {copy.back}
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <Loader2 className="size-4 animate-spin" />
          {copy.loading}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Error: {error}</div>
      ) : !booking ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          {copy.notFound}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{copy.cardTitle}</CardTitle>
            <CardDescription>{copy.cardDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSave}>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.customer}
                <select
                  name="customer_id"
                  defaultValue={booking.customer_id ?? ""}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  <option value="" disabled>
                    {copy.selectCustomer}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.vehicle}
                <select
                  name="vehicle_id"
                  defaultValue={booking.vehicle_id ?? ""}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  disabled={!selectedCustomerId || vehicles.length === 0}
                >
                  <option value="">
                    {vehicles.length === 0 ? copy.vehicleNone : copy.selectVehicle}
                  </option>
                  {vehicles.map((vehicle) => {
                    const label = [vehicle.brand, vehicle.model, vehicle.license_plate]
                      .filter(Boolean)
                      .join(" ")
                    return (
                      <option key={vehicle.id} value={vehicle.id}>
                        {label || vehicle.id}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.service}
                <select
                  name="service_name"
                  defaultValue={booking.service_name}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  <option value="" disabled>
                    {copy.selectService}
                  </option>
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.price}
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={booking.price ?? ""}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.date}
                <input
                  name="scheduled_at"
                  type="datetime-local"
                  defaultValue={toLocalInputValue(booking.scheduled_at)}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.status}
                <select
                  name="status"
                  defaultValue={booking.status}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  {statusOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {isEs ? s.labelEs : s.labelEn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.source}
                <select
                  name="source"
                  defaultValue={booking.source ?? "manual"}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  {sourceOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {isEs ? s.labelEs : s.labelEn}
                    </option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end">
                <Button className="bg-rose-600 text-white hover:bg-rose-500" type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                  {copy.save}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {booking ? <NotesPanel entityId={booking.id} entityType="booking" /> : null}
    </div>
  )
}

