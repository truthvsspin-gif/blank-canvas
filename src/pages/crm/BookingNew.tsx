import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  CalendarDays,
  Car,
  Clock,
  DollarSign,
  Loader2,
  Save,
  User,
  Wrench,
  Bot,
  UserCheck,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { Customer, Service, Vehicle } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import {
  BOOKING_SOURCE_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  createWorkOrderNo,
  normalizeBookingStatus,
  requiresWorkOrder,
} from "@/lib/crm-bookings"

type LeadOption = {
  id: string
  name: string | null
  source: string | null
  stage: string | null
}

type StaffOption = {
  user_id: string
  role: string
  users: {
    full_name: string | null
    email: string | null
  } | null
}

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
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])

  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [statusDraft, setStatusDraft] = useState("requested")
  const [sourceDraft, setSourceDraft] = useState("manual")

  const [vehiclesLoading, setVehiclesLoading] = useState(false)
  const [vehiclesError, setVehiclesError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === selectedLeadId) || null, [leads, selectedLeadId])

  const copy = isEs
    ? {
        title: "Nueva Reserva",
        description: "Agenda una cita operativa con cliente, vehiculo y estado.",
        back: "Volver a reservas",
        formTitle: "Detalles de la Reserva",
        formDesc: "Confirma cliente, servicio, horario y asignacion.",
        errorNoBusiness: "No hay negocio activo.",
        errorLoad: "Error al cargar datos",
        customer: "Cliente",
        vehicle: "Vehiculo",
        service: "Servicio",
        price: "Precio",
        date: "Fecha y hora",
        status: "Estado",
        source: "Origen",
        lead: "Lead pre-calificado",
        assignedTo: "Asignar a",
        notes: "Notas de confirmacion",
        selectCustomer: "Selecciona un cliente",
        selectVehicle: "Selecciona un vehiculo",
        selectCustomerFirst: "Primero selecciona un cliente",
        vehicleNone: "Sin vehiculos disponibles",
        selectService: "Selecciona un servicio",
        selectLead: "Selecciona un lead (opcional)",
        noLeads: "No hay leads disponibles",
        unassigned: "Sin asignar",
        me: "Yo",
        save: "Crear Reserva",
        customerSection: "Informacion del Cliente",
        serviceSection: "Servicio y Precio",
        scheduleSection: "Programacion",
        operationalSection: "Operacion",
      }
    : {
        title: "New Booking",
        description: "Create an operational appointment with customer, vehicle, and status.",
        back: "Back to bookings",
        formTitle: "Booking Details",
        formDesc: "Confirm customer, service, schedule, and assignment.",
        errorNoBusiness: "No active business.",
        errorLoad: "Failed to load data",
        customer: "Customer",
        vehicle: "Vehicle",
        service: "Service",
        price: "Price",
        date: "Date and time",
        status: "Status",
        source: "Source",
        lead: "Pre-qualified lead",
        assignedTo: "Assign to",
        notes: "Confirmation notes",
        selectCustomer: "Select a customer",
        selectVehicle: "Select a vehicle",
        selectCustomerFirst: "Select a customer first",
        vehicleNone: "No vehicles available",
        selectService: "Select a service",
        selectLead: "Select a lead (optional)",
        noLeads: "No leads available",
        unassigned: "Unassigned",
        me: "Me",
        save: "Create Booking",
        customerSection: "Customer Information",
        serviceSection: "Service & Pricing",
        scheduleSection: "Scheduling",
        operationalSection: "Operations",
      }

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

  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)

      const [{ data: cust, error: custErr }, { data: serv, error: servErr }, { data: leadsData, error: leadsErr }, { data: staffData }] =
        await Promise.all([
          supabase.from("customers").select("*").eq("business_id", businessId).order("full_name", { ascending: true }),
          supabase.from("services").select("*").eq("business_id", businessId).eq("is_active", true).order("name", { ascending: true }),
          supabase
            .from("leads")
            .select("id, name, source, stage")
            .eq("business_id", businessId)
            .in("stage", ["new", "qualified", "proposal", "negotiation"])
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("memberships")
            .select("user_id, role, users(full_name, email)")
            .eq("business_id", businessId)
            .order("created_at", { ascending: true }),
        ])

      if (custErr || servErr || leadsErr) {
        setError(custErr?.message || servErr?.message || leadsErr?.message || copy.errorLoad)
      } else {
        setCustomers((cust as Customer[]) || [])
        setServices((serv as Service[]) || [])
        setLeads((leadsData as LeadOption[]) || [])
        setStaffOptions((staffData as StaffOption[]) || [])
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

  const handleServiceChange = (serviceName: string) => {
    const service = services.find((s) => s.name === serviceName) || null
    setSelectedService(service)
  }

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId)
    const lead = leads.find((item) => item.id === leadId)
    if (lead?.source) {
      setSourceDraft(lead.source)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!businessId) {
      setError(copy.errorNoBusiness)
      return
    }

    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const normalizedStatus = normalizeBookingStatus((form.get("status") as string) || "requested")
    const localValue = (form.get("scheduled_at") as string) || ""

    const payload: Record<string, unknown> = {
      business_id: businessId,
      customer_id: (form.get("customer_id") as string) || null,
      vehicle_id: (form.get("vehicle_id") as string) || null,
      lead_id: (form.get("lead_id") as string) || null,
      assigned_to: (form.get("assigned_to") as string) || null,
      service_name: (form.get("service_name") as string) || "",
      price: form.get("price") ? Number(form.get("price")) : null,
      status: normalizedStatus,
      scheduled_at: localValue ? toUtcISOString(localValue) ?? localValue : null,
      source: (form.get("source") as string) || "manual",
      confirmation_notes: (form.get("confirmation_notes") as string) || null,
    }

    const { data, error: insertError } = await supabase.from("bookings").insert(payload).select("id").single()

    if (insertError) {
      setLoading(false)
      setError(insertError.message)
      return
    }

    if (data?.id && requiresWorkOrder(normalizedStatus)) {
      await supabase
        .from("bookings")
        .update({ work_order_no: createWorkOrderNo(data.id) })
        .eq("business_id", businessId)
        .eq("id", data.id)
    }

    setLoading(false)
    navigate(data?.id ? `/crm/bookings/${data.id}` : "/crm/bookings")
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

          <form className="space-y-8" onSubmit={handleSubmit}>
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
                    onChange={(event) => setSelectedCustomerId(event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {copy.selectCustomer}
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name}
                      </option>
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
                        <option key={vehicle.id} value={vehicle.id}>
                          {label || vehicle.id}
                        </option>
                      )
                    })}
                  </select>
                  {vehiclesError && <span className="text-xs text-destructive">{vehiclesError}</span>}
                </div>
              </div>
            </div>

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
                    onChange={(event) => handleServiceChange(event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {copy.selectService}
                    </option>
                    {services.map((service) => (
                      <option key={service.id} value={service.name}>
                        {service.name}
                      </option>
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

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4 w-4 text-rose-600" />
                {copy.scheduleSection}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                    {BOOKING_STATUS_OPTIONS.map((statusOption) => (
                      <label key={statusOption.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          value={statusOption.value}
                          defaultChecked={statusOption.value === "requested"}
                          className="peer sr-only"
                          onChange={(event) => setStatusDraft(event.target.value)}
                        />
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                            "peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-rose-500/50",
                            statusOption.color
                          )}
                        >
                          {isEs ? statusOption.labelEs : statusOption.labelEn}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserCheck className="h-4 w-4 text-rose-600" />
                {copy.operationalSection}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.lead}
                  </label>
                  <select
                    name="lead_id"
                    defaultValue=""
                    onChange={(event) => handleLeadChange(event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="">{leads.length ? copy.selectLead : copy.noLeads}</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {(lead.name || lead.id.slice(0, 8)) + (lead.stage ? ` (${lead.stage})` : "")}
                      </option>
                    ))}
                  </select>
                  {selectedLead && (
                    <p className="text-xs text-muted-foreground">
                      {isEs ? "Origen sugerido:" : "Suggested source:"} {selectedLead.source || "chatbot"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{copy.source}</label>
                  <select
                    name="source"
                    value={sourceDraft}
                    onChange={(event) => setSourceDraft(event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    {BOOKING_SOURCE_OPTIONS.map((sourceOption) => (
                      <option key={sourceOption.value} value={sourceOption.value}>
                        {isEs ? sourceOption.labelEs : sourceOption.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{copy.assignedTo}</label>
                  <select
                    name="assigned_to"
                    defaultValue={user?.id || ""}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  >
                    <option value="">{copy.unassigned}</option>
                    <option value={user?.id || ""}>{copy.me}</option>
                    {staffOptions
                      .filter((staff) => staff.user_id !== user?.id)
                      .map((staff) => (
                        <option key={staff.user_id} value={staff.user_id}>
                          {staff.users?.full_name || staff.users?.email || staff.user_id} ({staff.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{copy.notes}</label>
                  <input
                    name="confirmation_notes"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    placeholder={isEs ? "Notas internas" : "Internal notes"}
                  />
                </div>
              </div>
              {requiresWorkOrder(statusDraft) && (
                <p className="text-xs text-muted-foreground">
                  {isEs
                    ? "Se generara una orden de trabajo automaticamente al guardar."
                    : "A work order will be generated automatically after saving."}
                </p>
              )}
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
