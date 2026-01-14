// Server-side credentials - these should come from edge function env, not frontend
const serverEnv = {
  whatsappAccessToken: undefined as string | undefined,
  whatsappPhoneNumberId: undefined as string | undefined,
  instagramAccessToken: undefined as string | undefined,
  instagramBusinessId: undefined as string | undefined,
};

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { recordOutboundMessage } from "@/services/inboxService";
import type { NormalizedMessage } from "@/services/messageIngest";

type SendResult = {
  sent: boolean
  failed: boolean
  skipped: boolean
  providerMessageId?: string | null
  error?: string
}

type OutgoingPayload = {
  business_id: string
  channel: "whatsapp" | "instagram"
  conversation_id: string
  sender_name: string | null
  sender_phone_or_handle: string | null
  message_text: string
  message_timestamp: string
  message_direction: "outbound"
  metadata: Record<string, unknown>
}

type IntegrationConfig = {
  whatsappAccessToken?: string | null
  whatsappPhoneNumberId?: string | null
  instagramAccessToken?: string | null
  instagramBusinessId?: string | null
}

function getReplyToId(message: NormalizedMessage): string | null {
  if (!message.metadata || typeof message.metadata !== "object") return null
  const metadata = message.metadata as Record<string, unknown>
  const replyTo =
    (typeof metadata.message_id === "string" && metadata.message_id) ||
    (typeof metadata.message_mid === "string" && metadata.message_mid) ||
    null
  return replyTo
}

async function alreadyResponded(
  message: NormalizedMessage,
  replyToId: string | null,
  responseText: string
) {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from("conversations")
    .select("id")
    .eq("business_id", message.business_id)
    .eq("conversation_id", message.conversation_id)
    .eq("channel", message.channel)
    .eq("message_direction", "outbound")

  if (replyToId) {
    query = query.eq("metadata->>reply_to", replyToId)
  } else {
    query = query.eq("message_text", responseText)
  }

  const { data } = await (query as any).limit(1).maybeSingle()
  return Boolean((data as { id?: string } | null)?.id)
}

async function logOutgoingMessage(payload: OutgoingPayload) {
  const supabase = getSupabaseAdmin()
  const conversationsTable = supabase.from("conversations") as any
  const { error } = await conversationsTable.insert(payload)
  if (error) {
    throw new Error(error.message)
  }
}

async function loadIntegrationConfig(businessId: string): Promise<IntegrationConfig> {
  const supabase = getSupabaseAdmin()
  const integrationsTable = supabase.from("business_integrations") as any
  const { data } = await integrationsTable
    .select(
      "whatsapp_access_token, whatsapp_phone_number_id, instagram_access_token, instagram_business_id"
    )
    .eq("business_id", businessId)
    .maybeSingle()
  const record = data as
    | {
        whatsapp_access_token?: string | null
        whatsapp_phone_number_id?: string | null
        instagram_access_token?: string | null
        instagram_business_id?: string | null
      }
    | null
  return {
    whatsappAccessToken: record?.whatsapp_access_token ?? null,
    whatsappPhoneNumberId: record?.whatsapp_phone_number_id ?? null,
    instagramAccessToken: record?.instagram_access_token ?? null,
    instagramBusinessId: record?.instagram_business_id ?? null,
  }
}

async function sendWhatsApp(
  to: string,
  text: string,
  config: IntegrationConfig
) {
  const token = config.whatsappAccessToken ?? serverEnv.whatsappAccessToken;
  const phoneNumberId = config.whatsappPhoneNumberId ?? serverEnv.whatsappPhoneNumberId;
  if (!token || !phoneNumberId) {
    throw new Error("Missing WhatsApp credentials.")
  }
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        text: { body: text },
      }),
    }
  )
  const payload = (await response.json().catch(() => null)) as
    | { messages?: Array<{ id?: string }> }
    | { error?: { message?: string } }
    | null

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ??
      "WhatsApp send failed."
    throw new Error(message)
  }
  const messageId =
    (payload as { messages?: Array<{ id?: string }> } | null)?.messages?.[0]?.id ??
    null
  return { messageId }
}

async function sendInstagram(
  recipientId: string,
  text: string,
  config: IntegrationConfig
) {
  const token = config.instagramAccessToken ?? serverEnv.instagramAccessToken;
  const businessId = config.instagramBusinessId ?? serverEnv.instagramBusinessId;
  if (!token || !businessId) {
    throw new Error("Missing Instagram credentials.")
  }
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${businessId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_type: "RESPONSE",
        recipient: { id: recipientId },
        message: { text },
      }),
    }
  )
  const payload = (await response.json().catch(() => null)) as
    | { message_id?: string }
    | { error?: { message?: string } }
    | null

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ??
      "Instagram send failed."
    throw new Error(message)
  }
  const messageId =
    (payload as { message_id?: string } | null)?.message_id ?? null
  return { messageId }
}

export async function sendOutgoingMessage(
  message: NormalizedMessage,
  responseText: string,
  options?: { dryRun?: boolean }
): Promise<SendResult> {
  const trimmed = responseText.trim()
  if (!trimmed) {
    return { sent: false, failed: false, skipped: true }
  }
  if (!message.sender_phone_or_handle) {
    return {
      sent: false,
      failed: true,
      skipped: false,
      error: "Missing recipient handle.",
    }
  }

  const replyToId = getReplyToId(message)
  if (await alreadyResponded(message, replyToId, trimmed)) {
    return { sent: false, failed: false, skipped: true }
  }

  const integrationConfig = await loadIntegrationConfig(message.business_id)

  const outboundBase: OutgoingPayload = {
    business_id: message.business_id,
    channel: message.channel,
    conversation_id: message.conversation_id,
    sender_name: "Chatbot",
    sender_phone_or_handle: message.sender_phone_or_handle,
    message_text: trimmed,
    message_timestamp: new Date().toISOString(),
    message_direction: "outbound",
    metadata: {
      direction: "outbound",
      reply_to: replyToId,
    },
  }

  try {
    let providerMessageId: string | null = null
    if (!options?.dryRun) {
      if (message.channel === "whatsapp") {
        const result = await sendWhatsApp(
          message.sender_phone_or_handle,
          trimmed,
          integrationConfig
        )
        providerMessageId = result.messageId ?? null
      } else {
        const result = await sendInstagram(
          message.sender_phone_or_handle,
          trimmed,
          integrationConfig
        )
        providerMessageId = result.messageId ?? null
      }
    }

    await logOutgoingMessage({
      ...outboundBase,
      metadata: {
        ...outboundBase.metadata,
        provider_message_id: providerMessageId,
        status: options?.dryRun ? "mocked" : "sent",
      },
    })

    try {
      await recordOutboundMessage(message, trimmed, {
        ...outboundBase.metadata,
        provider_message_id: providerMessageId,
        status: options?.dryRun ? "mocked" : "sent",
      })
    } catch {
      // Intentionally swallow inbox logging errors.
    }

    return { sent: true, failed: false, skipped: false, providerMessageId }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send message."
    try {
      await logOutgoingMessage({
        ...outboundBase,
        metadata: {
          ...outboundBase.metadata,
          status: "failed",
          error: errorMessage,
        },
      })
    } catch {
      // Intentionally swallow logging errors to avoid webhook failure.
    }
    return { sent: false, failed: true, skipped: false, error: errorMessage }
  }
}
