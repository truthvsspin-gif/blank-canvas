import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import type { NormalizedMessage } from "@/services/messageIngest"

type ThreadRecord = {
  id: string
  unread_count: number
  contact_name: string | null
  contact_handle: string | null
}

function buildThreadKey(message: NormalizedMessage) {
  return message.sender_phone_or_handle || message.conversation_id
}

async function ensureThread(params: {
  message: NormalizedMessage
  direction: "inbound" | "outbound"
  messageText: string
  messageTimestamp: string
  metadata?: Record<string, unknown>
  senderName?: string | null
  senderHandle?: string | null
  intent?: string | null
}) {
  const { message, direction, messageText, messageTimestamp, metadata } = params
  const supabase = getSupabaseAdmin()
  const threadsTable = supabase.from("inbox_threads") as any
  const threadKey = buildThreadKey(message)

  const { data } = await threadsTable
    .select("id, unread_count, contact_name, contact_handle, last_intent")
    .eq("business_id", message.business_id)
    .eq("channel", message.channel)
    .eq("conversation_id", threadKey)
    .maybeSingle()

  const existing = data as (ThreadRecord & { last_intent?: string | null }) | null

  const now = new Date().toISOString()
  const nextUnread = direction === "inbound"
    ? (existing?.unread_count ?? 0) + 1
    : 0

  const payload = {
    business_id: message.business_id,
    channel: message.channel,
    conversation_id: threadKey,
    contact_name: params.senderName ?? existing?.contact_name ?? null,
    contact_handle: params.senderHandle ?? existing?.contact_handle ?? null,
    status: "open",
    unread_count: nextUnread,
    last_message_text: messageText,
    last_message_direction: direction,
    last_message_at: messageTimestamp,
    last_intent: params.intent ?? existing?.last_intent ?? null,
    metadata: {
      last_message_metadata: metadata ?? null,
    },
    updated_at: now,
  }

  if (existing?.id) {
    const { error } = await threadsTable
      .update(payload)
      .eq("id", existing.id)
    if (error) {
      throw new Error(error.message)
    }
    return existing.id
  }

  const { data: inserted, error } = await threadsTable
    .insert({
      ...payload,
      created_at: now,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return (inserted as { id: string }).id
}

async function recordMessage(params: {
  message: NormalizedMessage
  direction: "inbound" | "outbound"
  messageText: string
  messageTimestamp: string
  metadata?: Record<string, unknown>
  senderName?: string | null
  senderHandle?: string | null
  intent?: string | null
}) {
  const supabase = getSupabaseAdmin()
  const inboxMessagesTable = supabase.from("inbox_messages") as any
  const messagesTable = supabase.from("messages") as any
  const threadId = await ensureThread(params)
  const threadKey = buildThreadKey(params.message)

  const { error } = await inboxMessagesTable
    .insert({
      business_id: params.message.business_id,
      thread_id: threadId,
      channel: params.message.channel,
      conversation_id: threadKey,
      direction: params.direction,
      sender_name: params.senderName ?? null,
      sender_handle: params.senderHandle ?? null,
      message_text: params.messageText,
      message_timestamp: params.messageTimestamp,
      metadata: params.metadata ?? {},
    })

  if (error) {
    throw new Error(error.message)
  }

  const { error: messageError } = await messagesTable
    .insert({
      business_id: params.message.business_id,
      conversation_id: threadKey,
      direction: params.direction,
      sender: params.senderName ?? params.senderHandle ?? null,
      message_text: params.messageText,
      timestamp: params.messageTimestamp,
      channel: params.message.channel,
    })

  if (messageError) {
    throw new Error(messageError.message)
  }

  return { threadId }
}

export async function recordInboundMessage(message: NormalizedMessage, intent?: string | null) {
  return recordMessage({
    message,
    direction: "inbound",
    messageText: message.message_text,
    messageTimestamp: message.timestamp,
    metadata: message.metadata,
    senderName: message.sender_name ?? null,
    senderHandle: message.sender_phone_or_handle ?? null,
    intent: intent ?? null,
  })
}

export async function recordOutboundMessage(
  message: NormalizedMessage,
  responseText: string,
  metadata?: Record<string, unknown>
) {
  return recordMessage({
    message,
    direction: "outbound",
    messageText: responseText,
    messageTimestamp: new Date().toISOString(),
    metadata,
    senderName: "Chatbot",
    senderHandle: message.sender_phone_or_handle ?? null,
  })
}
