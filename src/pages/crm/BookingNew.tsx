import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, CalendarDays, Car, Clock, DollarSign, Loader2, Save, User, Wrench } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { Customer, Service, Vehicle } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

const statusOptions = [
  { value: "new", labelEs: "Nuevo", labelEn: "New", color: "bg-blue-100 text-blue-700" },
  { value: "confirmed", labelEs: "Confirmado", labelEn: "Confirmed", color: "bg-emerald-100 text-emerald-700" },
  { value: "completed", labelEs: "Completado", labelEn: "Completed", color: "bg-slate-100 text-slate-700" },
  { value: "cancelled", labelEs: "Cancelado", labelEn: "Cancelled", color: "bg-rose-100 text-rose-700" },
]

const sourceOptions = [
  { value: "manual", labelEs: "Manual", labelEn: "Manual" },
  { value: "chatbot", labelEs: "Chatbot", labelEn: "Chatbot" },
  { value: "reservation-page", labelEs: "Página de reserva", labelEn: "Reservation page" },
]

export default function NewBookingPage() {
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const { user } = useAuth()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const timeZone =
    typeof user?.user_metadata?.timezone === "string" && user.user_metadata.timezone.length > 0
      ? user.user_metadata.timezone
      : "Europe/Madrid"
  const [customers, setCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [vehiclesLoading, setVehiclesLoading] = useState(false)
  const [vehiclesError, setVehiclesError] = useState<string | null>(null)

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
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const copy = isEs
    ? {
        title: "Nueva Reserva",
        description: "Crea una cita ligando cliente, servicio y fecha.",
        back: "Volver a reservas",
        formTitle: "Detalles de la Reserva",
        formDesc: "Completa la información para agendar una nueva cita.",
        errorNoBusiness: "No hay negocio activo.",
        errorLoad: "Error al cargar datos",
        success: "Reserva creada exitosamente.",
        customer: "Cliente",
        vehicle: "Vehículo",
        service: "Servicio",
        price: "Precio",
        date: "Fecha y hora",
        status: "Estado",
        source: "Origen",
        selectCustomer: "Selecciona un cliente",
        selectVehicle: "Selecciona un vehículo",
        selectCustomerFirst: "Primero selecciona un cliente",
        vehicleNone: "Sin vehículos disponibles",
        selectService: "Selecciona un servicio",
        save: "Crear Reserva",
        customerSection: "Información del Cliente",
        serviceSection: "Servicio y Precio",
        scheduleSection: "Programación",
      }
    : {
        title: "New Booking",
        description: "Create an appointment by linking customer, service, and date.",
        back: "Back to bookings",
        formTitle: "Booking Details",
        formDesc: "Complete the information to schedule a new appointment.",
        errorNoBusiness: "No active business.",
        errorLoad: "Failed to load data",
        success: "Booking created successfully.",
        customer: "Customer",
        vehicle: "Vehicle",
        service: "Service",
        price: "Price",
        date: "Date and time",
        status: "Status",
        source: "Source",
        selectCustomer: "Select a customer",
        selectVehicle: "Select a vehicle",
        selectCustomerFirst: "Select a customer first",
        vehicleNone: "No vehicles available",
        selectService: "Select a service",
        save: "Create Booking",
        customerSection: "Customer Information",
        serviceSection: "Service & Pricing",
        scheduleSection: "Scheduling",
      }

  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      const [{ data: cust, error: custErr }, { data: serv, error: servErr }] = await Promise.all([
        supabase.from("customers").select("*").eq("business_id", businessId).order("full_name", { ascending: true }),
        supabase.from("services").select("*").eq("business_id", businessId).eq("is_active", true).order("name", { ascending: true }),
      ])
      if (custErr || servErr) {
        setError(custErr?.message || servErr?.message || copy.errorLoad)
      } else {
        setCustomers((cust as Customer[]) || [])
        setServices((serv as Service[]) || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [businessId, copy.errorLoad])

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!businessId || !selectedCustomerId) {
        setVehicles([])
        return
      }
      setVehiclesLoading(true)
      setVehiclesError(null)
      const { data, error: vehiclesErr } = await supabase
        .from("vehicles")
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_id", selectedCustomerId)
        .order("created_at", { ascending: false })
      if (vehiclesErr) {
        setVehiclesError(vehiclesErr.message)
        setVehicles([])
      } else {
        setVehicles((data as Vehicle[]) || [])
      }
      setVehiclesLoading(false)
    }
    fetchVehicles()
  }, [businessId, selectedCustomerId])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formEl = e.currentTarget
    if (!businessId) {
      setError(copy.errorNoBusiness)
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)

    const form = new FormData(formEl)
    const payload = {
      business_id: businessId,
      customer_id: (form.get("customer_id") as string) || null,
      vehicle_id: (form.get("vehicle_id") as string) || null,
      service_name: (form.get("service_name") as string) || "",
      price: form.get("price") ? Number(form.get("price")) : null,
      status: (form.get("status") as string) || "new",
      scheduled_at: (() => {
        const localValue = (form.get("scheduled_at") as string) || ""
        if (!localValue) return null
        return toUtcISOString(localValue) ?? localValue
      })(),
      source: (form.get("source") as string) || "manual",
    }

    const { data, error: err } = await supabase
      .from("bookings")
      .insert(payload)
      .select("id")
      .single()
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      formEl.reset()
      setSelectedService(null)
      if (data?.id) {
        navigate(`/crm/bookings/${data.id}`)
      } else {
        navigate("/crm/bookings")
      }
    }
  }

  const handleServiceChange = (serviceName: string) => {
    const service = services.find((s) => s.name === serviceName) || null
    setSelectedService(service || null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="outline" size="sm" asChild className="border-slate-200">
            <Link to="/crm/bookings">
              <ArrowLeft className="mr-2 size-4" />
              {copy.back}
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg shadow-black/5 border-0 bg-card overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-rose-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
              <CalendarDays className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{copy.formTitle}</CardTitle>
              <CardDescription>{copy.formDesc}</CardDescription>
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
          
          <form className="space-y-8" onSubmit={handleSubmit}>
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
                    required
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    defaultValue=""
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
                    key={selectedCustomerId || "vehicle"}
                    name="vehicle_id"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    defaultValue=""
                    disabled={!selectedCustomerId || vehiclesLoading || vehicles.length === 0}
                  >
                    <option value="">
                      {!selectedCustomerId
                        ? copy.selectCustomerFirst
                        : vehiclesLoading
                        ? "..."
                        : vehicles.length === 0
                        ? copy.vehicleNone
                        : copy.selectVehicle}
                    </option>
                    {vehicles.map((vehicle) => {
                      const label = [vehicle.brand, vehicle.model, vehicle.license_plate].filter(Boolean).join(" ")
                      return (
                        <option key={vehicle.id} value={vehicle.id}>{label || vehicle.id}</option>
                      )
                    })}
                  </select>
                  {vehiclesError && <span className="text-xs text-destructive">{vehiclesError}</span>}
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
                    required
                    onChange={(e) => handleServiceChange(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    defaultValue=""
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
                    defaultValue={selectedService?.base_price ?? ""}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder="0.00"
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
                          defaultChecked={s.value === "new"}
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
                    defaultValue="manual"
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
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                {copy.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
