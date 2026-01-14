import { NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { loadBusinessContext } from "@/services/businessContextLoader"
import { qualifyLeadFromMessage } from "@/services/leadQualificationService"
import { detectIntent } from "@/services/intentDetectionService"
import { recordInboundMessage } from "@/services/inboxService"
import { parseInstagramPayload } from "@/services/messageIngest"
import { runChatbotPipeline } from "@/services/chatbotPipeline"
import { sendOutgoingMessage } from "@/services/outgoingMessageService"
import { trackConversationWindow } from "@/services/usageTrackingService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const url = new URL(request.url)
  const businessIdFromRequest =
    url.searchParams.get("business_id") ?? request.headers.get("x-business-id")
  if (
    businessIdFromRequest &&
    payload &&
    typeof payload === "object" &&
    !("business_id" in payload)
  ) {
    payload = {
      ...(payload as Record<string, unknown>),
      business_id: businessIdFromRequest,
    }
  }

  let messages
  try {
    messages = parseInstagramPayload(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Instagram payload."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (messages.length === 0) {
    return NextResponse.json({ received: 0 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const conversations = supabase.from("conversations") as any
    const { error } = await conversations.insert(
      messages.map((message) => ({
        business_id: message.business_id,
        channel: message.channel,
        conversation_id: message.conversation_id,
        sender_name: message.sender_name,
        sender_phone_or_handle: message.sender_phone_or_handle,
        message_text: message.message_text,
        message_timestamp: message.timestamp,
        message_direction: "inbound",
        intent: detectIntent(message.message_text),
        metadata: message.metadata,
      }))
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await Promise.all(messages.map((message) => recordInboundMessage(message, detectIntent(message.message_text))))
      const tracked = new Set<string>()
      await Promise.all(
        messages
          .filter((message) => {
            const key = message.sender_phone_or_handle || message.conversation_id
            if (!key || tracked.has(key)) return false
            tracked.add(key)
            return true
          })
          .map((message) => trackConversationWindow(message))
      )
    } catch {
      // Intentionally swallow inbox logging errors.
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to store Instagram messages."
    return NextResponse.json({ error: message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const message of messages) {
    try {
      const context = await loadBusinessContext(message.business_id)
      await qualifyLeadFromMessage(message, context)
      const pipelineResult = await runChatbotPipeline(message)
      const outgoingResult = await sendOutgoingMessage(message, pipelineResult.responseText)
      if (outgoingResult.sent) {
        sent += 1
      } else if (outgoingResult.failed) {
        failed += 1
      }
    } catch {
      failed += 1
    }
  }

  return NextResponse.json({ received: messages.length, sent, failed })
}
