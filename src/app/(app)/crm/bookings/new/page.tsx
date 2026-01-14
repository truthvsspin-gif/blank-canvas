"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { useRouter } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { Customer, Service, Vehicle } from "@/types/crm"
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

export default function NewBookingPage() {
  const router = useRouter()
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
        title: "Nueva reserva",
        description: "Crea una cita ligando cliente, servicio y fecha.",
        back: "Volver",
        formTitle: "Formulario",
        formDesc: "Selecciona cliente, vehiculo, servicio, precio y fecha.",
        errorNoBusiness: "No hay negocio activo.",
        errorLoad: "Error al cargar datos",
        success: "Booking creado.",
        customer: "Cliente",
        vehicle: "Vehiculo",
        service: "Servicio",
        price: "Precio",
        date: "Fecha y hora",
        status: "Estado",
        source: "Origen",
        selectCustomer: "Selecciona cliente",
        selectVehicle: "Selecciona vehiculo",
        selectCustomerFirst: "Primero selecciona un cliente",
        vehicleNone: "Sin vehiculos disponibles",
        selectService: "Selecciona servicio",
        save: "Guardar reserva",
      }
    : {
        title: "New booking",
        description: "Create an appointment by linking customer, service, and date.",
        back: "Back",
        formTitle: "Form",
        formDesc: "Select customer, vehicle, service, price, and date.",
        errorNoBusiness: "No active business.",
        errorLoad: "Failed to load data",
        success: "Booking created.",
        customer: "Customer",
        vehicle: "Vehicle",
        service: "Service",
        price: "Price",
        date: "Date and time",
        status: "Status",
        source: "Source",
        selectCustomer: "Select customer",
        selectVehicle: "Select vehicle",
        selectCustomerFirst: "Select a customer first",
        vehicleNone: "No vehicles available",
        selectService: "Select service",
        save: "Save booking",
      }

  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      setLoading(true)
      const [{ data: cust, error: custErr }, { data: serv, error: servErr }] = await Promise.all([
        supabase.from("customers").select("*").eq("business_id", businessId).order("full_name", { ascending: true }),
        supabase.from("services").select("*").eq("business_id", businessId).order("name", { ascending: true }),
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
        router.push(`/crm/bookings/${data.id}`)
      } else {
        router.push("/crm/bookings")
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
          <Button variant="outline" size="sm" asChild>
            <Link href="/crm/bookings">
              <ArrowLeft className="mr-2 size-4" />
              {copy.back}
            </Link>
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{copy.formTitle}</CardTitle>
          <CardDescription>{copy.formDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
              Error: {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
              {copy.success}
            </div>
          ) : null}
          <form className="space-y-4 text-foreground" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.customer}
                <select
                  name="customer_id"
                  required
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  defaultValue=""
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
                  key={selectedCustomerId || "vehicle"}
                  name="vehicle_id"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
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
                {vehiclesError ? (
                  <span className="text-xs text-rose-600">{vehiclesError}</span>
                ) : null}
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.service}
                <select
                  name="service_name"
                  required
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  defaultValue=""
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
                  defaultValue={selectedService?.base_price ?? ""}
                  onChange={() => null}
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="0.00"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.date}
                <input
                  name="scheduled_at"
                  type="datetime-local"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.status}
                <select
                  name="status"
                  defaultValue="new"
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
                  defaultValue="manual"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  {sourceOptions.map((s) => (
                    <option key={s.value} value={s.value}>
                      {isEs ? s.labelEs : s.labelEn}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex justify-end">
              <Button className="bg-rose-600 text-white hover:bg-rose-500" type="submit" disabled={loading}>
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
