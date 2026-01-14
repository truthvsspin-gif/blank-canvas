"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { useRouter } from "next/navigation"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useLanguage } from "@/components/providers/language-provider"

export default function NewCustomerPage() {
  const router = useRouter()
  const { businessId } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const copy = isEs
    ? {
        title: "Nuevo cliente",
        description: "Captura basica de cliente.",
        back: "Volver",
        formTitle: "Formulario",
        formDesc: "Nombre, contacto, vehiculos, tags y notas.",
        errorNoBusiness: "No hay negocio activo para asociar el cliente.",
        success: "Cliente guardado.",
        name: "Nombre completo",
        phone: "Telefono",
        email: "Email",
        vehicle: "Notas de vehiculo",
        vehiclesTitle: "Vehiculo principal",
        vehiclesDesc: "Agrega los datos del primer vehiculo (opcional).",
        vehicleBrand: "Marca",
        vehicleModel: "Modelo",
        vehicleColor: "Color",
        vehiclePlate: "Placa",
        vehicleSize: "Tamano",
        tags: "Tags (separados por coma)",
        notes: "Notas",
        save: "Guardar cliente",
      }
    : {
        title: "New customer",
        description: "Basic customer intake.",
        back: "Back",
        formTitle: "Form",
        formDesc: "Name, contact, vehicles, tags, and notes.",
        errorNoBusiness: "No active business to associate the customer.",
        success: "Customer saved.",
        name: "Full name",
        phone: "Phone",
        email: "Email",
        vehicle: "Vehicle notes",
        vehiclesTitle: "Primary vehicle",
        vehiclesDesc: "Add the first vehicle details (optional).",
        vehicleBrand: "Brand",
        vehicleModel: "Model",
        vehicleColor: "Color",
        vehiclePlate: "License plate",
        vehicleSize: "Size",
        tags: "Tags (comma-separated)",
        notes: "Notes",
        save: "Save customer",
      }

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
      full_name: (form.get("full_name") as string) || "",
      phone: (form.get("phone") as string) || null,
      email: (form.get("email") as string) || null,
      vehicle_info: (form.get("vehicle_info") as string) || null,
      tags: ((form.get("tags") as string) || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: (form.get("notes") as string) || null,
    }

    const { data, error: err } = await supabase
      .from("customers")
      .insert(payload)
      .select("id")
      .single()
    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }

    const vehiclePayload = {
      business_id: businessId,
      customer_id: data?.id ?? "",
      brand: (form.get("vehicle_brand") as string) || null,
      model: (form.get("vehicle_model") as string) || null,
      color: (form.get("vehicle_color") as string) || null,
      license_plate: (form.get("vehicle_plate") as string) || null,
      size: (form.get("vehicle_size") as string) || null,
    }
    const hasVehicle =
      vehiclePayload.brand ||
      vehiclePayload.model ||
      vehiclePayload.color ||
      vehiclePayload.license_plate ||
      vehiclePayload.size

    if (data?.id && hasVehicle) {
      const { error: vehicleError } = await supabase.from("vehicles").insert(vehiclePayload)
      if (vehicleError) {
        setLoading(false)
        setError(vehicleError.message)
        return
      }
    }

    setLoading(false)
    setSuccess(true)
    formEl.reset()
    if (data?.id) {
      router.push(`/crm/customers/${data.id}`)
    } else {
      router.push("/crm/customers")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/crm/customers">
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
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              Error: {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
              {copy.success}
            </div>
          ) : null}
          <form className="space-y-4 text-foreground" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.name}
                <input
                  name="full_name"
                  required
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder={isEs ? "Nombre y apellido" : "First and last name"}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.phone}
                <input
                  name="phone"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="+34 600 000 000"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.email}
                <input
                  name="email"
                  type="email"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="customer@company.com"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.vehicle}
                <input
                  name="vehicle_info"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder={isEs ? "Detalle opcional" : "Optional detail"}
                />
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{copy.vehiclesTitle}</p>
              <p className="text-xs text-slate-600">{copy.vehiclesDesc}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.vehicleBrand}
                <input
                  name="vehicle_brand"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder={isEs ? "Ej: BMW" : "e.g. BMW"}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.vehicleModel}
                <input
                  name="vehicle_model"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder={isEs ? "Ej: X5" : "e.g. X5"}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.vehicleColor}
                <input
                  name="vehicle_color"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder={isEs ? "Negro" : "Black"}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                {copy.vehiclePlate}
                <input
                  name="vehicle_plate"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder={isEs ? "1234-ABC" : "ABC-1234"}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">
                {copy.vehicleSize}
                <input
                  name="vehicle_size"
                  className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder={isEs ? "Compacto, SUV, camioneta" : "Compact, SUV, truck"}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm font-medium">
              {copy.tags}
              <input
                name="tags"
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder={isEs ? "VIP, recurrente, nuevo" : "VIP, recurring, new"}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium">
              {copy.notes}
              <textarea
                name="notes"
                rows={3}
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder={isEs ? "Indicaciones, preferencias, historial." : "Directions, preferences, history."}
              />
            </label>

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
