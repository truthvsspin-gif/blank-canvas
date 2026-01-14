import { NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { loadBusinessContext } from "@/services/businessContextLoader"
import { qualifyLeadFromMessage } from "@/services/leadQualificationService"
import { detectIntent } from "@/services/intentDetectionService"
import { recordInboundMessage } from "@/services/inboxService"
import { parseInstagramPayload, parseWhatsAppPayload } from "@/services/messageIngest"
import { sendOutgoingMessage } from "@/services/outgoingMessageService"
import { buildWhatsAppAutoReply } from "@/services/autoReplyService"
import { buildWhatsAppAiReply } from "@/services/aiReplyService"
import { retrieveKnowledgeChunks } from "@/services/knowledgeBaseService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SimulatePayload = {
  businessId: string
  channel: "whatsapp" | "instagram"
  messageText: string
  senderHandle: string
  senderName?: string
}

type FlowStep = {
  step: string
  status: "ok" | "skipped" | "failed"
  detail?: string
  data?: Record<string, unknown> | null
}

function buildWhatsAppPayload(input: SimulatePayload) {
  return {
    business_id: input.businessId,
    entry: [
      {
        id: "dev-entry",
        changes: [
          {
            value: {
              contacts: [
                {
                  profile: { name: input.senderName ?? "Dev User" },
                  wa_id: input.senderHandle,
                },
              ],
              messages: [
                {
                  id: `dev-msg-${Date.now()}`,
                  from: input.senderHandle,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: input.messageText },
                },
              ],
            },
          },
        ],
      },
    ],
  }
}

function buildInstagramPayload(input: SimulatePayload) {
  return {
    business_id: input.businessId,
    entry: [
      {
        id: "dev-entry",
        messaging: [
          {
            sender: { id: input.senderHandle },
            recipient: { id: "dev-business" },
            timestamp: Date.now(),
            message: {
              mid: `dev-mid-${Date.now()}`,
              text: input.messageText,
            },
          },
        ],
      },
    ],
  }
}

async function findServiceMatch(businessId: string, messageText: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("services")
    .select("name")
    .eq("business_id", businessId)
    .eq("is_active", true)

  const lower = messageText.toLowerCase()
  const services = (data ?? []) as { name?: string | null }[]
  const match = services.find(
    (service) => service.name && lower.includes(service.name.toLowerCase())
  )
  return match?.name ?? null
}

function buildBookingLink(requestUrl: string, businessId: string, serviceName?: string | null) {
  const origin = new URL(requestUrl).origin
  const url = new URL("/crm/bookings/new", origin)
  url.searchParams.set("source", "whatsapp")
  url.searchParams.set("business_id", businessId)
  if (serviceName) {
    url.searchParams.set("service", serviceName)
  }
  return url.toString()
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let payload: SimulatePayload | null = null
  try {
    payload = (await request.json()) as SimulatePayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  if (
    !payload?.businessId ||
    !payload?.channel ||
    !payload?.messageText ||
    !payload?.senderHandle
  ) {
    return NextResponse.json(
      { error: "businessId, channel, messageText, senderHandle are required." },
      { status: 400 }
    )
  }

  const steps: FlowStep[] = []

  const ingestPayload =
    payload.channel === "whatsapp"
      ? buildWhatsAppPayload(payload)
      : buildInstagramPayload(payload)

  let normalized
  try {
    normalized =
      payload.channel === "whatsapp"
        ? parseWhatsAppPayload(ingestPayload)
        : parseInstagramPayload(ingestPayload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (normalized.length === 0) {
    return NextResponse.json({ error: "No normalized messages." }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const inbound = normalized[0]
  const intent = detectIntent(inbound.message_text)

  const conversations = supabase.from("conversations") as any
  const { error: insertError } = await conversations.insert({
    business_id: inbound.business_id,
    channel: inbound.channel,
    conversation_id: inbound.conversation_id,
    sender_name: inbound.sender_name,
    sender_phone_or_handle: inbound.sender_phone_or_handle,
    message_text: inbound.message_text,
    message_timestamp: inbound.timestamp,
    message_direction: "inbound",
    intent,
    metadata: inbound.metadata,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  try {
    await recordInboundMessage(inbound, intent)
    steps.push({
      step: "incoming_message",
      status: "ok",
      detail: "Inbound WhatsApp message stored.",
      data: { channel: inbound.channel },
    })
  } catch (error) {
    steps.push({
      step: "incoming_message",
      status: "failed",
      detail: error instanceof Error ? error.message : "Failed to store inbound message.",
    })
  }

  steps.push({
    step: "intent_detection",
    status: "ok",
    detail: `Intent detected: ${intent}`,
    data: { intent },
  })

  const context = await loadBusinessContext(inbound.business_id)
  let qualification: Awaited<ReturnType<typeof qualifyLeadFromMessage>> | null = null
  try {
    qualification = await qualifyLeadFromMessage(inbound, context)
    if (qualification.qualified) {
      steps.push({
        step: "lead_creation",
        status: "ok",
        detail: "Lead qualified and stored.",
        data: { leadId: qualification.leadId ?? null, reason: qualification.reason ?? null },
      })
    } else {
      steps.push({
        step: "lead_creation",
        status: "skipped",
        detail: "Lead not qualified for creation.",
        data: { reason: qualification.reason ?? null },
      })
    }
  } catch (error) {
    steps.push({
      step: "lead_creation",
      status: "failed",
      detail: error instanceof Error ? error.message : "Lead qualification failed.",
    })
  }

  if (payload.channel === "whatsapp") {
    try {
      const autoReply = await buildWhatsAppAutoReply(inbound)
      if (autoReply?.text) {
        await sendOutgoingMessage(inbound, autoReply.text, { dryRun: true })
        steps.push({
          step: "auto_reply",
          status: "ok",
          detail: "Auto-reply sent.",
          data: { rule: autoReply.rule ?? null },
        })
      } else {
        steps.push({
          step: "auto_reply",
          status: "skipped",
          detail: "No auto-reply matched.",
        })
      }
    } catch (error) {
      steps.push({
        step: "auto_reply",
        status: "failed",
        detail: error instanceof Error ? error.message : "Auto-reply failed.",
      })
    }

    try {
      const aiReply = await buildWhatsAppAiReply(inbound)
      if (aiReply?.text) {
        await sendOutgoingMessage(inbound, aiReply.text, { dryRun: true })
        steps.push({
          step: "ai_reply",
          status: "ok",
          detail: "AI reply generated.",
          data: { rule: aiReply.rule ?? null },
        })
      } else {
        const knowledgeChunks = await retrieveKnowledgeChunks(
          inbound.business_id,
          inbound.message_text,
          1
        )
        const chunk = knowledgeChunks[0]?.content ?? ""
        if (chunk.trim()) {
          const trimmed = chunk.replace(/\s+/g, " ").trim()
          const snippet = trimmed.length > 280 ? `${trimmed.slice(0, 277)}...` : trimmed
          const fallbackText = `From our knowledge base: ${snippet}`
          await sendOutgoingMessage(inbound, fallbackText, { dryRun: true })
          steps.push({
            step: "ai_reply",
            status: "ok",
            detail: "Knowledge fallback reply sent.",
            data: { source: "knowledge" },
          })
        } else {
          steps.push({
            step: "ai_reply",
            status: "skipped",
            detail: "AI reply not enabled and no knowledge content found.",
          })
        }
      }
    } catch (error) {
      steps.push({
        step: "ai_reply",
        status: "failed",
        detail: error instanceof Error ? error.message : "AI reply failed.",
      })
    }

    try {
      const bookingIntent = intent === "booking" || Boolean(qualification?.bookingIntent)
      if (bookingIntent) {
        const serviceName = await findServiceMatch(inbound.business_id, inbound.message_text)
        const link = buildBookingLink(request.url, inbound.business_id, serviceName)
        const bookingMessage = `Here is your booking link: ${link}`
        await sendOutgoingMessage(inbound, bookingMessage, { dryRun: true })
        steps.push({
          step: "booking_handoff",
          status: "ok",
          detail: "Booking link sent.",
          data: { link, service: serviceName ?? null },
        })
      } else {
        steps.push({
          step: "booking_handoff",
          status: "skipped",
          detail: "No booking intent detected.",
        })
      }
    } catch (error) {
      steps.push({
        step: "booking_handoff",
        status: "failed",
        detail: error instanceof Error ? error.message : "Booking handoff failed.",
      })
    }
  } else {
    steps.push({
      step: "auto_reply",
      status: "skipped",
      detail: "Auto-reply only runs for WhatsApp.",
    })
    steps.push({
      step: "ai_reply",
      status: "skipped",
      detail: "AI reply only runs for WhatsApp.",
    })
    steps.push({
      step: "booking_handoff",
      status: "skipped",
      detail: "Booking handoff only runs for WhatsApp.",
    })
  }

  const { data: conversationLogs } = await supabase
    .from("conversations")
    .select(
      "id, channel, message_direction, message_text, message_timestamp, metadata, conversation_id"
    )
    .eq("business_id", inbound.business_id)
    .eq("conversation_id", inbound.conversation_id)
    .order("message_timestamp", { ascending: true })

  const { data: lead } = await supabase
    .from("leads")
    .select("id, email, phone, qualification_reason, conversation_id")
    .eq("business_id", inbound.business_id)
    .eq("conversation_id", inbound.conversation_id)
    .maybeSingle()

  return NextResponse.json({
    conversationId: inbound.conversation_id,
    steps,
    lead,
    logs: conversationLogs ?? [],
  })
}
