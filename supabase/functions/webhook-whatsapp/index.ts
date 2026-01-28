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
const DEFAULT_MODEL = "llama-3.1-8b-instant";

// Intents that can trigger flyer sending
const FLYER_INTENTS = ["pricing", "services", "packages", "quote"];

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Handle Meta webhook verification (GET request)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const businessId = url.searchParams.get("business_id");

    // Get verify token from database or fallback to env
    let verifyToken = Deno.env.get("META_VERIFY_TOKEN") || "eldetailerpro_verify_token";
    
    if (businessId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: integration } = await supabase
        .from("business_integrations")
        .select("webhook_verify_token")
        .eq("business_id", businessId)
        .maybeSingle();
      
      if (integration?.webhook_verify_token) {
        verifyToken = integration.webhook_verify_token;
      }
    }

    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified successfully");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // Handle POST (incoming messages)
  if (req.method === "POST") {
    try {
      const payload = await req.json();
      console.log("WhatsApp webhook payload:", JSON.stringify(payload));

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Extract business_id from custom field or use default logic
      const businessId = payload.business_id || url.searchParams.get("business_id");
      
      if (!businessId) {
        console.error("Missing business_id in webhook payload");
        return new Response(JSON.stringify({ error: "Missing business_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if chatbot is enabled for this business
      const { data: business } = await supabase
        .from("businesses")
        .select("chatbot_enabled, ai_reply_enabled, language_preference, greeting_message, flyer_cooldown_hours")
        .eq("id", businessId)
        .single();

      if (!business?.chatbot_enabled) {
        console.log("Chatbot disabled for business:", businessId);
        return new Response(JSON.stringify({ status: "chatbot_disabled" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parse WhatsApp messages
      const messages = parseWhatsAppPayload(payload, businessId);
      
      if (messages.length === 0) {
        return new Response(JSON.stringify({ status: "no_messages" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      
      for (const message of messages) {
        // Detect intent
        const intent = detectIntent(message.message_text);
        
        // Store inbound message
        const threadId = await ensureThread(supabase, message, "inbound", intent);
        await recordMessage(supabase, message, threadId, "inbound", intent);

        // Track conversation window for usage
        await trackConversationWindow(supabase, message);

        // Generate AI response if enabled
        if (business.ai_reply_enabled) {
          const aiResponse = await generateAIResponse(supabase, message, business);
          
          if (aiResponse) {
            // Record outbound text message
            await recordMessage(supabase, {
              ...message,
              message_text: aiResponse,
            }, threadId, "outbound", null);

            // Send text via WhatsApp API
            await sendWhatsAppMessage(supabase, businessId, message.sender_phone_or_handle!, aiResponse);
            
            // Check if we should send a flyer for this intent
            if (FLYER_INTENTS.includes(intent)) {
              const flyerSent = await maybeSendFlyer(
                supabase, 
                businessId, 
                message.sender_phone_or_handle!, 
                message.conversation_id,
                threadId,
                business.flyer_cooldown_hours || 24
              );
              
              if (flyerSent) {
                results.push({ 
                  conversation_id: message.conversation_id, 
                  response_sent: true,
                  flyer_sent: true,
                  intent,
                });
                continue;
              }
            }
            
            results.push({ 
              conversation_id: message.conversation_id, 
              response_sent: true,
              intent,
            });
          }
        }

        // Check for lead qualification
        await qualifyLead(supabase, message, intent);
        
        results.push({ 
          conversation_id: message.conversation_id, 
          recorded: true,
          intent,
        });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const error = err as Error;
      console.error("WhatsApp webhook error:", error);
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

function parseWhatsAppPayload(payload: any, businessId: string): NormalizedMessage[] {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const messages: NormalizedMessage[] = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value ?? {};
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const contact = contacts[0] as { profile?: { name?: string }; wa_id?: string } | undefined;
      const contactName = contact?.profile?.name ?? null;
      const contactId = contact?.wa_id ?? null;
      const waMessages = Array.isArray(value.messages) ? value.messages : [];

      for (const message of waMessages) {
        const textBody = message?.text?.body;
        if (typeof textBody !== "string" || !textBody.trim()) continue;

        const from = message?.from;
        const messageId = message?.id;
        const contextId = message?.context?.id;
        const timestamp = normalizeTimestamp(message?.timestamp);
        const senderHandle = typeof from === "string" ? from : contactId;
        const conversationId = contextId || messageId || senderHandle || "whatsapp";

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
        });
      }
    }
  }

  return messages;
}

function normalizeTimestamp(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = parseInt(value, 10);
    const ms = value.length > 10 ? parsed : parsed * 1000;
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
  intent: string | null,
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

  // Increment monthly counter
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
): Promise<string | null> {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) {
    console.error("GROQ_API_KEY not configured");
    return null;
  }

  // Load services for context
  const { data: services } = await supabase
    .from("services")
    .select("name, description, base_price, duration_minutes")
    .eq("business_id", message.business_id)
    .eq("is_active", true);

  // Load knowledge base
  const { data: knowledge } = await supabase
    .from("knowledge_chunks")
    .select("content")
    .eq("business_id", message.business_id)
    .textSearch("content_tsv", message.message_text.split(" ").slice(0, 5).join(" | "))
    .limit(3);

  const knowledgeContext = knowledge?.map((k: any) => k.content).join("\n") || "";
  const servicesContext = services?.map((s: any) => 
    `${s.name}: ${s.description || ""} - $${s.base_price || "TBD"} (${s.duration_minutes || "?"} min)`
  ).join("\n") || "No services configured.";

  const language = business.language_preference === "es" ? "Spanish" : "English";
  
  const systemPrompt = `You are a helpful AI assistant for ${business.name || "a car detailing business"} responding on WhatsApp.
Respond in ${language}.
Be friendly, professional, and concise (1-3 sentences max).

Your goals:
1. Answer questions about services, pricing, and hours
2. Qualify leads by identifying booking interest
3. If customer wants to book, ask for preferred date/time and vehicle type

Business Services:
${servicesContext}

Knowledge Base:
${knowledgeContext}

Greeting: ${business.greeting_message || "Hi! How can I help you today?"}

Rules:
- Keep responses short for WhatsApp format
- Be direct and actionable
- If you don't know something, offer to connect them with the team
- When discussing services/pricing, mention you can share a visual service menu`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message.message_text },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("AI response generation failed:", error);
    return null;
  }
}

async function maybeSendFlyer(
  supabase: any,
  businessId: string,
  to: string,
  conversationId: string,
  threadId: string,
  cooldownHours: number
): Promise<boolean> {
  // Check if flyer was sent recently
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - cooldownMs).toISOString();
  
  const { data: recentSend } = await supabase
    .from("flyer_send_log")
    .select("id")
    .eq("business_id", businessId)
    .eq("conversation_id", conversationId)
    .gte("sent_at", cutoff)
    .limit(1)
    .maybeSingle();

  if (recentSend) {
    console.log("Flyer already sent recently, skipping");
    return false;
  }

  // Get default active flyer
  const { data: flyer } = await supabase
    .from("media_assets")
    .select("id, file_url, title, mime_type")
    .eq("business_id", businessId)
    .eq("asset_type", "services_flyer")
    .eq("is_active", true)
    .eq("is_default", true)
    .maybeSingle();

  if (!flyer) {
    console.log("No default flyer configured");
    return false;
  }

  // Send the image via WhatsApp
  const sent = await sendWhatsAppImage(supabase, businessId, to, flyer.file_url, flyer.title);
  
  if (sent) {
    // Log the send
    await supabase.from("flyer_send_log").insert({
      business_id: businessId,
      conversation_id: conversationId,
      media_asset_id: flyer.id,
      sent_at: new Date().toISOString(),
    });

    // Record the image message
    const now = new Date().toISOString();
    await supabase.from("inbox_messages").insert({
      business_id: businessId,
      thread_id: threadId,
      channel: "whatsapp",
      conversation_id: conversationId,
      direction: "outbound",
      sender_name: "Chatbot",
      sender_handle: to,
      message_text: flyer.title || "Service Menu",
      message_timestamp: now,
      metadata: { flyer: true },
      message_type: "image",
      media_asset_id: flyer.id,
      file_url: flyer.file_url,
    });

    await supabase.from("messages").insert({
      business_id: businessId,
      conversation_id: conversationId,
      direction: "outbound",
      sender: "Chatbot",
      message_text: flyer.title || "Service Menu",
      timestamp: now,
      channel: "whatsapp",
      message_type: "image",
      media_asset_id: flyer.id,
      file_url: flyer.file_url,
    });
  }

  return sent;
}

async function sendWhatsAppImage(
  supabase: any,
  businessId: string,
  to: string,
  imageUrl: string,
  caption: string | null
): Promise<boolean> {
  const { data: integration } = await supabase
    .from("business_integrations")
    .select("whatsapp_access_token, whatsapp_phone_number_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const token = integration?.whatsapp_access_token;
  const phoneNumberId = integration?.whatsapp_phone_number_id;

  if (!token || !phoneNumberId) {
    console.log("WhatsApp credentials not configured for business:", businessId);
    return false;
  }

  const language = caption?.toLowerCase().includes("menú") || caption?.toLowerCase().includes("servicio") ? "es" : "en";
  const defaultCaption = language === "es" 
    ? "📋 Aquí está nuestro menú de servicios. ¿En qué paquete estás interesado?"
    : "📋 Here's our service menu. Which package are you interested in?";

  try {
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
          type: "image",
          image: {
            link: imageUrl,
            caption: caption || defaultCaption,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp image send error:", error);
      return false;
    }
    
    console.log("WhatsApp image sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Failed to send WhatsApp image:", error);
    return false;
  }
}

async function sendWhatsAppMessage(
  supabase: any,
  businessId: string,
  to: string,
  text: string
) {
  const { data: integration } = await supabase
    .from("business_integrations")
    .select("whatsapp_access_token, whatsapp_phone_number_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const token = integration?.whatsapp_access_token;
  const phoneNumberId = integration?.whatsapp_phone_number_id;

  if (!token || !phoneNumberId) {
    console.log("WhatsApp credentials not configured for business:", businessId);
    return;
  }

  try {
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
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp send error:", error);
    }
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
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
    .select("id")
    .eq("business_id", message.business_id)
    .eq("conversation_id", threadKey)
    .maybeSingle();

  if (existingLead?.id) {
    await supabase
      .from("leads")
      .update({
        qualification_reason: `intent=${intent}; source=whatsapp`,
        email,
        stage: "qualified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingLead.id);
    return;
  }

  await supabase.from("leads").insert({
    business_id: message.business_id,
    email,
    phone,
    conversation_id: threadKey,
    name: message.sender_name,
    source: "whatsapp",
    stage: "new",
    qualification_reason: `intent=${intent}`,
  });
}
