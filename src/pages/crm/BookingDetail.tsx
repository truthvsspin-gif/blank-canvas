import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Bot, Loader2, Save, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useAuth } from "@/hooks/useAuth"
import { Booking, Customer, Service, Vehicle } from "@/types/crm"
import { NotesPanel } from "@/components/crm/notes-panel"
import {
  BOOKING_SOURCE_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  createWorkOrderNo,
  normalizeBookingStatus,
  requiresWorkOrder,
} from "@/lib/crm-bookings"

type LeadDetail = {
  id: string
  name: string | null
  stage: string | null
  qualification_reason: string | null
}

type StaffOption = {
  user_id: string
  role: string
  users: { full_name: string | null; email: string | null } | null
}

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>()
  const bookingId = params?.id || ""
  const { businessId } = useCurrentBusiness()
  const { user } = useAuth()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [leads, setLeads] = useState<LeadDetail[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedLead = useMemo(() => {
    if (!booking?.lead_id) return null
    return leads.find((lead) => lead.id === booking.lead_id) || null
  }, [booking?.lead_id, leads])

  useEffect(() => {
    const load = async () => {
      if (!businessId || !bookingId) return
      setLoading(true)
      setError(null)
      const [bookingRes, customersRes, servicesRes, leadsRes, staffRes] = await Promise.all([
        supabase.from("bookings").select("*").eq("business_id", businessId).eq("id", bookingId).single(),
        supabase.from("customers").select("id, full_name").eq("business_id", businessId),
        supabase.from("services").select("*").eq("business_id", businessId).order("name", { ascending: true }),
        supabase
          .from("leads")
          .select("id, name, stage, qualification_reason")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("memberships")
          .select("user_id, role, users(full_name, email)")
          .eq("business_id", businessId)
          .order("created_at", { ascending: true }),
      ])

      if (bookingRes.error) {
        setError(bookingRes.error.message)
        setBooking(null)
      } else {
        const row = bookingRes.data as Booking
        setBooking(row)
        setSelectedCustomerId(row.customer_id || "")
      }
      setCustomers((customersRes.data as Customer[]) || [])
      setServices((servicesRes.data as Service[]) || [])
      setLeads((leadsRes.data as LeadDetail[]) || [])
      setStaff((staffRes.data as StaffOption[]) || [])
      setLoading(false)
    }
    load()
  }, [businessId, bookingId])

  useEffect(() => {
    const loadVehicles = async () => {
      if (!businessId || !selectedCustomerId) {
        setVehicles([])
        return
      }
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .eq("business_id", businessId)
        .eq("customer_id", selectedCustomerId)
        .order("created_at", { ascending: false })
      setVehicles((data as Vehicle[]) || [])
    }
    loadVehicles()
  }, [businessId, selectedCustomerId])

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!businessId || !booking) return
    setSaving(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const nextStatus = normalizeBookingStatus((form.get("status") as string) || booking.status)
    const payload: Record<string, unknown> = {
      customer_id: (form.get("customer_id") as string) || null,
      vehicle_id: (form.get("vehicle_id") as string) || null,
      service_name: (form.get("service_name") as string) || booking.service_name,
      price: form.get("price") ? Number(form.get("price")) : null,
      status: nextStatus,
      source: (form.get("source") as string) || "manual",
      lead_id: (form.get("lead_id") as string) || null,
      assigned_to: (form.get("assigned_to") as string) || null,
      confirmation_notes: (form.get("confirmation_notes") as string) || null,
      updated_at: new Date().toISOString(),
    }
    if (requiresWorkOrder(nextStatus) && !booking.work_order_no) {
      payload.work_order_no = createWorkOrderNo(booking.id)
    }

    const { data, error: updateError } = await supabase
      .from("bookings")
      .update(payload)
      .eq("business_id", businessId)
      .eq("id", booking.id)
      .select("*")
      .single()
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setBooking(data as Booking)
  }

  const handleDelete = async () => {
    if (!businessId || !booking) return
    setDeleting(true)
    const { error: deleteError } = await supabase.from("bookings").delete().eq("business_id", businessId).eq("id", booking.id)
    setDeleting(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    window.location.href = "/crm/bookings"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading...
      </div>
    )
  }

  if (!booking) {
    return <div className="text-sm text-destructive">Booking not found.</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Detail"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/crm/bookings">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Trash2 className="mr-2 size-4" />}
              Delete
            </Button>
          </div>
        }
      />

      {error && <div className="rounded border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Operational Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <select name="customer_id" defaultValue={booking.customer_id || ""} onChange={(e) => setSelectedCustomerId(e.target.value)} className="rounded border px-3 py-2">
                  <option value="">Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.full_name}</option>
                  ))}
                </select>
                <select name="vehicle_id" defaultValue={booking.vehicle_id || ""} className="rounded border px-3 py-2">
                  <option value="">Vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {[vehicle.brand, vehicle.model, vehicle.license_plate].filter(Boolean).join(" ")}
                    </option>
                  ))}
                </select>
                <select name="service_name" defaultValue={booking.service_name} className="rounded border px-3 py-2">
                  <option value="">Service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.name}>{service.name}</option>
                  ))}
                </select>
                <input name="price" type="number" min="0" step="0.01" defaultValue={booking.price ?? ""} placeholder="Price" className="rounded border px-3 py-2" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select name="status" defaultValue={normalizeBookingStatus(booking.status)} className="rounded border px-3 py-2">
                  {BOOKING_STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>{status.labelEn}</option>
                  ))}
                </select>
                <select name="source" defaultValue={booking.source || "manual"} className="rounded border px-3 py-2">
                  {BOOKING_SOURCE_OPTIONS.map((source) => (
                    <option key={source.value} value={source.value}>{source.labelEn}</option>
                  ))}
                </select>
                <select name="lead_id" defaultValue={booking.lead_id || ""} className="rounded border px-3 py-2">
                  <option value="">Lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>{(lead.name || lead.id.slice(0, 8)) + (lead.stage ? ` (${lead.stage})` : "")}</option>
                  ))}
                </select>
                <select name="assigned_to" defaultValue={booking.assigned_to || user?.id || ""} className="rounded border px-3 py-2">
                  <option value="">Unassigned</option>
                  <option value={user?.id || ""}>Me</option>
                  {staff.filter((member) => member.user_id !== user?.id).map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.users?.full_name || member.users?.email || member.user_id} ({member.role})
                    </option>
                  ))}
                </select>
              </div>
              <input
                name="confirmation_notes"
                defaultValue={booking.confirmation_notes || ""}
                placeholder="Confirmation notes"
                className="w-full rounded border px-3 py-2"
              />
              <Button type="submit" disabled={saving} className="bg-rose-600 text-white hover:bg-rose-500">
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-600" />
                Lead Context
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {selectedLead ? (
                <>
                  <p className="font-medium">{selectedLead.name || selectedLead.id}</p>
                  <p className="text-muted-foreground">{selectedLead.stage || "-"}</p>
                  <p className="text-muted-foreground">{selectedLead.qualification_reason || "No lead summary."}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No lead linked.</p>
              )}
              {booking.work_order_no && <p className="mt-2 font-medium">Work order: {booking.work_order_no}</p>}
            </CardContent>
          </Card>
          <NotesPanel entityId={booking.id} entityType="booking" />
        </div>
      </div>
    </div>
  )
}
