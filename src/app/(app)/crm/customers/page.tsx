"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Loader2, Plus, Search } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { Customer } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"

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
        description: "Vista de clientes con filtros y acciones rapidas.",
        newCustomer: "Nuevo cliente",
        cardTitle: "Clientes",
        loadingBusiness: "Cargando negocio...",
        searchHint: "Agrega filtros o busca por nombre o telefono.",
        searchPlaceholder: "Buscar clientes",
        loading: "Cargando clientes...",
        empty: "No hay clientes aun. Crea el primero.",
        name: "Nombre",
        phone: "Telefono",
        email: "Email",
        vehicle: "Vehiculo",
        tags: "Tags",
        actions: "Acciones",
        view: "Ver",
        pageLabel: "Pagina",
        of: "de",
        prev: "Anterior",
        next: "Siguiente",
        emptyValue: "N/A",
      }
    : {
        title: "Customers",
        description: "Customer view with filters and quick actions.",
        newCustomer: "New customer",
        cardTitle: "Customers",
        loadingBusiness: "Loading business...",
        searchHint: "Add filters or search by name or phone.",
        searchPlaceholder: "Search customers",
        loading: "Loading customers...",
        empty: "No customers yet. Create the first one.",
        name: "Name",
        phone: "Phone",
        email: "Email",
        vehicle: "Vehicle",
        tags: "Tags",
        actions: "Actions",
        view: "View",
        pageLabel: "Page",
        of: "of",
        prev: "Previous",
        next: "Next",
        emptyValue: "N/A",
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
        query.or(`full_name.ilike.%${filter}%,phone.ilike.%${filter}%`)
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
          <Button asChild className="bg-rose-600 text-white hover:bg-rose-500">
            <Link href="/crm/customers/new">
              <Plus className="mr-2 size-4" />
              {copy.newCustomer}
            </Link>
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>{copy.cardTitle}</CardTitle>
            <CardDescription>
              {bizError
                ? bizError
                : bizLoading
                  ? copy.loadingBusiness
                  : copy.searchHint}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-xs md:w-auto">
              <Search className="size-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder={copy.searchPlaceholder}
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-slate-700">
              <Loader2 className="size-4 animate-spin" />
              {copy.loading}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              Error: {error}
            </div>
          ) : emptyState ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-600">
              {copy.empty}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">{copy.name}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.phone}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.email}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.vehicle}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.tags}</th>
                    <th className="px-4 py-3 text-left font-semibold">{copy.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-3 text-slate-900">{customer.full_name}</td>
                      <td className="px-4 py-3 text-slate-700">{customer.phone || copy.emptyValue}</td>
                      <td className="px-4 py-3 text-slate-700">{customer.email || copy.emptyValue}</td>
                      <td className="px-4 py-3 text-slate-700">{customer.vehicle_info || copy.emptyValue}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {customer.tags && customer.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {customer.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="border-slate-200 text-slate-700">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          copy.emptyValue
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" asChild className="text-rose-700 hover:bg-rose-50">
                          <Link href={`/crm/customers/${customer.id}`}>
                            {copy.view}
                            <ArrowRight className="ml-1 size-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              {copy.pageLabel} {page} {copy.of} {total} {copy.title.toLowerCase()}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200"
                disabled={!hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {copy.prev}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                {copy.next}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
