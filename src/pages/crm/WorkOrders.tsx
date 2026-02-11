import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ClipboardList, Filter, Loader2, Plus, Search, User, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { WorkOrder } from "@/types/crm"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

type StaffMember = {
  user_id: string
  users:
    | { full_name: string | null; email: string | null }
    | Array<{ full_name: string | null; email: string | null }>
    | null
}

const COLUMNS = [
  { key: "open", labelEn: "Pending", labelEs: "Pendientes", color: "text-amber-600", bg: "bg-amber-100", ring: "ring-amber-200" },
  { key: "in_progress", labelEn: "In Progress", labelEs: "En curso", color: "text-blue-600", bg: "bg-blue-100", ring: "ring-blue-200" },
  { key: "completed", labelEn: "Completed", labelEs: "Completadas", color: "text-emerald-600", bg: "bg-emerald-100", ring: "ring-emerald-200" },
  { key: "cancelled", labelEn: "Cancelled", labelEs: "Canceladas", color: "text-muted-foreground", bg: "bg-muted", ring: "ring-border" },
] as const

export default function WorkOrdersPage() {
  const { businessId } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [staffMap, setStaffMap] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState("")
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "month" | "all">("all")

  const copy = isEs
    ? {
        title: "Órdenes",
        newOrder: "+ Orden de trabajo",
        search: "Escribe para buscar.",
        today: "Hoy",
        week: "Semana",
        month: "Mes",
        all: "Todo",
        loading: "Cargando...",
        emptyPending: "No tienes nuevas órdenes para mostrar. Haz click en + Orden para crear una nueva.",
        emptyWaiting: "Aquí se muestran las órdenes de trabajo que has aceptado y agendado, pero aún están en la cola para empezar a trabajar en ellas.",
        emptyProgress: "Aquí se mostrarán las órdenes de trabajo en las que estás trabajando.",
        emptyCompleted: "¡Enhorabuena! En esta estación se mostrarán las órdenes de trabajo que hayas completado.",
        unassigned: "Sin asignar",
      }
    : {
        title: "Work Orders",
        newOrder: "+ Work Order",
        search: "Search...",
        today: "Today",
        week: "Week",
        month: "Month",
        all: "All",
        loading: "Loading...",
        emptyPending: "No new orders to show. Click + Order to create one.",
        emptyWaiting: "Accepted and scheduled orders waiting to start will appear here.",
        emptyProgress: "Orders currently being worked on will appear here.",
        emptyCompleted: "Completed orders will appear here. Great work!",
        unassigned: "Unassigned",
      }

  const emptyMessages: Record<string, string> = {
    open: copy.emptyPending,
    in_progress: copy.emptyProgress,
    completed: copy.emptyCompleted,
    cancelled: isEs ? "No hay órdenes canceladas." : "No cancelled orders.",
  }

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      setLoading(true)
      const [{ data: ordersData }, { data: membershipData }] = await Promise.all([
        supabase
          .from("work_orders")
          .select("*")
          .eq("business_id", businessId)
          .order("scheduled_at", { ascending: true, nullsFirst: false }),
        supabase
          .from("memberships")
          .select("user_id, users(full_name, email)")
          .eq("business_id", businessId),
      ])
      setOrders((ordersData as WorkOrder[]) || [])
      const memberships = (membershipData as StaffMember[]) || []
      const map = new Map<string, string>()
      memberships.forEach((m) => {
        const user = Array.isArray(m.users) ? m.users[0] : m.users
        map.set(m.user_id, user?.full_name || user?.email || m.user_id)
      })
      setStaffMap(map)
      setLoading(false)
    }
    load()
  }, [businessId])

  const updateStatus = async (id: string, status: string) => {
    if (!businessId) return
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === "in_progress") patch.started_at = new Date().toISOString()
    if (status === "completed") patch.completed_at = new Date().toISOString()
    const { data } = await supabase
      .from("work_orders")
      .update(patch)
      .eq("business_id", businessId)
      .eq("id", id)
      .select("*")
      .single()
    if (data) setOrders((prev) => prev.map((o) => (o.id === id ? (data as WorkOrder) : o)))
  }

  const filtered = orders.filter((o) => {
    if (search && !o.service_name.toLowerCase().includes(search.toLowerCase())) return false
    if (timeFilter === "all") return true
    const now = new Date()
    const scheduled = o.scheduled_at ? new Date(o.scheduled_at) : null
    if (!scheduled) return false
    if (timeFilter === "today") return scheduled.toDateString() === now.toDateString()
    if (timeFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 86400000)
      return scheduled >= weekAgo
    }
    if (timeFilter === "month") {
      return scheduled.getMonth() === now.getMonth() && scheduled.getFullYear() === now.getFullYear()
    }
    return true
  })

  const locale = isEs ? "es-ES" : "en-US"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{copy.title}</h1>
          <Button asChild size="sm" className="bg-primary text-primary-foreground">
            <Link to="/crm/bookings/new">
              {copy.newOrder}
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.search}
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-background w-48 focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex items-center rounded-lg border overflow-hidden">
            {(["today", "week", "month", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  timeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {t === "today" ? copy.today : t === "week" ? copy.week : t === "month" ? copy.month : copy.all}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {copy.loading}
        </div>
      ) : (
        /* Kanban Board */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const colOrders = filtered.filter((o) => o.status === col.key)
            return (
              <div key={col.key} className="space-y-3">
                {/* Column Header */}
                <div className="flex items-center justify-between">
                  <h3 className={cn("text-sm font-bold", col.color)}>
                    {isEs ? col.labelEs : col.labelEn}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs font-bold", col.bg, col.color)}
                  >
                    {colOrders.length}
                  </Badge>
                </div>

                <div className="h-px bg-border" />

                {/* Cards or Empty State */}
                {colOrders.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-border/50 p-6 text-center">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {emptyMessages[col.key]}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {colOrders.map((order) => (
                      <Card
                        key={order.id}
                        className={cn("border shadow-sm hover:shadow-md transition-shadow")}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium text-foreground">
                              {order.service_name}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3" />
                              {staffMap.get(order.assigned_to || "") || copy.unassigned}
                            </div>
                            {order.scheduled_at && (
                              <div className="flex items-center gap-1.5">
                                <ClipboardList className="h-3 w-3" />
                                {new Intl.DateTimeFormat(locale, {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                }).format(new Date(order.scheduled_at))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 pt-1">
                            {COLUMNS.filter((c) => c.key !== col.key && c.key !== "cancelled").map((target) => (
                              <button
                                key={target.key}
                                onClick={() => updateStatus(order.id, target.key)}
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                                  target.bg,
                                  target.color,
                                  "hover:opacity-80"
                                )}
                              >
                                {isEs ? target.labelEs : target.labelEn}
                              </button>
                            ))}
                          </div>
                          <Button variant="ghost" size="sm" asChild className="px-0 text-xs h-6">
                            <Link to={`/crm/bookings/${order.booking_id}`}>
                              {isEs ? "Ver reserva" : "View booking"}
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
