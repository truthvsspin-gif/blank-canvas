import { FormEvent, useEffect, useState } from "react"
import { Clock, DollarSign, Loader2, Plus, Save, Trash2, Wrench, X, Check, ChevronLeft, ChevronRight } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { Service } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

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
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    base_price: "",
    duration_minutes: "",
    is_active: true,
    is_trojan_horse: false,
  })

  const copy = isEs
    ? {
        title: "Servicios",
        description: "Catálogo de servicios con precios y duración.",
        newService: "Nuevo servicio",
        editTitle: "Editar servicio",
        createTitle: "Crear servicio",
        formDesc: "Nombre, descripción, precio y duración.",
        name: "Nombre del servicio",
        basePrice: "Precio base",
        desc: "Descripción",
        duration: "Duración (min)",
        active: "Servicio activo",
        trojanHorse: "Servicio de entrada",
        trojanHorseHint: "Recomendar primero para consultas generales",
        saveChanges: "Guardar cambios",
        create: "Crear servicio",
        cancel: "Cancelar",
        listTitle: "Catálogo de Servicios",
        listDesc: "Gestiona todos tus servicios disponibles.",
        loading: "Cargando servicios...",
        empty: "No hay servicios aún. ¡Crea el primero!",
        status: "Estado",
        actions: "Acciones",
        inactive: "Inactivo",
        edit: "Editar",
        delete: "Eliminar",
        deleteTitle: "¿Eliminar servicio?",
        deleteDesc: "Esta acción no se puede deshacer.",
        cancelDelete: "Cancelar",
        confirm: "Eliminar",
        errorNoBusiness: "No hay negocio activo.",
        totalServices: "servicios en total",
        activeServices: "servicios activos",
        pageLabel: "Mostrando",
        of: "de",
        entryLevel: "Entrada",
      }
    : {
        title: "Services",
        description: "Service catalog with pricing and duration.",
        newService: "New service",
        editTitle: "Edit service",
        createTitle: "Create service",
        formDesc: "Name, description, price, and duration.",
        name: "Service name",
        basePrice: "Base price",
        desc: "Description",
        duration: "Duration (min)",
        active: "Service active",
        trojanHorse: "Entry-level service",
        trojanHorseHint: "Recommend first for general inquiries",
        saveChanges: "Save changes",
        create: "Create service",
        cancel: "Cancel",
        listTitle: "Service Catalog",
        listDesc: "Manage all your available services.",
        loading: "Loading services...",
        empty: "No services yet. Create the first one!",
        status: "Status",
        actions: "Actions",
        inactive: "Inactive",
        edit: "Edit",
        delete: "Delete",
        deleteTitle: "Delete service?",
        deleteDesc: "This action cannot be undone.",
        cancelDelete: "Cancel",
        confirm: "Delete",
        errorNoBusiness: "No active business.",
        totalServices: "total services",
        activeServices: "active services",
        pageLabel: "Showing",
        of: "of",
        entryLevel: "Entry",
      }

  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)
      const offset = (page - 1) * PAGE_SIZE
      const { data, error: err, count } = await supabase
        .from("services")
        .select("*", { count: "exact" })
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
      if (err) {
        setError(err.message)
        setServices([])
      } else {
        setServices((data as Service[]) || [])
        setTotal(count || 0)
      }
      setLoading(false)
    }
    fetchServices()
  }, [businessId, page])

  const activeCount = services.filter((s) => s.is_active).length

  const resetForm = () => {
    setForm({
      id: "",
      name: "",
      description: "",
      base_price: "",
      duration_minutes: "",
      is_active: true,
      is_trojan_horse: false,
    })
    setShowForm(false)
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
      is_trojan_horse: form.is_trojan_horse,
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
        setTotal((t) => t + 1)
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
      is_trojan_horse: service.is_trojan_horse ?? false,
    })
    setShowForm(true)
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
      setTotal((t) => t - 1)
      setConfirmDelete(null)
      if (form.id === confirmDelete) resetForm()
    }
  }

  const hasPrev = page > 1
  const hasNext = page * PAGE_SIZE < total

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button
            className="bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/20"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
            <Plus className="mr-2 size-4" />
            {copy.newService}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-violet-50 to-white border-violet-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                <Wrench className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-700">{total}</p>
                <p className="text-xs text-violet-600/70">{copy.totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
                <p className="text-xs text-emerald-600/70">{copy.activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Form Modal/Card */}
      {showForm && (
        <Card className="shadow-lg shadow-black/5 border-0 bg-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-violet-50 to-white">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold">{form.id ? copy.editTitle : copy.createTitle}</CardTitle>
              <CardDescription>{copy.formDesc}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={resetForm} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                Error: {error}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{copy.name}</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                    placeholder={isEs ? "Lavado Premium" : "Premium wash"}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{copy.basePrice}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.base_price}
                      onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      placeholder="49.00"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{copy.desc}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none"
                  placeholder={isEs ? "Incluye interior, exterior, encerado..." : "Includes interior, exterior, wax..."}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{copy.duration}</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      min="0"
                      value={form.duration_minutes}
                      onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                      placeholder="60"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-7">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_active}
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      form.is_active ? "bg-violet-600" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform",
                        form.is_active ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <span className="text-sm font-medium text-foreground">{copy.active}</span>
                </div>
              </div>
              {/* Trojan Horse toggle */}
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.is_trojan_horse}
                  onClick={() => setForm((f) => ({ ...f, is_trojan_horse: !f.is_trojan_horse }))}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    form.is_trojan_horse ? "bg-amber-500" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform",
                      form.is_trojan_horse ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
                <div className="flex-1">
                  <span className="text-sm font-medium text-amber-900">⭐ {copy.trojanHorse}</span>
                  <p className="text-xs text-amber-700">{copy.trojanHorseHint}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={resetForm} disabled={saving}>
                  {copy.cancel}
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                  {form.id ? copy.saveChanges : copy.create}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Services List */}
      <Card className="shadow-lg shadow-black/5 border-0 bg-card">
        <CardHeader className="border-b bg-muted/30 rounded-t-xl">
          <CardTitle className="text-lg font-semibold">{copy.listTitle}</CardTitle>
          <CardDescription>{copy.listDesc}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>{copy.loading}</span>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
                <Wrench className="h-8 w-8 text-violet-600" />
              </div>
              <p className="text-muted-foreground mb-4">{copy.empty}</p>
              <Button 
                variant="outline" 
                className="border-violet-200 text-violet-700 hover:bg-violet-50"
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-2 size-4" />
                {copy.newService}
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.name}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.desc}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.basePrice}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.duration}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.status}</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">{copy.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {services.map((service, idx) => (
                      <tr 
                        key={service.id}
                        className={cn(
                          "hover:bg-muted/50 transition-colors",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white">
                              <Wrench className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">{service.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                          {service.description || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-foreground font-medium">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {service.base_price != null ? service.base_price.toFixed(2) : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {service.duration_minutes != null ? `${service.duration_minutes} min` : "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                service.is_active
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              )}
                            >
                              {service.is_active ? copy.active : copy.inactive}
                            </Badge>
                            {service.is_trojan_horse && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-amber-100 text-amber-700 border-amber-200"
                              >
                                ⭐ {copy.entryLevel}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-violet-700 hover:text-violet-800 hover:bg-violet-50"
                              onClick={() => handleEdit(service)}
                            >
                              {copy.edit}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  {copy.pageLabel} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} {copy.of} {total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 py-1 text-sm font-medium bg-background border rounded-lg">
                    {page}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!hasNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                {copy.cancelDelete}
              </Button>
              <Button
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
      )}
    </div>
  )
}
