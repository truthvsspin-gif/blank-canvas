import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ClipboardList, Loader2, User, Wrench } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { WorkOrder } from "@/types/crm"

const statuses = ["open", "in_progress", "completed", "cancelled"] as const

export default function WorkOrdersPage() {
  const { businessId } = useCurrentBusiness()
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [staffMap, setStaffMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      setLoading(true)
      const { data } = await supabase
        .from("work_orders")
        .select("*")
        .eq("business_id", businessId)
        .order("scheduled_at", { ascending: true, nullsFirst: false })
      const rows = (data as WorkOrder[]) || []
      setOrders(rows)

      const assigneeIds = Array.from(new Set(rows.map((row) => row.assigned_to).filter(Boolean))) as string[]
      if (assigneeIds.length) {
        const { data: users } = await supabase.from("users").select("id, full_name, email").in("id", assigneeIds)
        setStaffMap(new Map((users || []).map((user) => [user.id, user.full_name || user.email || user.id])))
      } else {
        setStaffMap(new Map())
      }
      setLoading(false)
    }
    load()
  }, [businessId])

  const updateOrderStatus = async (orderId: string, status: string) => {
    if (!businessId) return
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (status === "in_progress") patch.started_at = new Date().toISOString()
    if (status === "completed") patch.completed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from("work_orders")
      .update(patch)
      .eq("business_id", businessId)
      .eq("id", orderId)
      .select("*")
      .single()
    if (error) {
      console.error("Failed to update work order status", error)
      return
    }
    setOrders((prev) => prev.map((row) => (row.id === orderId ? (data as WorkOrder) : row)))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Work Orders" description="Operational execution queue for approved bookings." />
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Loading work orders...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((status) => (
            <Card key={status}>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide">{status.replace("_", " ")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders
                  .filter((order) => order.status === status)
                  .map((order) => (
                    <div key={order.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{order.service_name}</div>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ClipboardList className="size-3.5" />
                          {order.id.slice(0, 8)}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="size-3.5" />
                          {staffMap.get(order.assigned_to || "") || "Unassigned"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Wrench className="size-3.5" />
                          {order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : "No date"}
                        </div>
                      </div>
                      <select
                        value={order.status}
                        onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                        className="w-full rounded border px-2 py-1 text-xs"
                      >
                        {statuses.map((option) => (
                          <option key={option} value={option}>
                            {option.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      <Button variant="ghost" size="sm" asChild className="px-0">
                        <Link to={`/crm/bookings/${order.booking_id}`}>Open booking</Link>
                      </Button>
                    </div>
                  ))}
                {orders.filter((order) => order.status === status).length === 0 && (
                  <p className="text-xs text-muted-foreground">No work orders.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
