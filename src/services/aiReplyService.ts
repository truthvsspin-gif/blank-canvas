import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { retrieveKnowledgeChunks } from "@/services/knowledgeBaseService"
import type { NormalizedMessage } from "@/services/messageIngest"

const DEFAULT_FALLBACK = {
  en: "Thanks for your message. Our team will reply shortly.",
  es: "Gracias por tu mensaje. Nuestro equipo te respondera pronto.",
}

type RecentMessage = {
  direction: string
  message_text: string
  timestamp: string
}

async function isEchoMessage(message: NormalizedMessage) {
  if (!message.metadata || typeof message.metadata != "object") return false
  const metadata = message.metadata as Record<string, unknown>
  const messageId = metadata.message_id
  if (typeof messageId != "string" || !messageId) return false

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", message.business_id)
    .eq("message_direction", "outbound")
    .eq("metadata->>provider_message_id", messageId)
    .limit(1)
    .maybeSingle()

  const row = data as { id?: string } | null
  return Boolean(row?.id)
}

function buildServiceSummary(services: Array<{ name: string; base_price: number | null; duration_minutes: number | null }>) {
  if (!services || services.length === 0) return "No services configured."
  return services.slice(0, 5).map((service) => {
    const price = service.base_price ? `$${service.base_price}` : ""
    const duration = service.duration_minutes ? `${service.duration_minutes} min` : ""
    return [service.name, price, duration].filter(Boolean).join("  ")
  }).join(" | ")
}


function buildKnowledgeFallback(chunks: Array<{ content: string }>, language: "en" | "es") {
  if (!chunks || chunks.length === 0) return null
  const snippet = chunks[0].content.replace(/\s+/g, " ").trim()
  if (!snippet) return null
  const trimmed = snippet.length > 280 ? `${snippet.slice(0, 277)}...` : snippet
  return language === "es"
    ? `De nuestra base de conocimiento: ${trimmed}`
    : `From our knowledge base: ${trimmed}`
}

function buildContextPreview(messages: RecentMessage[]) {
  if (messages.length === 0) return ""
  return messages
    .map((item) => `${item.direction === "inbound" ? "Customer" : "Assistant"}: ${item.message_text}`)
    .join("\n")
}

export async function buildWhatsAppAiReply(message: NormalizedMessage) {
  if (message.channel !== "whatsapp") return null
  if (message.metadata && typeof message.metadata == "object") {
    const metadata = message.metadata as Record<string, unknown>
    if (metadata.direction == "outbound") return null
  }
  if (await isEchoMessage(message)) return null

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("businesses")
    .select("id, name, language_preference, office_hours, ai_reply_enabled")
    .eq("id", message.business_id)
    .maybeSingle()

  const business = data as {
    id?: string
    name?: string | null
    language_preference?: string | null
    office_hours?: string | null
    ai_reply_enabled?: boolean | null
  } | null

  if (!business?.ai_reply_enabled) return null

  const language =
    business.language_preference === "es" || business.language_preference === "en"
      ? business.language_preference
      : "en"

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    const knowledgeChunks = await retrieveKnowledgeChunks(
      message.business_id,
      message.message_text,
      1
    )
    const knowledgeReply = buildKnowledgeFallback(knowledgeChunks, language)
    if (knowledgeReply) {
      return { text: knowledgeReply, rule: "knowledge" }
    }
    return { text: DEFAULT_FALLBACK[language], rule: "fallback" }
  }

  const { data: services } = await supabase
    .from("services")
    .select("name, base_price, duration_minutes")
    .eq("business_id", message.business_id)
    .eq("is_active", true)
    .order("name", { ascending: true })

  const { data: recent } = await supabase
    .from("messages")
    .select("direction, message_text, timestamp")
    .eq("business_id", message.business_id)
    .eq("conversation_id", message.conversation_id)
    .eq("channel", "whatsapp")
    .order("timestamp", { ascending: false })
    .limit(4)

  const recentRows = (recent ?? []) as RecentMessage[]
  const recentMessages = recentRows.reverse().filter((item) => {
    if (item.direction === "inbound" && item.message_text === message.message_text) {
      return false
    }
    return true
  })

  const fallback = DEFAULT_FALLBACK[language]
  const servicesSummary = buildServiceSummary((services ?? []) as Array<{ name: string; base_price: number | null; duration_minutes: number | null }>)
  const contextPreview = buildContextPreview(recentMessages as RecentMessage[])

  const systemPrompt = [
    "You are a professional customer support assistant for a vehicle detailing business.",
    "Respond briefly in 1-3 short sentences.",
    "Do not book appointments, take payments, or ask for sensitive info.",
    "If the user asks to book or share payment info, tell them the team will follow up.",
    `Reply in ${language === "es" ? "Spanish" : "English"}.`,
    `Business name: ${business?.name || "the business"}.`,
    `Business hours: ${business?.office_hours || "Not specified"}.`,
    `Services: ${servicesSummary}.`,
    contextPreview ? `Recent context:\n${contextPreview}` : "",
  ].filter(Boolean).join("\n")

  const userPrompt = `Latest customer message: ${message.message_text}`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 120,
    }),
  })

  if (!response.ok) {
    return { text: fallback, rule: "fallback" }
  }

  const payload = await response.json().catch(() => null)
  const text = payload?.choices?.[0]?.message?.content
  if (!text || typeof text !== "string") {
    return { text: fallback, rule: "fallback" }
  }

  return { text: text.trim(), rule: "ai" }
}
