import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CalendarDays, Car, Edit, FileText, Loader2, Mail, Phone, Plus, Save, Tag, Trash2, User } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { Customer, Vehicle, Booking } from "@/types/crm"
import { NotesPanel } from "@/components/crm/notes-panel"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

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
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)

  const copy = isEs
    ? {
        title: "Perfil del Cliente",
        back: "Volver a clientes",
        edit: "Editar",
        cancel: "Cancelar",
        delete: "Eliminar",
        loading: "Cargando...",
        notFound: "No se encontró el cliente.",
        profile: "Información de Contacto",
        profileDesc: "Datos personales y de contacto.",
        name: "Nombre completo",
        phone: "Teléfono",
        email: "Email",
        vehicle: "Notas de vehículo",
        tags: "Etiquetas",
        tagsHint: "Separadas por coma",
        notes: "Notas",
        vehiclesTitle: "Vehículos",
        vehiclesDesc: "Vehículos registrados del cliente.",
        vehicleBrand: "Marca",
        vehicleModel: "Modelo",
        vehicleColor: "Color",
        vehiclePlate: "Placa",
        vehicleSize: "Tamaño",
        vehicleAdd: "Agregar vehículo",
        vehicleNone: "No hay vehículos registrados.",
        unknownVehicle: "Sin identificar",
        vehicleDelete: "Eliminar",
        vehicleRequired: "Completa al menos marca, modelo o placa.",
        save: "Guardar cambios",
        activity: "Historial de Reservas",
        activityDesc: "Últimas citas y servicios.",
        noEvents: "Sin reservas registradas.",
        viewBooking: "Ver",
        deleteTitle: "¿Eliminar cliente?",
        deleteDesc: "Esta acción no se puede deshacer. Se eliminará el cliente y sus datos asociados.",
        cancelDelete: "Cancelar",
        confirm: "Eliminar",
        memberSince: "Cliente desde",
        totalBookings: "reservas",
        addNew: "Nuevo",
      }
    : {
        title: "Customer Profile",
        back: "Back to customers",
        edit: "Edit",
        cancel: "Cancel",
        delete: "Delete",
        loading: "Loading...",
        notFound: "Customer not found.",
        profile: "Contact Information",
        profileDesc: "Personal and contact details.",
        name: "Full name",
        phone: "Phone",
        email: "Email",
        vehicle: "Vehicle notes",
        tags: "Tags",
        tagsHint: "Comma-separated",
        notes: "Notes",
        vehiclesTitle: "Vehicles",
        vehiclesDesc: "Customer's registered vehicles.",
        vehicleBrand: "Brand",
        vehicleModel: "Model",
        vehicleColor: "Color",
        vehiclePlate: "License plate",
        vehicleSize: "Size",
        vehicleAdd: "Add vehicle",
        vehicleNone: "No vehicles registered.",
        unknownVehicle: "Unidentified",
        vehicleDelete: "Delete",
        vehicleRequired: "Fill at least brand, model, or plate.",
        save: "Save changes",
        activity: "Booking History",
        activityDesc: "Recent appointments and services.",
        noEvents: "No bookings recorded.",
        viewBooking: "View",
        deleteTitle: "Delete customer?",
        deleteDesc: "This action cannot be undone. The customer and related data will be removed.",
        cancelDelete: "Cancel",
        confirm: "Delete",
        memberSince: "Customer since",
        totalBookings: "bookings",
        addNew: "New",
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

  useEffect(() => {
    const fetchBookings = async () => {
      if (!businessId || !id) return
      setBookingsLoading(true)
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(5)
      setBookings((data ?? []) as Booking[])
      setBookingsLoading(false)
    }
    fetchBookings()
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
      setShowAddVehicle(false)
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

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat(isEs ? "es-ES" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(date))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>{copy.loading}</span>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={copy.title}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/customers">
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
              <Link to="/crm/customers">
                <ArrowLeft className="mr-2 size-4" />
                {copy.back}
              </Link>
            </Button>
            <Button
              size="sm"
              variant={editMode ? "secondary" : "default"}
              className={cn(
                editMode 
                  ? "bg-slate-100 text-slate-800 hover:bg-slate-200" 
                  : "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400"
              )}
              onClick={() => setEditMode((v) => !v)}
            >
              <Edit className="mr-2 size-4" />
              {editMode ? copy.cancel : copy.edit}
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

      {/* Customer Header Card */}
      <Card className="shadow-lg shadow-black/5 border-0 bg-gradient-to-r from-emerald-50 via-white to-white overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white text-3xl font-bold shadow-lg shadow-emerald-500/30">
              {customer.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{customer.full_name}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {customer.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {copy.memberSince} {formatDate(customer.created_at)}
                </div>
              </div>
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {customer.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl bg-emerald-100 px-6 py-4">
              <span className="text-3xl font-bold text-emerald-700">{bookings.length}</span>
              <span className="text-xs text-emerald-600">{copy.totalBookings}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Form */}
          <Card className="shadow-lg shadow-black/5 border-0 bg-card">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{copy.profile}</CardTitle>
                  <CardDescription>{copy.profileDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-foreground">{copy.name}</label>
                    <input
                      name="full_name"
                      defaultValue={customer.full_name}
                      disabled={!editMode}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      {copy.phone}
                    </label>
                    <input
                      name="phone"
                      defaultValue={customer.phone ?? ""}
                      disabled={!editMode}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {copy.email}
                    </label>
                    <input
                      name="email"
                      defaultValue={customer.email ?? ""}
                      disabled={!editMode}
                      className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.tags}
                    <span className="text-xs text-muted-foreground font-normal">({copy.tagsHint})</span>
                  </label>
                  <input
                    name="tags"
                    defaultValue={customer.tags?.join(", ") ?? ""}
                    disabled={!editMode}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {copy.notes}
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={customer.notes ?? ""}
                    disabled={!editMode}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                {editMode && (
                  <div className="flex justify-end pt-2">
                    <Button
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400"
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                      {copy.save}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Vehicles Section */}
          <Card className="shadow-lg shadow-black/5 border-0 bg-card">
            <CardHeader className="border-b bg-muted/30 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Car className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{copy.vehiclesTitle}</CardTitle>
                  <CardDescription>{copy.vehiclesDesc}</CardDescription>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => setShowAddVehicle(!showAddVehicle)}
              >
                <Plus className="mr-1.5 size-4" />
                {copy.addNew}
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {vehicleError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {vehicleError}
                </div>
              )}

              {showAddVehicle && (
                <form className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-4" onSubmit={handleAddVehicle}>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">{copy.vehicleBrand}</label>
                      <input
                        name="brand"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder={isEs ? "Ej: BMW" : "e.g. BMW"}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">{copy.vehicleModel}</label>
                      <input
                        name="model"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder={isEs ? "Ej: X5" : "e.g. X5"}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">{copy.vehiclePlate}</label>
                      <input
                        name="license_plate"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder={isEs ? "1234-ABC" : "ABC-1234"}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">{copy.vehicleColor}</label>
                      <input
                        name="color"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        placeholder={isEs ? "Negro" : "Black"}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">{copy.vehicleSize}</label>
                      <select
                        name="size"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        defaultValue=""
                      >
                        <option value="">{isEs ? "Seleccionar..." : "Select..."}</option>
                        <option value="compact">{isEs ? "Compacto" : "Compact"}</option>
                        <option value="sedan">{isEs ? "Sedán" : "Sedan"}</option>
                        <option value="suv">SUV</option>
                        <option value="truck">{isEs ? "Camioneta" : "Truck"}</option>
                        <option value="van">Van</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full bg-blue-600 text-white hover:bg-blue-500"
                        disabled={vehicleSaving}
                      >
                        {vehicleSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                        {copy.vehicleAdd}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {vehiclesLoading ? (
                <div className="flex items-center justify-center gap-3 py-8 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : vehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">{copy.vehicleNone}</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {vehicles.map((vehicle) => {
                    const title = [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim()
                    return (
                      <div
                        key={vehicle.id}
                        className="group relative rounded-xl border bg-card p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                            <Car className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {title || copy.unknownVehicle}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {vehicle.license_plate && (
                                <Badge variant="outline" className="text-xs bg-slate-50">
                                  {vehicle.license_plate}
                                </Badge>
                              )}
                              {vehicle.color && (
                                <span className="text-xs text-muted-foreground">{vehicle.color}</span>
                              )}
                              {vehicle.size && (
                                <span className="text-xs text-muted-foreground capitalize">{vehicle.size}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0"
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                            disabled={vehicleDeletingId === vehicle.id}
                          >
                            {vehicleDeletingId === vehicle.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Booking History */}
          <Card className="shadow-lg shadow-black/5 border-0 bg-card">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
                  <CalendarDays className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">{copy.activity}</CardTitle>
                  <CardDescription>{copy.activityDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
                    <CalendarDays className="h-6 w-6 text-rose-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">{copy.noEvents}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between rounded-xl border bg-card p-3 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium",
                          booking.status === "completed" ? "bg-slate-100 text-slate-600" :
                          booking.status === "confirmed" ? "bg-emerald-100 text-emerald-600" :
                          booking.status === "cancelled" ? "bg-rose-100 text-rose-600" :
                          "bg-blue-100 text-blue-600"
                        )}>
                          <CalendarDays className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{booking.service_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.scheduled_at ? formatDate(booking.scheduled_at) : formatDate(booking.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Link to={`/crm/bookings/${booking.id}`}>{copy.viewBooking}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes Panel */}
          <NotesPanel entityId={customer.id} entityType="customer" />
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
            {error && (
              <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
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
