import { useEffect, useState } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { supabase } from "@/lib/supabaseClient"

type Lead = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  qualification_reason: string | null
  source: string | null
  created_at: string
}

export default function CrmLeadsPage() {
  const { businessId } = useCurrentBusiness()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    const loadLeads = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, email, phone, qualification_reason, source, created_at, stage")
        .eq("business_id", businessId)
        .eq("stage", "qualified")
        .order("created_at", { ascending: false })
      if (!error) {
        setLeads((data ?? []) as Lead[])
      }
      setLoading(false)
    }
    loadLeads()
  }, [businessId])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qualified Leads"
        description="Leads that match pricing or booking intent and have contact info or booking intent."
        actions={<Badge variant="secondary">Qualified</Badge>}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>One lead per conversation.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="text-sm text-slate-500">No qualified leads yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2">Phone</th>
                    <th className="py-2">Qualification</th>
                    <th className="py-2">Source</th>
                    <th className="py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id}>
                      <td className="py-2 font-semibold text-slate-900">{lead.name ?? "Unknown"}</td>
                      <td className="py-2 text-slate-600">{lead.email ?? "-"}</td>
                      <td className="py-2 text-slate-600">{lead.phone ?? "-"}</td>
                      <td className="py-2 text-slate-600">{lead.qualification_reason ?? "-"}</td>
                      <td className="py-2 text-slate-600">{lead.source ?? "-"}</td>
                      <td className="py-2 text-slate-600">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

