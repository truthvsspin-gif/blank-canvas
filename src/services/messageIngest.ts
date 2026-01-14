export type NormalizedMessage = {
  business_id: string
  channel: "whatsapp" | "instagram"
  conversation_id: string
  sender_name: string | null
  sender_phone_or_handle: string | null
  message_text: string
  timestamp: string
  metadata: Record<string, unknown>
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1000
    return new Date(ms).toISOString()
  }
  if (typeof value === "string") {
    if (/^\d+$/.test(value)) {
      const parsed = Number.parseInt(value, 10)
      const ms = value.length > 10 ? parsed : parsed * 1000
      return new Date(ms).toISOString()
    }
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString()
    }
  }
  return new Date().toISOString()
}

function requireBusinessId(payload: unknown): string {
  if (payload && typeof payload === "object" && "business_id" in payload) {
    const businessId = (payload as { business_id?: unknown }).business_id
    if (typeof businessId === "string" && businessId.trim()) {
      return businessId.trim()
    }
  }
  throw new Error("Missing required business_id in webhook payload.")
}

export function parseWhatsAppPayload(payload: unknown): NormalizedMessage[] {
  const businessId = requireBusinessId(payload)
  const entries = Array.isArray((payload as { entry?: unknown }).entry)
    ? (payload as { entry: Array<Record<string, unknown>> }).entry
    : []

  const messages: NormalizedMessage[] = []

  if (entries.length === 0) {
    throw new Error("Invalid WhatsApp payload: missing entry array.")
  }

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []
    for (const change of changes) {
      const value = (change as { value?: Record<string, unknown> }).value ?? {}
      const contacts = Array.isArray(value.contacts) ? value.contacts : []
      const contact = contacts[0] as
        | { profile?: { name?: string }; wa_id?: string }
        | undefined
      const contactName = contact?.profile?.name ?? null
      const contactId = contact?.wa_id ?? null
      const waMessages = Array.isArray(value.messages) ? value.messages : []

      for (const message of waMessages) {
        const textBody = (message as { text?: { body?: unknown } })?.text?.body
        if (typeof textBody !== "string" || !textBody.trim()) {
          continue
        }
        const from = (message as { from?: unknown })?.from
        const messageId = (message as { id?: unknown })?.id
        const contextId = (message as { context?: { id?: unknown } })?.context?.id
        const timestamp = normalizeTimestamp((message as { timestamp?: unknown })?.timestamp)

        const senderHandle = typeof from === "string" ? from : contactId
        const conversationId =
          (typeof contextId === "string" && contextId) ||
          (typeof messageId === "string" && messageId) ||
          senderHandle ||
          "whatsapp"

        messages.push({
          business_id: businessId,
          channel: "whatsapp",
          conversation_id: conversationId,
          sender_name: contactName,
          sender_phone_or_handle: senderHandle,
          message_text: textBody.trim(),
          timestamp,
          metadata: {
            provider: "whatsapp",
            message_id: messageId ?? null,
            entry_id: entry?.id ?? null,
          },
        })
      }
    }
  }

  return messages
}

export function parseInstagramPayload(payload: unknown): NormalizedMessage[] {
  const businessId = requireBusinessId(payload)
  const entries = Array.isArray((payload as { entry?: unknown }).entry)
    ? (payload as { entry: Array<Record<string, unknown>> }).entry
    : []

  const messages: NormalizedMessage[] = []

  if (entries.length === 0) {
    throw new Error("Invalid Instagram payload: missing entry array.")
  }

  for (const entry of entries) {
    const messagingEvents = Array.isArray(entry?.messaging) ? entry.messaging : []
    for (const event of messagingEvents) {
      const messageText = (event as { message?: { text?: unknown } })?.message?.text
      if (typeof messageText !== "string" || !messageText.trim()) {
        continue
      }
      const senderId = (event as { sender?: { id?: unknown } })?.sender?.id
      const recipientId = (event as { recipient?: { id?: unknown } })?.recipient?.id
      const messageMid = (event as { message?: { mid?: unknown } })?.message?.mid
      const timestamp = normalizeTimestamp((event as { timestamp?: unknown })?.timestamp)

      const senderHandle = typeof senderId === "string" ? senderId : null
      const conversationId =
        (typeof messageMid === "string" && messageMid) ||
        (typeof recipientId === "string" && recipientId) ||
        senderHandle ||
        "instagram"

      messages.push({
        business_id: businessId,
        channel: "instagram",
        conversation_id: conversationId,
        sender_name: null,
        sender_phone_or_handle: senderHandle,
        message_text: messageText.trim(),
        timestamp,
        metadata: {
          provider: "instagram",
          message_mid: messageMid ?? null,
          entry_id: entry?.id ?? null,
        },
      })
    }
  }

  return messages
}
