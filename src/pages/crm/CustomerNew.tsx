import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, Car, Loader2, Mail, Phone, Save, Tag, User, FileText } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useLanguage } from "@/components/providers/language-provider"

export default function NewCustomerPage() {
  const navigate = useNavigate()
  const { businessId } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const copy = isEs
    ? {
        title: "Nuevo Cliente",
        description: "Agrega un nuevo cliente a tu base de datos.",
        back: "Volver a clientes",
        formTitle: "Información del Cliente",
        formDesc: "Completa los datos básicos del cliente.",
        errorNoBusiness: "No hay negocio activo para asociar el cliente.",
        success: "Cliente guardado exitosamente.",
        name: "Nombre completo",
        phone: "Teléfono",
        email: "Email",
        vehicle: "Notas de vehículo",
        vehiclesTitle: "Vehículo Principal",
        vehiclesDesc: "Agrega los datos del primer vehículo (opcional).",
        vehicleBrand: "Marca",
        vehicleModel: "Modelo",
        vehicleColor: "Color",
        vehiclePlate: "Placa",
        vehicleSize: "Tamaño",
        tags: "Etiquetas",
        tagsHint: "Separadas por coma (ej: VIP, recurrente)",
        notes: "Notas adicionales",
        save: "Guardar Cliente",
        contactSection: "Información de Contacto",
        vehicleSection: "Información del Vehículo",
        additionalSection: "Información Adicional",
      }
    : {
        title: "New Customer",
        description: "Add a new customer to your database.",
        back: "Back to customers",
        formTitle: "Customer Information",
        formDesc: "Complete the basic customer details.",
        errorNoBusiness: "No active business to associate the customer.",
        success: "Customer saved successfully.",
        name: "Full name",
        phone: "Phone",
        email: "Email",
        vehicle: "Vehicle notes",
        vehiclesTitle: "Primary Vehicle",
        vehiclesDesc: "Add the first vehicle details (optional).",
        vehicleBrand: "Brand",
        vehicleModel: "Model",
        vehicleColor: "Color",
        vehiclePlate: "License plate",
        vehicleSize: "Size",
        tags: "Tags",
        tagsHint: "Comma-separated (e.g., VIP, recurring)",
        notes: "Additional notes",
        save: "Save Customer",
        contactSection: "Contact Information",
        vehicleSection: "Vehicle Information",
        additionalSection: "Additional Information",
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
      navigate(`/crm/customers/${data.id}`)
    } else {
      navigate("/crm/customers")
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button variant="outline" size="sm" asChild className="border-slate-200">
            <Link to="/crm/customers">
              <ArrowLeft className="mr-2 size-4" />
              {copy.back}
            </Link>
          </Button>
        }
      />

      <Card className="shadow-lg shadow-black/5 border-0 bg-card overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <User className="h-5 w-5 text-emerald-600" />
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
            {/* Contact Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <User className="h-4 w-4 text-emerald-600" />
                {copy.contactSection}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-foreground">{copy.name}</label>
                  <input
                    name="full_name"
                    required
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder={isEs ? "Nombre y apellido" : "First and last name"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.phone}
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.email}
                  </label>
                  <input
                    name="email"
                    type="email"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder="customer@company.com"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Car className="h-4 w-4 text-emerald-600" />
                {copy.vehicleSection}
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                    <Car className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{copy.vehiclesTitle}</p>
                    <p className="text-xs text-muted-foreground">{copy.vehiclesDesc}</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{copy.vehicleBrand}</label>
                    <input
                      name="vehicle_brand"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder={isEs ? "Ej: BMW" : "e.g. BMW"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{copy.vehicleModel}</label>
                    <input
                      name="vehicle_model"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder={isEs ? "Ej: X5" : "e.g. X5"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{copy.vehicleColor}</label>
                    <input
                      name="vehicle_color"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder={isEs ? "Negro" : "Black"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{copy.vehiclePlate}</label>
                    <input
                      name="vehicle_plate"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder={isEs ? "1234-ABC" : "ABC-1234"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{copy.vehicleSize}</label>
                    <select
                      name="vehicle_size"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      defaultValue=""
                    >
                      <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                      <option value="compact">{isEs ? "Compacto" : "Compact"}</option>
                      <option value="sedan">{isEs ? "Sedán" : "Sedan"}</option>
                      <option value="suv">SUV</option>
                      <option value="truck">{isEs ? "Camioneta" : "Truck"}</option>
                      <option value="van">{isEs ? "Van" : "Van"}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{copy.vehicle}</label>
                    <input
                      name="vehicle_info"
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder={isEs ? "Detalles adicionales" : "Additional details"}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileText className="h-4 w-4 text-emerald-600" />
                {copy.additionalSection}
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.tags}
                  </label>
                  <input
                    name="tags"
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    placeholder={copy.tagsHint}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{copy.notes}</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    placeholder={isEs ? "Indicaciones, preferencias, historial..." : "Directions, preferences, history..."}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button 
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20" 
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
