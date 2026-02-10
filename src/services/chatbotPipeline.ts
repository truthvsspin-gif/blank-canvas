import type { NormalizedMessage } from "@/services/messageIngest"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { loadBusinessContext, type BusinessContext } from "@/services/businessContextLoader"
import { qualifyLeadFromMessage } from "@/services/leadQualificationService"
import { syncLeadToCrm } from "@/services/leadSyncService"
import { hasKnowledgeSources, retrieveKnowledgeChunks } from "@/services/knowledgeBaseService"
import { evaluateUsageLimits } from "@/services/usageTrackingService"

type PipelineResult = {
  responseText: string
  detectedLanguage: "en" | "es"
  context: BusinessContext
}

function detectLanguage(messageText: string): "en" | "es" {
  const normalized = messageText.toLowerCase()
  const spanishHints = [
    "hola",
    "precio",
    "cita",
    "gracias",
    "por favor",
    "necesito",
    "servicio",
    "horario",
  ]
  return spanishHints.some((hint) => normalized.includes(hint)) ? "es" : "en"
}

const intentKeywords = {
  pricing: ["price", "pricing", "cost", "quote", "precio", "costo", "cotizacion"],
  booking: ["book", "booking", "appointment", "reserve", "schedule", "cita", "agendar", "reservar"],
  services: ["services", "service list", "options", "servicios", "opciones", "include", "included", "package", "paquete", "incluye"],
  hours: ["hours", "open", "horario", "abren", "abierto"],
  complaint: ["complaint", "refund", "problem", "issue", "damage", "queja", "reclamo", "problema", "danos"],
}

const vehicleKeywords = [
  "suv",
  "truck",
  "pickup",
  "van",
  "sedan",
  "coupe",
  "hatchback",
  "motorcycle",
  "camioneta",
  "camion",
  "furgoneta",
  "moto",
]

function detectIntent(messageText: string) {
  const lower = messageText.toLowerCase()
  return {
    pricing: intentKeywords.pricing.some((word) => lower.includes(word)),
    booking: intentKeywords.booking.some((word) => lower.includes(word)),
    services: intentKeywords.services.some((word) => lower.includes(word)),
    hours: intentKeywords.hours.some((word) => lower.includes(word)),
    complaint: intentKeywords.complaint.some((word) => lower.includes(word)),
  }
}

function detectVehicleType(messageText: string): string | null {
  const lower = messageText.toLowerCase()
  const match = vehicleKeywords.find((word) => lower.includes(word))
  if (!match) return null
  if (["camioneta", "suv"].includes(match)) return "SUV"
  if (["camion", "truck"].includes(match)) return "Truck"
  if (["pickup"].includes(match)) return "Pickup"
  if (["furgoneta", "van"].includes(match)) return "Van"
  if (["moto", "motorcycle"].includes(match)) return "Motorcycle"
  if (["sedan"].includes(match)) return "Sedan"
  if (["coupe"].includes(match)) return "Coupe"
  if (["hatchback"].includes(match)) return "Hatchback"
  return "Car"
}

function detectTimePreference(messageText: string): string | null {
  const lower = messageText.toLowerCase()
  const keywords = [
    "today",
    "tomorrow",
    "this week",
    "next week",
    "morning",
    "afternoon",
    "evening",
    "hoy",
    "manana",
    "manana",
    "esta semana",
    "proxima semana",
    "tarde",
    "noche",
  ]
  const keywordMatch = keywords.find((word) => lower.includes(word))
  if (keywordMatch) return keywordMatch
  const dateMatch = messageText.match(/\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b/)
  const timeMatch = messageText.match(/\b\d{1,2}(:\d{2})?\s?(am|pm)?\b/i)
  if (dateMatch || timeMatch) {
    return [dateMatch?.[0], timeMatch?.[0]].filter(Boolean).join(" ")
  }
  return null
}

function normalizeText(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim()
}

function detectService(
  messageText: string,
  services: BusinessContext["services"]
): BusinessContext["services"][number] | null {
  if (!services || services.length === 0) return null
  const normalized = normalizeText(messageText)
  if (!normalized) return null
  return (
    services.find((service) => {
      const name = normalizeText(service.name)
      if (!name) return false
      return normalized.includes(name)
    }) ?? null
  )
}

type ConversationContext = {
  vehicleType: string | null
  timePreference: string | null
  selectedService: BusinessContext["services"][number] | null
}

function buildThreadKey(message: NormalizedMessage) {
  return message.sender_phone_or_handle || message.conversation_id
}

async function loadRecentContext(
  message: NormalizedMessage,
  services: BusinessContext["services"]
): Promise<ConversationContext> {
  const threadKey = buildThreadKey(message)
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from("messages")
    .select("message_text, direction")
    .eq("business_id", message.business_id)
    .eq("conversation_id", threadKey)
    .order("timestamp", { ascending: false })
    .limit(8)

  const rows = (data ?? []) as Array<{ message_text?: string | null; direction?: string | null }>
  let vehicleType: string | null = null
  let timePreference: string | null = null
  let selectedService: BusinessContext["services"][number] | null = null

  for (const row of rows) {
    if (row.direction !== "inbound") continue
    const text = row.message_text ?? ""
    if (!vehicleType) vehicleType = detectVehicleType(text)
    if (!timePreference) timePreference = detectTimePreference(text)
    if (!selectedService) selectedService = detectService(text, services)
    if (vehicleType && timePreference && selectedService) break
  }

  return { vehicleType, timePreference, selectedService }
}

function formatKnowledgeContext(chunks: Array<{ content: string }>) {
  if (chunks.length === 0) return null
  return chunks
    .map((chunk) => chunk.content.trim())
    .filter(Boolean)
    .slice(0, 1)
    .join("\n---\n")
}

function summarizeKnowledge(knowledge: string, maxChars = 220) {
  const cleaned = knowledge.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxChars) return cleaned
  const sentences = cleaned.split(/(?<=[.!?])\s+/)
  let summary = ""
  for (const sentence of sentences) {
    if (!sentence) continue
    if ((summary + sentence).length > maxChars) break
    summary = summary ? `${summary} ${sentence}` : sentence
  }
  return summary || cleaned.slice(0, maxChars)
}

function formatServiceLine(
  service: BusinessContext["services"][number],
  language: "en" | "es"
) {
  const price = service.base_price ? `$${service.base_price}` : null
  const duration = service.duration_minutes ? `${service.duration_minutes} min` : null
  const priceCopy = price
    ? language === "es"
      ? `desde ${price}`
      : `starting at ${price}`
    : language === "es"
    ? "precio a confirmar"
    : "price on request"
  return [service.name, priceCopy, duration].filter(Boolean).join(" - ")
}

function buildServiceOptions(
  context: BusinessContext,
  language: "en" | "es"
): string {
  if (context.services.length === 0) {
    return language === "es"
      ? "No hay servicios configurados."
      : "No services configured yet."
  }
  const names = context.services.slice(0, 3).map((service) => service.name)
  return language === "es"
    ? `Servicios: ${names.join(", ")}.`
    : `Services: ${names.join(", ")}.`
}

function buildGreeting(
  context: BusinessContext,
  language: "en" | "es"
): string {
  const name = context.business_name ?? (language === "es" ? "nuestro equipo" : "our team")
  if (context.greeting_message) {
    return context.greeting_message
  }
  return language === "es"
    ? `Hola, soy el asistente virtual de ${name}. En que te puedo ayudar?`
    : `Hi, I'm the virtual assistant for ${name}. How can I help you today?`
}

function buildMissingKnowledge(language: "en" | "es") {
  return language === "es"
    ? "Aun no hay informacion cargada. Que servicio te interesa?"
    : "We don't have detailed info loaded yet. What service are you interested in?"
}

function buildNoMatchKnowledge(language: "en" | "es") {
  return language === "es"
    ? "No encontre esa informacion. Que servicio te interesa?"
    : "I couldn't find that. Which service are you asking about?"
}

function buildKnowledgeResponse(
  knowledge: string,
  nextPrompt?: string
) {
  return `${knowledge}${nextPrompt ? ` ${nextPrompt}` : ""}`.trim()
}

function buildPricingResponse(params: {
  context: BusinessContext
  language: "en" | "es"
  selectedService: BusinessContext["services"][number] | null
  vehicleType: string | null
}): string {
  const { context, language, selectedService, vehicleType } = params
  if (!selectedService) {
    const services = buildServiceOptions(context, language)
    return language === "es"
      ? `Claro. ${services} Que servicio te interesa?`
      : `Sure. ${services} Which service are you interested in?`
  }
  if (!vehicleType) {
    return language === "es"
      ? "Que tipo de vehiculo es (sedan, SUV, pickup, etc.)?"
      : "What type of vehicle is it (sedan, SUV, pickup, etc.)?"
  }
  const baseLine = formatServiceLine(selectedService, language)
  return language === "es"
    ? `Para ${selectedService.name} en un ${vehicleType}, el precio suele ${baseLine.toLowerCase()}. El costo final depende del tamano y la condicion.`
    : `For ${selectedService.name} on a ${vehicleType}, pricing is ${baseLine.toLowerCase()}. Final cost depends on size and condition.`
}

function buildBookingResponse(params: {
  context: BusinessContext
  language: "en" | "es"
  selectedService: BusinessContext["services"][number] | null
  vehicleType: string | null
  timePreference: string | null
}): string {
  const { context, language, selectedService, vehicleType, timePreference } = params
  const missingService = !selectedService
  const missingVehicle = !vehicleType
  const missingTime = !timePreference

  if (missingService) {
    const services = buildServiceOptions(context, language)
    return language === "es"
      ? `Perfecto. Que servicio deseas reservar? ${services}`
      : `Great. Which service would you like to book? ${services}`
  }
  if (missingVehicle) {
    return language === "es"
      ? "Genial. Que tipo de vehiculo es (sedan, SUV, pickup, etc.)?"
      : "Great. What type of vehicle is it (sedan, SUV, pickup, etc.)?"
  }
  if (missingTime) {
    const hours = context.office_hours
      ? language === "es"
        ? `Horario: ${context.office_hours}.`
        : `Hours: ${context.office_hours}.`
      : ""
    return language === "es"
      ? `Listo. Que dia y hora te conviene dentro del horario? ${hours}`.trim()
      : `All set. What day and time works for you within business hours? ${hours}`.trim()
  }
  return language === "es"
    ? `Perfecto. Tengo: ${selectedService.name}, ${vehicleType}, ${timePreference}. Cual es el mejor nombre y telefono de contacto para confirmar?`
    : `Perfect. I have: ${selectedService.name}, ${vehicleType}, ${timePreference}. What's the best name and contact number to confirm?`
}

function buildEscalation(language: "en" | "es") {
  return language === "es"
    ? "Para este caso especifico, voy a conectar contigo el equipo."
    : "For this specific request, I'll connect you with the team."
}

function buildHoursResponse(context: BusinessContext, language: "en" | "es") {
  const hours = context.office_hours
    ? context.office_hours
    : language === "es"
    ? "Horario disponible a solicitud"
    : "Business hours available on request"
  return language === "es"
    ? `Nuestro horario es: ${hours}.`
    : `Our hours are: ${hours}.`
}

function generateAIResponse(
  messageText: string,
  context: BusinessContext,
  language: "en" | "es",
  knowledge: string | null,
  knowledgeExists: boolean,
  conversationContext: ConversationContext
): string {
  if (!knowledge && !knowledgeExists) {
    return buildMissingKnowledge(language)
  }
  if (!knowledge && knowledgeExists) {
    return buildNoMatchKnowledge(language)
  }

  const intent = detectIntent(messageText)
  const detectedVehicle = detectVehicleType(messageText)
  const detectedTime = detectTimePreference(messageText)
  const detectedService = detectService(messageText, context.services)
  const vehicleType = detectedVehicle ?? conversationContext.vehicleType
  const timePreference = detectedTime ?? conversationContext.timePreference
  const selectedService = detectedService ?? conversationContext.selectedService
  const knowledgeSummary = knowledge ? summarizeKnowledge(knowledge) : null

  if (intent.complaint) {
    return buildEscalation(language)
  }
  if (intent.hours) {
    return buildHoursResponse(context, language)
  }
  if (intent.services) {
    if (knowledgeSummary) {
      return buildKnowledgeResponse(
        knowledgeSummary,
        language === "es" ? "Que servicio te interesa?" : "Which service are you interested in?"
      )
    }
    const services = buildServiceOptions(context, language)
    return language === "es"
      ? `${services} Cual te interesa?`
      : `${services} Which one are you interested in?`
  }
  if (intent.pricing) {
    return buildPricingResponse({
      context,
      language,
      selectedService,
      vehicleType,
    })
  }
  if (intent.booking) {
    return buildBookingResponse({
      context,
      language,
      selectedService,
      vehicleType,
      timePreference,
    })
  }

  if (knowledgeSummary) {
    if (!selectedService && intent.services) {
      return buildKnowledgeResponse(
        knowledgeSummary,
        language === "es" ? "Que servicio te interesa?" : "Which service are you interested in?"
      )
    }
    return buildKnowledgeResponse(knowledgeSummary)
  }

  return buildGreeting(context, language)
}

export async function runChatbotPipeline(message: NormalizedMessage): Promise<PipelineResult> {
  const context = await loadBusinessContext(message.business_id)
  const detectedLanguage =
    context.language_preference ?? detectLanguage(message.message_text)
  const usage = await evaluateUsageLimits(message.business_id)
  if (usage.overLimit) {
    const responseText =
      detectedLanguage === "es"
        ? "Gracias por tu mensaje. El sistema automatizado llego al limite del plan. Por favor contacta directamente al negocio."
        : "Thanks for your message. The automated system has reached its plan limit. Please contact the shop directly."
    return { responseText, detectedLanguage, context }
  }
  const knowledgeChunks = await retrieveKnowledgeChunks(
    message.business_id,
    message.message_text
  )
  const knowledge = formatKnowledgeContext(knowledgeChunks)
  const knowledgeExists = await hasKnowledgeSources(message.business_id)
  const recentContext = await loadRecentContext(message, context.services)
  const responseText = generateAIResponse(
    message.message_text,
    context,
    detectedLanguage,
    knowledge,
    knowledgeExists,
    recentContext
  )

  try {
    const qualification = await qualifyLeadFromMessage(message, context)
    if (qualification.qualified && qualification.leadId && message.conversation_id) {
      await syncLeadToCrm({
        leadId: qualification.leadId,
        businessId: message.business_id,
        conversationId: message.conversation_id,
        senderName: message.sender_name ?? null,
        senderPhone: message.sender_phone_or_handle ?? null,
        bookingIntent: qualification.bookingIntent,
        selectedService: recentContext.selectedService?.name ?? null,
      })
    }
  } catch (error) {
    console.error("Lead qualification failed", error)
  }

  return {
    responseText,
    detectedLanguage,
    context,
  }
}
