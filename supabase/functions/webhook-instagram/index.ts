// @ts-nocheck - Deno edge function, uses Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function logAiFailureEvent(
  supabase: any,
  businessId: string | null,
  functionName: string,
  errorMessage: string,
  context: Record<string, unknown> = {}
) {
  if (!businessId) return;
  try {
    await supabase.from("ai_failure_events").insert({
      business_id: businessId,
      function_name: functionName,
      error_message: errorMessage,
      context,
    });
  } catch (logError) {
    console.error("[webhook-instagram] Failed to log AI failure event:", logError);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ── GET: Meta webhook verification ──
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Instagram verification request - mode:", mode, "token:", token);

    if (mode === "subscribe" && token) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: integration, error } = await supabase
        .from("business_integrations")
        .select("business_id, webhook_verify_token")
        .eq("webhook_verify_token", token)
        .maybeSingle();

      console.log("Token lookup result:", integration ? "found" : "not found", error?.message || "");

      if (integration?.webhook_verify_token === token) {
        console.log("Instagram webhook verified for business:", integration.business_id);
        return new Response(challenge, { status: 200 });
      }

      // Fallback to env variable for legacy support
      const envToken = Deno.env.get("META_VERIFY_TOKEN");
      if (envToken && token === envToken) {
        console.log("Instagram webhook verified via env token");
        return new Response(challenge, { status: 200 });
      }
    }

    console.log("Instagram webhook verification failed");
    return new Response("Forbidden", { status: 403 });
  }

  // ── POST: Incoming message ──
  if (req.method === "POST") {
    let requestBusinessId: string | null = null;
    try {
      const payload = await req.json();
      console.log("Instagram webhook payload:", JSON.stringify(payload));

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const businessId = payload.business_id || url.searchParams.get("business_id");
      requestBusinessId = businessId || null;

      if (!businessId) {
        console.error("Missing business_id in webhook payload");
        return new Response(JSON.stringify({ error: "Missing business_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("chatbot_enabled, ai_reply_enabled, language_preference, greeting_message, office_hours")
        .eq("id", businessId)
        .single();

      if (!business?.chatbot_enabled) {
        console.log("Chatbot disabled for business:", businessId);
        return new Response(JSON.stringify({ status: "chatbot_disabled" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const messages = parseInstagramPayload(payload, businessId);

      if (messages.length === 0) {
        return new Response(JSON.stringify({ status: "no_messages" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];

      for (const message of messages) {
        const intent = detectIntent(message.message_text);
        const threadId = await ensureThread(supabase, message, "inbound", intent);
        await recordMessage(supabase, message, threadId, "inbound", intent);
        await trackConversationWindow(supabase, message);

        // Delegate AI response to ai-chat (handles state machine, flyers, lead qualification)
        if (business.ai_reply_enabled) {
          const aiResult = await delegateToAiChat(supabase, message);

          if (aiResult?.reply) {
            await recordMessage(
              supabase,
              { ...message, message_text: aiResult.reply },
              threadId,
              "outbound",
              null
            );

            await sendInstagramMessage(supabase, businessId, message.sender_phone_or_handle!, aiResult.reply);

            results.push({
              conversation_id: message.conversation_id,
              response_sent: true,
              intent,
              handoff_required: aiResult.handoffRequired,
            });
          }
        }

        results.push({ conversation_id: message.conversation_id, recorded: true, intent });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const error = err as Error;
      console.error("Instagram webhook error:", error);
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await logAiFailureEvent(supabase, requestBusinessId, "webhook-instagram", error.message, {
          scope: "handler",
        });
      } catch (_inner) {
        // ignore secondary logging errors
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});

// ============= Helper Functions =============

type NormalizedMessage = {
  business_id: string;
  channel: "whatsapp" | "instagram";
  conversation_id: string;
  sender_name: string | null;
  sender_phone_or_handle: string | null;
  message_text: string;
  timestamp: string;
  metadata: Record<string, unknown>;
};

function parseInstagramPayload(payload: any, businessId: string): NormalizedMessage[] {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const messages: NormalizedMessage[] = [];

  for (const entry of entries) {
    const messagingEvents = Array.isArray(entry?.messaging) ? entry.messaging : [];

    for (const event of messagingEvents) {
      const messageText = event?.message?.text;
      if (typeof messageText !== "string" || !messageText.trim()) continue;

      const senderId = event?.sender?.id;
      const recipientId = event?.recipient?.id;
      const messageMid = event?.message?.mid;
      const timestamp = normalizeTimestamp(event?.timestamp);
      const senderHandle = typeof senderId === "string" ? senderId : null;
      const conversationId = messageMid || recipientId || senderHandle || "instagram";

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
      });
    }
  }

  return messages;
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  return new Date().toISOString();
}

/** Lightweight intent detection – only used to tag inbox_threads.last_intent for CRM */
function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  const intents: Record<string, string[]> = {
    pricing: ["price", "pricing", "cost", "quote", "precio", "costo", "cotizacion", "cuanto", "how much"],
    services: ["service", "services", "servicio", "servicios", "what do you offer", "que ofrecen", "menu", "menú"],
    packages: ["package", "packages", "paquete", "paquetes", "combo", "deal", "promocion", "promo"],
    booking: ["book", "booking", "appointment", "reserve", "schedule", "cita", "agendar", "reservar"],
    availability: ["availability", "available", "slots", "open", "hours", "horario", "disponible"],
  };

  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some((kw) => lower.includes(kw))) return intent;
  }
  return "general_question";
}

// ── ai-chat delegation ──

async function delegateToAiChat(
  supabase: any,
  message: NormalizedMessage
): Promise<{ reply: string; handoffRequired: boolean } | null> {
  const threadKey = message.sender_phone_or_handle || message.conversation_id;

  // If already handed off, stop responding
  const { data: existingConversation } = await supabase
    .from("conversations")
    .select("handoff_required")
    .eq("conversation_id", threadKey)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConversation?.handoff_required) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        businessId: message.business_id,
        userMessage: message.message_text,
        conversationId: threadKey,
        customerIdentifier: message.sender_phone_or_handle || threadKey,
        customerName: message.sender_name,
        channel: message.channel,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ai-chat error:", response.status, errorText);
      await logAiFailureEvent(supabase, message.business_id, "webhook-instagram", `ai-chat HTTP ${response.status}`, {
        scope: "delegateToAiChat",
        details: errorText?.slice(0, 1000),
      });
      return null;
    }

    const data = await response.json();
    return data?.reply ? { reply: data.reply, handoffRequired: !!data.handoffRequired } : null;
  } catch (error) {
    console.error("AI response generation failed:", error);
    await logAiFailureEvent(supabase, message.business_id, "webhook-instagram", (error as Error)?.message || "Unknown AI error", {
      scope: "delegateToAiChat",
    });
    return null;
  }
}

// ── Thread & message persistence ──

async function ensureThread(
  supabase: any,
  message: NormalizedMessage,
  direction: string,
  intent: string | null
): Promise<string> {
  const threadKey = message.sender_phone_or_handle || message.conversation_id;

  const { data: existing } = await supabase
    .from("inbox_threads")
    .select("id, unread_count")
    .eq("business_id", message.business_id)
    .eq("channel", message.channel)
    .eq("conversation_id", threadKey)
    .maybeSingle();

  const now = new Date().toISOString();
  const nextUnread = direction === "inbound" ? (existing?.unread_count ?? 0) + 1 : 0;

  const payload = {
    business_id: message.business_id,
    channel: message.channel,
    conversation_id: threadKey,
    contact_name: message.sender_name,
    contact_handle: message.sender_phone_or_handle,
    status: "open",
    unread_count: nextUnread,
    last_message_text: message.message_text,
    last_message_direction: direction,
    last_message_at: message.timestamp,
    last_intent: intent,
    updated_at: now,
  };

  if (existing?.id) {
    await supabase.from("inbox_threads").update(payload).eq("id", existing.id);
    return existing.id;
  }

  const { data: inserted } = await supabase
    .from("inbox_threads")
    .insert({ ...payload, created_at: now })
    .select("id")
    .single();

  return inserted?.id;
}

async function recordMessage(
  supabase: any,
  message: NormalizedMessage,
  threadId: string,
  direction: string,
  _intent: string | null,
  options?: { messageType?: string; mediaAssetId?: string; fileUrl?: string }
) {
  const threadKey = message.sender_phone_or_handle || message.conversation_id;
  const messageType = options?.messageType || "text";

  await supabase.from("inbox_messages").insert({
    business_id: message.business_id,
    thread_id: threadId,
    channel: message.channel,
    conversation_id: threadKey,
    direction,
    sender_name: direction === "outbound" ? "Chatbot" : message.sender_name,
    sender_handle: message.sender_phone_or_handle,
    message_text: message.message_text,
    message_timestamp: message.timestamp,
    metadata: message.metadata,
    message_type: messageType,
    media_asset_id: options?.mediaAssetId || null,
    file_url: options?.fileUrl || null,
  });

  await supabase.from("messages").insert({
    business_id: message.business_id,
    conversation_id: threadKey,
    direction,
    sender: direction === "outbound" ? "Chatbot" : message.sender_name,
    message_text: message.message_text,
    timestamp: message.timestamp,
    channel: message.channel,
    message_type: messageType,
    media_asset_id: options?.mediaAssetId || null,
    file_url: options?.fileUrl || null,
  });
}

// ── Usage tracking ──

async function trackConversationWindow(supabase: any, message: NormalizedMessage) {
  const threadKey = message.sender_phone_or_handle || message.conversation_id;
  const MS_24H = 24 * 60 * 60 * 1000;

  const { data: thread } = await supabase
    .from("inbox_threads")
    .select("id, last_usage_window_at")
    .eq("business_id", message.business_id)
    .eq("channel", message.channel)
    .eq("conversation_id", threadKey)
    .maybeSingle();

  if (!thread?.id) return;

  const now = new Date(message.timestamp);
  const lastWindow = thread.last_usage_window_at ? new Date(thread.last_usage_window_at) : null;
  const isNewWindow = !lastWindow || now.getTime() - lastWindow.getTime() >= MS_24H;
  if (!isNewWindow) return;

  await supabase
    .from("inbox_threads")
    .update({ last_usage_window_at: now.toISOString() })
    .eq("id", thread.id);

  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const { data: existing } = await supabase
    .from("usage_monthly")
    .select("id, value")
    .eq("business_id", message.business_id)
    .eq("metric", "conversations_24h")
    .eq("period", period)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("usage_monthly")
      .update({ value: (existing.value ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("usage_monthly").insert({
      business_id: message.business_id,
      metric: "conversations_24h",
      value: 1,
      period,
    });
  }
}

// ── Outbound Instagram messaging ──

async function sendInstagramMessage(
  supabase: any,
  businessId: string,
  recipientId: string,
  text: string
) {
  const { data: integration } = await supabase
    .from("business_integrations")
    .select("instagram_access_token, instagram_business_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const token = integration?.instagram_access_token;
  const igBusinessId = integration?.instagram_business_id;

  if (!token || !igBusinessId) {
    console.log("Instagram credentials not configured for business:", businessId);
    return;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${igBusinessId}/messages`,
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
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Instagram send error:", error);
    }
  } catch (error) {
    console.error("Failed to send Instagram message:", error);
  }
}
