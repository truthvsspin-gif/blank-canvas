import type { NormalizedMessage } from "@/services/messageIngest"
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
  services: ["services", "service list", "options", "servicios", "opciones"],
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
  "car",
  "coche",
  "auto",
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
    "mañana",
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

function formatKnowledgeContext(chunks: Array<{ content: string }>) {
  if (chunks.length === 0) return null
  return chunks
    .map((chunk) => chunk.content.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n---\n")
}

function summarizeKnowledge(knowledge: string, maxChars = 360) {
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

function formatServiceSummary(context: BusinessContext, language: "en" | "es"): string {
  if (context.services.length === 0) {
    return language === "es" ? "No hay servicios configurados." : "No services configured yet."
  }
  return context.services
    .slice(0, 3)
    .map((service) => {
      const price = service.base_price ? `$${service.base_price}` : null
      const duration = service.duration_minutes ? `${service.duration_minutes} min` : null
      const pieces = [service.name, price ? `desde ${price}` : null, duration].filter(Boolean)
      return pieces.join(" · ")
    })
    .join("\n")
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
  return [service.name, priceCopy, duration].filter(Boolean).join(" · ")
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
  return context.services
    .slice(0, 3)
    .map((service) => `• ${formatServiceLine(service, language)}`)
    .join("\n")
}

function buildGreeting(
  context: BusinessContext,
  language: "en" | "es"
): string {
  const name = context.business_name ?? (language === "es" ? "nuestro equipo" : "our team")
  const options =
    language === "es"
      ? "1) Servicios  2) Precios  3) Reservar cita"
      : "1) Services  2) Pricing  3) Book an appointment"
  return language === "es"
    ? `Hola, soy el asistente virtual de ${name}. En que te puedo ayudar?\n${options}`
    : `Hi, I'm the virtual assistant for ${name}. How can I help you today?\n${options}`
}

function buildMissingKnowledge(language: "en" | "es") {
  return language === "es"
    ? "Aun no hay contenido ingestado. Agrega informacion en la base de conocimiento para activar respuestas completas."
    : "No content ingested yet. Add knowledge base content to enable full responses."
}

function buildNoMatchKnowledge(language: "en" | "es") {
  return language === "es"
    ? "No encontre esa informacion en la base de conocimiento. Puedes indicar el servicio o compartir mas detalles?"
    : "I couldn't find that in the knowledge base. Can you share the service name or more details?"
}

function buildKnowledgeResponse(
  language: "en" | "es",
  knowledge: string,
  nextPrompt: string
) {
  const header = language === "es" ? "Info del negocio:" : "Business info:"
  return `${header}\n${knowledge}\n${nextPrompt}`.trim()
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
      ? `Claro. Estos son algunos servicios:\n${services}\nQue servicio te interesa?`
      : `Sure. Here are a few services:\n${services}\nWhich service are you interested in?`
  }
  const baseLine = formatServiceLine(selectedService, language)
  const vehicleCopy = vehicleType
    ? language === "es"
      ? `para un ${vehicleType}`
      : `for a ${vehicleType}`
    : language === "es"
    ? "para tu vehiculo"
    : "for your vehicle"
  return language === "es"
    ? `Para ${selectedService.name} ${vehicleCopy}, los precios suelen ${baseLine.toLowerCase()}. El costo final depende del tamano y la condicion del vehiculo.\nQue tipo de vehiculo es y cuando te gustaria agendar?`
    : `For ${selectedService.name} ${vehicleCopy}, pricing is ${baseLine.toLowerCase()}. Final cost depends on vehicle size and condition.\nWhat vehicle type is it and what timing works for you?`
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
      ? `Perfecto. Que servicio deseas reservar?\n${services}`
      : `Great. Which service would you like to book?\n${services}`
  }
  if (missingVehicle) {
    return language === "es"
      ? `Genial. Que tipo de vehiculo es (carro, SUV, camioneta, etc.)?`
      : `Great. What type of vehicle is it (car, SUV, truck, etc.)?`
  }
  if (missingTime) {
    const hours = context.office_hours
      ? language === "es"
        ? `Horario: ${context.office_hours}.`
        : `Hours: ${context.office_hours}.`
      : ""
    return language === "es"
      ? `Listo. Que dia y hora te conviene dentro del horario?\n${hours}`.trim()
      : `All set. What day and time works for you within business hours?\n${hours}`.trim()
  }
  return language === "es"
    ? `Perfecto. Tengo: ${selectedService.name}, ${vehicleType}, ${timePreference}. Necesito tu nombre y un telefono de contacto para confirmar.`
    : `Perfect. I have: ${selectedService.name}, ${vehicleType}, ${timePreference}. Please share your name and a contact phone to confirm.`
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
    ? `Nuestro horario es: ${hours}. Te gustaria agendar una cita?`
    : `Our hours are: ${hours}. Would you like to book an appointment?`
}

function generateAIResponse(
  messageText: string,
  context: BusinessContext,
  language: "en" | "es",
  knowledge: string | null,
  knowledgeExists: boolean
): string {
  if (!knowledge && !knowledgeExists) {
    return buildMissingKnowledge(language)
  }
  if (!knowledge && knowledgeExists) {
    return buildNoMatchKnowledge(language)
  }

  const intent = detectIntent(messageText)
  const vehicleType = detectVehicleType(messageText)
  const timePreference = detectTimePreference(messageText)

  if (intent.complaint) {
    return buildEscalation(language)
  }
  if (intent.hours) {
    const nextPrompt =
      language === "es"
        ? "Quieres agendar una cita?"
        : "Would you like to book an appointment?"
    return buildKnowledgeResponse(language, knowledge ?? "", nextPrompt)
  }
  if (intent.services) {
    const nextPrompt =
      language === "es"
        ? "Te interesa un precio o una cita?"
        : "Would you like pricing or to book an appointment?"
    return buildKnowledgeResponse(language, knowledge ?? "", nextPrompt)
  }
  if (intent.pricing) {
    const nextPrompt =
      language === "es"
        ? "Que servicio y tipo de vehiculo te interesa?"
        : "Which service and vehicle type are you interested in?"
    return buildKnowledgeResponse(language, knowledge ?? "", nextPrompt)
  }
  if (intent.booking) {
    const nextPrompt = (() => {
      if (!vehicleType) {
        return language === "es"
          ? "Que tipo de vehiculo es?"
          : "What type of vehicle is it?"
      }
      if (!timePreference) {
        return language === "es"
          ? "Que dia y hora prefieres?"
          : "What day and time do you prefer?"
      }
      return language === "es"
        ? "Listo. Comparte tu nombre y telefono para confirmar."
        : "Great. Share your name and phone to confirm."
    })()
    return buildKnowledgeResponse(language, knowledge ?? "", nextPrompt)
  }

  const greeting = buildGreeting(context, language)
  return buildKnowledgeResponse(language, knowledge ?? "", greeting)
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
  const responseText = generateAIResponse(
    message.message_text,
    context,
    detectedLanguage,
    knowledge,
    knowledgeExists
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
