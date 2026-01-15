import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Loader2, Plus, Search, Users, Phone, Mail as MailIcon, Car, Tag, ChevronLeft, ChevronRight } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { Customer } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

export default function CustomersPage() {
  const { businessId, loading: bizLoading, error: bizError } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const copy = isEs
    ? {
        title: "Clientes",
        description: "Gestiona tu base de clientes con filtros y acciones rápidas.",
        newCustomer: "Nuevo cliente",
        cardTitle: "Base de Clientes",
        loadingBusiness: "Cargando negocio...",
        searchHint: "Busca por nombre, teléfono o email.",
        searchPlaceholder: "Buscar clientes...",
        loading: "Cargando clientes...",
        empty: "No hay clientes aún. ¡Crea el primero!",
        name: "Nombre",
        phone: "Teléfono",
        email: "Email",
        vehicle: "Vehículo",
        tags: "Etiquetas",
        actions: "Acciones",
        view: "Ver perfil",
        pageLabel: "Mostrando",
        of: "de",
        prev: "Anterior",
        next: "Siguiente",
        emptyValue: "—",
        totalCustomers: "clientes en total",
      }
    : {
        title: "Customers",
        description: "Manage your customer base with filters and quick actions.",
        newCustomer: "New customer",
        cardTitle: "Customer Database",
        loadingBusiness: "Loading business...",
        searchHint: "Search by name, phone, or email.",
        searchPlaceholder: "Search customers...",
        loading: "Loading customers...",
        empty: "No customers yet. Create the first one!",
        name: "Name",
        phone: "Phone",
        email: "Email",
        vehicle: "Vehicle",
        tags: "Tags",
        actions: "Actions",
        view: "View profile",
        pageLabel: "Showing",
        of: "of",
        prev: "Previous",
        next: "Next",
        emptyValue: "—",
        totalCustomers: "total customers",
      }

  const hasPrev = page > 1
  const hasNext = page * PAGE_SIZE < total

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!businessId) return
      setLoading(true)
      setError(null)
      const offset = (page - 1) * PAGE_SIZE
      const query = supabase
        .from("customers")
        .select("*", { count: "exact" })
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      const filter = search.trim()
      if (filter) {
        query.or(`full_name.ilike.%${filter}%,phone.ilike.%${filter}%,email.ilike.%${filter}%`)
      }

      const { data, error: err, count } = await query
      if (err) {
        setError(err.message)
      } else {
        setCustomers(data || [])
        setTotal(count || 0)
      }
      setLoading(false)
    }
    fetchCustomers()
  }, [businessId, page, search])

  const emptyState = !loading && customers.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button asChild className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20">
            <Link to="/crm/customers/new">
              <Plus className="mr-2 size-4" />
              {copy.newCustomer}
            </Link>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{total}</p>
                <p className="text-xs text-emerald-600/70">{copy.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg shadow-black/5 border-0 bg-card">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b bg-muted/30 rounded-t-xl">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{copy.cardTitle}</CardTitle>
            <CardDescription>
              {bizError
                ? bizError
                : bizLoading
                  ? copy.loadingBusiness
                  : copy.searchHint}
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={copy.searchPlaceholder}
              className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span>{copy.loading}</span>
            </div>
          ) : error ? (
            <div className="m-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Error: {error}
            </div>
          ) : emptyState ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Users className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="text-muted-foreground mb-4">{copy.empty}</p>
              <Button asChild variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Link to="/crm/customers/new">
                  <Plus className="mr-2 size-4" />
                  {copy.newCustomer}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.name}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.phone}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.email}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.vehicle}</th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">{copy.tags}</th>
                      <th className="px-4 py-3 text-right font-semibold text-foreground">{copy.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customers.map((customer, idx) => (
                      <tr 
                        key={customer.id} 
                        className={cn(
                          "hover:bg-muted/50 transition-colors",
                          idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-medium text-sm">
                              {customer.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground">{customer.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {customer.phone || copy.emptyValue}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MailIcon className="h-3.5 w-3.5" />
                            {customer.email || copy.emptyValue}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Car className="h-3.5 w-3.5" />
                            {customer.vehicle_info || copy.emptyValue}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {customer.tags && customer.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {customer.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                  <Tag className="h-2.5 w-2.5 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {customer.tags.length > 2 && (
                                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                                  +{customer.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{copy.emptyValue}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            asChild 
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          >
                            <Link to={`/crm/customers/${customer.id}`}>
                              {copy.view}
                              <ArrowRight className="ml-1.5 size-3.5" />
                            </Link>
                          </Button>
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
    </div>
  )
}
