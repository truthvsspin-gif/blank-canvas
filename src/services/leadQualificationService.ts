import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { incrementQualifiedLeads } from "@/services/usageTrackingService"
import type { BusinessContext } from "@/services/businessContextLoader"
import type { NormalizedMessage } from "@/services/messageIngest"
import { detectIntent, type IntentLabel } from "@/services/intentDetectionService"

type QualificationResult = {
  qualified: boolean
  reason: string | null
  email: string | null
  phone: string | null
  bookingIntent: boolean
  intent: IntentLabel
}

function extractEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match ? match[0] : null
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/)
  if (!match) return null
  const digits = match[0].replace(/[^\d+]/g, "")
  return digits.length >= 8 ? digits : null
}

function detectBookingIntent(text: string): boolean {
  const lower = text.toLowerCase()
  const keywords = [
    "book",
    "booking",
    "appointment",
    "schedule",
    "reserve",
    "cita",
    "agendar",
    "reservar",
    "programar",
  ]
  return keywords.some((keyword) => lower.includes(keyword))
}

function buildQualificationReason(params: {
  intent: IntentLabel
  hasContact: boolean
  bookingIntent: boolean
  email?: string | null
  phone?: string | null
}) {
  const parts = [`intent=${params.intent}`]
  if (params.email) parts.push("contact=email")
  if (params.phone) parts.push("contact=phone")
  if (params.bookingIntent) parts.push("explicit_booking=true")
  if (!params.hasContact) parts.push("contact=missing")
  return parts.join("; ")
}

function buildQualificationResult(message: NormalizedMessage): QualificationResult {
  const email = extractEmail(message.message_text)
  const phone =
    extractPhone(message.message_text) ?? extractPhone(message.sender_phone_or_handle ?? "")
  const intent = detectIntent(message.message_text)
  const bookingIntent = detectBookingIntent(message.message_text)
  const hasContact = Boolean(email || phone)
  const qualified =
    (intent === "pricing" || intent === "booking") && (hasContact || bookingIntent)

  const reason = qualified
    ? buildQualificationReason({
        intent,
        hasContact,
        bookingIntent,
        email,
        phone,
      })
    : null

  return {
    qualified,
    reason,
    email: email ?? null,
    phone: phone ?? null,
    bookingIntent,
    intent,
  }
}

async function findOrCreateCustomer(params: {
  businessId: string
  name: string | null
  email: string | null
  phone: string | null
}) {
  const { businessId, name, email, phone } = params
  if (!email && !phone && !name) return null

  const supabase = getSupabaseAdmin()
  const customersTable = supabase.from("customers") as any

  let existing = null as { id?: string } | null
  if (email) {
    const { data } = await customersTable
      .select("id")
      .eq("business_id", businessId)
      .eq("email", email)
      .maybeSingle()
    existing = data as { id?: string } | null
  }
  if (!existing?.id && phone) {
    const { data } = await customersTable
      .select("id")
      .eq("business_id", businessId)
      .eq("phone", phone)
      .maybeSingle()
    existing = data as { id?: string } | null
  }

  if (existing?.id) {
    return existing.id
  }

  const { data: inserted, error } = await customersTable
    .insert({
      business_id: businessId,
      full_name: name ?? "Unknown",
      email,
      phone,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) {
    return null
  }

  return (inserted as { id?: string } | null)?.id ?? null
}

export async function qualifyLeadFromMessage(
  message: NormalizedMessage,
  _context: BusinessContext
): Promise<{
  qualified: boolean
  leadId?: string
  reason?: string | null
  bookingIntent?: boolean
}> {
  const result = buildQualificationResult(message)
  if (!result.qualified) {
    return {
      qualified: false,
      reason: result.reason ?? null,
      bookingIntent: result.bookingIntent,
    }
  }

  if (!message.conversation_id) {
    return { qualified: false }
  }

  const supabase = getSupabaseAdmin()
  const leadsTable = supabase.from("leads") as any

  const customerId = await findOrCreateCustomer({
    businessId: message.business_id,
    name: message.sender_name ?? null,
    email: result.email,
    phone: result.phone,
  })

  const { data: existingLead } = await leadsTable
    .select("id")
    .eq("business_id", message.business_id)
    .eq("conversation_id", message.conversation_id)
    .maybeSingle()

  if (existingLead?.id) {
    await leadsTable
      .update({
        qualification_reason: result.reason,
        email: result.email,
        phone: result.phone,
        customer_id: customerId,
        stage: "qualified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingLead.id)

    return {
      qualified: true,
      leadId: existingLead.id,
      reason: result.reason,
      bookingIntent: result.bookingIntent,
    }
  }

  const { data: insertedLead, error: leadError } = await leadsTable
    .insert({
      business_id: message.business_id,
      email: result.email,
      phone: result.phone,
      conversation_id: message.conversation_id,
      customer_id: customerId,
      name: message.sender_name,
      source: message.channel,
      stage: "qualified",
      qualification_reason: result.reason,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (leadError) {
    throw new Error(leadError.message)
  }

  const leadId = insertedLead?.id
  if (leadId) {
    const conversationsTable = supabase.from("conversations") as any
    await conversationsTable
      .update({ lead_id: leadId })
      .eq("business_id", message.business_id)
      .eq("conversation_id", message.conversation_id)

    await incrementQualifiedLeads(message.business_id, 1)
  }

  return {
    qualified: true,
    leadId: leadId ?? undefined,
    reason: result.reason,
    bookingIntent: result.bookingIntent,
  }
}

