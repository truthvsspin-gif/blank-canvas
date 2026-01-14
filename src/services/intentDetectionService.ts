export type IntentLabel = "pricing" | "booking" | "availability" | "general_question"

const INTENT_KEYWORDS: Record<IntentLabel, string[]> = {
  pricing: ["price", "pricing", "cost", "quote", "estimate", "precio", "costo", "cotizacion"],
  booking: ["book", "booking", "appointment", "reserve", "schedule", "cita", "agendar", "reservar"],
  availability: ["availability", "available", "slots", "open", "hours", "horario", "disponible"],
  general_question: [],
}

export function detectIntent(messageText: string): IntentLabel {
  const text = messageText.toLowerCase()
  if (INTENT_KEYWORDS.pricing.some((word) => text.includes(word))) {
    return "pricing"
  }
  if (INTENT_KEYWORDS.booking.some((word) => text.includes(word))) {
    return "booking"
  }
  if (INTENT_KEYWORDS.availability.some((word) => text.includes(word))) {
    return "availability"
  }
  return "general_question"
}
