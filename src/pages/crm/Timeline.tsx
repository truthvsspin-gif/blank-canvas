import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"

type TimelineRow = {
  id: string
  entity_type: string
  entity_id: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

export default function TimelinePage() {
  const { businessId } = useCurrentBusiness()
  const [rows, setRows] = useState<TimelineRow[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const load = async () => {
      if (!businessId) return
      setLoading(true)
      const { data } = await supabase
        .from("crm_audit_logs")
        .select("id, entity_type, entity_id, action, details, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(300)
      setRows((data as TimelineRow[]) || [])
      setLoading(false)
    }
    load()
  }, [businessId])

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return rows
    return rows.filter((row) => {
      const payload = JSON.stringify(row.details || {}).toLowerCase()
      return (
        row.entity_type.toLowerCase().includes(text) ||
        row.entity_id.toLowerCase().includes(text) ||
        row.action.toLowerCase().includes(text) ||
        payload.includes(text)
      )
    })
  }, [query, rows])

  return (
    <div className="space-y-6">
      <PageHeader title="CRM Timeline" description="Searchable audit timeline across bookings, vehicles, and work orders." />
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Activity</CardTitle>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search action, entity, details..."
              className="w-full rounded border px-9 py-2 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading timeline...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity found.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((row) => (
                <div key={row.id} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {row.entity_type} - {row.action}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">entity: {row.entity_id}</div>
                  <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[11px]">{JSON.stringify(row.details || {}, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
