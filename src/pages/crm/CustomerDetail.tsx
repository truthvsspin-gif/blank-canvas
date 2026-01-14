import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useParams } from "react-router-dom"
import { ArrowLeft, Edit, Info, Loader2, Plus, Save, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { Customer, Vehicle } from "@/types/crm"
import { NotesPanel } from "@/components/crm/notes-panel"
import { useLanguage } from "@/components/providers/language-provider"

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { businessId } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehiclesLoading, setVehiclesLoading] = useState(false)
  const [vehicleError, setVehicleError] = useState<string | null>(null)
  const [vehicleSaving, setVehicleSaving] = useState(false)
  const [vehicleDeletingId, setVehicleDeletingId] = useState<string | null>(null)

  const copy = isEs
    ? {
        title: "Detalle de cliente",
        back: "Volver",
        edit: "Editar",
        cancel: "Cancelar",
        delete: "Eliminar",
        loading: "Cargando cliente...",
        notFound: "No se encontro el cliente.",
        profile: "Perfil",
        profileDesc: "Datos de contacto, vehiculo, notas.",
        name: "Nombre completo",
        phone: "Telefono",
        email: "Email",
        vehicle: "Vehiculo",
        tags: "Tags (separados por coma)",
        notes: "Notas",
        vehiclesTitle: "Vehiculos",
        vehiclesDesc: "Agrega multiples vehiculos por cliente.",
        vehicleBrand: "Marca",
        vehicleModel: "Modelo",
        vehicleColor: "Color",
        vehiclePlate: "Placa",
        vehicleSize: "Tamano",
        vehicleAdd: "Agregar vehiculo",
        vehicleNone: "No hay vehiculos cargados.",
        unknownVehicle: "Sin vehiculo",
        vehicleDelete: "Eliminar",
        vehicleRequired: "Completa al menos marca, modelo o placa.",
        save: "Guardar cambios",
        activity: "Actividad",
        activityDesc: "Bookings recientes o timeline.",
        noEvents: "Sin eventos cargados.",
        connectFeed: "Conecta al feed real",
        deleteTitle: "Eliminar cliente",
        deleteDesc: "Esta accion no se puede deshacer. Se eliminara el cliente y sus datos asociados.",
        cancelDelete: "Cancelar",
        confirm: "Confirmar",
      }
    : {
        title: "Customer detail",
        back: "Back",
        edit: "Edit",
        cancel: "Cancel",
        delete: "Delete",
        loading: "Loading customer...",
        notFound: "Customer not found.",
        profile: "Profile",
        profileDesc: "Contact details, vehicle, notes.",
        name: "Full name",
        phone: "Phone",
        email: "Email",
        vehicle: "Vehicle",
        tags: "Tags (comma-separated)",
        notes: "Notes",
        vehiclesTitle: "Vehicles",
        vehiclesDesc: "Add multiple vehicles per client.",
        vehicleBrand: "Brand",
        vehicleModel: "Model",
        vehicleColor: "Color",
        vehiclePlate: "License plate",
        vehicleSize: "Size",
        vehicleAdd: "Add vehicle",
        vehicleNone: "No vehicles added yet.",
        unknownVehicle: "No vehicle",
        vehicleDelete: "Delete",
        vehicleRequired: "Fill at least brand, model, or plate.",
        save: "Save changes",
        activity: "Activity",
        activityDesc: "Recent bookings or timeline.",
        noEvents: "No events loaded.",
        connectFeed: "Connect to live feed",
        deleteTitle: "Delete customer",
        deleteDesc: "This action cannot be undone. The customer and related data will be removed.",
        cancelDelete: "Cancel",
        confirm: "Confirm",
      }

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .eq("id", id)
        .single()
      if (err) {
        setError(err.message)
        setCustomer(null)
      } else {
        setCustomer(data as Customer)
      }
      setLoading(false)
    }
    fetchCustomer()
  }, [businessId, id])

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!businessId || !id) return
      setVehiclesLoading(true)
      setVehicleError(null)
      const { data, error: err } = await supabase
        .from("vehicles")
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
      if (err) {
        setVehicleError(err.message)
        setVehicles([])
      } else {
        setVehicles((data ?? []) as Vehicle[])
      }
      setVehiclesLoading(false)
    }
    fetchVehicles()
  }, [businessId, id])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!businessId || !customer) return
    setSaving(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const payload = {
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
    const { error: err, data } = await supabase
      .from("customers")
      .update(payload)
      .eq("business_id", businessId)
      .eq("id", customer.id)
      .select()
      .single()
    setSaving(false)
    if (err) {
      setError(err.message)
    } else {
      setCustomer(data as Customer)
      setEditMode(false)
    }
  }

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!businessId || !customer) return
    const form = new FormData(e.currentTarget)
    const payload = {
      business_id: businessId,
      customer_id: customer.id,
      brand: (form.get("brand") as string) || null,
      model: (form.get("model") as string) || null,
      color: (form.get("color") as string) || null,
      license_plate: (form.get("license_plate") as string) || null,
      size: (form.get("size") as string) || null,
    }
    if (!payload.brand && !payload.model && !payload.license_plate) {
      setVehicleError(copy.vehicleRequired)
      return
    }
    setVehicleSaving(true)
    setVehicleError(null)
    const { data, error: err } = await supabase
      .from("vehicles")
      .insert(payload)
      .select("*")
      .single()
    setVehicleSaving(false)
    if (err) {
      setVehicleError(err.message)
      return
    }
    if (data) {
      setVehicles((prev) => [data as Vehicle, ...prev])
      e.currentTarget.reset()
    }
  }

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!businessId) return
    setVehicleDeletingId(vehicleId)
    setVehicleError(null)
    const { error: err } = await supabase
      .from("vehicles")
      .delete()
      .eq("business_id", businessId)
      .eq("id", vehicleId)
    setVehicleDeletingId(null)
    if (err) {
      setVehicleError(err.message)
      return
    }
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId))
  }

  const handleDelete = async () => {
    if (!businessId || !customer) return
    setDeleting(true)
    const { error: err } = await supabase
      .from("customers")
      .delete()
      .eq("business_id", businessId)
      .eq("id", customer.id)
    setDeleting(false)
    if (err) {
      setError(err.message)
    } else {
      window.location.href = "/crm/customers"
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={`ID: ${id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/customers">
                <ArrowLeft className="mr-2 size-4" />
                {copy.back}
              </Link>
            </Button>
            <Button
              size="sm"
              variant={editMode ? "secondary" : "default"}
              className={editMode ? "bg-slate-100 text-slate-800" : "bg-rose-600 text-white hover:bg-rose-500"}
              onClick={() => setEditMode((v) => !v)}
              disabled={loading}
            >
              <Edit className="mr-2 size-4" />
              {editMode ? copy.cancel : copy.edit}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={() => setConfirmDelete(true)}
              disabled={loading}
            >
              <Trash2 className="mr-2 size-4" />
              {copy.delete}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <Loader2 className="size-4 animate-spin" />
          {copy.loading}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Error: {error}</div>
      ) : !customer ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
          {copy.notFound}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>{copy.profile}</CardTitle>
              <CardDescription>{copy.profileDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4 text-sm text-foreground" onSubmit={handleSave}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {copy.name}
                    <input
                      name="full_name"
                      defaultValue={customer.full_name}
                      disabled={!editMode}
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {copy.phone}
                    <input
                      name="phone"
                      defaultValue={customer.phone ?? ""}
                      disabled={!editMode}
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {copy.email}
                    <input
                      name="email"
                      defaultValue={customer.email ?? ""}
                      disabled={!editMode}
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {copy.vehicle}
                    <input
                      name="vehicle_info"
                      defaultValue={customer.vehicle_info ?? ""}
                      disabled={!editMode}
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm font-medium">
                  {copy.tags}
                  <input
                    name="tags"
                    defaultValue={customer.tags?.join(", ") ?? ""}
                    disabled={!editMode}
                    className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium">
                  {copy.notes}
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={customer.notes ?? ""}
                    disabled={!editMode}
                    className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>

                {editMode ? (
                  <div className="flex justify-end">
                    <Button
                      className="bg-rose-600 text-white hover:bg-rose-500"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                      {copy.save}
                    </Button>
                  </div>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>{copy.vehiclesTitle}</CardTitle>
              <CardDescription>{copy.vehiclesDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-foreground">
              {vehicleError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                  {vehicleError}
                </div>
              ) : null}

              {vehiclesLoading ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <Loader2 className="mr-2 inline-flex size-4 animate-spin" />
                  {copy.loading}
                </div>
              ) : vehicles.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {copy.vehicleNone}
                </div>
              ) : (
                <div className="space-y-2">
                  {vehicles.map((vehicle) => {
                    const title = [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim()
                    const details = [vehicle.color, vehicle.license_plate, vehicle.size]
                      .filter(Boolean)
                      .join(" • ")
                    return (
                      <div
                        key={vehicle.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {title || copy.unknownVehicle}
                          </p>
                          {details ? <p className="text-xs text-slate-500">{details}</p> : null}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700"
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          disabled={vehicleDeletingId === vehicle.id}
                        >
                          <Trash2 className="mr-2 size-4" />
                          {copy.vehicleDelete}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              <form className="space-y-3" onSubmit={handleAddVehicle}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {copy.vehicleBrand}
                    <input
                      name="brand"
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                      placeholder={isEs ? "Ej: BMW" : "e.g. BMW"}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {copy.vehicleModel}
                    <input
                      name="model"
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                      placeholder={isEs ? "Ej: X5" : "e.g. X5"}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {copy.vehicleColor}
                    <input
                      name="color"
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                      placeholder={isEs ? "Negro" : "Black"}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    {copy.vehiclePlate}
                    <input
                      name="license_plate"
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                      placeholder={isEs ? "1234-ABC" : "ABC-1234"}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">
                    {copy.vehicleSize}
                    <input
                      name="size"
                      className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                      placeholder={isEs ? "Compacto, SUV, camioneta" : "Compact, SUV, truck"}
                    />
                  </label>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-rose-600 text-white hover:bg-rose-500"
                    disabled={vehicleSaving}
                  >
                    {vehicleSaving ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-4" />
                    )}
                    {copy.vehicleAdd}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>{copy.activity}</CardTitle>
              <CardDescription>{copy.activityDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Info className="size-4 text-slate-500" />
                <span>{copy.noEvents}</span>
              </div>
              <Badge variant="outline" className="border-rose-200 text-rose-700">
                {copy.connectFeed}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {customer ? <NotesPanel entityId={customer.id} entityType="customer" /> : null}

      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">{copy.deleteTitle}</h2>
            <p className="mt-2 text-sm text-slate-600">{copy.deleteDesc}</p>
            {error ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                {copy.cancelDelete}
              </Button>
              <Button
                size="sm"
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
      ) : null}
    </div>
  )
}

