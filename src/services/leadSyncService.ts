import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
type LeadSyncInput = {
  leadId: string
  businessId: string
  conversationId: string
  senderName: string | null
  senderPhone: string | null
  bookingIntent?: boolean
  selectedService?: string | null
}

function buildNoteMessage(entry: {
  channel: string | null
  sender: string | null
  text: string | null
  timestamp: string | null
}) {
  const parts = [
    entry.timestamp ? `[${entry.timestamp}]` : null,
    entry.channel ? `[${entry.channel}]` : null,
    entry.sender ? `${entry.sender}:` : null,
    entry.text ?? null,
  ].filter(Boolean)
  return parts.join(" ")
}

export async function syncLeadToCrm(input: LeadSyncInput) {
  const supabase = getSupabaseAdmin()

  const leadsTable = supabase.from("leads") as any
  const { data: lead } = await leadsTable
    .select("id, business_id, email, phone, name")
    .eq("id", input.leadId)
    .eq("business_id", input.businessId)
    .single()

  if (!lead) return

  let customerId: string | null = null

  if (lead.email || lead.phone) {
    let customerQuery = (supabase.from("customers") as any)
      .select("id")
      .eq("business_id", input.businessId)

    if (lead.email && lead.phone) {
      customerQuery = customerQuery.or(
        `email.eq.${lead.email},phone.eq.${lead.phone}`
      )
    } else if (lead.email) {
      customerQuery = customerQuery.eq("email", lead.email)
    } else if (lead.phone) {
      customerQuery = customerQuery.eq("phone", lead.phone)
    }

    const { data: existingCustomer } = await customerQuery.limit(1).maybeSingle()
    customerId = existingCustomer?.id ?? null
  }

  if (!customerId) {
    const customersTable = supabase.from("customers") as any
    const { data: createdCustomer, error: customerError } = await customersTable
      .insert({
        business_id: input.businessId,
        full_name: lead.name ?? input.senderName ?? "Unknown",
        email: lead.email,
        phone: lead.phone ?? input.senderPhone,
        tags: ["lead"],
      })
      .select("id")
      .single()

    if (customerError) {
      throw new Error(customerError.message)
    }
    customerId = createdCustomer?.id ?? null
  }

  if (!customerId) return

  const conversationsTable = supabase.from("conversations") as any
  const { data: conversationMessages } = await conversationsTable
    .select("channel, sender_name, sender_phone_or_handle, message_text, message_timestamp")
    .eq("business_id", input.businessId)
    .eq("conversation_id", input.conversationId)
    .order("message_timestamp", { ascending: true })

  if (conversationMessages && conversationMessages.length > 0) {
    const noteMessages = (conversationMessages as Array<{
      channel?: string | null
      sender_name?: string | null
      sender_phone_or_handle?: string | null
      message_text?: string | null
      message_timestamp?: string | null
    }>).map((entry) =>
      buildNoteMessage({
        channel: entry.channel ?? null,
        sender: entry.sender_name ?? entry.sender_phone_or_handle ?? null,
        text: entry.message_text ?? null,
        timestamp: entry.message_timestamp ?? null,
      })
    )

    const notesTable = supabase.from("notes") as any
    const { data: existingNotes } = await notesTable
      .select("message")
      .eq("business_id", input.businessId)
      .eq("entity_type", "customer")
      .eq("entity_id", customerId)
      .in("message", noteMessages)

    const existingSet = new Set(
      (existingNotes as Array<{ message?: string | null }> | null | undefined ?? []).map(
        (note) => note.message ?? ""
      )
    )
    const newNotes = noteMessages
      .filter((note) => note && !existingSet.has(note))
      .map((note) => ({
        business_id: input.businessId,
        entity_type: "customer",
        entity_id: customerId,
        message: note,
      }))

    if (newNotes.length > 0) {
      await notesTable.insert(newNotes)
    }
  }

  if (input.bookingIntent) {
    const bookingsTable = supabase.from("bookings") as any
    const { data: existingBooking } = await bookingsTable
      .select("id")
      .eq("business_id", input.businessId)
      .eq("customer_id", customerId)
      .eq("source", "chatbot")
      .eq("status", "pending")
      .is("scheduled_at", null)
      .limit(1)
      .maybeSingle()

    if (!existingBooking?.id) {
      await bookingsTable.insert({
        business_id: input.businessId,
        customer_id: customerId,
        service_name: input.selectedService ?? "TBD",
        status: "pending",
        source: "chatbot",
      })
    }
  }
}
