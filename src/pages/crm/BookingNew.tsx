import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
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
import { Booking, Customer, Service, Vehicle } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import {
  BOOKING_SOURCE_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  createWorkOrderNo,
  normalizeBookingStatus,
  requiresWorkOrder,
} from "@/lib/crm-bookings"
import { ensureWorkOrderForBooking } from "@/lib/work-orders"
import { logCrmAudit } from "@/lib/crm-audit"
import { CrmGettingStarted } from "@/components/crm/crm-getting-started"

type LeadOption = {
  id: string
  name: string | null
  source: string | null
  stage: string | null
  customer_id: string | null
  conversation_id: string | null
  email: string | null
  phone: string | null
  qualification_reason: string | null
}

type ConversationSnapshot = {
  vehicle_info: Record<string, unknown> | null
  recommendation_summary: string | null
  scheduled_day: string | null
  scheduled_time: string | null
  scheduled_hour: number | null
  scheduled_minute: number | null
}

type StaffOption = {
  user_id: string
  role: string
  users:
    | {
        full_name: string | null
        email: string | null
      }
    | Array<{
        full_name: string | null
        email: string | null
      }>
    | null
}

export default function NewBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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
  const [selectedVehicleId, setSelectedVehicleId] = useState("")
  const [serviceNameDraft, setServiceNameDraft] = useState("")
  const [priceDraft, setPriceDraft] = useState("")
  const [selectedLeadId, setSelectedLeadId] = useState("")
  const [statusDraft, setStatusDraft] = useState("requested")
  const [sourceDraft, setSourceDraft] = useState("manual")
  const [scheduledAtDraft, setScheduledAtDraft] = useState("")
  const [pendingVehicleHint, setPendingVehicleHint] = useState<Record<string, unknown> | null>(null)
  const [scheduleConflicts, setScheduleConflicts] = useState<Booking[]>([])

  const [vehiclesLoading, setVehiclesLoading] = useState(false)
  const [vehiclesError, setVehiclesError] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leadHydrating, setLeadHydrating] = useState(false)

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
        leadSyncing: "Cargando datos del lead...",
        unassigned: "Sin asignar",
        me: "Yo",
        save: "Crear Reserva",
        scheduleConflictTitle: "Conflicto de agenda detectado",
        scheduleConflictEmpty: "No hay conflictos para este horario.",
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
        leadSyncing: "Loading lead context...",
        unassigned: "Unassigned",
        me: "Me",
        save: "Create Booking",
        scheduleConflictTitle: "Schedule conflict detected",
        scheduleConflictEmpty: "No conflicts for this time.",
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

  const toLocalInputValue = (value: Date | string) => {
    const date = typeof value === "string" ? new Date(value) : value
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
    const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]))
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
  }

  const nextDateFromWeekday = (weekday: string) => {
    const mapping: Record<string, number> = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0,
    }
    const target = mapping[weekday.toLowerCase()]
    if (target === undefined) return null
    const now = new Date()
    const current = now.getDay()
    let delta = target - current
    if (delta <= 0) delta += 7
    const next = new Date(now)
    next.setDate(now.getDate() + delta)
    return next
  }

  const getSchedulePrefill = (snapshot: ConversationSnapshot) => {
    if (!snapshot.scheduled_day) return ""
    const date = nextDateFromWeekday(snapshot.scheduled_day)
    if (!date) return ""
    const hour =
      typeof snapshot.scheduled_hour === "number"
        ? Math.max(0, Math.min(23, snapshot.scheduled_hour))
        : snapshot.scheduled_time === "afternoon"
        ? 14
        : 10
    const minute =
      typeof snapshot.scheduled_minute === "number"
        ? Math.max(0, Math.min(59, snapshot.scheduled_minute))
        : 0
    date.setHours(hour, minute, 0, 0)
    return toLocalInputValue(date)
  }

  const findServiceFromText = (text: string | null) => {
    const value = (text || "").toLowerCase().trim()
    if (!value) return null
    return services.find((service) => value.includes(service.name.toLowerCase())) || null
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
            .select("id, name, source, stage, customer_id, conversation_id, email, phone, qualification_reason")
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
        setSelectedVehicleId("")
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
        setSelectedVehicleId("")
      } else {
        const rows = (data as Vehicle[]) || []
        setVehicles(rows)
        if (rows.length === 0) {
          setSelectedVehicleId("")
          setPendingVehicleHint(null)
          return
        }

        if (pendingVehicleHint) {
          const hintBrand = String(pendingVehicleHint.brand || "").toLowerCase().trim()
          const hintModel = String(pendingVehicleHint.model || "").toLowerCase().trim()
          const match = rows.find((vehicle) => {
            const brand = (vehicle.brand || "").toLowerCase()
            const model = (vehicle.model || "").toLowerCase()
            if (hintBrand && hintModel) return brand.includes(hintBrand) && model.includes(hintModel)
            if (hintBrand) return brand.includes(hintBrand)
            if (hintModel) return model.includes(hintModel)
            return false
          })
          if (match) {
            setSelectedVehicleId(match.id)
          } else if (rows.length === 1) {
            setSelectedVehicleId(rows[0].id)
          } else {
            setSelectedVehicleId("")
          }
          setPendingVehicleHint(null)
        } else if (selectedVehicleId && !rows.some((vehicle) => vehicle.id === selectedVehicleId)) {
          setSelectedVehicleId("")
        } else if (!selectedVehicleId && rows.length === 1) {
          setSelectedVehicleId(rows[0].id)
        }
      }

      setVehiclesLoading(false)
    }

    fetchVehicles()
  }, [businessId, pendingVehicleHint, selectedCustomerId, selectedVehicleId])

  useEffect(() => {
    const findScheduleConflicts = async () => {
      if (!businessId || !selectedCustomerId || !scheduledAtDraft) {
        setScheduleConflicts([])
        return
      }

      const utc = toUtcISOString(scheduledAtDraft)
      if (!utc) {
        setScheduleConflicts([])
        return
      }

      const selectedAt = new Date(utc)
      const from = new Date(selectedAt.getTime() - 60 * 60 * 1000).toISOString()
      const to = new Date(selectedAt.getTime() + 60 * 60 * 1000).toISOString()

      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_id", selectedCustomerId)
        .gte("scheduled_at", from)
        .lte("scheduled_at", to)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(5)

      setScheduleConflicts((data as Booking[]) || [])
    }

    findScheduleConflicts()
  }, [businessId, selectedCustomerId, scheduledAtDraft])

  const handleServiceChange = (serviceName: string, options?: { forcePrice?: boolean }) => {
    setServiceNameDraft(serviceName)
    const service = services.find((s) => s.name === serviceName) || null
    if (service?.base_price != null) {
      setPriceDraft(String(service.base_price))
    } else if (!service && options?.forcePrice) {
      setPriceDraft("")
    }
  }

  const getStaffLabel = (staff: StaffOption) => {
    const user = Array.isArray(staff.users) ? staff.users[0] : staff.users
    return user?.full_name || user?.email || staff.user_id
  }

  const handleLeadChange = async (leadId: string) => {
    setSelectedLeadId(leadId)
    if (!leadId || !businessId) return

    const lead = leads.find((item) => item.id === leadId)
    if (!lead) return

    setLeadHydrating(true)
    if (lead?.source && BOOKING_SOURCE_OPTIONS.some((option) => option.value === lead.source)) {
      setSourceDraft(lead.source)
    } else {
      setSourceDraft("chatbot")
    }

    try {
      let matchedCustomerId = lead.customer_id || null
      if (!matchedCustomerId && lead.email) {
        const { data } = await supabase
          .from("customers")
          .select("id")
          .eq("business_id", businessId)
          .eq("email", lead.email)
          .maybeSingle()
        matchedCustomerId = data?.id || null
      }
      if (!matchedCustomerId && lead.phone) {
        const { data } = await supabase
          .from("customers")
          .select("id")
          .eq("business_id", businessId)
          .eq("phone", lead.phone)
          .maybeSingle()
        matchedCustomerId = data?.id || null
      }
      if (matchedCustomerId) {
        setSelectedCustomerId(matchedCustomerId)
      }

      if (lead.conversation_id) {
        const { data: snapshotData } = await supabase
          .from("conversations")
          .select("vehicle_info, recommendation_summary, scheduled_day, scheduled_time, scheduled_hour, scheduled_minute")
          .eq("business_id", businessId)
          .eq("conversation_id", lead.conversation_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (snapshotData) {
          const snapshot = snapshotData as ConversationSnapshot
          const matchedService =
            findServiceFromText(snapshot.recommendation_summary) ||
            findServiceFromText(lead.qualification_reason)
          if (matchedService) {
            handleServiceChange(matchedService.name, { forcePrice: true })
          }

          const localSlot = getSchedulePrefill(snapshot)
          if (localSlot) {
            setScheduledAtDraft(localSlot)
          }

          if (snapshot.vehicle_info && typeof snapshot.vehicle_info === "object") {
            setPendingVehicleHint(snapshot.vehicle_info)
          }
        }
      }
    } finally {
      setLeadHydrating(false)
    }
  }

  useEffect(() => {
    const leadIdFromQuery = searchParams.get("leadId")
    if (!leadIdFromQuery || leads.length === 0 || selectedLeadId === leadIdFromQuery) return
    void handleLeadChange(leadIdFromQuery)
  }, [leads, searchParams, selectedLeadId])

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
      validation_status: normalizedStatus === "confirmed" || normalizedStatus === "in_progress" || normalizedStatus === "completed" ? "approved" : "pending",
      validated_by:
        normalizedStatus === "confirmed" || normalizedStatus === "in_progress" || normalizedStatus === "completed"
          ? user?.id || null
          : null,
      validated_at:
        normalizedStatus === "confirmed" || normalizedStatus === "in_progress" || normalizedStatus === "completed"
          ? new Date().toISOString()
          : null,
    }

    const { data, error: insertError } = await supabase.from("bookings").insert(payload).select("id").single()

    if (insertError) {
      setLoading(false)
      setError(insertError.message)
      return
    }

    if (data?.id && requiresWorkOrder(normalizedStatus)) {
      const { data: updatedBooking } = await supabase
        .from("bookings")
        .update({ work_order_no: createWorkOrderNo(data.id) })
        .eq("business_id", businessId)
        .eq("id", data.id)
        .select("*")
        .single()
      if (updatedBooking) {
        try {
          await ensureWorkOrderForBooking(supabase, updatedBooking as Booking)
          await logCrmAudit(supabase, {
            businessId,
            actorUserId: user?.id || null,
            entityType: "work_order",
            entityId: (updatedBooking as Booking).id,
            action: "auto_created_from_booking",
            details: { source: "booking_new" },
          })
        } catch (workOrderError) {
          console.error("Failed to create work order", workOrderError)
        }
      }
    }

    if (data?.id) {
      await logCrmAudit(supabase, {
        businessId,
        actorUserId: user?.id || null,
        entityType: "booking",
        entityId: data.id,
        action: "created",
        details: {
          status: normalizedStatus,
          source: payload.source,
          lead_id: payload.lead_id,
        },
      })
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

      <CrmGettingStarted
        titleEs="¿Cómo crear una Reserva?"
        titleEn="How to create a Booking?"
        storageKey="crm-tips-booking-new"
        steps={[
          { emoji: "👤", textEs: "Selecciona un cliente en el campo 'Cliente'.", textEn: "Select a customer in the 'Customer' field." },
          { emoji: "🚗", textEs: "Elige un vehículo (se cargará automáticamente si existe).", textEn: "Choose a vehicle (it will auto-load if it exists)." },
          { emoji: "🔧", textEs: "Selecciona servicio y precio en la sección 'Servicio y Precio'.", textEn: "Select service and price in the 'Service & Pricing' section." },
          { emoji: "📅", textEs: "Establece fecha, hora y estado para completar la reserva.", textEn: "Set date, time, and status to complete the booking." },
        ]}
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
                    value={selectedCustomerId}
                    onChange={(event) => {
                      setSelectedCustomerId(event.target.value)
                      setSelectedVehicleId("")
                    }}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
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
                    value={selectedVehicleId}
                    onChange={(event) => setSelectedVehicleId(event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    value={serviceNameDraft}
                    onChange={(event) => handleServiceChange(event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
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
                    value={priceDraft}
                    onChange={(event) => setPriceDraft(event.target.value)}
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
                    value={scheduledAtDraft}
                    onChange={(event) => setScheduledAtDraft(event.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2">
                    <p className="text-xs font-medium text-amber-800">{copy.scheduleConflictTitle}</p>
                    {scheduleConflicts.length === 0 ? (
                      <p className="text-xs text-amber-700">{copy.scheduleConflictEmpty}</p>
                    ) : (
                      <div className="mt-1 space-y-1">
                        {scheduleConflicts.map((entry) => (
                          <Link key={entry.id} to={`/crm/bookings/${entry.id}`} className="block text-xs text-amber-800 hover:underline">
                            {entry.service_name} - {entry.scheduled_at ? new Date(entry.scheduled_at).toLocaleString() : "No date"}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
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
                          checked={statusDraft === statusOption.value}
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
                    value={selectedLeadId}
                    onChange={(event) => {
                      void handleLeadChange(event.target.value)
                    }}
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
                  {leadHydrating && (
                    <p className="text-xs text-muted-foreground">{copy.leadSyncing}</p>
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
                          {getStaffLabel(staff)} ({staff.role})
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
