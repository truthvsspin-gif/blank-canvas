// @ts-nocheck - Deno edge function
// DetaPRO Sales Agent v1 - Consultative Sales Chatbot with State Machine + Groq AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Groq API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const RECENT_HISTORY_WINDOW = 100;
const LONG_HISTORY_MAX_CHARS = 30000;
const LONG_HISTORY_SNIPPET_CHARS = 240;

// STATE MACHINE DEFINITIONS through detectFlyerType/isServicesInquiry - lines 17-590
const STATES = {
  STATE_0_OPENING: "STATE_0_OPENING",
  STATE_1_VEHICLE: "STATE_1_VEHICLE",
  STATE_2_BENEFIT: "STATE_2_BENEFIT",
  STATE_3_USAGE: "STATE_3_USAGE",
  STATE_4_PRESCRIPTION: "STATE_4_PRESCRIPTION",
  STATE_5_SCHEDULE: "STATE_5_SCHEDULE",
  STATE_6_ACTION: "STATE_6_ACTION",
  STATE_7_HANDOFF: "STATE_7_HANDOFF",
} as const;

type State = typeof STATES[keyof typeof STATES];
const STATE_ORDER: Record<State, number> = {
  STATE_0_OPENING: 0,
  STATE_1_VEHICLE: 1,
  STATE_2_BENEFIT: 2,
  STATE_3_USAGE: 3,
  STATE_4_PRESCRIPTION: 4,
  STATE_5_SCHEDULE: 5,
  STATE_6_ACTION: 6,
  STATE_7_HANDOFF: 7,
};

interface ConversationContext {
  currentState: State;
  vehicleInfo: {
    brand?: string;
    model?: string;
    year?: string;
    type?: string;
    sizeClass?: string;
  };
  benefitIntent?: string;
  protectionDuration?: "short" | "long";
  recommendationSummary?: string;
  handoffRequired: boolean;
  leadQualified: boolean;
  recoveryAttemptCount: number;
  scheduledDay?: string;
  scheduledTime?: string;
  scheduledHour?: number;
  scheduledMinute?: number;
  detectedLanguage?: "en" | "es";
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StoredMessageRow {
  direction: "inbound" | "outbound";
  message_text: string | null;
  timestamp?: string | null;
  created_at?: string | null;
}

interface AIRequest {
  businessId: string;
  action?: "chat" | "clearConversation";
  conversationId?: string;
  customerId?: string;
  customerIdentifier?: string;
  customerName?: string;
  channel?: string;
  userMessage?: string;
  conversationHistory?: ChatMessage[];
}

interface AIResponse {
  success: boolean;
  reply: string;
  intent: string | null;
  model: string;
  currentState: string;
  handoffRequired: boolean;
  leadQualified: boolean;
  returningCustomer: boolean;
  bookingCreated?: boolean;
  bookingId?: string | null;
  flyerUrl?: string | null;
  flyerType?: string | null;
  error?: string;
}

interface CustomerMemory {
  vehicleInfo: ConversationContext["vehicleInfo"];
  preferredBenefit?: string;
  protectionDuration?: "short" | "long";
  customerName?: string;
  conversationCount: number;
  lastInteractionAt: string;
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================
function detectLanguage(text: string): "en" | "es" {
  const lowerText = text.toLowerCase();
  
  const spanishPatterns = [
    /\b(hola|buenos|buenas|gracias|por favor|disculpa|oye|oiga)\b/,
    /\b(quiero|necesito|tengo|busco|estoy|puedo|puede|tienen|hacen|ofrecen|cuestan|cuesta)\b/,
    /\b(cuanto|como|donde|cual|cuando|quien|por que)\b/,
    /\b(servicio|cita|reserva|vehiculo|carro|coche|auto|camioneta|precio|lavado|limpieza)\b/,
    /\b(mi|mis|tu|tus|su|sus|el|la|los|las|un|una|unos|unas)\b/,
    /\b(para|sobre|desde|hasta|entre|con|sin|hacia|durante)\b/,
    /\b(hoy|manana|ahora|despues|antes|siempre|nunca|lunes|martes|miercoles|jueves|viernes)\b/,
    /\b(bien|bueno|buena|mejor|nuevo|nueva|grande|pequeno|diario|semanal)\b/,
    /\b(si|claro|exacto|perfecto|vale|nada|tampoco|tambien)\b/,
    /\b(me llamo|me gustaria|lo uso|es mi|para mi|por la|en la|de la)\b/,
    /\b(brillo|proteccion|interior|exterior|pintura|detallado|encerado|pulido)\b/,
  ];
  
  const isSpanish = spanishPatterns.some(pattern => pattern.test(lowerText));
  return isSpanish ? "es" : "en";
}

// ============================================================================
// SIMPLE INTENT & SLOT DETECTION
// ============================================================================
type WebhookIntent = "pricing" | "services" | "packages" | "booking" | "availability" | "general_question";

function detectWebhookIntent(text: string): WebhookIntent {
  const lower = text.toLowerCase();
  const intents: Record<WebhookIntent, string[]> = {
    pricing: ["price", "pricing", "cost", "quote", "precio", "costo", "cotizacion", "cuanto", "how much"],
    services: ["service", "services", "servicio", "servicios", "what do you offer", "que ofrecen", "menu"],
    packages: ["package", "packages", "paquete", "paquetes", "combo", "deal", "promocion", "promo"],
    booking: ["book", "booking", "appointment", "reserve", "schedule", "cita", "agendar", "reservar"],
    availability: ["availability", "available", "slots", "open", "hours", "horario", "disponible"],
    general_question: [],
  };

  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some((kw) => lower.includes(kw))) return intent as WebhookIntent;
  }
  return "general_question";
}

function detectVehicleTypeSimple(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(suv|crossover|camioneta|4x4)\b/i.test(lower)) return "SUV";
  if (/\b(pickup|pick-up|pick up|troca)\b/i.test(lower)) return "Pickup";
  if (/\b(truck|camion)\b/i.test(lower)) return "Truck";
  if (/\b(sedan)\b/i.test(lower)) return "Sedan";
  if (/\b(coupe|deportivo)\b/i.test(lower)) return "Coupe";
  if (/\b(hatchback|hatch)\b/i.test(lower)) return "Hatchback";
  if (/\b(van|minivan|mini van|furgoneta)\b/i.test(lower)) return "Van";
  if (/\b(moto|motorcycle)\b/i.test(lower)) return "Motorcycle";
  return null;
}

function normalizeTextSimple(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

function detectServiceNameSimple(text: string, services: Array<{ name?: string | null }>): string | null {
  if (!services || services.length === 0) return null;
  const normalized = normalizeTextSimple(text);
  if (!normalized) return null;
  const match = services.find((service) => {
    const name = normalizeTextSimple(service.name || "");
    return name && normalized.includes(name);
  });
  return match?.name || null;
}

function trimResponse(text: string, maxSentences = 3, maxChars = 420): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) {
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    if (sentences.length <= maxSentences) return cleaned;
    return sentences.slice(0, maxSentences).join(" ").trim();
  }
  return cleaned.slice(0, maxChars).trim();
}

// ============================================================================
// VEHICLE PARSING (STATE 1 - Internal)
// ============================================================================
function parseVehicleInfo(text: string): ConversationContext["vehicleInfo"] | null {
  const lowerText = text.toLowerCase();
  
  const brands = [
    "toyota", "honda", "ford", "chevrolet", "chevy", "nissan", "hyundai", "kia",
    "bmw", "mercedes", "audi", "volkswagen", "vw", "mazda", "subaru", "lexus",
    "jeep", "dodge", "ram", "gmc", "cadillac", "buick", "tesla", "volvo",
    "porsche", "jaguar", "land rover", "range rover", "infiniti", "acura",
    "mitsubishi", "suzuki", "fiat", "peugeot", "renault", "seat", "skoda",
    "mini", "alfa romeo", "genesis", "lincoln", "chrysler", "isuzu",
  ];
  
  const typePatterns = {
    sedan: /\b(sedan)\b/i,
    suv: /\b(suv|crossover|camioneta|truck|4x4)\b/i,
    pickup: /\b(pickup|pick-up|pick up|troca|truck)\b/i,
    coupe: /\b(coupe|deportivo|sports car)\b/i,
    hatchback: /\b(hatchback|hatch)\b/i,
    van: /\b(van|minivan|mini van)\b/i,
  };
  
  let detectedBrand: string | undefined;
  let detectedModel: string | undefined;
  let detectedYear: string | undefined;
  let detectedType: string | undefined;
  
  for (const brand of brands) {
    if (lowerText.includes(brand)) {
      detectedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }
  
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(text)) {
      detectedType = type;
      break;
    }
  }
  
  const modelPatterns = [
    /\b(camry|corolla|rav4|highlander|tacoma|4runner|tundra|prius|yaris|supra)\b/i,
    /\b(civic|accord|cr-v|pilot|odyssey|fit|hr-v|ridgeline)\b/i,
    /\b(f-150|f150|mustang|explorer|escape|bronco|ranger|edge|expedition)\b/i,
    /\b(silverado|tahoe|suburban|malibu|equinox|traverse|camaro|colorado)\b/i,
    /\b(altima|sentra|rogue|pathfinder|frontier|maxima|versa|kicks)\b/i,
    /\b(elantra|sonata|tucson|santa fe|palisade|kona|venue)\b/i,
    /\b(3 series|5 series|7 series|x1|x3|x5|x7|m3|m5|m4|z4)\b/i,
    /\b(c.?300|c.?class|e.?class|e.?350|s.?class|s.?500|gle|glc|gla|glb|amg|a.?class|cla|cls)\b/i,
    /\b(a3|a4|a5|a6|a7|a8|q3|q5|q7|q8|tt|r8|e-tron|etron|rs)\b/i,
    /\b(golf|jetta|tiguan|atlas|passat|taos|id\.?4)\b/i,
    /\b(wrangler|grand cherokee|cherokee|compass|gladiator|renegade)\b/i,
    /\b(model 3|model s|model x|model y|cybertruck)\b/i,
    /\b(cx-5|cx-30|cx-50|cx-9|mazda3|mazda6|mx-5|miata)\b/i,
    /\b(outback|forester|crosstrek|wrx|impreza|ascent|brz)\b/i,
    /\b(rx|es|is|nx|gx|lx|ux|lc|ls)\b/i,
    /\b(cayenne|macan|911|taycan|panamera|boxster|cayman)\b/i,
    /\b(xc40|xc60|xc90|s60|s90|v60|v90)\b/i,
    /\b(forte|sportage|telluride|sorento|seltos|carnival|soul|k5)\b/i,
    /\b(challenger|charger|durango|hornet)\b/i,
    /\b(1500|2500|3500)\b/i,
    /\b(sierra|yukon|terrain|acadia|canyon|hummer)\b/i,
    /\b(escalade|xt4|xt5|xt6|ct4|ct5|lyriq)\b/i,
    /\b(q50|q60|qx50|qx55|qx60|qx80)\b/i,
    /\b(mdx|rdx|tlx|integra)\b/i,
    /\b(montero|outlander|eclipse|lancer|pajero|l200|asx|mirage|xpander|eclipse cross)\b/i,
    /\b(jimny|swift|vitara|s-cross|baleno|ignis|ertiga|xl7)\b/i,
    /\b(500|punto|tipo|panda|ducato|doblo|toro|argo|cronos|strada)\b/i,
    /\b(208|308|3008|2008|5008|408|partner|rifter)\b/i,
    /\b(duster|sandero|logan|koleos|captur|megane|clio|kwid|stepway)\b/i,
    /\b(ibiza|leon|arona|ateca|tarraco)\b/i,
    /\b(octavia|kodiaq|karoq|superb|fabia|kamiq|scala)\b/i,
    /\b(cooper|countryman|clubman|paceman)\b/i,
    /\b(giulia|stelvio|tonale)\b/i,
    /\b(g70|g80|g90|gv70|gv80|gv60)\b/i,
    /\b(navigator|aviator|corsair|nautilus)\b/i,
    /\b(pacifica|300|voyager)\b/i,
    /\b(d-max|mu-x)\b/i,
    /\b(sport|velar|evoque|defender|discovery|freelander|vogue|autobiography|dynamic|se|hse)\b/i,
  ];
  
  for (const pattern of modelPatterns) {
    const match = text.match(pattern);
    if (match) {
      detectedModel = match[0];
      break;
    }
  }

  const yearMatch = text.match(/\b(19[8-9]\d|20[0-3]\d)\b/);
  if (yearMatch) {
    detectedYear = yearMatch[1];
  }
  
  let sizeClass = "medium";
  if (detectedType === "pickup" || detectedType === "suv") {
    sizeClass = "large";
  } else if (detectedType === "coupe" || detectedType === "hatchback") {
    sizeClass = "small";
  }
  
  if (detectedBrand || detectedModel || detectedYear || detectedType) {
    return {
      brand: detectedBrand,
      model: detectedModel,
      year: detectedYear,
      type: detectedType,
      sizeClass,
    };
  }
  
  return null;
}

function hasVehicleIdentity(vehicleInfo?: ConversationContext["vehicleInfo"]): boolean {
  return Boolean(vehicleInfo?.brand || vehicleInfo?.model);
}

function hasVehicleCore(vehicleInfo?: ConversationContext["vehicleInfo"]): boolean {
  return Boolean(vehicleInfo?.brand && vehicleInfo?.model);
}

function getVehicleMissingParts(vehicleInfo?: ConversationContext["vehicleInfo"]): string[] {
  const missing: string[] = [];
  if (!vehicleInfo?.brand) missing.push("brand");
  if (!vehicleInfo?.model) missing.push("model");
  return missing;
}

// BENEFIT INTENT DETECTION (STATE 2)
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseBenefitIntent(text: string): string | null {
  const lowerText = stripAccents(text.toLowerCase());
  
  if (/\b(shine|shiny|brillante|brillo|brillar|brilloso|new|nuevo|como nuevo|look|lucir|luzca|polish|pulir|scratch|swirl|detalle|detail|clean|limpio|limpia|limpiar|impecable|perfecto)\b/i.test(lowerText)) {
    return "shine";
  }
  
  if (/\b(protect|proteger|protegido|proteccion|ceramic|ceramico|wax|cera|coating|maintain|mantener|durabilidad|durable|durar|duradero|long|largo plazo|preservar|cuidar|cuidado)\b/i.test(lowerText)) {
    return "protection";
  }
  
  if (/\b(interior|inside|adentro|seats|asientos|leather|piel|cuero|smell|olor|clean inside|limpiar adentro|upholstery|tapiceria|alfombra|carpet)\b/i.test(lowerText)) {
    return "interior";
  }
  
  if (/\b(not sure|no se|unsure|no estoy seguro|don't know|maybe|quizas|options|opciones|general|basico|simple)\b/i.test(lowerText)) {
    return "unsure";
  }
  
  return null;
}

// PROTECTION DURATION DETECTION (STATE 3)
function parseProtectionDuration(text: string): "short" | "long" | null {
  const lowerText = stripAccents(text.toLowerCase());

  if (/\b(1\s*-\s*3\s*years?|1\s*a\s*3\s*anos?|1\s*to\s*3\s*years?)\b/i.test(lowerText)) {
    return "long";
  }
  if (/\b(year|years|ano|anos|long[-\s]?term|largo\s+plazo|duradero|durabilidad|ceramic|ceramico|coating)\b/i.test(lowerText)) {
    return "long";
  }

  if (/\b(few\s+months?|pocos\s+meses|some\s+months?)\b/i.test(lowerText)) {
    return "short";
  }
  if (/\b(month|months|mes|meses|short[-\s]?term|corto\s+plazo|temporal)\b/i.test(lowerText)) {
    return "short";
  }

  return null;
}

// BOOKING INTENT DETECTION (STATE 6)
function shouldTriggerHandoff(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  const negativePatterns = [
    /\b(no|not|don't|doesn't|won't|nada|nunca|tampoco)\s+(me interesa|interesado|quiero|thanks|gracias)/i,
    /\b(no me interesa|no estoy interesado|not interested|don't want|no quiero)\b/i,
  ];
  
  if (negativePatterns.some(p => p.test(lowerText))) {
    return false;
  }

  if (/\b(more robust|stronger option|better option|premium option|higher package|upgrade|mas robusta?|mas completo|opcion mas fuerte|paquete mas alto)\b/i.test(lowerText)) {
    return false;
  }
  
  const patterns = [
    /\b(interested|interesado|i'm in|me interesa|let's do it|hagamoslo|vamos|proceed|adelante)\b/i,
    /\b(i want that one|i want this one|i'll take it|i will take it|quiero ese|quiero esa|lo quiero|me quedo con ese|me quedo con esa)\b/i,
    /\b(book|reservar|agendar|schedule|programar|cita|appointment)\b/i,
    /\b(yes|si|sounds good|suena bien|perfect|perfecto|next step|siguiente paso)\b/i,
    /\b(availability|disponibilidad|when can|cuando puedo|cuando pueden)\b/i,
    /\b(confirm|confirmo|confirmar)\b/i,
  ];
  
  return patterns.some(p => p.test(lowerText));
}

function wantsMoreRobustOption(text: string): boolean {
  const lowerText = text.toLowerCase();
  return /\b(more robust|stronger option|better option|premium option|higher package|upgrade|mas robusta?|mas completo|opcion mas fuerte|paquete mas alto)\b/i.test(lowerText);
}

function hasContactInfo(text: string): boolean {
  const phonePattern = /\b(\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}|\d{10,11}|\+\d{1,3}\s?\d{6,12})\b/;
  const nameIntroPattern = /\b(me llamo|my name is|soy|i'm|i am)\s+([A-Z][a-z]+)/i;
  const capitalizedName = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)?\s*[,\\s]+.*\d{3}/;
  
  const hasPhone = phonePattern.test(text);
  const hasName = nameIntroPattern.test(text) || capitalizedName.test(text);
  
  return hasPhone && hasName;
}

// SCHEDULE RESPONSE PARSING (STATE_5_SCHEDULE)
function parseScheduleResponse(text: string): { day: string | null; time: string | null; hour: number | null; minute: number | null } {
  const lowerText = text.toLowerCase();
  
  const dayPatterns: Record<string, RegExp> = {
    monday: /\b(monday|lunes)\b/i,
    tuesday: /\b(tuesday|martes)\b/i,
    wednesday: /\b(wednesday|miercoles)\b/i,
    thursday: /\b(thursday|jueves)\b/i,
    friday: /\b(friday|viernes)\b/i,
  };
  
  let detectedDay: string | null = null;
  for (const [day, pattern] of Object.entries(dayPatterns)) {
    if (pattern.test(lowerText)) {
      detectedDay = day;
      break;
    }
  }
  
  let detectedTime: string | null = null;
  let detectedHour: number | null = null;
  let detectedMinute: number | null = null;

  const twelveHourMatch = lowerText.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (twelveHourMatch) {
    const rawHour = parseInt(twelveHourMatch[1], 10);
    const rawMinute = twelveHourMatch[2] ? parseInt(twelveHourMatch[2], 10) : 0;
    const meridiem = twelveHourMatch[3].toLowerCase();
    let hour24 = rawHour % 12;
    if (meridiem === "pm") hour24 += 12;

    detectedHour = hour24;
    detectedMinute = rawMinute;
    detectedTime = hour24 < 12 ? "morning" : "afternoon";
  } else {
    const twentyFourMatch = lowerText.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourMatch) {
      detectedHour = parseInt(twentyFourMatch[1], 10);
      detectedMinute = parseInt(twentyFourMatch[2], 10);
      detectedTime = detectedHour < 12 ? "morning" : "afternoon";
    } else {
      if (/\b(morning|manana|am|por la manana)\b/i.test(lowerText)) {
        detectedTime = "morning";
      }
      if (/\b(afternoon|tarde|pm|por la tarde|evening)\b/i.test(lowerText)) {
        detectedTime = "afternoon";
      }
    }
  }
  
  return { day: detectedDay, time: detectedTime, hour: detectedHour, minute: detectedMinute };
}

function getNextWeekday(targetDay: string): Date {
  const dayMap: Record<string, number> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5,
  };
  
  const targetDayNum = dayMap[targetDay.toLowerCase()] || 1;
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = targetDayNum - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  
  const result = new Date(now);
  result.setDate(now.getDate() + daysUntil);
  return result;
}

function getNextBusinessSlotSuggestion(language: "en" | "es"): string {
  const dayNamesEn = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayNamesEs: Record<string, string> = {
    monday: "lunes",
    tuesday: "martes",
    wednesday: "miercoles",
    thursday: "jueves",
    friday: "viernes",
  };

  const now = new Date();
  const candidate = new Date(now);
  candidate.setDate(now.getDate() + 1);

  while (candidate.getDay() === 0 || candidate.getDay() === 6) {
    candidate.setDate(candidate.getDate() + 1);
  }

  const dayEn = dayNamesEn[candidate.getDay()];
  if (language === "es") {
    const dayEs = dayNamesEs[dayEn] || "lunes";
    return `${dayEs} por la manana`;
  }
  return `${dayEn} morning`;
}

// LOW INTENT DETECTION
function isLowIntent(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  
  if (/^(no|nah|nope|na|meh|ok|k|bye|adios|chao)$/i.test(lowerText)) {
    return true;
  }
  
  const lowIntentPatterns = [
    /\b(just looking|solo viendo|browsing|curious|curioso|maybe later|despues|tal vez despues)\b/i,
    /\b(not now|ahora no|no thanks|no gracias|never mind|olvidalo|forget it)\b/i,
    /\b(not interested|no me interesa|no estoy interesado|don't want|no quiero|paso|pass)\b/i,
    /\b(too expensive|muy caro|caro|expensive|later|luego|otro dia|another day|pensare|think about it)\b/i,
    /\b(no need|no necesito|don't need|no hace falta|I'm good|estoy bien)\b/i,
  ];
  
  return lowIntentPatterns.some(p => p.test(lowerText));
}

// FLYER TYPE DETECTION
type FlyerType = "menu" | "price_list" | "services_flyer" | null;

function detectFlyerType(text: string): FlyerType {
  const lowerText = text.toLowerCase();
  
  const menuPatterns = [
    /\b(menu|food|comida|dishes|platos|eat|comer|drink|bebida|beverage|appetizer|dessert|postre|cuisine|cocina|order|ordenar|breakfast|desayuno|lunch|almuerzo|dinner|cena|specials)\b/i,
    /\b(what do you (serve|have to eat)|que (sirven|tienen para comer))\b/i,
  ];
  
  const priceListPatterns = [
    /\b(price list|lista de precios|pricing|precios|rates|tarifas|cost|costo|how much|cuanto|what.*charge|cobran|fees?|quote|cotizacion|estimate|estimado|budget|presupuesto)\b/i,
    /\b(price for|precio de|rate for|tarifa de|cost of|costo de)\b/i,
  ];
  
  const servicesFlyerPatterns = [
    /\b(services|servicios|what (do you|can you) offer|que (ofrecen|hacen)|your services|sus servicios|packages?|paquetes|options|opciones|treatments?|tratamientos|what's available|que hay disponible|available services)\b/i,
    /\b(info|information|informacion|tell me about|cuentame|details|detalles|more about|mas sobre)\b/i,
    /\b(brochure|folleto|catalog|catalogo)\b/i,
  ];
  
  if (menuPatterns.some(p => p.test(lowerText))) return "menu";
  if (priceListPatterns.some(p => p.test(lowerText))) return "price_list";
  if (servicesFlyerPatterns.some(p => p.test(lowerText))) return "services_flyer";
  
  return null;
}

function isServicesInquiry(text: string): boolean {
  return detectFlyerType(text) !== null;
}

// FLYER LOOKUP
interface FlyerResult {
  url: string | null;
  type: string | null;
}

async function lookupServicesFlyer(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  preferredType?: FlyerType,
  strictPreferred = false
): Promise<FlyerResult> {
  try {
    if (preferredType) {
      console.log(`[FLYER] Looking for ${preferredType} flyer for business ${businessId}`);
      
      const { data: preferredFlyer } = await supabase
        .from("media_assets")
        .select("file_url, asset_type")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .eq("asset_type", preferredType)
        .eq("is_default", true)
        .maybeSingle();
      
      if (preferredFlyer?.file_url) {
        console.log(`[FLYER] Found default ${preferredFlyer.asset_type} for business ${businessId}`);
        return { url: preferredFlyer.file_url, type: preferredFlyer.asset_type };
      }
      
      const { data: anyPreferred } = await supabase
        .from("media_assets")
        .select("file_url, asset_type")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .eq("asset_type", preferredType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (anyPreferred?.file_url) {
        console.log(`[FLYER] Found ${anyPreferred.asset_type} for business ${businessId}`);
        return { url: anyPreferred.file_url, type: anyPreferred.asset_type };
      }
    }
    
    if (preferredType && strictPreferred) {
      console.log(`[FLYER] No ${preferredType} flyer found for business ${businessId}`);
      return { url: null, type: null };
    }

    const { data: flyer, error } = await supabase
      .from("media_assets")
      .select("file_url, asset_type")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .in("asset_type", ["services_flyer", "menu", "price_list"])
      .eq("is_default", true)
      .maybeSingle();
    
    if (error) {
      console.error("[FLYER] Lookup error:", error.message);
      return { url: null, type: null };
    }
    
    if (flyer?.file_url) {
      console.log(`[FLYER] Found fallback default ${flyer.asset_type} for business ${businessId}`);
      return { url: flyer.file_url, type: flyer.asset_type };
    }
    
    const { data: anyFlyer } = await supabase
      .from("media_assets")
      .select("file_url, asset_type")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .in("asset_type", ["services_flyer", "menu", "price_list"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (anyFlyer?.file_url) {
      console.log(`[FLYER] Found fallback ${anyFlyer.asset_type} for business ${businessId}`);
      return { url: anyFlyer.file_url, type: anyFlyer.asset_type };
    }
    
    console.log(`[FLYER] No flyer found for business ${businessId}`);
    return { url: null, type: null };
  } catch (err) {
    console.error("[FLYER] Exception:", err);
    return { url: null, type: null };
  }
}

// CONTACT INFO EXTRACTION
function extractEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/);
  if (!match) return null;
  const digits = match[0].replace(/[^\\d+]/g, "");
  return digits.length >= 8 ? digits : null;
}

// LEAD CREATION/UPDATE
async function createOrUpdateLead(
  supabase: ReturnType<typeof createClient>,
  params: {
    businessId: string;
    conversationId: string;
    customerName: string | null;
    customerIdentifier: string | null;
    channel: string | null;
    messageText: string;
    context: ConversationContext;
  }
): Promise<string | null> {
  const { businessId, conversationId, customerName, customerIdentifier, channel, messageText, context } = params;
  
  const emailFromMessage = extractEmail(messageText);
  const phoneFromMessage = extractPhone(messageText);
  const phone = phoneFromMessage || (customerIdentifier?.startsWith("+") ? customerIdentifier : null);
  
  const qualificationParts = [];
  if (context.benefitIntent) qualificationParts.push(`intent=${context.benefitIntent}`);
  if (emailFromMessage) qualificationParts.push("contact=email");
  if (phone) qualificationParts.push("contact=phone");
  if (context.handoffRequired) qualificationParts.push("handoff=true");
  const qualificationReason = qualificationParts.join("; ");

  try {
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("business_id", businessId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (existingLead?.id) {
      await supabase
        .from("leads")
        .update({
          stage: "qualified",
          qualification_reason: qualificationReason,
          email: emailFromMessage || undefined,
          phone: phone || undefined,
          name: customerName || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id);
      
      console.log(`[LEAD] Updated existing lead ${existingLead.id}`);
      return existingLead.id;
    }

    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({
        business_id: businessId,
        conversation_id: conversationId,
        name: customerName || "Unknown",
        email: emailFromMessage,
        phone: phone,
        source: channel || "simulator",
        stage: "qualified",
        qualification_reason: qualificationReason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[LEAD] Failed to create lead:", error);
      return null;
    }

    console.log(`[LEAD] Created new lead ${newLead?.id}`);
    return newLead?.id || null;
  } catch (err) {
    console.error("[LEAD] Error in createOrUpdateLead:", err);
    return null;
  }
}

// BOOKING CREATION
interface BookingCreationResult {
  bookingId: string | null;
  created: boolean;
  updated: boolean;
}

async function createBookingFromConversation(
  supabase: ReturnType<typeof createClient>,
  params: {
    businessId: string;
    conversationId: string;
    customerIdentifier: string | null;
    customerName: string | null;
    channel: string | null;
    context: ConversationContext;
    recommendedService: string | null;
    leadId: string | null;
  }
): Promise<BookingCreationResult> {
  const { businessId, conversationId, customerIdentifier, customerName, channel, context, recommendedService, leadId } = params;

  try {
    let customerId: string | null = null;
    // Accept phone numbers with or without + prefix
    const phone = customerIdentifier && /\d{7,}/.test(customerIdentifier.replace(/[-.\s]/g, "")) ? customerIdentifier : null;

    if (phone) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", businessId)
        .eq("phone", phone)
        .maybeSingle();

      if (existingCustomer?.id) {
        customerId = existingCustomer.id;
        console.log(`[BOOKING] Found existing customer ${customerId} by phone`);
      }
    }

    if (!customerId) {
      const vehicleInfoStr = context.vehicleInfo?.brand && context.vehicleInfo?.model
        ? `${context.vehicleInfo.brand} ${context.vehicleInfo.model}`
        : context.vehicleInfo?.brand || context.vehicleInfo?.type || null;

      const { data: newCustomer, error: custError } = await supabase
        .from("customers")
        .insert({
          business_id: businessId,
          full_name: customerName || "Chatbot Lead",
          phone: phone,
          vehicle_info: vehicleInfoStr,
          tags: ["chatbot", channel || "unknown"].filter(Boolean),
        })
        .select("id")
        .single();

      if (custError) {
        console.error("[BOOKING] Failed to create customer:", custError);
        return { bookingId: null, created: false, updated: false };
      }

      customerId = newCustomer?.id || null;
      console.log(`[BOOKING] Created new customer ${customerId}`);
    }

    if (!customerId) {
      console.error("[BOOKING] No customer ID available");
      return { bookingId: null, created: false, updated: false };
    }

    let vehicleId: string | null = null;
    const vehicleBrand = context.vehicleInfo?.brand?.trim() || null;
    const vehicleModel = context.vehicleInfo?.model?.trim() || null;
    const vehicleType = context.vehicleInfo?.type?.trim() || null;

    if (customerId && (vehicleBrand || vehicleModel || vehicleType)) {
      let vehicleQuery = supabase
        .from("vehicles")
        .select("id")
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .limit(1);

      if (vehicleBrand) vehicleQuery = vehicleQuery.eq("brand", vehicleBrand);
      if (vehicleModel) vehicleQuery = vehicleQuery.eq("model", vehicleModel);

      const { data: existingVehicle } = await vehicleQuery.maybeSingle();
      if (existingVehicle?.id) {
        vehicleId = existingVehicle.id;
      } else {
        const { data: createdVehicle, error: vehicleError } = await supabase
          .from("vehicles")
          .insert({
            business_id: businessId,
            customer_id: customerId,
            brand: vehicleBrand,
            model: vehicleModel,
            size: vehicleType,
          })
          .select("id")
          .single();

        if (vehicleError) {
          console.error("[BOOKING] Failed to create vehicle:", vehicleError);
        } else {
          vehicleId = createdVehicle?.id || null;
        }
      }
    }

    const serviceName = recommendedService || context.recommendationSummary || "TBD";

    // Look up the service base_price from the services table
    let servicePrice: number | null = null;
    if (serviceName && serviceName !== "TBD") {
      const { data: matchedService } = await supabase
        .from("services")
        .select("base_price")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .ilike("name", serviceName)
        .maybeSingle();
      if (matchedService?.base_price != null) {
        servicePrice = matchedService.base_price;
        console.log(`[BOOKING] Found service price: $${servicePrice} for "${serviceName}"`);
      } else {
        console.log(`[BOOKING] No price found for service "${serviceName}"`);
      }
    }

    let scheduledAt: string | null = null;
    if (context.scheduledDay) {
      const scheduledDate = getNextWeekday(context.scheduledDay);
      let hour = 10;
      let minute = 0;

      if (typeof context.scheduledHour === "number") {
        hour = Math.max(0, Math.min(23, context.scheduledHour));
        minute = typeof context.scheduledMinute === "number"
          ? Math.max(0, Math.min(59, context.scheduledMinute))
          : 0;
      } else if (context.scheduledTime === "afternoon") {
        hour = 14;
      } else if (context.scheduledTime === "morning") {
        hour = 10;
      }

      scheduledDate.setHours(hour, minute, 0, 0);
      scheduledAt = scheduledDate.toISOString();
      console.log(`[BOOKING] Calculated scheduled_at: ${scheduledAt} from day: ${context.scheduledDay}, time: ${context.scheduledTime || 'default'}, exact: ${context.scheduledHour ?? 'none'}:${context.scheduledMinute ?? 0}`);
    }

    // Chatbot bookings start as "pending" so the owner can review before confirming
    const bookingStatus = "pending";

    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id, service_name, status, created_at, scheduled_at, vehicle_id")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .eq("source", "chatbot")
      .in("status", ["requested", "pending", "confirmed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingBooking?.id) {
      const createdAt = existingBooking.created_at ? new Date(existingBooking.created_at) : null;
      const isRecent = createdAt ? (Date.now() - createdAt.getTime() <= 24 * 60 * 60 * 1000) : false;
      const sameService = (existingBooking.service_name || "").toLowerCase() === serviceName.toLowerCase();
      if (isRecent && sameService) {
        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
        let updated = false;

        if (scheduledAt && existingBooking.scheduled_at !== scheduledAt) {
          updatePayload.scheduled_at = scheduledAt;
          updated = true;
        }

        if (existingBooking.status !== bookingStatus) {
          updatePayload.status = bookingStatus;
          updated = true;
        }

        if (leadId) {
          updatePayload.lead_id = leadId;
          updated = true;
        }

        if (vehicleId && existingBooking.vehicle_id !== vehicleId) {
          updatePayload.vehicle_id = vehicleId;
          updated = true;
        }

        if (updated) {
          const { error: updateError } = await supabase
            .from("bookings")
            .update(updatePayload)
            .eq("id", existingBooking.id);

          if (updateError) {
            console.error("[BOOKING] Failed to update existing booking:", updateError);
            return { bookingId: null, created: false, updated: false };
          }
          console.log(`[BOOKING] Updated existing recent booking: ${existingBooking.id}`);
        } else {
          console.log(`[BOOKING] Reused existing recent booking without changes: ${existingBooking.id}`);
        }

        return { bookingId: existingBooking.id, created: false, updated };
      }
    }

    const { data: newBooking, error: bookError } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        vehicle_id: vehicleId,
        lead_id: leadId,
        service_name: serviceName,
        price: servicePrice,
        status: bookingStatus,
        source: "chatbot",
        scheduled_at: scheduledAt,
      })
      .select("id")
      .single();

    if (bookError) {
      console.error("[BOOKING] Failed to create booking:", bookError);
      return { bookingId: null, created: false, updated: false };
    }

    console.log(`[BOOKING] Created new booking ${newBooking?.id} for service: ${serviceName}`);
    return { bookingId: newBooking?.id || null, created: true, updated: false };
  } catch (err) {
    console.error("[BOOKING] Error in createBookingFromConversation:", err);
    return { bookingId: null, created: false, updated: false };
  }
}

// EXTRACT RECOMMENDED SERVICE
function extractRecommendedService(
  aiResponse: string,
  services: { name: string; description?: string | null; is_trojan_horse?: boolean }[],
  context: ConversationContext
): string | null {
  if (!services || services.length === 0) return null;
  
  const responseLower = aiResponse.toLowerCase();
  
  // 1. Check if AI response mentions a service name directly
  for (const service of services) {
    const serviceName = service.name.toLowerCase();
    if (responseLower.includes(serviceName)) {
      console.log(`[SERVICE MATCH] Found "${service.name}" in AI response`);
      return service.name;
    }
  }

  // 2. Check if recommendationSummary from context mentions a service
  if (context.recommendationSummary) {
    const summaryLower = context.recommendationSummary.toLowerCase();
    for (const service of services) {
      if (summaryLower.includes(service.name.toLowerCase())) {
        console.log(`[SERVICE MATCH] Found "${service.name}" in recommendation summary`);
        return service.name;
      }
    }
  }
  
  // 3. Match by benefit intent keywords against service names/descriptions
  if (context.benefitIntent) {
    const benefitKeywords: Record<string, string[]> = {
      shine: ["brillo", "shine", "polish", "pulir", "abrillant", "wax", "cera", "express"],
      protection: ["ceramic", "ceramico", "ceramica", "coating", "ppf", "proteccion", "protection", "sellado", "premium"],
      interior: ["interior", "tapiceria", "asiento", "seat", "leather", "piel", "limpieza"],
    };
    
    const keywords = benefitKeywords[context.benefitIntent] || [];
    for (const service of services) {
      const nameAndDesc = `${service.name} ${service.description || ""}`.toLowerCase();
      if (keywords.some(kw => nameAndDesc.includes(kw))) {
        console.log(`[SERVICE MATCH] Matched "${service.name}" by benefit intent: ${context.benefitIntent}`);
        return service.name;
      }
    }
  }
  
  // 4. Fallback to trojan horse only if no intent was detected
  const trojanHorse = services.find(s => s.is_trojan_horse);
  if (trojanHorse) {
    console.log(`[SERVICE MATCH] Using Trojan Horse: "${trojanHorse.name}"`);
    return trojanHorse.name;
  }
  
  if (services.length > 0) {
    console.log(`[SERVICE MATCH] Defaulting to first service: "${services[0].name}"`);
    return services[0].name;
  }
  
  return null;
}

// STALL DETECTION
function isStallResponse(text: string, state: State): boolean {
  const lowerText = text.toLowerCase().trim();
  
  if (state === STATES.STATE_4_PRESCRIPTION || 
      state === STATES.STATE_5_SCHEDULE || 
      state === STATES.STATE_6_ACTION) {
    const vaguePatterns = [
      /^(ok|okay|hmm|mhm|alright|sure|bien|bueno|esta bien|ya|ah|oh|uh huh)\.?$/i,
      /^(i see|i understand|entiendo|ya veo)\.?$/i,
      /^(interesting|interesante)\.?$/i,
      /^(let me think|dejame pensar|lo pienso)\.?$/i,
      /\b(not sure|no se|no estoy seguro)$/i,
    ];
    
    const priceOnlyPatterns = [
      /^(how much|cuanto|what.*price|precio).*\\?$/i,
      /^(price|precio)\\??$/i,
    ];
    
    if (vaguePatterns.some(p => p.test(lowerText))) return true;
    if (priceOnlyPatterns.some(p => p.test(lowerText))) return true;
  }
  
  return false;
}

// INTENT RECOVERY PROMPT
function buildRecoveryPrompt(
  attemptNumber: number,
  context: ConversationContext,
  language: "en" | "es"
): string {
  const vehicleRef = context.vehicleInfo?.brand
    ? `${context.vehicleInfo.brand} ${context.vehicleInfo.model || ""}`.trim()
    : null;
  
  if (attemptNumber === 1) {
    return language === "es"
      ? `RECUPERACION DE INTENCION - INTENTO 1 (Reencuadre de Valor):
El cliente parece dudar. Tu objetivo es REFORZAR el valor de tu recomendacion.

INSTRUCCIONES:
1. Reconoce brevemente que entiendes su situacion ${vehicleRef ? `con su ${vehicleRef}` : ""}
2. Reenmarca el BENEFICIO principal (no caracteristicas tecnicas)
3. Ofrece agendar ahora como siguiente paso natural
4. NO preguntes si quieren algo diferente
5. NO ofrezcas alternativas
6. Manten el tono confiado pero no agresivo
7. Respuesta CORTA (2-3 oraciones maximo)`
      : `INTENT RECOVERY - ATTEMPT 1 (Value Reframe):
Customer seems hesitant. Your goal is to REINFORCE the value of your recommendation.

INSTRUCTIONS:
1. Briefly acknowledge you understand their situation ${vehicleRef ? `with their ${vehicleRef}` : ""}
2. Reframe the PRIMARY BENEFIT (not technical features)
3. Offer to book now as the natural next step
4. DO NOT ask if they want something different
5. DO NOT offer alternatives
6. Keep tone confident but not pushy
7. SHORT response (2-3 sentences max)`;
  } else {
    return language === "es"
      ? `RECUPERACION DE INTENCION - INTENTO 2 (Reduccion de Friccion):
El cliente sigue dudando. Este es tu ULTIMO intento antes de cerrar educadamente.

INSTRUCCIONES:
1. Simplifica radicalmente la eleccion
2. Ofrece UNA opcion binaria clara: "Buscas [beneficio principal] o algo mas basico por ahora?"
3. Esta pregunta les permite comprometerse O autoseleccionarse
4. Si dicen basico, sugiere un punto de entrada simple
5. Si siguen vagos despues de esto, saldras educadamente
6. NO presiones - se consultivo
7. Respuesta CORTA (2 oraciones maximo)`
      : `INTENT RECOVERY - ATTEMPT 2 (Friction Reduction):
Customer still hesitant. This is your LAST attempt before gracefully closing.

INSTRUCTIONS:
1. Radically simplify the choice
2. Offer ONE clear binary option: "Are you looking for [main benefit] or something more basic for now?"
3. This question lets them commit OR self-select out
4. If they say basic, suggest a simple entry point
5. If still vague after this, you'll exit gracefully
6. DO NOT pressure - be consultative
7. SHORT response (2 sentences max)`;
  }
}

// GROQ API CALL
interface GroqAPIResult {
  content: string;
  error?: string;
  latencyMs: number;
}

async function callGroqAPI(
  messages: ChatMessage[],
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<GroqAPIResult> {
  const startTime = Date.now();
  try {
    console.log(`[GROQ] Calling Groq API with model: ${model}, messages: ${messages.length}`);
    
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 300,
        top_p: 1,
        stream: false,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GROQ] API error:", response.status, errorText);
      return { content: "", error: `API error: ${response.status}`, latencyMs };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log(`[GROQ] Response received in ${latencyMs}ms: ${content.substring(0, 100)}...`);
    return { content, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    console.error("[GROQ] API call failed:", err);
    return { content: "", error: "Failed to connect to AI service.", latencyMs };
  }
}

// BUILD CONFIRMED FACTS BLOCK (Context Lock)
function buildConfirmedFactsBlock(context: ConversationContext, language: "en" | "es"): string {
  const facts: string[] = [];

  if (hasVehicleIdentity(context.vehicleInfo)) {
    const vehicleParts = [
      context.vehicleInfo.brand,
      context.vehicleInfo.model,
      context.vehicleInfo.year ? `(${context.vehicleInfo.year})` : null,
      context.vehicleInfo.type ? `(${context.vehicleInfo.type})` : null,
      context.vehicleInfo.sizeClass ? `- ${context.vehicleInfo.sizeClass} size` : null
    ].filter(Boolean).join(" ");
    facts.push(`VEHICLE: ${vehicleParts}`);
  }

  if (context.benefitIntent) {
    const intentMap: Record<string, { en: string; es: string }> = {
      shine: { en: "Make it look like new / shine", es: "Hacerlo lucir como nuevo / brillo" },
      protection: { en: "Long-term protection", es: "Proteccion a largo plazo" },
      interior: { en: "Interior refresh/cleaning", es: "Renovacion/limpieza interior" },
      unsure: { en: "Not sure yet - needs guidance", es: "No esta seguro - necesita orientacion" }
    };
    const intentText = intentMap[context.benefitIntent]?.[language] || context.benefitIntent;
    facts.push(`CUSTOMER GOAL: ${intentText}`);
  }

  if (context.protectionDuration) {
    const durationMap: Record<string, { en: string; es: string }> = {
      short: { en: "Short-term (a few months)", es: "Corto plazo (unos meses)" },
      long: { en: "Long-term (1-3 years)", es: "Largo plazo (1-3 anos)" }
    };
    const durationText = durationMap[context.protectionDuration]?.[language] || context.protectionDuration;
    facts.push(`PROTECTION DURATION: ${durationText}`);
  }

  if (facts.length === 0) {
    return language === "es"
      ? "===== INFORMACION CONFIRMADA =====\nNinguna aun - pregunta por el vehiculo.\n=================================="
      : "===== CONFIRMED INFORMATION =====\nNone collected yet - ask for vehicle info.\n==================================";
  }

  const header = language === "es"
    ? "===== INFORMACION CONFIRMADA (NO PREGUNTAR DE NUEVO) ====="
    : "===== CONFIRMED FACTS (DO NOT ASK ABOUT THESE AGAIN) =====";

  const footer = "=".repeat(header.length);

  return `${header}\n${facts.join("\n")}\n${footer}`;
}

// NEGATIVE CONSTRAINTS
function buildNegativeConstraints(context: ConversationContext, language: "en" | "es"): string {
  const constraints: string[] = [];

  if (hasVehicleIdentity(context.vehicleInfo)) {
    const missing = getVehicleMissingParts(context.vehicleInfo);
    if (missing.length > 0) {
      const missingText = missing.join(", ");
      constraints.push(language === "es"
        ? `No repitas lo que ya sabes del vehiculo. Solo pide lo que falta: ${missingText}.`
        : `Do not re-ask known vehicle details. Ask only what's missing: ${missingText}.`
      );
    } else {
      constraints.push(language === "es"
        ? "No preguntes de nuevo por marca/modelo/tipo."
        : "Do not ask again for make/model/type."
      );
    }
  }

  if (context.benefitIntent) {
    constraints.push(language === "es"
      ? "YA SABES su objetivo. NO preguntes que buscan o que les gustaria lograr."
      : "You ALREADY KNOW their goal. DO NOT ask what they're looking for or want to achieve."
    );
  }

  if (context.protectionDuration) {
    constraints.push(language === "es"
      ? "YA SABES la duracion de proteccion. NO preguntes meses vs largo plazo otra vez."
      : "You ALREADY KNOW the protection duration. DO NOT ask months vs long-term again."
    );
  }

  constraints.push(language === "es"
    ? "NO preguntes por el ano del vehiculo."
    : "Do NOT ask for the vehicle year."
  );

  if (constraints.length === 0) return "";

  const header = language === "es" ? "RESTRICCIONES CRITICAS:" : "CRITICAL RESTRICTIONS:";
  return `${header}\n${constraints.join("\n")}`;
}

// AGENT BRAIN - STATIC BEHAVIOR RULES
interface AgentBrainPrompt {
  coreRules: string;
  stateGoal: string;
}

function buildAgentBrain(
  state: State,
  context: ConversationContext,
  language: "en" | "es"
): AgentBrainPrompt {
  const vehicleRef = context.vehicleInfo?.brand
    ? `${context.vehicleInfo.brand} ${context.vehicleInfo.model || ""} ${context.vehicleInfo.type || ""}`.trim()
    : null;

  const coreRules = language === "es"
    ? `=== AGENTE DE VENTAS CONSULTIVO - REGLAS PRINCIPALES ===
IDENTIDAD: Eres un asesor de ventas consultivo, NO un bot informativo.
Tu trabajo es DIAGNOSTICAR necesidades y PRESCRIBIR UNA solucion, no listar opciones.

REGLAS ABSOLUTAS (NUNCA ROMPER):
1. UNA sola pregunta a la vez - SIEMPRE
2. Respuestas CORTAS (1-3 oraciones maximo)
3. NUNCA listar todos los servicios con detalle (pero SI puedes mencionar el servicio de entrada + cuantos paquetes mas hay)
4. NUNCA presentar multiples opciones con detalle; recomienda UNA sola
5. NUNCA explicar procesos tecnicos ni usar jerga
6. NUNCA pedir el ano del vehiculo
7. NUNCA pedir fotos ni depositos
8. NUNCA presionar - se consultivo, no vendedor agresivo
9. SIEMPRE incluir el precio cuando menciones un servicio
10. SOLO recomienda servicios que existen en tu CONTEXTO DE NEGOCIO
11. Si no hay servicio que aplique, haz UNA pregunta de aclaracion o cierra con amabilidad
12. Se calido, profesional y humano - responde en Espanol`
    : `=== CONSULTATIVE SALES AGENT - CORE RULES ===
IDENTITY: You are a consultative sales advisor, NOT an informational bot.
Your job is to DIAGNOSE needs and PRESCRIBE ONE solution, not list options.

ABSOLUTE RULES (NEVER BREAK):
1. ONE question at a time - ALWAYS
2. SHORT responses (1-3 sentences max)
3. NEVER list all services in detail (but you CAN mention the entry-level service + how many more packages exist)
4. NEVER present multiple options in detail; recommend ONE
5. NEVER explain technical processes or use jargon
6. NEVER ask for the vehicle year
7. NEVER ask for photos or deposits
8. NEVER pressure - be consultative, not pushy
9. ALWAYS include the price when mentioning a service
10. ONLY recommend services that exist in your BUSINESS CONTEXT
11. If no service applies, ask ONE clarifying question or close politely
12. Be warm, professional, and human - reply in English`;

  let stateGoal = "";
  const nextSlotSuggestion = getNextBusinessSlotSuggestion(language);
  switch (state) {
    case STATES.STATE_0_OPENING: {
      if (!hasVehicleCore(context.vehicleInfo)) {
        const missing = getVehicleMissingParts(context.vehicleInfo);
        const missingLabels = missing.map((part) => {
          if (language === "es") {
            if (part === "brand") return "marca";
            if (part === "model") return "modelo";
          }
          return part;
        });
        const missingText = missingLabels.length > 0
          ? missingLabels.join(", ")
          : (language === "es" ? "marca y modelo" : "brand and model");

        // ALWAYS ask for vehicle first before any recommendation
        stateGoal = language === "es"
          ? `OBJETIVO: Necesitas saber el vehiculo PRIMERO antes de recomendar cualquier servicio.
1. Saluda brevemente y de forma calida
2. Pregunta por ${missingText} del vehiculo en UNA sola pregunta
3. NO menciones servicios, precios ni paquetes todavia - primero necesitas saber el vehiculo
4. NO pidas el ano del vehiculo
5. Si el cliente pregunta por servicios o precios, di que con gusto le ayudas pero primero necesitas saber su vehiculo para dar la mejor recomendacion`
          : `GOAL: You need to know the vehicle FIRST before recommending any service.
1. Greet briefly and warmly
2. Ask for the vehicle ${missingText} in ONE short question
3. DO NOT mention services, prices, or packages yet - you need the vehicle info first
4. Do NOT ask for the vehicle year
5. If the customer asks about services or prices, say you'd love to help but first need their vehicle info to give the best recommendation`;
      } else {
        stateGoal = language === "es"
          ? `OBJETIVO: Confirmar el vehiculo y preguntar su necesidad principal.
Confirma brevemente el vehiculo y pregunta:
"¿Cual es tu principal necesidad: brillo y proteccion ligera, limpieza completa de interior, o algo mas robusto o de mayor duracion?"
NO listes servicios ni precios. Solo pregunta por su necesidad.`
          : `GOAL: Confirm the vehicle and ask their main need.
Briefly confirm the vehicle and ask:
"What is your main concern: shine and light protection, a full interior cleaning, or something more robust or longer-lasting?"
Do NOT list services or prices. Just ask about their need.`;
      }
      break;
    }

    case STATES.STATE_2_BENEFIT: {
      const earlyIntent = context.benefitIntent;
      if (earlyIntent && language === "es") {
        const intentLabel: Record<string, string> = {
          protection: "protección",
          shine: "brillo",
          cleaning: "limpieza",
          interior: "interior",
          new_car: "cuidado de auto nuevo",
        };
        const label = intentLabel[earlyIntent] || earlyIntent;
        stateGoal = `OBJETIVO: El cliente ya mencionó que le interesa "${label}".
${vehicleRef ? `Menciona su ${vehicleRef} para mostrar que escuchaste.` : ""}
Confirma esa necesidad con una pregunta corta, por ejemplo:
"Mencionaste que te interesa ${label} para tu ${vehicleRef || "vehiculo"}. ¿Es esa tu prioridad principal o hay algo mas que te preocupe?"
NO listes servicios ni opciones; solo CONFIRMA el objetivo.`;
      } else if (earlyIntent) {
        const intentLabelEn: Record<string, string> = {
          protection: "protection",
          shine: "shine",
          cleaning: "cleaning",
          interior: "interior care",
          new_car: "new car care",
        };
        const label = intentLabelEn[earlyIntent] || earlyIntent;
        stateGoal = `GOAL: The customer already mentioned interest in "${label}".
${vehicleRef ? `Reference their ${vehicleRef} to show you listened.` : ""}
Confirm that need with a short question, for example:
"You mentioned ${label} for your ${vehicleRef || "vehicle"}. Is that your main priority, or is there something else you'd like to address?"
DO NOT list services or options; just CONFIRM the goal.`;
      } else {
        stateGoal = language === "es"
          ? `OBJETIVO: Entender que beneficio/problema quieren resolver.
${vehicleRef ? `Menciona su ${vehicleRef} para mostrar que escuchaste.` : ""}
Pregunta: "¿Cual es tu principal necesidad: brillo y proteccion ligera, limpieza completa de interior, o algo mas robusto o de mayor duracion?"

PROHIBIDO en este paso:
- NO recomiendes NINGUN servicio ni paquete
- NO menciones precios
- NO menciones el servicio de entrada ni el Trojan Horse
- NO listes servicios por nombre
- SOLO haz la pregunta diagnostica sobre su NECESIDAD`
          : `GOAL: Understand what benefit/problem they want to solve.
${vehicleRef ? `Reference their ${vehicleRef} to show you listened.` : ""}
Ask: "What is your main concern: shine and light protection, a full interior cleaning, or something more robust or longer-lasting?"

FORBIDDEN at this step:
- Do NOT recommend ANY service or package
- Do NOT mention prices
- Do NOT mention the entry-level or Trojan Horse service
- Do NOT list services by name
- ONLY ask the diagnostic question about their NEED`;
      }
      break;
    }

    case STATES.STATE_3_USAGE:
      if (!context.protectionDuration) {
        stateGoal = language === "es"
          ? `OBJETIVO: Aclarar duracion de proteccion (una pregunta).
${vehicleRef ? `Referencia su ${vehicleRef}.` : ""}
Pregunta: "Buscas algo que dure unos meses, o proteccion a largo plazo (1 a 3 anos)?"`
          : `GOAL: Clarify protection duration (one question).
${vehicleRef ? `Reference their ${vehicleRef}.` : ""}
Ask: "Are you looking for something that lasts a few months, or long-term protection (1 to 3 years)?"`;
      } else {
        stateGoal = language === "es"
          ? `OBJETIVO: Ya tienes la duracion. Avanza a la recomendacion.`
          : `GOAL: You already have the duration. Move to recommendation.`;
      }
      break;

    case STATES.STATE_4_PRESCRIPTION: {
      // Intent-aware prescription: recommend the service that matches what the customer asked for
      const hasProtectionIntent = context.benefitIntent === "protection" || context.protectionDuration === "long";
      const hasInteriorIntent = context.benefitIntent === "interior";
      // If user expressed a clear intent, recommend the MATCHING service, not the Trojan Horse
      const intentBasedEs = hasProtectionIntent
        ? `OBJETIVO: El cliente quiere PROTECCION ROBUSTA/LARGO PLAZO. Recomienda el servicio de PROTECCION CERAMICA (el mas premium/proteccion) con su PRECIO EXACTO.
1. Breve resumen mostrando que entiendes su necesidad de proteccion duradera
2. Recomienda el servicio de ceramica/proteccion premium con su precio exacto
3. Cierra con: "Te gustaria agendar una cita para este servicio?"
NO recomiendes el servicio basico/de entrada. El cliente ya dijo que quiere algo robusto y duradero.`
        : hasInteriorIntent
          ? `OBJETIVO: El cliente quiere LIMPIEZA/RENOVACION INTERIOR. Recomienda el servicio de INTERIOR con su PRECIO EXACTO.
1. Breve resumen mostrando que entiendes su necesidad de interior
2. Recomienda el servicio de interior/limpieza profunda con su precio exacto
3. Cierra con: "Te gustaria agendar una cita para este servicio?"
NO recomiendes el servicio basico/de entrada. El cliente ya dijo que quiere interior.`
          : `OBJETIVO: Recomendar PRIMERO el servicio Trojan Horse (entrada) con PRECIO.
1. Breve resumen mostrando que entiendes su situacion
2. Enmarca el beneficio principal (no proceso tecnico)
3. Recomienda el servicio marcado como Trojan Horse (entrada) con su precio exacto
4. Cierra SIEMPRE con esta pregunta: "Te interesa este servicio o prefieres algo mas completo y profundo?"
5. Si el cliente dice que SI quiere el basico, avanza a agendar (STATE 5)
6. Si el cliente pide algo mas completo/profundo, recomienda UNA opcion superior con precio`;

      const intentBasedEn = hasProtectionIntent
        ? `GOAL: Customer wants ROBUST/LONG-TERM PROTECTION. Recommend the CERAMIC PROTECTION (premium) service with EXACT PRICE.
1. Brief summary showing you understand their need for lasting protection
2. Recommend the ceramic/premium protection service with exact price
3. Close with: "Would you like to schedule an appointment for this service?"
Do NOT recommend the basic/entry service. Customer already said they want something robust and lasting.`
        : hasInteriorIntent
          ? `GOAL: Customer wants INTERIOR CLEANING/RENEWAL. Recommend the INTERIOR service with EXACT PRICE.
1. Brief summary showing you understand their interior need
2. Recommend the interior/deep cleaning service with exact price
3. Close with: "Would you like to schedule an appointment for this service?"
Do NOT recommend the basic/entry service. Customer already said they want interior work.`
          : `GOAL: Recommend the Trojan Horse (entry-level) service FIRST with PRICE.
1. Brief summary showing you understand their situation
2. Frame the primary benefit (not technical process)
3. Recommend the Trojan Horse (entry) service with exact price
4. ALWAYS close with: "Is this something you'd like, or would you prefer a deeper, more complete service?"
5. If customer says YES to the basic, advance to scheduling (STATE 5)
6. If customer asks for something deeper, recommend ONE superior option with price`;

      stateGoal = language === "es"
        ? `${intentBasedEs}

CRITICO: Ya tienes TODA la informacion del vehiculo en INFORMACION CONFIRMADA.
NO vuelvas a preguntar marca, modelo ni tipo de vehiculo.
USA esa informacion para personalizar tu recomendacion.

IMPORTANTE: Selecciona precios basandote en:
- Vehiculo del cliente (tamano, tipo)
- Objetivo deseado (brillo, proteccion, interior)
- Duracion de proteccion si aplica`
        : `${intentBasedEn}

CRITICAL: You already have ALL vehicle information in CONFIRMED INFORMATION.
DO NOT ask for make, model, or vehicle type again.
USE that information to personalize your recommendation.

IMPORTANT: Select prices based on:
- Customer's vehicle (size, type)
- Desired outcome (shine, protection, interior)
- Protection duration if applicable`;
      break;
    }
    case STATES.STATE_5_SCHEDULE: {
      const hasDay = !!context.scheduledDay;
      const hasTime = !!context.scheduledTime;
      const askEs = !hasDay && !hasTime
        ? `Tengo disponible ${nextSlotSuggestion}. Te funciona ese horario o prefieres otro dia entre lunes y viernes?`
        : !hasDay
          ? "Que dia te queda mejor (lunes a viernes)?"
          : !hasTime
            ? "Prefieres manana o tarde?"
            : "Confirmo tu reserva. Si necesitas cambios, avisame.";
      const askEn = !hasDay && !hasTime
        ? `I have ${nextSlotSuggestion} available. Does that work for you, or do you prefer another day (Mon-Fri)?`
        : !hasDay
          ? "What day works best (Mon-Fri)?"
          : !hasTime
            ? "Do you prefer morning or afternoon?"
            : "Your booking is confirmed. If you need changes, just let me know.";

      stateGoal = language === "es"
        ? `OBJETIVO: Agendar la reserva.
${vehicleRef ? `Referencia su ${vehicleRef}.` : ""}
Pregunta: "${askEs}"`
        : `GOAL: Schedule the booking.
${vehicleRef ? `Reference their ${vehicleRef}.` : ""}
Ask: "${askEn}"`;
      break;
    }
    case STATES.STATE_6_ACTION:
      stateGoal = language === "es"
        ? `OBJETIVO: Recopilar datos de confirmacion para la cita.
Pide al cliente los siguientes datos para confirmar:
1. Nombre completo
2. Vehiculo (marca y modelo, si aun no lo tienes confirmado)
3. Numero de WhatsApp o telefono de contacto
Menciona el dia/horario si ya lo tienes.
No transfieras a humano.
Respuesta CORTA (2-3 oraciones).`
        : `GOAL: Collect confirmation details for the appointment.
Ask the customer for the following to confirm:
1. Full name
2. Vehicle (make and model, if not already confirmed)
3. WhatsApp or phone number for contact
Mention the day/time if available.
Do not hand off to a human.
SHORT response (2-3 sentences).`;
      break;

    case STATES.STATE_7_HANDOFF:
      stateGoal = language === "es"
        ? `OBJETIVO: Confirmar la reserva.
Indica que la reserva esta confirmada y que puede pedir cambios si los necesita.
Respuesta breve.`
        : `GOAL: Confirm the booking.
State the booking is confirmed and they can request changes if needed.
Brief response.`;
      break;

    default:
      stateGoal = "";
  }

  return { coreRules, stateGoal };
}

// DYNAMIC BUSINESS CONTEXT BLOCK (Generated from DB on each request)
interface ServiceContext {
  name: string;
  description: string | null;
  base_price: number | null;
  duration_minutes: number | null;
  is_trojan_horse?: boolean;
  ideal_for?: string;
  exclusions?: string;
}

function buildBusinessContextBlock(
  business: any,
  services: ServiceContext[],
  language: "en" | "es",
  currentState?: State
): string {
  const businessName = business?.name || "the business";
  const businessDesc = business?.business_description || "";
  const customInstructions = business?.ai_instructions || "";

  if (!services || services.length === 0) {
    return language === "es"
      ? `=== CONTEXTO DE NEGOCIO (SOLO INTERNO) ===
ADVERTENCIA: No hay servicios configurados para este negocio.
NO intentes vender ni recomendar servicios especificos.
Indica que ahora no hay servicios configurados y ofrece intentar mas tarde.
===========================================`
      : `=== BUSINESS CONTEXT (INTERNAL ONLY) ===
WARNING: No services configured for this business.
DO NOT attempt to sell or recommend specific services.
Let them know no services are configured and offer to try again later.
=========================================`;
  }

  const trojanHorse = services.find(s => s.is_trojan_horse);

  const serviceBlocks = services.map((service, idx) => {
    const parts: string[] = [];
    const isTrojan = service.is_trojan_horse;
    
    parts.push(`${idx + 1}. ${service.name}${isTrojan ? " -> [ENTRY-LEVEL SERVICE]" : ""}`);
    
    if (service.description) {
      parts.push(`   - Benefit: ${service.description}`);
    }
    
    const idealFor = inferIdealFor(service.name, service.description || "");
    if (idealFor) {
      parts.push(`   - Ideal when: ${idealFor}`);
    }
    
    if (isTrojan) {
      parts.push(`   - DEFAULT for general inquiries or unclear needs`);
    }
    
    if (service.base_price) {
      parts.push(`   - Price range: ~$${service.base_price}`);
    }
    
    if (service.duration_minutes) {
      parts.push(`   - Duration: ~${service.duration_minutes} min`);
    }
    
    return parts.join("\n");
  }).join("\n\n");

  const header = language === "es"
    ? "=== CONTEXTO DE NEGOCIO (SOLO INTERNO - NUNCA MOSTRAR AL CLIENTE) ==="
    : "=== BUSINESS CONTEXT (INTERNAL ONLY - NEVER SHOW TO CUSTOMER) ===";

  // Trojan Horse rule (DetaPRO v1.2) - Show entry service + teaser of other packages
  const otherCount = services.filter(s => !s.is_trojan_horse).length;
  const otherTeaserEs = otherCount > 0
    ? ` Tambien ofrecemos ${otherCount} paquete${otherCount > 1 ? "s" : ""} mas para distintas necesidades.`
    : "";
  const otherTeaserEn = otherCount > 0
    ? ` We also offer ${otherCount} more package${otherCount > 1 ? "s" : ""} for different needs.`
    : "";
  // Build a short list of other services by name + price for when customer asks
  const otherServices = services.filter(s => !s.is_trojan_horse);
  const otherListEs = otherServices.map(s => `- ${s.name}${s.base_price ? ` (~$${s.base_price})` : ""}`).join("\n");
  const otherListEn = otherServices.map(s => `- ${s.name}${s.base_price ? ` (~$${s.base_price})` : ""}`).join("\n");

  // Only include Trojan Horse rule when we're in STATE_4+ (prescription or later)
  // In earlier states (STATE_0-3), we must NOT recommend services - we're still diagnosing
  const isPrescriptionReady = currentState && STATE_ORDER[currentState] >= STATE_ORDER[STATES.STATE_4_PRESCRIPTION];
  
  const trojanHorseRule = trojanHorse && isPrescriptionReady
    ? language === "es"
      ? `
REGLA DE RECOMENDACION: Selecciona el servicio que MEJOR se ajuste a la necesidad expresada por el cliente:
- Si el cliente pidio proteccion robusta/largo plazo/ceramica → recomienda el servicio de PROTECCION CERAMICA/PREMIUM
- Si el cliente pidio limpieza interior → recomienda el servicio de INTERIOR
- Si el cliente pidio brillo/limpieza rapida O no tiene objetivo especifico → recomienda "${trojanHorse.name}"${trojanHorse.base_price ? ` (~$${trojanHorse.base_price})` : ""} como punto de entrada
${otherTeaserEs.trim()}
NO listes los otros servicios por nombre a menos que el cliente PREGUNTE EXPLICITAMENTE.`
      : `
RECOMMENDATION RULE: Select the service that BEST matches the customer's expressed need:
- If customer asked for robust/long-term protection/ceramic → recommend the CERAMIC/PREMIUM PROTECTION service
- If customer asked for interior cleaning → recommend the INTERIOR service  
- If customer asked for shine/quick clean OR has no specific goal → recommend "${trojanHorse.name}"${trojanHorse.base_price ? ` (~$${trojanHorse.base_price})` : ""} as the entry point
${otherTeaserEn.trim()}
Do NOT list other services by name unless the customer EXPLICITLY ASKS.`
    : trojanHorse && !isPrescriptionReady
      ? language === "es"
        ? `\nIMPORTANTE: NO recomiendes servicios todavia. Primero debes entender la necesidad del cliente (brillo, proteccion, interior). Los servicios listados son SOLO para tu referencia interna.`
        : `\nIMPORTANT: Do NOT recommend services yet. First understand the customer's need (shine, protection, interior). Services listed are for your INTERNAL reference only.`
      : "";

  const rulesBlock = language === "es"
    ? `REGLAS DE USO:
- SOLO puedes recomendar servicios listados aqui
- NUNCA inventes servicios, paquetes o precios
- NO listes todos los servicios EXCEPTO cuando el cliente pregunte explicitamente por otros servicios
- Selecciona UNA mejor opcion basada en su situacion
- Si nada aplica, haz UNA pregunta de aclaracion o cierra de forma amable
- SIEMPRE menciona el precio cuando recomiendes un servicio
- Si preguntan por disponibilidad o agenda, pasa al flujo de reserva (dia y horario)${trojanHorseRule}`
    : `USAGE RULES:
- You may ONLY recommend services listed here
- NEVER invent services, packages, or prices
- Do NOT list all services UNLESS the customer explicitly asks about other services
- Select ONE best option based on their situation
- If nothing fits, ask ONE clarifying question or close politely
- ALWAYS mention the price when recommending a service
- If they ask about availability/scheduling, proceed to booking (day/time)${trojanHorseRule}`;

  let contextBlock = `${header}
Business: ${businessName}
${businessDesc ? `Description: ${businessDesc}` : ""}

AVAILABLE SERVICES:
${serviceBlocks}

${rulesBlock}`;

  if (customInstructions) {
    contextBlock += `\n\nCUSTOM BUSINESS INSTRUCTIONS:\n${customInstructions}`;
  }

  contextBlock += "\n" + "=".repeat(header.length);

  return contextBlock;
}

// INFER IDEAL USE CASES
function inferIdealFor(name: string, description: string): string {
  const lowerName = name.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const combined = `${lowerName} ${lowerDesc}`;
  
  if (/polish|shine|brillo|correction|scratch|swirl|enhancement/.test(combined)) {
    return "customer wants vehicle to look new, remove scratches/swirls";
  }
  
  if (/ceramic|coating|protection|proteccion|sealant|wax|durability/.test(combined)) {
    return "customer wants long-term protection, durability";
  }
  
  if (/interior|inside|leather|seats|upholstery|carpet|smell|odor/.test(combined)) {
    return "customer wants interior refresh, cleaning, odor removal";
  }
  
  if (/full|complete|completo|detail|total/.test(combined)) {
    return "customer wants comprehensive service, inside and out";
  }
  
  if (/wash|maintenance|basic|express|quick|lavado/.test(combined)) {
    return "customer wants quick maintenance wash";
  }
  
  return "";
}

// ASSEMBLE COMPLETE SYSTEM PROMPT
function buildSystemPrompt(
  state: State,
  context: ConversationContext,
  language: "en" | "es",
  business: any,
  services: ServiceContext[]
): string {
  const confirmedFacts = buildConfirmedFactsBlock(context, language);
  const negativeConstraints = buildNegativeConstraints(context, language);
  const { coreRules, stateGoal } = buildAgentBrain(state, context, language);
  const businessContext = buildBusinessContextBlock(business, services, language, state);

  const languageInstruction = language === "es"
    ? "IDIOMA OBLIGATORIO: Responde SIEMPRE en ESPANOL. Bajo ninguna circunstancia respondas en ingles."
    : "MANDATORY LANGUAGE: ALWAYS respond in ENGLISH. Never respond in Spanish.";

  return `${languageInstruction}

${confirmedFacts}

${negativeConstraints}

${coreRules}

${businessContext}

CURRENT STATE: ${state}
${stateGoal}`.trim();
}

// STATE TRANSITION LOGIC WITH GROQ
interface StateMachineResult {
  reply: string;
  newContext: ConversationContext;
  performance: {
    responseTimeMs: number;
    isFallback: boolean;
    aiModel: string;
  };
}

async function processStateMachine(
  userMessage: string,
  context: ConversationContext,
  language: "en" | "es",
  business: any,
  services: any[],
  conversationHistory: ChatMessage[],
  fullHistory: ChatMessage[],
  apiKey: string
): Promise<StateMachineResult> {
  const newContext = { ...context };
  const effectiveHistory = fullHistory && fullHistory.length > 0 ? fullHistory : conversationHistory;
  let lastLatencyMs = 0;
  let usedFallback = false;
  
  console.log(`[STATE MACHINE] Current state: ${context.currentState}, Message: "${userMessage.substring(0, 50)}..."`);
  
  if (isLowIntent(userMessage)) {
    if (context.recoveryAttemptCount < 2 && 
        (context.currentState === STATES.STATE_4_PRESCRIPTION || context.currentState === STATES.STATE_5_SCHEDULE)) {
      console.log(`[RECOVERY] Low intent detected but attempting recovery (attempt ${context.recoveryAttemptCount + 1})`);
      newContext.recoveryAttemptCount = context.recoveryAttemptCount + 1;
    } else {
      console.log(`[EXIT] Low intent with ${context.recoveryAttemptCount} recovery attempts - exiting gracefully`);
      const exitPrompt = buildSystemPrompt(context.currentState, context, language, business, services);
      const messages: ChatMessage[] = [
        { role: "system", content: `${exitPrompt}\n\nThe customer shows low intent and recovery attempts are exhausted. Exit gracefully:\n- Be warm and professional\n- Leave the door open for future contact\n- Do NOT pressure or try to recover\n- Keep it to 1-2 sentences` },
        { role: "user", content: userMessage }
      ];
      
      const { content, error, latencyMs } = await callGroqAPI(messages, apiKey);
      lastLatencyMs = latencyMs;
      if (error || !content) {
        usedFallback = true;
        const fallback = language === "es"
          ? "Perfecto, cuando quieras retomarlo estare aqui. Que tengas buen dia."
          : "Perfect, whenever you want to revisit it I'll be happy to help. Have a great day.";
        return { 
          reply: fallback, 
          newContext,
          performance: { responseTimeMs: lastLatencyMs, isFallback: true, aiModel: DEFAULT_MODEL }
        };
      }
      return { 
        reply: content, 
        newContext,
        performance: { responseTimeMs: lastLatencyMs, isFallback: false, aiModel: DEFAULT_MODEL }
      };
    }
  }
  
  // INTENT RECOVERY WINDOW
  if ((context.currentState === STATES.STATE_4_PRESCRIPTION || 
       context.currentState === STATES.STATE_5_SCHEDULE ||
       context.currentState === STATES.STATE_6_ACTION) &&
      isStallResponse(userMessage, context.currentState) &&
      context.recoveryAttemptCount < 2) {
    
    const attemptNumber = context.recoveryAttemptCount + 1;
    newContext.recoveryAttemptCount = attemptNumber;
    
    console.log(`[RECOVERY] Stall detected in ${context.currentState}, triggering recovery attempt ${attemptNumber}`);
    
    const basePrompt = buildSystemPrompt(context.currentState, context, language, business, services);
    const recoveryInstructions = buildRecoveryPrompt(attemptNumber, context, language);
    
    const messages: ChatMessage[] = [
      { role: "system", content: `${basePrompt}\n\n${recoveryInstructions}` },
      ...effectiveHistory.slice(-RECENT_HISTORY_WINDOW),
      { role: "user", content: userMessage }
    ];
    
    const { content, error, latencyMs } = await callGroqAPI(messages, apiKey);
    lastLatencyMs = latencyMs;
    
    if (error || !content) {
      usedFallback = true;
      const recoveryFallback = attemptNumber === 1
        ? (language === "es"
            ? "Basandome en lo que me compartiste, esta opcion realmente se adapta a tu situacion. Quieres agendarla ahora o prefieres una opcion mas robusta?"
            : "Based on what you've shared, this option really fits your situation. Would you like to book it now, or prefer a more robust option?")
        : (language === "es"
            ? "Para simplificarlo: buscas el resultado completo que mencionamos, o algo mas basico por ahora?"
            : "To simplify: are you looking for the full result we discussed, or something more basic for now?");
      return { 
        reply: recoveryFallback, 
        newContext,
        performance: { responseTimeMs: lastLatencyMs, isFallback: true, aiModel: DEFAULT_MODEL }
      };
    }
    
    return { 
      reply: content, 
      newContext,
      performance: { responseTimeMs: lastLatencyMs, isFallback: false, aiModel: DEFAULT_MODEL }
    };
  }
  
  if (context.recoveryAttemptCount > 0 && !isStallResponse(userMessage, context.currentState) && !isLowIntent(userMessage)) {
    newContext.recoveryAttemptCount = 0;
    console.log(`[RECOVERY] Customer engaged meaningfully, resetting recovery count`);
  }
  
  // Check for booking intent
  if ((context.currentState === STATES.STATE_4_PRESCRIPTION ||
       context.currentState === STATES.STATE_5_SCHEDULE ||
       context.currentState === STATES.STATE_6_ACTION) &&
      (shouldTriggerHandoff(userMessage) || hasContactInfo(userMessage))) {
    newContext.leadQualified = true;
    const schedule = parseScheduleResponse(userMessage);
    if (schedule.day) newContext.scheduledDay = schedule.day;
    if (schedule.time) newContext.scheduledTime = schedule.time;
    if (typeof schedule.hour === "number") {
      newContext.scheduledHour = schedule.hour;
      newContext.scheduledMinute = typeof schedule.minute === "number" ? schedule.minute : 0;
    }
    
    // Determine next state: need schedule first, then contact info
    if (hasContactInfo(userMessage) && newContext.scheduledDay && newContext.scheduledTime) {
      // Has both schedule AND contact info → go to handoff
      newContext.handoffRequired = true;
      newContext.currentState = STATES.STATE_7_HANDOFF;
    } else if (newContext.scheduledDay && newContext.scheduledTime) {
      // Has schedule but NO contact info → go to STATE_6 to collect it
      newContext.currentState = STATES.STATE_6_ACTION;
    } else {
      newContext.currentState = STATES.STATE_5_SCHEDULE;
    }

    const systemPrompt = buildSystemPrompt(newContext.currentState, newContext, language, business, services);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...effectiveHistory.slice(-RECENT_HISTORY_WINDOW),
      { role: "user", content: userMessage }
    ];

    const { content, error, latencyMs } = await callGroqAPI(messages, apiKey);
    lastLatencyMs = latencyMs;
    if (error || !content) {
      usedFallback = true;
      const dayText = newContext.scheduledDay ? newContext.scheduledDay : null;
      const timeText = newContext.scheduledTime ? newContext.scheduledTime : null;
      const scheduleFallback = newContext.currentState === STATES.STATE_6_ACTION
        ? (language === "es"
            ? `Perfecto! Para confirmar tu cita, necesito tu nombre completo y un numero de WhatsApp o telefono de contacto.`
            : `Perfect! To confirm your appointment, I need your full name and a WhatsApp or phone number where we can reach you.`)
        : (language === "es"
            ? `Perfecto. Tengo disponible ${getNextBusinessSlotSuggestion(language)}. Te funciona ese horario o prefieres otro dia entre lunes y viernes?`
            : `Perfect. I have ${getNextBusinessSlotSuggestion(language)} available. Does that work, or do you prefer another day (Mon-Fri)?`);
      return {
        reply: scheduleFallback,
        newContext,
        performance: { responseTimeMs: lastLatencyMs, isFallback: true, aiModel: DEFAULT_MODEL }
      };
    }
    return {
      reply: content,
      newContext,
      performance: { responseTimeMs: lastLatencyMs, isFallback: false, aiModel: DEFAULT_MODEL }
    };
  }

  // Process based on current state
  switch (context.currentState) {
    case STATES.STATE_0_OPENING: {
      const vehicleInfo = parseVehicleInfo(userMessage);
      if (vehicleInfo) {
        newContext.vehicleInfo = { ...(newContext.vehicleInfo || {}), ...vehicleInfo };
        console.log(`[STATE MACHINE] Vehicle updated: ${JSON.stringify(newContext.vehicleInfo)}`);
      }
      // Store early benefit/duration signals but do NOT skip STATE_2_BENEFIT.
      // We ALWAYS ask the customer's main concern to validate their need
      // before prescribing any service. This lets us guide the conversation
      // and avoids offering the entry service when the customer actually
      // wants premium protection.
      const earlyBenefit = parseBenefitIntent(userMessage);
      if (earlyBenefit && !newContext.benefitIntent) newContext.benefitIntent = earlyBenefit;
      const earlyDuration = parseProtectionDuration(userMessage);
      if (earlyDuration && !newContext.protectionDuration) newContext.protectionDuration = earlyDuration;
      if (hasVehicleCore(newContext.vehicleInfo)) {
        // Always go to STATE_2_BENEFIT to ask the customer's main concern.
        // Even if we detected a benefit keyword, we confirm it with the customer
        // so they feel heard and we validate the actual need.
        newContext.currentState = STATES.STATE_2_BENEFIT;
      }
      break;
    }
    case STATES.STATE_2_BENEFIT: {
      const benefit = parseBenefitIntent(userMessage);
      const duration = parseProtectionDuration(userMessage);

      if (benefit) {
        newContext.benefitIntent = benefit;
        if (benefit === "protection") {
          if (duration) {
            newContext.protectionDuration = duration;
            newContext.currentState = STATES.STATE_4_PRESCRIPTION;
          } else {
            newContext.currentState = STATES.STATE_3_USAGE;
          }
        } else {
          newContext.currentState = STATES.STATE_4_PRESCRIPTION;
        }
      } else if (duration) {
        newContext.benefitIntent = "protection";
        newContext.protectionDuration = duration;
        newContext.currentState = STATES.STATE_4_PRESCRIPTION;
      } else if (shouldTriggerHandoff(userMessage)) {
        newContext.benefitIntent = "unsure";
        newContext.currentState = STATES.STATE_4_PRESCRIPTION;
      }
      break;
    }
    case STATES.STATE_3_USAGE: {
      const duration = parseProtectionDuration(userMessage);
      if (duration) {
        newContext.protectionDuration = duration;
        newContext.currentState = STATES.STATE_4_PRESCRIPTION;
      } else {
        newContext.protectionDuration = "short";
        newContext.currentState = STATES.STATE_4_PRESCRIPTION;
      }
      break;
    }
    case STATES.STATE_4_PRESCRIPTION: {
      newContext.leadQualified = true;
      if (wantsMoreRobustOption(userMessage)) {
        newContext.benefitIntent = "protection";
        newContext.protectionDuration = "long";
      }
      newContext.currentState = STATES.STATE_4_PRESCRIPTION;
      break;
    }
    case STATES.STATE_5_SCHEDULE: {
      const schedule = parseScheduleResponse(userMessage);
      if (schedule.day) newContext.scheduledDay = schedule.day;
      if (schedule.time) newContext.scheduledTime = schedule.time;
      if (typeof schedule.hour === "number") {
        newContext.scheduledHour = schedule.hour;
        newContext.scheduledMinute = typeof schedule.minute === "number" ? schedule.minute : 0;
      }

      if (newContext.scheduledDay && newContext.scheduledTime) {
        newContext.currentState = STATES.STATE_6_ACTION;
      } else {
        newContext.currentState = STATES.STATE_5_SCHEDULE;
      }
      break;
    }
    case STATES.STATE_6_ACTION: {
      // Check if user provided contact info (name + phone) in this message
      if (hasContactInfo(userMessage)) {
        newContext.handoffRequired = true;
        newContext.currentState = STATES.STATE_7_HANDOFF;
      } else {
        // Stay in STATE_6 until contact info is provided
        newContext.currentState = STATES.STATE_6_ACTION;
      }
      break;
    }
    case STATES.STATE_7_HANDOFF: {
      break;
    }
  }

  // Universal schedule extraction: parse schedule info from ANY state
  // so that if a user provides day/time early, it's captured
  if (!newContext.scheduledDay || !newContext.scheduledTime) {
    const schedule = parseScheduleResponse(userMessage);
    if (schedule.day && !newContext.scheduledDay) newContext.scheduledDay = schedule.day;
    if (schedule.time && !newContext.scheduledTime) newContext.scheduledTime = schedule.time;
    if (typeof schedule.hour === "number" && typeof newContext.scheduledHour === "undefined") {
      newContext.scheduledHour = schedule.hour;
      newContext.scheduledMinute = typeof schedule.minute === "number" ? schedule.minute : 0;
    }
  }
  
  const contextSummary = buildContextSummary(newContext, language);
  
  const baseSystemPrompt = buildSystemPrompt(newContext.currentState, newContext, language, business, services);
  const longHistoryBlock = buildLongHistoryMemoryBlock(effectiveHistory, language);
  const systemPrompt = longHistoryBlock
    ? `${baseSystemPrompt}\n\n${longHistoryBlock}`
    : baseSystemPrompt;
  
  const historyWithContext: ChatMessage[] = contextSummary
    ? [{ role: "assistant" as const, content: contextSummary }, ...effectiveHistory.slice(-RECENT_HISTORY_WINDOW)]
    : effectiveHistory.slice(-RECENT_HISTORY_WINDOW);
  
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyWithContext,
    { role: "user", content: userMessage }
  ];
  
  let { content, error, latencyMs } = await callGroqAPI(messages, apiKey);
  lastLatencyMs = latencyMs;
  
  if (content && !validateResponse(content, newContext)) {
    console.warn("[VALIDATION] Response failed validation, regenerating with stronger constraints");
    const reinforcedPrompt = `${systemPrompt}\n\nCRITICAL: Your previous response asked about information we already have. DO NOT repeat this mistake. Check CONFIRMED FACTS above.`;
    const retryMessages: ChatMessage[] = [
      { role: "system", content: reinforcedPrompt },
      ...historyWithContext,
      { role: "user", content: userMessage }
    ];
    const retry = await callGroqAPI(retryMessages, apiKey);
    if (retry.content && validateResponse(retry.content, newContext)) {
      content = retry.content;
      lastLatencyMs = retry.latencyMs;
    }
  }
  
  if (error || !content) {
    usedFallback = true;
    const vehicleRef = newContext.vehicleInfo?.brand
      ? `${newContext.vehicleInfo.brand} ${newContext.vehicleInfo.model || ""}`.trim()
      : null;
    const trojanHorse = services?.find((s: any) => s.is_trojan_horse);
    const trojanName = trojanHorse?.name || services?.[0]?.name || "our service";
    const trojanPrice = trojanHorse?.base_price || services?.[0]?.base_price || null;
    const priceStr = trojanPrice ? ` ($${trojanPrice})` : "";
    
    const prescriptionFallbackEn = `Based on what you've shared, I'd recommend our ${trojanName}${priceStr}. Would you like to schedule an appointment?`;
    const prescriptionFallbackEs = `Basandome en lo que me compartes, te recomiendo nuestro ${trojanName}${priceStr}. Te gustaria agendar una cita?`;

    const fallbacks: Record<string, { en: string; es: string }> = {
      STATE_0_OPENING: {
        en: "Sure! Could you tell me the make and model of your vehicle?",
        es: "Claro! Me puedes decir la marca y modelo de tu vehiculo?"
      },
      STATE_1_VEHICLE: { en: "", es: "" },
      STATE_2_BENEFIT: {
        en: context.benefitIntent
          ? `You mentioned ${context.benefitIntent} for your ${vehicleRef || "vehicle"}. Is that your main priority, or is there something else?`
          : `What is your main concern for your ${vehicleRef || "vehicle"}: shine and light protection, a full interior cleaning, or something more robust or longer-lasting?`,
        es: context.benefitIntent
          ? `Mencionaste ${context.benefitIntent} para tu ${vehicleRef || "vehiculo"}. Es esa tu prioridad principal o hay algo mas?`
          : `¿Cual es tu principal necesidad para tu ${vehicleRef || "vehiculo"}: brillo y proteccion ligera, limpieza completa de interior, o algo mas robusto o de mayor duracion?`
      },
      STATE_3_USAGE: {
        en: "Are you looking for something that lasts a few months, or long-term protection (1 to 3 years)?",
        es: "Buscas algo que dure unos meses, o proteccion a largo plazo (1 a 3 anos)?"
      },
      STATE_4_PRESCRIPTION: {
        en: prescriptionFallbackEn,
        es: prescriptionFallbackEs
      },
      STATE_5_SCHEDULE: {
        en: `Great. I have ${getNextBusinessSlotSuggestion(language)} available. Does that work, or do you prefer another day (Mon-Fri)?`,
        es: `Perfecto. Tengo disponible ${getNextBusinessSlotSuggestion(language)}. Te funciona ese horario o prefieres otro dia entre lunes y viernes?`
      },
      STATE_6_ACTION: {
        en: "Great! To confirm your appointment, I just need your full name and a WhatsApp or phone number where we can reach you.",
        es: "Perfecto! Para confirmar tu cita, solo necesito tu nombre completo y un numero de WhatsApp o telefono donde podamos contactarte."
      },
      STATE_7_HANDOFF: {
        en: "Perfect. Your booking is confirmed.",
        es: "Perfecto. Tu reserva esta confirmada."
      }
    };
    
    const fallback = fallbacks[newContext.currentState] || fallbacks.STATE_0_OPENING;
    return { 
      reply: fallback[language], 
      newContext,
      performance: { responseTimeMs: lastLatencyMs, isFallback: true, aiModel: DEFAULT_MODEL }
    };
  }
  
  return { 
    reply: content, 
    newContext,
    performance: { responseTimeMs: lastLatencyMs, isFallback: false, aiModel: DEFAULT_MODEL }
  };
}

// BUILD CONTEXT SUMMARY
function buildContextSummary(context: ConversationContext, language: "en" | "es"): string | null {
  const parts: string[] = [];

  if (hasVehicleIdentity(context.vehicleInfo) || context.vehicleInfo?.year) {
    const vehicle = `${context.vehicleInfo.brand || ""} ${context.vehicleInfo.model || ""} ${context.vehicleInfo.year || ""} ${context.vehicleInfo.type || ""}`.trim();
    parts.push(language === "es" ? `vehiculo: ${vehicle}` : `vehicle: ${vehicle}`);
  }

  if (context.benefitIntent) {
    parts.push(language === "es" ? `objetivo: ${context.benefitIntent}` : `goal: ${context.benefitIntent}`);
  }

  if (context.protectionDuration) {
    const durationText = context.protectionDuration === "long"
      ? (language === "es" ? "proteccion a largo plazo" : "long-term protection")
      : (language === "es" ? "proteccion por meses" : "short-term protection");
    parts.push(language === "es" ? `duracion: ${durationText}` : `duration: ${durationText}`);
  }

  if (parts.length === 0) return null;

  return language === "es"
    ? `[CONTEXTO] Cliente tiene ${parts.join(", ")}.`
    : `[CONTEXT] Customer has ${parts.join(", ")}.`;
}

// VALIDATE RESPONSE
function validateResponse(response: string, context: ConversationContext): boolean {
  const lowerResponse = response.toLowerCase();

  if (hasVehicleIdentity(context.vehicleInfo)) {
    const missing = getVehicleMissingParts(context.vehicleInfo);

    const asksBrand = /\b(make|brand|marca|que marca)\b/i.test(response);
    const asksModel = /\b(model|modelo)\b/i.test(response);
    const asksType = /\b(type|kind|tipo|sedan|suv|pickup|camioneta|truck)\b/i.test(response);
    const asksYear = /\b(what|which)\s+year\b|\byear is\b|\bmodel year\b|\byear of (your|the)\b|\bde que ano\b|\bano (de|del)\b/i.test(lowerResponse);
    const asksVehicleGeneric = /\bwhat vehicle is this for\b|\bwhat kind of car\b|\b(what|which)\s+(car|vehicle|auto|truck)\b|\bque\s+(vehiculo|carro|coche|auto)\b|\bque\s+tipo\s+de\s+(vehiculo|carro|coche|auto)\b/i.test(lowerResponse);

    if (asksYear) {
      console.warn("[VALIDATION] Response asked for year, which is not required");
      return false;
    }

    if (missing.length < 3 && asksVehicleGeneric) {
      console.warn("[VALIDATION] Response asked for full vehicle info despite having some details");
      return false;
    }

    if (!missing.includes("brand") && asksBrand) {
      console.warn("[VALIDATION] Response re-asked brand despite having it");
      return false;
    }
    if (!missing.includes("model") && asksModel) {
      console.warn("[VALIDATION] Response re-asked model despite having it");
      return false;
    }
    if (!missing.includes("type") && asksType) {
      console.warn("[VALIDATION] Response re-asked type despite having it");
      return false;
    }
  }

  if (context.benefitIntent) {
    const asksIntent = /what are you (looking|trying|hoping|wanting) to (achieve|do|accomplish|get)/i.test(response) ||
                       /what would you like to/i.test(response) ||
                       /que (buscas?|quieres?|te gustaria)/i.test(response) ||
                       /what('s| is) your (main )?goal/i.test(response);
    if (asksIntent) {
      console.warn("[VALIDATION] Response asks about intent despite having info");
      return false;
    }
  }

  if (context.protectionDuration) {
    const asksDuration = /how long|duracion|cuanto dura|months?|meses|years?|anos|largo plazo|long[-\s]?term/i.test(response);
    if (asksDuration) {
      console.warn("[VALIDATION] Response asks about protection duration despite having info");
      return false;
    }
  }

  return true;
}

// STORE CONVERSATION STATE
interface PerformanceMetrics {
  responseTimeMs: number;
  isFallback: boolean;
  aiModel: string;
}

async function storeConversationState(
  supabase: any,
  businessId: string,
  conversationId: string | null,
  userMessage: string,
  aiReply: string,
  context: ConversationContext,
  performance?: PerformanceMetrics
): Promise<void> {
  try {
    if (conversationId) {
      const conversationData: Record<string, any> = {
        business_id: businessId,
        conversation_id: conversationId,
        current_state: context.currentState,
        vehicle_info: context.vehicleInfo,
        benefit_intent: context.benefitIntent,
        usage_context: context.protectionDuration,
        recommendation_summary: context.recommendationSummary,
        handoff_required: context.handoffRequired,
        lead_qualified: context.leadQualified,
        recovery_attempt_count: context.recoveryAttemptCount,
        scheduled_day: context.scheduledDay || null,
        scheduled_time: context.scheduledTime || null,
        updated_at: new Date().toISOString(),
        metadata: {
          detected_language: context.detectedLanguage || "en",
          scheduled_hour: typeof context.scheduledHour === "number" ? context.scheduledHour : null,
          scheduled_minute: typeof context.scheduledMinute === "number" ? context.scheduledMinute : null,
        },
      };

      if (performance) {
        conversationData.response_time_ms = performance.responseTimeMs;
        conversationData.is_fallback = performance.isFallback;
        conversationData.ai_model = performance.aiModel;
      }

      await supabase
        .from("conversations")
        .upsert(conversationData, { 
          onConflict: "conversation_id",
          ignoreDuplicates: false 
        });
    }

    await supabase.from("messages").insert([
      {
        business_id: businessId,
        conversation_id: conversationId || "dev-test",
        direction: "inbound",
        message_text: userMessage,
        channel: "ai-chat",
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      },
      {
        business_id: businessId,
        conversation_id: conversationId || "dev-test",
        direction: "outbound",
        message_text: aiReply,
        channel: "ai-chat",
        created_at: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch (err) {
    console.error("Failed to store conversation:", err);
  }
}

// CUSTOMER MEMORY - LOAD
async function loadCustomerMemory(
  supabase: any,
  businessId: string,
  customerIdentifier: string | null
): Promise<CustomerMemory | null> {
  if (!customerIdentifier) return null;

  try {
    const { data } = await supabase
      .from("customer_memory")
      .select("*")
      .eq("business_id", businessId)
      .eq("customer_identifier", customerIdentifier)
      .maybeSingle();

    if (data) {
      console.log(`[MEMORY] Found returning customer: ${customerIdentifier}, visits: ${data.conversation_count}`);
      return {
        vehicleInfo: data.vehicle_info || {},
        preferredBenefit: data.preferred_benefit,
        protectionDuration: data.usage_pattern,
        customerName: data.customer_name,
        conversationCount: data.conversation_count || 1,
        lastInteractionAt: data.last_interaction_at,
      };
    }
  } catch (err) {
    console.error("[MEMORY] Failed to load customer memory:", err);
  }

  return null;
}

// CUSTOMER MEMORY - SAVE/UPDATE
async function saveCustomerMemory(
  supabase: any,
  businessId: string,
  customerIdentifier: string | null,
  customerName: string | null,
  channel: string | null,
  context: ConversationContext,
  isReturning: boolean
): Promise<void> {
  if (!customerIdentifier) return;

  try {
    const memoryData = {
      business_id: businessId,
      customer_identifier: customerIdentifier,
      channel: channel || "unknown",
      customer_name: customerName,
      vehicle_info: context.vehicleInfo,
      preferred_benefit: context.benefitIntent,
      usage_pattern: context.protectionDuration,
      last_state: context.currentState,
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isReturning) {
      const { data: existing } = await supabase
        .from("customer_memory")
        .select("conversation_count")
        .eq("business_id", businessId)
        .eq("customer_identifier", customerIdentifier)
        .maybeSingle();

      await supabase
        .from("customer_memory")
        .update({
          ...memoryData,
          conversation_count: (existing?.conversation_count || 1) + 1,
        })
        .eq("business_id", businessId)
        .eq("customer_identifier", customerIdentifier);

      console.log(`[MEMORY] Updated memory for returning customer: ${customerIdentifier}`);
    } else {
      await supabase
        .from("customer_memory")
        .insert({
          ...memoryData,
          conversation_count: 1,
          created_at: new Date().toISOString(),
        });

      console.log(`[MEMORY] Created new memory for customer: ${customerIdentifier}`);
    }
  } catch (err) {
    console.error("[MEMORY] Failed to save customer memory:", err);
  }
}

// FOLLOW-UP QUEUE
async function queueFollowUps(
  supabase: any,
  businessId: string,
  conversationId: string | null,
  leadId: string | null
): Promise<void> {
  if (!conversationId) return;

  const now = new Date();
  const followUps = [
    { type: "24h", delay: 24 * 60 * 60 * 1000 },
    { type: "5d", delay: 5 * 24 * 60 * 60 * 1000 },
  ];

  try {
    for (const { type, delay } of followUps) {
      const scheduledFor = new Date(now.getTime() + delay);
      
      await supabase
        .from("follow_up_queue")
        .upsert({
          business_id: businessId,
          conversation_id: conversationId,
          lead_id: leadId,
          follow_up_type: type,
          scheduled_for: scheduledFor.toISOString(),
          status: "pending",
        }, {
          onConflict: "conversation_id,follow_up_type",
          ignoreDuplicates: true,
        });
    }
    
    console.log(`[FOLLOWUP] Queued follow-ups for conversation ${conversationId}`);
  } catch (err) {
    console.error("[FOLLOWUP] Failed to queue follow-ups:", err);
  }
}

async function cancelPendingFollowUps(
  supabase: any,
  businessId: string,
  conversationId: string | null
): Promise<void> {
  if (!conversationId) return;

  try {
    await supabase
      .from("follow_up_queue")
      .update({ status: "cancelled" })
      .eq("business_id", businessId)
      .eq("conversation_id", conversationId)
      .eq("status", "pending");
      
    console.log(`[FOLLOWUP] Cancelled pending follow-ups for ${conversationId}`);
  } catch (err) {
    console.error("[FOLLOWUP] Failed to cancel follow-ups:", err);
  }
}

async function triggerEdgeNotification(
  supabase: any,
  functionName: string,
  payload: Record<string, any>,
  label: string
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke(functionName, { body: payload });
    if (error) {
      console.warn(`[NOTIFY] ${label} invoke warning:`, error.message || error);
    }
  } catch (err) {
    console.warn(`[NOTIFY] ${label} invoke failed:`, err);
  }
}

async function notifyLeadQualifiedOwner(
  supabase: any,
  businessId: string,
  leadId: string
): Promise<void> {
  await triggerEdgeNotification(supabase, "lead-notify", { businessId, leadId }, "lead-notify");
}

async function notifyBookingConfirmedOwner(
  supabase: any,
  businessId: string,
  bookingId: string
): Promise<void> {
  await triggerEdgeNotification(supabase, "booking-notify", { businessId, bookingId }, "booking-notify");
}

function buildLongHistoryMemoryBlock(
  history: ChatMessage[],
  language: "en" | "es",
  recentWindow = RECENT_HISTORY_WINDOW,
  maxChars = LONG_HISTORY_MAX_CHARS
): string {
  if (!history || history.length <= recentWindow) return "";

  const older = history.slice(0, -recentWindow);
  if (older.length === 0) return "";

  const header = language === "es"
    ? "RESUMEN DE HISTORIAL (turnos anteriores, usar como memoria):"
    : "LONG HISTORY SUMMARY (earlier turns, use as memory):";

  const lines: string[] = [];
  let used = header.length + 2;

  for (const msg of older) {
    const role = msg.role === "user" ? (language === "es" ? "Cliente" : "Customer") : (language === "es" ? "Asesor" : "Assistant");
    const cleaned = msg.content.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    const compact = cleaned.length > LONG_HISTORY_SNIPPET_CHARS ? `${cleaned.slice(0, LONG_HISTORY_SNIPPET_CHARS - 3)}...` : cleaned;
    const line = `- ${role}: ${compact}`;

    if (used + line.length + 1 > maxChars) {
      lines.push(language === "es" ? "- [historial anterior truncado por longitud]" : "- [earlier history truncated for length]");
      break;
    }

    lines.push(line);
    used += line.length + 1;
  }

  return `${header}\n${lines.join("\n")}`;
}

async function clearConversationData(
  supabase: any,
  businessId: string,
  conversationId: string | null,
  customerIdentifier: string | null
): Promise<void> {
  if (!businessId) return;

  const safeDelete = async (label: string, op: () => Promise<any>) => {
    try {
      const { error } = await op();
      if (error) {
        console.warn(`[CLEAR] ${label} delete warning:`, error.message || error);
      }
    } catch (err) {
      console.warn(`[CLEAR] ${label} delete failed:`, err);
    }
  };

  if (conversationId) {
    await safeDelete("messages", () =>
      supabase.from("messages").delete().eq("business_id", businessId).eq("conversation_id", conversationId)
    );

    await safeDelete("conversations", () =>
      supabase.from("conversations").delete().eq("business_id", businessId).eq("conversation_id", conversationId)
    );

    await safeDelete("follow_up_queue", () =>
      supabase.from("follow_up_queue").delete().eq("business_id", businessId).eq("conversation_id", conversationId)
    );

    await safeDelete("leads", () =>
      supabase.from("leads").delete().eq("business_id", businessId).eq("conversation_id", conversationId)
    );
  }

  if (customerIdentifier) {
    await safeDelete("customer_memory", () =>
      supabase.from("customer_memory").delete().eq("business_id", businessId).eq("customer_identifier", customerIdentifier)
    );
  }
}

// LOAD CONVERSATION CONTEXT
async function loadConversationContext(
  supabase: any,
  conversationId: string | null
): Promise<ConversationContext> {
  const defaultContext: ConversationContext = {
    currentState: STATES.STATE_0_OPENING,
    vehicleInfo: {},
    handoffRequired: false,
    leadQualified: false,
    recoveryAttemptCount: 0,
  };

  if (!conversationId) return defaultContext;

  try {
    const { data } = await supabase
      .from("conversations")
      .select("current_state, vehicle_info, benefit_intent, usage_context, recommendation_summary, handoff_required, lead_qualified, recovery_attempt_count, scheduled_day, scheduled_time, metadata")
      .eq("conversation_id", conversationId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const storedLanguage = data.metadata?.detected_language as "en" | "es" | undefined;
      const storedHour = typeof data.metadata?.scheduled_hour === "number" ? data.metadata.scheduled_hour : undefined;
      const storedMinute = typeof data.metadata?.scheduled_minute === "number" ? data.metadata.scheduled_minute : undefined;
      
      return {
        currentState: data.current_state || STATES.STATE_0_OPENING,
        vehicleInfo: data.vehicle_info || {},
        benefitIntent: data.benefit_intent,
        protectionDuration: data.usage_context,
        recommendationSummary: data.recommendation_summary,
        handoffRequired: data.handoff_required || false,
        leadQualified: data.lead_qualified || false,
        recoveryAttemptCount: data.recovery_attempt_count || 0,
        scheduledDay: data.scheduled_day || undefined,
        scheduledTime: data.scheduled_time || undefined,
        scheduledHour: storedHour,
        scheduledMinute: storedMinute,
        detectedLanguage: storedLanguage,
      };
    }
  } catch (err) {
    console.error("Failed to load conversation context:", err);
  }

  return defaultContext;
}

async function loadConversationHistoryFromDb(
  supabase: any,
  businessId: string,
  conversationId: string | null
): Promise<ChatMessage[]> {
  if (!conversationId) return [];

  try {
    const { data, error } = await supabase
      .from("messages")
      .select("direction, message_text, timestamp")
      .eq("business_id", businessId)
      .eq("conversation_id", conversationId)
      .order("timestamp", { ascending: true });

    if (error) {
      console.warn("[HISTORY] Failed to load conversation history:", error.message || error);
      return [];
    }

    const rows = (data || []) as StoredMessageRow[];
    return rows
      .filter((row) => typeof row.message_text === "string" && row.message_text.trim().length > 0)
      .map((row) => ({
        role: row.direction === "inbound" ? "user" : "assistant",
        content: (row.message_text || "").trim(),
      }));
  } catch (err) {
    console.warn("[HISTORY] Error loading conversation history:", err);
    return [];
  }
}

// MERGE CUSTOMER MEMORY INTO CONTEXT
function mergeMemoryIntoContext(
  context: ConversationContext,
  memory: CustomerMemory | null
): { context: ConversationContext; isReturning: boolean } {
  if (!memory) return { context, isReturning: false };

  const hasVehicle = hasVehicleIdentity(context.vehicleInfo);
  const hasBenefit = !!context.benefitIntent;
  const hasDuration = !!context.protectionDuration;

  const mergedContext = { ...context };
  let wasEnhanced = false;

  if (!hasVehicle && (memory.vehicleInfo?.brand || memory.vehicleInfo?.model)) {
    mergedContext.vehicleInfo = memory.vehicleInfo;
    wasEnhanced = true;
    console.log("[MEMORY] Pre-populated vehicle info from memory");
  }

  if (!hasBenefit && memory.preferredBenefit) {
    mergedContext.benefitIntent = memory.preferredBenefit;
    wasEnhanced = true;
    console.log("[MEMORY] Pre-populated benefit intent from memory");
  }

  if (!hasDuration && memory.protectionDuration) {
    mergedContext.protectionDuration = memory.protectionDuration;
    wasEnhanced = true;
    console.log("[MEMORY] Pre-populated protection duration from memory");
  }

  if (wasEnhanced) {
    if (mergedContext.protectionDuration && mergedContext.benefitIntent) {
      mergedContext.currentState = STATES.STATE_4_PRESCRIPTION;
    } else if (mergedContext.benefitIntent) {
      mergedContext.currentState = STATES.STATE_3_USAGE;
    } else if (hasVehicleCore(mergedContext.vehicleInfo)) {
      mergedContext.currentState = STATES.STATE_2_BENEFIT;
    }
  }

  return { 
    context: mergedContext, 
    isReturning: memory.conversationCount > 0 
  };
}

function deriveStateFromContext(context: ConversationContext): State {
  if (context.handoffRequired) return STATES.STATE_7_HANDOFF;
  if (context.protectionDuration && context.benefitIntent) return STATES.STATE_4_PRESCRIPTION;
  if (context.benefitIntent) {
    return context.benefitIntent === "protection" ? STATES.STATE_3_USAGE : STATES.STATE_4_PRESCRIPTION;
  }
  if (hasVehicleCore(context.vehicleInfo)) return STATES.STATE_2_BENEFIT;
  return STATES.STATE_0_OPENING;
}

function rehydrateContextFromHistory(
  context: ConversationContext,
  history: ChatMessage[]
): { context: ConversationContext; updated: boolean } {
  if (!history || history.length === 0) return { context, updated: false };

  const hydrated: ConversationContext = {
    ...context,
    vehicleInfo: { ...(context.vehicleInfo || {}) },
  };
  let updated = false;
  const needsDuration = !hydrated.protectionDuration && (!hydrated.benefitIntent || hydrated.benefitIntent === "protection");

  if (!hasVehicleCore(hydrated.vehicleInfo) || !hydrated.benefitIntent || needsDuration) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.role !== "user") continue;

      if (!hasVehicleCore(hydrated.vehicleInfo)) {
        const vehicle = parseVehicleInfo(msg.content);
        if (vehicle) {
          hydrated.vehicleInfo = { ...(hydrated.vehicleInfo || {}), ...vehicle };
          updated = true;
        }
      }

      if (!hydrated.benefitIntent) {
        const benefit = parseBenefitIntent(msg.content);
        if (benefit) {
          hydrated.benefitIntent = benefit;
          updated = true;
        }
      }

      if (!hydrated.protectionDuration) {
        const shouldParseDuration = !hydrated.benefitIntent || hydrated.benefitIntent === "protection";
        if (shouldParseDuration) {
          const duration = parseProtectionDuration(msg.content);
          if (duration) {
            hydrated.protectionDuration = duration;
            updated = true;
          }
        }
      }

      if (hasVehicleCore(hydrated.vehicleInfo) && hydrated.benefitIntent && (hydrated.benefitIntent !== "protection" || hydrated.protectionDuration)) {
        break;
      }
    }
  }

  const derivedState = deriveStateFromContext(hydrated);
  if (STATE_ORDER[derivedState] > STATE_ORDER[hydrated.currentState]) {
    hydrated.currentState = derivedState;
    updated = true;
  }

  return { context: hydrated, updated };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      console.error("[AI-CHAT] GROQ_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AIRequest = await req.json();
    const { 
      businessId, 
      action = "chat",
      conversationId, 
      customerIdentifier, 
      customerName,
      channel,
      userMessage, 
      conversationHistory = [] 
    } = body;

    if (!businessId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing businessId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "clearConversation") {
      await clearConversationData(supabase, businessId, conversationId || null, customerIdentifier || null);

      return new Response(
        JSON.stringify({ success: true, cleared: true, conversationId: conversationId || null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing userMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("name, language_preference, greeting_message, industry_type, business_description, ai_instructions, office_hours")
      .eq("id", businessId)
      .single();

    if (bizError) {
      console.error("[AI-CHAT] Failed to load business:", bizError);
    }

    const { data: services, error: svcError } = await supabase
      .from("services")
      .select("name, description, base_price, duration_minutes, is_trojan_horse, flyer_url")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("is_trojan_horse", { ascending: false })
      .order("name", { ascending: true });

    if (svcError) {
      console.error("[AI-CHAT] Failed to load services:", svcError);
    }

    const serviceCount = services?.length || 0;
    console.log(`[AI-CHAT] Loaded ${serviceCount} active services for business ${businessId}`);

    let detectedLang = detectLanguage(userMessage);

    if (!business) {
      const failsafeMsg = detectedLang === "es"
        ? "Quiero asegurarme de darte la orientacion correcta. Por favor intenta de nuevo en un momento."
        : "I want to make sure you get the right guidance. Please try again in a moment.";
      
      return new Response(
        JSON.stringify({
          success: true,
          reply: failsafeMsg,
          intent: null,
          model: DEFAULT_MODEL,
          currentState: STATES.STATE_0_OPENING,
          handoffRequired: false,
          leadQualified: false,
          returningCustomer: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let context = await loadConversationContext(supabase, conversationId || null);
    const storedHistory = await loadConversationHistoryFromDb(supabase, businessId, conversationId || null);
    const mergedHistory = storedHistory.length > 0 ? storedHistory : conversationHistory;
    
    const language: "en" | "es" = context.detectedLanguage || detectedLang;
    
    const customerMemory = await loadCustomerMemory(supabase, businessId, customerIdentifier || null);
    const { context: enrichedContext, isReturning } = mergeMemoryIntoContext(context, customerMemory);
    context = enrichedContext;
    
    if (!context.detectedLanguage) {
      context.detectedLanguage = language;
    }

    const parsedVehicle = parseVehicleInfo(userMessage);
    if (parsedVehicle) {
      context.vehicleInfo = { ...(context.vehicleInfo || {}), ...parsedVehicle };
    }

    const { context: hydratedContext, updated: historyHydrated } = rehydrateContextFromHistory(context, mergedHistory);
    context = hydratedContext;
    if (historyHydrated) {
      console.log("[MEMORY] Rehydrated context from conversation history");
    }

    if (context.handoffRequired) {
      context.handoffRequired = false;
    }
    if (context.currentState === STATES.STATE_7_HANDOFF) {
      context.currentState = deriveStateFromContext(context);
    }

    if (isReturning && customerMemory) {
      console.log(`[AI-CHAT] Returning customer detected! Visits: ${customerMemory.conversationCount}, Last: ${customerMemory.lastInteractionAt}`);
    }
    
    console.log(`[AI-CHAT] Business: ${business?.name}, Services: ${serviceCount}, State: ${context.currentState}, Language: ${language}, Returning: ${isReturning}`);

    const { data: knowledge } = await supabase
      .from("knowledge_chunks")
      .select("content")
      .eq("business_id", businessId)
      .textSearch("content_tsv", userMessage.split(" ").slice(0, 5).join(" | "))
      .limit(3);

    const knowledgeContext = knowledge?.map((k: any) => k.content).join("\n") || "";

    const businessWithKnowledge = knowledgeContext
      ? {
          ...business,
          ai_instructions: `${business?.ai_instructions ? `${business.ai_instructions}\n\n` : ""}KNOWLEDGE BASE FACTS:\n${knowledgeContext}`,
        }
      : business;

    const stateMachine = await processStateMachine(
      userMessage,
      context,
      language,
      businessWithKnowledge,
      services || [],
      conversationHistory,
      mergedHistory,
      GROQ_API_KEY
    );

    const reply = trimResponse(stateMachine.reply);
    const newContext = { ...stateMachine.newContext, detectedLanguage: language };

    // Store recommendation summary when in prescription state so booking uses correct service
    if (newContext.currentState === STATES.STATE_4_PRESCRIPTION || 
        newContext.currentState === STATES.STATE_5_SCHEDULE ||
        newContext.currentState === STATES.STATE_6_ACTION) {
      if (!newContext.recommendationSummary) {
        const matchedService = extractRecommendedService(reply, services || [], newContext);
        if (matchedService) {
          newContext.recommendationSummary = matchedService;
          console.log(`[CONTEXT] Stored recommendation: "${matchedService}"`);
        }
      }
    }
    const performance = stateMachine.performance;
    console.log(`[AI-CHAT] Response generated in ${performance.responseTimeMs}ms, fallback: ${performance.isFallback}`);
    // Determine flyer: prefer service-specific flyer_url based on which service is mentioned in the reply
    let flyerResult: FlyerResult = { url: null, type: null };
    if (services && services.length > 0) {
      const replyLower = reply.toLowerCase();
      const matchedService = services.find(s => s.flyer_url && replyLower.includes(s.name.toLowerCase()));
      if (matchedService?.flyer_url) {
        flyerResult = { url: matchedService.flyer_url, type: "service_flyer" };
        console.log(`[FLYER] Using service-specific flyer for "${matchedService.name}"`);
      }
    }
    // Fallback to generic flyer lookup if no service-specific flyer matched
    if (!flyerResult.url) {
      const requestedFlyerType = detectFlyerType(userMessage);
      flyerResult = requestedFlyerType
        ? await lookupServicesFlyer(supabase, businessId, requestedFlyerType, true)
        : { url: null, type: null };
    }

    await storeConversationState(supabase, businessId, conversationId || null, userMessage, reply, newContext, performance);

    await saveCustomerMemory(supabase, businessId, customerIdentifier || null, customerName || null, channel || null, newContext, isReturning);

    if (isReturning && conversationId) {
      await cancelPendingFollowUps(supabase, businessId, conversationId);
    }

    let createdLeadId: string | null = null;
    if (newContext.leadQualified && conversationId) {
      createdLeadId = await createOrUpdateLead(supabase, {
        businessId,
        conversationId,
        customerName: customerName || null,
        customerIdentifier: customerIdentifier || null,
        channel: channel || null,
        messageText: userMessage,
        context: newContext,
      });
      
      if (createdLeadId) {
        console.log(`[EVENT] lead_qualified for business ${businessId}, leadId: ${createdLeadId}`);
      }
    }
    
    let bookingResult: BookingCreationResult = { bookingId: null, created: false, updated: false };
    const bookingEligibleStates: State[] = [
      STATES.STATE_4_PRESCRIPTION,
      STATES.STATE_5_SCHEDULE,
      STATES.STATE_6_ACTION,
      STATES.STATE_7_HANDOFF,
    ];
    // Only create booking AFTER contact info is collected (STATE_7) or hasContactInfo in current message
    const hasContact = hasContactInfo(userMessage);
    const justReachedHandoff = newContext.currentState === STATES.STATE_7_HANDOFF && context.currentState !== STATES.STATE_7_HANDOFF;
    const shouldCreateBooking =
      (justReachedHandoff || hasContact) &&
      newContext.scheduledDay &&
      newContext.scheduledTime;

    if (shouldCreateBooking) {
      console.log(`[EVENT] booking_requested for business ${businessId}`);

      const recommendedService = extractRecommendedService(reply, services || [], newContext);

      // Extract customer name from contact info message if not provided in request body
      let resolvedCustomerName = customerName || null;
      if (!resolvedCustomerName) {
        const nameMatch = userMessage.match(/\b(?:me llamo|my name is|soy|i'm|i am)\s+([A-Z][a-záéíóúñ]+(?:\s+[A-Z][a-záéíóúñ]+)*)/i);
        if (nameMatch) {
          resolvedCustomerName = nameMatch[1].trim();
          console.log(`[BOOKING] Extracted customer name from message: "${resolvedCustomerName}"`);
        }
        // Also try "Name LastName" pattern before phone number
        if (!resolvedCustomerName) {
          const namePhoneMatch = userMessage.match(/([A-Z][a-záéíóúñ]+\s+[A-Z][a-záéíóúñ]+)[\s,]+.*\d{7,}/i);
          if (namePhoneMatch) {
            resolvedCustomerName = namePhoneMatch[1].trim();
            console.log(`[BOOKING] Extracted customer name from name+phone pattern: "${resolvedCustomerName}"`);
          }
        }
      }
      
      // Extract phone from contact info message if not provided
      let resolvedPhone = customerIdentifier || null;
      if (!resolvedPhone) {
        const phoneMatch = userMessage.match(/(\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}|\d{10,11}|\+\d{1,3}\s?\d{6,12})/);
        if (phoneMatch) {
          resolvedPhone = phoneMatch[1].replace(/[-.\s]/g, "");
          console.log(`[BOOKING] Extracted phone from message: "${resolvedPhone}"`);
        }
      }

      bookingResult = await createBookingFromConversation(supabase, {
        businessId,
        conversationId: conversationId || `auto-${Date.now()}`,
        customerIdentifier: resolvedPhone,
        customerName: resolvedCustomerName,
        channel: channel || null,
        context: newContext,
        recommendedService: recommendedService,
        leadId: createdLeadId,
      });

      if (!createdLeadId && bookingResult.bookingId && conversationId) {
        const { data: leadData } = await supabase
          .from("leads")
          .select("id")
          .eq("business_id", businessId)
          .eq("conversation_id", conversationId)
          .maybeSingle();

        if (leadData?.id) {
          await supabase
            .from("bookings")
            .update({ lead_id: leadData.id })
            .eq("business_id", businessId)
            .eq("id", bookingResult.bookingId);
        }
      }

      if (bookingResult.bookingId) {
        console.log(`[EVENT] booking_${bookingResult.created ? "created" : "updated"} for business ${businessId}, bookingId: ${bookingResult.bookingId}, service: ${recommendedService}`);
      }
    }

    // Send only ONE notification: lead OR booking, not both
    if (bookingResult.bookingId && bookingResult.created) {
      // Booking was created — send only booking notification (skip lead email)
      await notifyBookingConfirmedOwner(supabase, businessId, bookingResult.bookingId);
    } else if (createdLeadId && !context.leadQualified) {
      // No booking created — send lead notification
      await notifyLeadQualifiedOwner(supabase, businessId, createdLeadId);
    }

    const shouldQueueFollowUps =
      newContext.leadQualified &&
      (newContext.recoveryAttemptCount >= 2 ||
       newContext.handoffRequired ||
       newContext.currentState === STATES.STATE_7_HANDOFF);
    
    if (shouldQueueFollowUps && conversationId) {
      let leadIdForFollowUp = createdLeadId;
      if (!leadIdForFollowUp) {
        const { data: leadData } = await supabase
          .from("leads")
          .select("id")
          .eq("business_id", businessId)
          .eq("conversation_id", conversationId)
          .maybeSingle();
        leadIdForFollowUp = leadData?.id || null;
      }
      
      await queueFollowUps(supabase, businessId, conversationId, leadIdForFollowUp);
    }

    const response: AIResponse = {
      success: true,
      reply,
      intent: newContext.benefitIntent || null,
      model: DEFAULT_MODEL,
      currentState: newContext.currentState,
      handoffRequired: newContext.handoffRequired,
      leadQualified: newContext.leadQualified,
      returningCustomer: isReturning,
      bookingCreated: bookingResult.created,
      bookingId: bookingResult.bookingId,
      flyerUrl: flyerResult.url,
      flyerType: flyerResult.type,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[AI-CHAT] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
