// @ts-nocheck - Deno edge function, uses Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Groq API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";

// Intents that can trigger flyer sending
const FLYER_INTENTS = ["pricing", "services", "packages", "quote"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Handle Meta webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Instagram verification request - mode:", mode, "token:", token);

    if (mode === "subscribe" && token) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Search for ANY business with this verification token
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

  if (req.method === "POST") {
    try {
      const payload = await req.json();
      console.log("Instagram webhook payload:", JSON.stringify(payload));

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const businessId = payload.business_id || url.searchParams.get("business_id");

      if (!businessId) {
        console.error("Missing business_id in webhook payload");
        return new Response(JSON.stringify({ error: "Missing business_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("chatbot_enabled, ai_reply_enabled, language_preference, greeting_message, flyer_cooldown_hours, office_hours")
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

        if (business.ai_reply_enabled) {
          const aiResult = await generateAIResponse(supabase, message, business);

          if (aiResult?.reply) {
            await recordMessage(supabase, {
              ...message,
              message_text: aiResult.reply,
            }, threadId, "outbound", null);

            await sendInstagramMessage(supabase, businessId, message.sender_phone_or_handle!, aiResult.reply);

            results.push({
              conversation_id: message.conversation_id,
              response_sent: true,
              intent,
              handoff_required: aiResult.handoffRequired,
            });
          }
        }

        const requestedFlyerType = detectFlyerType(message.message_text || "");
        const flyerCooldownHours = Number.isFinite(business.flyer_cooldown_hours)
          ? business.flyer_cooldown_hours
          : 24;
        if (requestedFlyerType) {
          await maybeSendFlyer(
            supabase,
            message,
            threadId,
            flyerCooldownHours,
            requestedFlyerType,
            business.language_preference || null
          );
        }

        // Record inbound even if no AI reply
        results.push({ conversation_id: message.conversation_id, recorded: true, intent });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const error = err as Error;
      console.error("Instagram webhook error:", error);
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

type FlyerType = "menu" | "price_list" | "services_flyer";

function detectFlyerType(text: string): FlyerType | null {
  const lower = text.toLowerCase();

  const menuPatterns = [
    /\bmenu\b/i,
    /\bfood\b/i,
    /\bcomida\b/i,
    /\bdishes\b/i,
    /\bplatos\b/i,
    /\bdrink\b/i,
    /\bbebida\b/i,
    /\bbeverage\b/i,
  ];

  const priceListPatterns = [
    /\bprice\s*list\b/i,
    /\bpricing\b/i,
    /\bprices\b/i,
    /\brate[s]?\b/i,
    /\bcost\b/i,
    /\bquote\b/i,
    /\bcotizacion\b/i,
    /\bpresupuesto\b/i,
    /\bprecio\b/i,
    /\bcuanto\b/i,
    /\bhow\s+much\b/i,
  ];

  const servicesFlyerPatterns = [
    /\bservices?\b/i,
    /\bservicios?\b/i,
    /\bpackages?\b/i,
    /\bpaquetes?\b/i,
    /\boptions?\b/i,
    /\bopciones?\b/i,
    /\bwhat\s+do\s+you\s+offer\b/i,
    /\bque\s+ofrecen\b/i,
    /\bofferings\b/i,
    /\bbrochure\b/i,
    /\bcatalog\b/i,
  ];

  if (menuPatterns.some((p) => p.test(lower))) return "menu";
  if (priceListPatterns.some((p) => p.test(lower))) return "price_list";
  if (servicesFlyerPatterns.some((p) => p.test(lower))) return "services_flyer";

  return null;
}

async function lookupFlyerAsset(
  supabase: any,
  businessId: string,
  flyerType: FlyerType
): Promise<{ id: string; file_url: string; title: string | null; asset_type: string; mime_type?: string | null } | null> {
  const { data: preferredFlyer } = await supabase
    .from("media_assets")
    .select("id, file_url, title, asset_type, mime_type")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .eq("asset_type", flyerType)
    .eq("is_default", true)
    .maybeSingle();

  if (preferredFlyer?.file_url) return preferredFlyer;

  const { data: anyFlyer } = await supabase
    .from("media_assets")
    .select("id, file_url, title, asset_type, mime_type")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .eq("asset_type", flyerType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (anyFlyer?.file_url) return anyFlyer;

  return null;
}

function buildFlyerCaption(language: string | null | undefined, title?: string | null): string {
  const cleanTitle = (title || "").trim();
  if (cleanTitle) return cleanTitle;
  return language === "es" ? "Aqui esta el flyer que pediste." : "Here is the flyer you requested.";
}

type ChatbotThreadState = {
  vehicleType?: string | null;
  serviceName?: string | null;
  timePreference?: string | null;
  updatedAt?: string | null;
};

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

function detectVehicleType(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(suv|crossover|camioneta|4x4)\b/i.test(lower)) return "SUV";
  if (/\b(pickup|pick-up|pick up|troca)\b/i.test(lower)) return "Pickup";
  if (/\b(truck|camion)\b/i.test(lower)) return "Truck";
  if (/\b(sedan|sedÃ¡n)\b/i.test(lower)) return "Sedan";
  if (/\b(coupe|coupÃ©|deportivo)\b/i.test(lower)) return "Coupe";
  if (/\b(hatchback|hatch)\b/i.test(lower)) return "Hatchback";
  if (/\b(van|minivan|mini van|furgoneta)\b/i.test(lower)) return "Van";
  if (/\b(moto|motorcycle)\b/i.test(lower)) return "Motorcycle";
  return null;
}

function detectTimePreference(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(morning|maÃ±ana|manana|temprano)\b/i.test(lower)) return "morning";
  if (/\b(afternoon|tarde)\b/i.test(lower)) return "afternoon";
  if (/\b(evening|noche)\b/i.test(lower)) return "evening";
  if (/\b(today|hoy|tomorrow|maÃ±ana)\b/i.test(lower)) return "soon";
  return null;
}

function detectServiceName(
  text: string,
  services: Array<{ name?: string | null }>
): string | null {
  if (!services || services.length === 0) return null;
  const normalized = normalizeText(text);
  if (!normalized) return null;
  const match = services.find((s) => {
    const name = normalizeText(s.name || "");
    return name && normalized.includes(name);
  });
  return match?.name || null;

}

async function loadThreadState(
  supabase: any,
  message: NormalizedMessage
): Promise<ChatbotThreadState> {
  const threadKey = message.sender_phone_or_handle || message.conversation_id;
  const { data } = await supabase
    .from("inbox_threads")
    .select("metadata")
    .eq("business_id", message.business_id)
    .eq("channel", message.channel)
    .eq("conversation_id", threadKey)
    .maybeSingle();
  const meta = data?.metadata || {};
  const state = meta?.chatbot_state || {};
  return {
    vehicleType: state.vehicleType || null,
    serviceName: state.serviceName || null,
    timePreference: state.timePreference || null,
    updatedAt: state.updatedAt || null,
  };
}

async function saveThreadState(
  supabase: any,
  message: NormalizedMessage,
  nextState: ChatbotThreadState
): Promise<void> {
  const threadKey = message.sender_phone_or_handle || message.conversation_id;
  const { data } = await supabase
    .from("inbox_threads")
    .select("id, metadata")
    .eq("business_id", message.business_id)
    .eq("channel", message.channel)
    .eq("conversation_id", threadKey)
    .maybeSingle();
  if (!data?.id) return;
  const metadata = data.metadata || {};
  const chatbotState = {
    ...(metadata.chatbot_state || {}),
    ...nextState,
    updatedAt: new Date().toISOString(),
  };
  await supabase
    .from("inbox_threads")
    .update({ metadata: { ...metadata, chatbot_state: chatbotState } })
    .eq("id", data.id);
}

function trimResponse(text: string, maxSentences = 2, maxChars = 360): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) {
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    if (sentences.length <= maxSentences) return cleaned;
    return sentences.slice(0, maxSentences).join(" ").trim();
  }
  return cleaned.slice(0, maxChars).trim();
}

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
    .select("id, stage")
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

async function generateAIResponse(
  supabase: any,
  message: NormalizedMessage,
  business: any
): Promise<{ reply: string; handoffRequired: boolean } | null> {
  const threadKey = message.sender_phone_or_handle || message.conversation_id;

  // If already handed off, stop responding
  const { data: existingConversation } = await supabase
    .from("conversations")
    .select("handoff_required, current_state")
    .eq("conversation_id", threadKey)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingConversation?.handoff_required) {
    return null;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
      return null;
    }

    const data = await response.json();
    const reply = data?.reply;
    if (!reply) return null;

    return { reply, handoffRequired: !!data?.handoffRequired };
  } catch (error) {
    console.error("AI response generation failed:", error);
    return null;
  }
}
async function maybeSendFlyer(
  supabase: any,
  message: NormalizedMessage,
  threadId: string,
  cooldownHours: number,
  preferredType: FlyerType | null,
  languagePreference?: string | null
): Promise<boolean> {
  if (!preferredType) return false;
  const recipientId = message.sender_phone_or_handle;
  if (!recipientId) return false;

  const conversationId = message.sender_phone_or_handle || message.conversation_id;

  const cooldownMs = Math.max(0, cooldownHours) * 60 * 60 * 1000;
  if (cooldownMs > 0) {
    const cutoff = new Date(Date.now() - cooldownMs).toISOString();
    const { data: recentSend } = await supabase
      .from("flyer_send_log")
      .select("id, stage")
      .eq("business_id", message.business_id)
      .eq("conversation_id", conversationId)
      .gte("sent_at", cutoff)
      .limit(1)
      .maybeSingle();

    if (recentSend) {
      console.log("Flyer already sent recently, skipping");
      return false;
    }
  }

  const flyer = await lookupFlyerAsset(supabase, message.business_id, preferredType);
  if (!flyer?.file_url) {
    console.log("No flyer configured for type:", preferredType);
    return false;
  }

  const caption = buildFlyerCaption(languagePreference || null, flyer.title);
  const sent = await sendInstagramImage(supabase, message.business_id, recipientId, flyer.file_url, caption);

  if (sent) {
    await supabase.from("flyer_send_log").insert({
      business_id: message.business_id,
      conversation_id: conversationId,
      media_asset_id: flyer.id,
      sent_at: new Date().toISOString(),
    });

    const now = new Date().toISOString();
    const outboundMessage: NormalizedMessage = {
      ...message,
      message_text: caption,
      timestamp: now,
      metadata: { ...(message.metadata || {}), flyer: true, flyer_type: preferredType },
    };

    await recordMessage(supabase, outboundMessage, threadId, "outbound", null, {
      messageType: "image",
      mediaAssetId: flyer.id,
      fileUrl: flyer.file_url,
    });
  }

  return sent;
}
async function sendInstagramImage(
  supabase: any,
  businessId: string,
  recipientId: string,
  imageUrl: string,
  caption: string | null
): Promise<boolean> {
  const { data: integration } = await supabase
    .from("business_integrations")
    .select("instagram_access_token, instagram_business_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const token = integration?.instagram_access_token;
  const igBusinessId = integration?.instagram_business_id;

  if (!token || !igBusinessId) {
    console.log("Instagram credentials not configured for business:", businessId);
    return false;
  }

  const messageCaption = caption && caption.trim().length > 0
    ? caption
    : "Here is the flyer you requested.";

  // Instagram Messaging API has limited image sending support
  // Try image attachment first, fallback to text with link
  try {
    // Try sending as image attachment (Instagram Send API)
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
          message: {
            attachment: {
              type: "image",
              payload: {
                url: imageUrl,
                is_reusable: true,
              },
            },
          },
        }),
      }
    );

    if (response.ok) {
      console.log("Instagram image sent successfully to:", recipientId);
      // Also send caption as separate text
      await sendInstagramMessage(supabase, businessId, recipientId, messageCaption);
      return true;
    }

    // If image sending fails, fallback to text message with link
    console.log("Instagram image API failed, sending fallback text with link");
    const fallbackMessage = `${messageCaption}\n\nView flyer: ${imageUrl}`;
    await sendInstagramMessage(supabase, businessId, recipientId, fallbackMessage);
    return true;

  } catch (error) {
    console.error("Failed to send Instagram image, trying fallback:", error);
    
    // Fallback: send text with public URL
    try {
      const fallbackMessage = `${messageCaption}\n\nView flyer: ${imageUrl}`;
      await sendInstagramMessage(supabase, businessId, recipientId, fallbackMessage);
      return true;
    } catch (fallbackError) {
      console.error("Instagram fallback also failed:", fallbackError);
      return false;
    }
  }
}

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

async function qualifyLead(
  supabase: any,
  message: NormalizedMessage,
  intent: string
) {
  if (intent !== "pricing" && intent !== "booking" && intent !== "services" && intent !== "packages") return;

  const emailMatch = message.message_text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = message.sender_phone_or_handle;
  const email = emailMatch?.[0] || null;

  const hasContact = email || phone;
  if (!hasContact) return;

  const threadKey = message.sender_phone_or_handle || message.conversation_id;

  const { data: existingLead } = await supabase
    .from("leads")
    .select("id, stage")
    .eq("business_id", message.business_id)
    .eq("conversation_id", threadKey)
    .maybeSingle();

  if (existingLead?.id) {
    const wasAlreadyQualified = existingLead.stage === "qualified";
    await supabase
      .from("leads")
      .update({
        qualification_reason: `intent=${intent}; source=instagram`,
        email,
        stage: "qualified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingLead.id);

    if (!wasAlreadyQualified) {
      try {
        await supabase.functions.invoke("lead-notify", {
          body: { businessId: message.business_id, leadId: existingLead.id },
        });
      } catch (err) {
        console.warn("[INSTAGRAM] lead-notify invoke failed:", err);
      }
    }
    return;
  }

  const { data: insertedLead } = await supabase
    .from("leads")
    .insert({
      business_id: message.business_id,
      email,
      phone,
      conversation_id: threadKey,
      name: message.sender_name,
      source: "instagram",
      stage: "qualified",
      qualification_reason: `intent=${intent}; source=instagram`,
      updated_at: new Date().toISOString(),
    })
    .select("id, stage")
    .single();

  if (insertedLead?.id) {
    try {
      await supabase.functions.invoke("lead-notify", {
        body: { businessId: message.business_id, leadId: insertedLead.id },
      });
    } catch (err) {
      console.warn("[INSTAGRAM] lead-notify invoke failed:", err);
    }
  }
}


