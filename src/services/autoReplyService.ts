import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import type { NormalizedMessage } from "@/services/messageIngest"

const DEFAULT_FALLBACK = {
  en: "Thanks for your message. Our team will reply shortly.",
  es: "Gracias por tu mensaje. Nuestro equipo te respondera pronto.",
}

const DEFAULT_GREETING = {
  en: "Hi! Thanks for reaching out.",
  es: "Hola. Gracias por escribirnos.",
}

const DEFAULT_OOO = {
  en: "We are currently closed. We will get back to you during business hours.",
  es: "Estamos cerrados en este momento. Te responderemos en el horario laboral.",
}

type AutoReplyRules = {
  enabled?: boolean
  greeting?: {
    enabled?: boolean
    text?: string
  }
  out_of_office?: {
    enabled?: boolean
    text?: string
    timezone?: string
    hours?: {
      start?: string
      end?: string
      days?: number[]
    }
  }
  fallback?: {
    text?: string
  }
  timezone?: string
}

function normalizeRules(input: unknown): AutoReplyRules {
  if (!input || typeof input != "object") return {}
  return input as AutoReplyRules
}

function parseTimeValue(value?: string | null): number | null {
  if (!value) return null
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number.parseInt(match[1], 10)
  const minutes = Number.parseInt(match[2] || "0", 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function getLocalParts(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date())
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type != "literal") {
      map[part.type] = part.value
    }
  }
  const weekday = map.weekday || "Mon"
  const hour = Number.parseInt(map.hour || "0", 10)
  const minute = Number.parseInt(map.minute || "0", 10)
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday)
  return {
    weekday: weekdayIndex == -1 ? 1 : weekdayIndex,
    minutes: hour * 60 + minute,
  }
}

function isOutsideBusinessHours(rules: AutoReplyRules, officeHours?: string | null) {
  const tz = rules.out_of_office?.timezone || rules.timezone || "UTC"
  const hours = rules.out_of_office?.hours || {}
  let startMinutes = parseTimeValue(hours.start ?? null)
  let endMinutes = parseTimeValue(hours.end ?? null)
  const days = Array.isArray(hours.days) && hours.days.length > 0 ? hours.days : [1, 2, 3, 4, 5]

  if (startMinutes == null || endMinutes == null) {
    if (officeHours) {
      const match = officeHours.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
      if (match) {
        const parseHour = (h: string, m: string | undefined, meridiem: string | undefined) => {
          let hour = Number.parseInt(h, 10)
          const minutes = Number.parseInt(m || "0", 10)
          if (meridiem) {
            const lower = meridiem.toLowerCase()
            if (lower == "pm" && hour < 12) hour += 12
            if (lower == "am" && hour == 12) hour = 0
          }
          return hour * 60 + minutes
        }
        startMinutes = parseHour(match[1], match[2], match[3])
        endMinutes = parseHour(match[4], match[5], match[6])
      }
    }
  }

  if (startMinutes == null || endMinutes == null) return false

  const local = getLocalParts(tz)
  if (!days.includes(local.weekday)) return true

  if (startMinutes <= endMinutes) {
    return local.minutes < startMinutes || local.minutes > endMinutes
  }
  return local.minutes < startMinutes && local.minutes > endMinutes
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

async function isFirstInbound(message: NormalizedMessage) {
  const supabase = getSupabaseAdmin()
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", message.business_id)
    .eq("conversation_id", message.conversation_id)
    .eq("direction", "inbound")
    .eq("channel", "whatsapp")
  return (count ?? 0) <= 1
}

export async function buildWhatsAppAutoReply(message: NormalizedMessage) {
  if (message.channel != "whatsapp") return null
  if (message.metadata && typeof message.metadata == "object") {
    const metadata = message.metadata as Record<string, unknown>
    if (metadata.direction == "outbound") return null
  }
  if (await isEchoMessage(message)) return null

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("businesses")
    .select("id, name, language_preference, office_hours, greeting_message, auto_reply_rules")
    .eq("id", message.business_id)
    .maybeSingle()

  const business = data as {
    id?: string
    name?: string | null
    language_preference?: string | null
    office_hours?: string | null
    greeting_message?: string | null
    auto_reply_rules?: Record<string, unknown> | null
  } | null

  if (!business) return null

  const rules = normalizeRules(business.auto_reply_rules)
  if (rules.enabled == false) return null

  const language =
    business.language_preference === "es" || business.language_preference === "en"
      ? business.language_preference
      : "en"

  const greetingText =
    rules.greeting?.text ||
    business.greeting_message ||
    DEFAULT_GREETING[language]

  const fallbackText = rules.fallback?.text || DEFAULT_FALLBACK[language]
  const oooText = rules.out_of_office?.text || DEFAULT_OOO[language]

  const greetingEnabled = rules.greeting?.enabled != false
  const oooEnabled = rules.out_of_office?.enabled != false

  const firstInbound = await isFirstInbound(message)
  const outsideHours = oooEnabled ? isOutsideBusinessHours(rules, business.office_hours) : false

  if (firstInbound && greetingEnabled) {
    if (outsideHours && oooEnabled) {
      return { text: `${greetingText}\n\n${oooText}`, rule: "greeting" }
    }
    return { text: greetingText, rule: "greeting" }
  }

  if (outsideHours && oooEnabled) {
    return { text: oooText, rule: "out_of_office" }
  }

  return { text: fallbackText, rule: "fallback" }
}
