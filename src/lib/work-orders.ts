import { SupabaseClient } from "@supabase/supabase-js"

import { Booking } from "@/types/crm"
import { normalizeBookingStatus } from "@/lib/crm-bookings"

function toWorkOrderStatus(bookingStatus: string) {
  const normalized = normalizeBookingStatus(bookingStatus)
  if (normalized === "completed") return "completed"
  if (normalized === "in_progress") return "in_progress"
  if (normalized === "cancelled" || normalized === "no_show") return "cancelled"
  return "open"
}

export async function ensureWorkOrderForBooking(supabase: SupabaseClient, booking: Booking) {
  const normalizedStatus = normalizeBookingStatus(booking.status)
  if (!["confirmed", "in_progress", "completed"].includes(normalizedStatus)) return null

  const { data: existing } = await supabase
    .from("work_orders")
    .select("id")
    .eq("business_id", booking.business_id)
    .eq("booking_id", booking.id)
    .maybeSingle()

  const payload = {
    business_id: booking.business_id,
    booking_id: booking.id,
    customer_id: booking.customer_id,
    vehicle_id: booking.vehicle_id,
    service_name: booking.service_name,
    status: toWorkOrderStatus(booking.status),
    assigned_to: booking.assigned_to,
    scheduled_at: booking.scheduled_at,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("work_orders")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase.from("work_orders").insert(payload).select("*").single()
  if (error) throw error
  return data
}
