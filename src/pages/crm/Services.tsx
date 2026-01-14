import { FormEvent, useEffect, useState } from "react"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { Service } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"

export default function ServicesPage() {
  const { businessId } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    base_price: "",
    duration_minutes: "",
    is_active: true,
  })

  const copy = isEs
    ? {
        title: "Servicios",
        description: "Catalogo de servicios por negocio con precios base y duracion.",
        newService: "Nuevo servicio",
        editTitle: "Editar servicio",
        createTitle: "Crear servicio",
        formDesc: "Nombre, descripcion, precio y duracion.",
        name: "Nombre",
        basePrice: "Precio base",
        desc: "Descripcion",
        duration: "Duracion (min)",
        active: "Activo",
        saveChanges: "Guardar cambios",
        create: "Crear servicio",
        cancel: "Cancelar edicion",
        listTitle: "Listado",
        listDesc: "Incluye nombre, descripcion, precio base, duracion y estado.",
        loading: "Cargando servicios...",
        empty: "No hay servicios aun. Crea el primero.",
        status: "Estado",
        actions: "Acciones",
        inactive: "Inactivo",
        edit: "Editar",
        delete: "Eliminar",
        deleteTitle: "Eliminar servicio",
        deleteDesc: "Esta accion no se puede deshacer.",
        cancelDelete: "Cancelar",
        confirm: "Confirmar",
        errorNoBusiness: "No hay negocio activo.",
      }
    : {
        title: "Services",
        description: "Service catalog per business with base pricing and duration.",
        newService: "New service",
        editTitle: "Edit service",
        createTitle: "Create service",
        formDesc: "Name, description, price, and duration.",
        name: "Name",
        basePrice: "Base price",
        desc: "Description",
        duration: "Duration (min)",
        active: "Active",
        saveChanges: "Save changes",
        create: "Create service",
        cancel: "Cancel edit",
        listTitle: "List",
        listDesc: "Includes name, description, base price, duration, and status.",
        loading: "Loading services...",
        empty: "No services yet. Create the first one.",
        status: "Status",
        actions: "Actions",
        inactive: "Inactive",
        edit: "Edit",
        delete: "Delete",
        deleteTitle: "Delete service",
        deleteDesc: "This action cannot be undone.",
        cancelDelete: "Cancel",
        confirm: "Confirm",
        errorNoBusiness: "No active business.",
      }

  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
      if (err) {
        setError(err.message)
        setServices([])
      } else {
        setServices((data as Service[]) || [])
      }
      setLoading(false)
    }
    fetchServices()
  }, [businessId])

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      description: "",
      base_price: "",
      duration_minutes: "",
      is_active: true,
    })
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!businessId) {
      setError(copy.errorNoBusiness)
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      business_id: businessId,
      name: form.name,
      description: form.description || null,
      base_price: form.base_price ? Number(form.base_price) : null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      is_active: form.is_active,
    }
    if (form.id) {
      const { error: err, data } = await supabase
        .from("services")
        .update(payload)
        .eq("business_id", businessId)
        .eq("id", form.id)
        .select()
      if (err) {
        setError(err.message)
      } else {
        setServices((prev) => prev.map((s) => (s.id === form.id ? { ...(data?.[0] as Service) } : s)))
        resetForm()
      }
    } else {
      const { error: err, data } = await supabase.from("services").insert(payload).select()
      if (err) {
        setError(err.message)
      } else if (data && data[0]) {
        setServices((prev) => [data[0] as Service, ...prev])
        resetForm()
      }
    }
    setSaving(false)
  }

  const handleEdit = (service: Service) => {
    setForm({
      id: service.id,
      name: service.name,
      description: service.description ?? "",
      base_price: service.base_price?.toString() ?? "",
      duration_minutes: service.duration_minutes?.toString() ?? "",
      is_active: service.is_active,
    })
  }

  const handleDelete = async () => {
    if (!businessId || !confirmDelete) return
    setDeletingId(confirmDelete)
    const { error: err } = await supabase
      .from("services")
      .delete()
      .eq("business_id", businessId)
      .eq("id", confirmDelete)
    setDeletingId(null)
    if (err) {
      setError(err.message)
    } else {
      setServices((prev) => prev.filter((s) => s.id !== confirmDelete))
      setConfirmDelete(null)
      if (form.id === confirmDelete) resetForm()
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700"
            onClick={() => resetForm()}
          >
            <Plus className="mr-2 size-4" />
            {copy.newService}
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{form.id ? copy.editTitle : copy.createTitle}</CardTitle>
          <CardDescription>{copy.formDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Error: {error}
            </div>
          ) : null}
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {copy.name}
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder={isEs ? "Lavado Premium" : "Premium wash"}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {copy.basePrice}
              <input
                type="number"
                min="0"
                value={form.base_price}
                onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="49.00"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium md:col-span-2">
              {copy.desc}
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder={isEs ? "Incluye interior, exterior, encerado..." : "Includes interior, exterior, wax..."}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {copy.duration}
              <input
                type="number"
                min="0"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                className="rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                placeholder="60"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="size-4 rounded border border-input text-rose-600"
              />
              {copy.active}
            </label>
            <div className="flex items-center gap-2 md:col-span-2">
              <Button
                type="submit"
                className="bg-rose-600 text-white hover:bg-rose-500"
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                {form.id ? copy.saveChanges : copy.create}
              </Button>
              {form.id ? (
                <Button variant="ghost" size="sm" onClick={resetForm} disabled={saving}>
                  {copy.cancel}
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{copy.listTitle}</CardTitle>
          <CardDescription>{copy.listDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loading ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-slate-700">
              <Loader2 className="size-4 animate-spin" />
              {copy.loading}
            </div>
          ) : services.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
              {copy.empty}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">{copy.name}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.desc}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.basePrice}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.duration}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.status}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td className="px-4 py-3 text-slate-900">{service.name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {service.description ? service.description : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {service.base_price != null ? `$${service.base_price.toFixed(2)}` : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {service.duration_minutes != null ? `${service.duration_minutes} min` : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            service.is_active
                              ? "border-emerald-200 text-emerald-700"
                              : "border-rose-200 text-rose-700"
                          }
                        >
                          {service.is_active ? copy.active : copy.inactive}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-700 hover:bg-slate-50"
                            onClick={() => handleEdit(service)}
                          >
                            {copy.edit}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-700 hover:bg-rose-50"
                            onClick={() => setConfirmDelete(service.id)}
                          >
                            {copy.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                {copy.cancelDelete}
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 text-white hover:bg-rose-500"
                onClick={handleDelete}
                disabled={deletingId === confirmDelete}
              >
                {deletingId === confirmDelete ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 size-4" />
                )}
                {copy.confirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

