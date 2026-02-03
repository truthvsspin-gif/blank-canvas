// @ts-nocheck - Deno edge function
// DetaPRO Sales Agent v1 - Consultative Sales Chatbot with State Machine + Groq AI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Groq API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

// ============================================================================
// STATE MACHINE DEFINITIONS
// ============================================================================
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

interface ConversationContext {
  currentState: State;
  vehicleInfo: {
    brand?: string;
    model?: string;
    type?: string;
    sizeClass?: string;
  };
  benefitIntent?: string;
  usageContext?: string;
  recommendationSummary?: string;
  handoffRequired: boolean;
  leadQualified: boolean;
  recoveryAttemptCount: number; // Intent Recovery Window (0-2)
  scheduledDay?: string; // Mon-Fri day selection
  scheduledTime?: string; // morning/afternoon
  detectedLanguage?: "en" | "es"; // Persisted language preference
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIRequest {
  businessId: string;
  conversationId?: string;
  customerId?: string;
  customerIdentifier?: string; // phone or handle for memory lookup
  customerName?: string;
  channel?: string;
  userMessage: string;
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
  flyerUrl?: string | null; // Services flyer URL when applicable
  flyerType?: string | null; // Type of flyer (services_flyer, etc.)
  error?: string;
}

interface CustomerMemory {
  vehicleInfo: ConversationContext["vehicleInfo"];
  preferredBenefit?: string;
  usagePattern?: string;
  customerName?: string;
  conversationCount: number;
  lastInteractionAt: string;
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================
function detectLanguage(text: string): "en" | "es" {
  const lowerText = text.toLowerCase();
  
  // Comprehensive Spanish patterns - common words, phrases, and sentence structures
  const spanishPatterns = [
    // Greetings & courtesy
    /\b(hola|buenos|buenas|gracias|por favor|disculpa|perdón|oye|oiga)\b/,
    // Common verbs (conjugated forms)
    /\b(quiero|necesito|tengo|busco|estoy|puedo|puede|tienen|hacen|ofrecen|cuestan|cuesta)\b/,
    // Question words
    /\b(cuánto|cómo|dónde|qué|cuál|cuándo|quién|por qué)\b/,
    // Common nouns
    /\b(servicio|cita|reserva|vehículo|carro|coche|auto|camioneta|precio|lavado|limpieza)\b/,
    // Pronouns & articles
    /\b(mi|mis|tu|tus|su|sus|el|la|los|las|un|una|unos|unas)\b/,
    // Prepositions & connectors
    /\b(para|sobre|desde|hasta|entre|con|sin|hacia|durante)\b/,
    // Time expressions
    /\b(hoy|mañana|ahora|después|antes|siempre|nunca|lunes|martes|miércoles|jueves|viernes)\b/,
    // Common adjectives
    /\b(bien|bueno|buena|mejor|nuevo|nueva|grande|pequeño|diario|semanal)\b/,
    // Affirmations/negations (excluding universal terms like "ok", "no" alone)
    /\b(sí|claro|exacto|perfecto|vale|nada|tampoco|también)\b/,
    // Common phrases
    /\b(me llamo|me gustaría|lo uso|es mi|para mi|por la|en la|de la)\b/,
    // Vehicle-related Spanish
    /\b(brillo|protección|interior|exterior|pintura|detallado|encerado|pulido)\b/,
  ];
  
  // Check if any Spanish pattern matches
  const isSpanish = spanishPatterns.some(pattern => pattern.test(lowerText));
  
  return isSpanish ? "es" : "en";
}

// ============================================================================
// SIMPLE INTENT DETECTION (FAQ STYLE)
// ============================================================================
type SimpleIntent = "pricing" | "services" | "hours" | "booking" | "availability" | "general_question";

function detectSimpleIntent(text: string): SimpleIntent {
  const lower = text.toLowerCase();
  if (/\b(book|booking|appointment|reserve|schedule|cita|agendar|reservar)\b/i.test(lower)) return "booking";
  if (/\b(availability|available|slots?|openings?|hours|horario|disponible)\b/i.test(lower)) return "availability";
  if (/\b(price|pricing|cost|quote|precio|costo|cotizaci[oó]n|cu[aá]nto|how much|estimate|presupuesto)\b/i.test(lower)) return "pricing";
  if (/\b(services?|servicios?|packages?|paquetes|menu|men[uú]|options|opciones|included|include|incluye)\b/i.test(lower)) return "services";
  if (/\b(hours|open|horario|abren|abierto)\b/i.test(lower)) return "hours";
  return "general_question";
}

function normalizeText(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
}

function detectServiceName(text: string, services: Array<{ name?: string | null }>): string | null {
  if (!services || services.length === 0) return null;
  const normalized = normalizeText(text);
  if (!normalized) return null;
  const match = services.find((service) => {
    const name = normalizeText(service.name || "");
    return name && normalized.includes(name);
  });
  return match?.name || null;
}

function buildServicesReply(services: Array<{ name?: string | null }>, language: "en" | "es") {
  if (!services || services.length === 0) {
    return language === "es"
      ? "Por ahora no tenemos servicios configurados. ¿Qué necesitas?"
      : "We do not have services listed yet. What do you need help with?";
  }
  const names = services.slice(0, 3).map((s) => s.name).filter(Boolean);
  const list = names.join(", ");
  return language === "es"
    ? `Servicios: ${list}. ¿Cuál te interesa?`
    : `Services: ${list}. Which one are you interested in?`;
}

function buildHoursReply(officeHours: string | null, language: "en" | "es") {
  if (officeHours) {
    return language === "es"
      ? `Nuestro horario es: ${officeHours}.`
      : `Our hours are: ${officeHours}.`;
  }
  return language === "es"
    ? "Horario disponible a solicitud."
    : "Business hours available on request.";
}

function buildPricingReply(params: {
  services: Array<{ name?: string | null; base_price?: number | null }>;
  language: "en" | "es";
  serviceName: string | null;
  hasVehicle: boolean;
}) {
  const { services, language, serviceName, hasVehicle } = params;
  if (!serviceName) {
    return language === "es"
      ? "¿Qué servicio te interesa?"
      : "Which service are you interested in?";
  }
  const match = services.find((s) => s.name === serviceName);
  const price = match?.base_price ?? null;
  if (price != null) {
    if (!hasVehicle) {
      return language === "es"
        ? `Para ${serviceName}, el precio inicia en $${price}. ¿Qué tipo de vehículo es?`
        : `For ${serviceName}, pricing starts at $${price}. What type of vehicle is it?`;
    }
    return language === "es"
      ? `Para ${serviceName}, el precio inicia en $${price}.`
      : `For ${serviceName}, pricing starts at $${price}.`;
  }
  return language === "es"
    ? `El precio de ${serviceName} depende del vehículo. ¿Qué tipo de vehículo es?`
    : `Pricing for ${serviceName} depends on the vehicle. What type of vehicle is it?`;
}

function buildGeneralReply(greeting: string | null, language: "en" | "es") {
  const base = greeting?.trim()
    ? greeting.trim()
    : language === "es"
      ? "Hola, gracias por escribirnos."
      : "Hi, thanks for reaching out.";
  const question = language === "es"
    ? "¿Buscas servicios, precios o reservar una cita?"
    : "Are you looking for services, pricing, or to book?";
  return `${base} ${question}`.trim();
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
    "porsche", "jaguar", "land rover", "range rover", "infiniti", "acura"
  ];
  
  const typePatterns = {
    sedan: /\b(sedan|sedán|car|carro|coche|auto)\b/i,
    suv: /\b(suv|crossover|camioneta|truck|4x4)\b/i,
    pickup: /\b(pickup|pick-up|pick up|troca|truck)\b/i,
    coupe: /\b(coupe|coupé|deportivo|sports car)\b/i,
    hatchback: /\b(hatchback|hatch)\b/i,
    van: /\b(van|minivan|mini van)\b/i,
  };
  
  let detectedBrand: string | undefined;
  let detectedModel: string | undefined;
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
    /\b(camry|corolla|rav4|highlander|tacoma|4runner|tundra|prius)\b/i,
    /\b(civic|accord|cr-v|pilot|odyssey|fit|hr-v)\b/i,
    /\b(f-150|f150|mustang|explorer|escape|bronco|ranger)\b/i,
    /\b(silverado|tahoe|suburban|malibu|equinox|traverse|camaro)\b/i,
    /\b(altima|sentra|rogue|pathfinder|frontier|maxima)\b/i,
    /\b(elantra|sonata|tucson|santa fe|palisade|kona)\b/i,
    /\b(3 series|5 series|x3|x5|m3|m5)\b/i,
    /\b(wrangler|grand cherokee|cherokee|compass|gladiator)\b/i,
    /\b(model 3|model s|model x|model y)\b/i,
  ];
  
  for (const pattern of modelPatterns) {
    const match = text.match(pattern);
    if (match) {
      detectedModel = match[0];
      break;
    }
  }
  
  let sizeClass = "medium";
  if (detectedType === "pickup" || detectedType === "suv") {
    sizeClass = "large";
  } else if (detectedType === "coupe" || detectedType === "hatchback") {
    sizeClass = "small";
  }
  
  // Return vehicle info if ANY identifier was detected (brand, model, or type)
  if (detectedBrand || detectedModel || detectedType) {
    return {
      brand: detectedBrand,
      model: detectedModel,
      type: detectedType,
      sizeClass,
    };
  }
  
  return null;
}

// ============================================================================
// BENEFIT INTENT DETECTION (STATE 2)
// ============================================================================
function parseBenefitIntent(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  // Shine/appearance-focused keywords (expanded with more variations)
  if (/\b(shine|shiny|brillante|brillo|brillar|brilloso|new|nuevo|como nuevo|look|lucir|luzca|polish|pulir|scratch|rayón|rayon|swirl|detalle|detail|clean|limpio|limpia|limpiar|impecable|perfecto)\b/i.test(lowerText)) {
    return "shine";
  }
  
  // Protection-focused keywords (expanded with more variations)
  if (/\b(protect|proteger|protegido|protección|proteccion|ceramic|cerámico|ceramico|wax|cera|coating|maintain|mantener|durabilidad|durable|durar|duradero|long|largo plazo|preservar|cuidar|cuidado)\b/i.test(lowerText)) {
    return "protection";
  }
  
  // Interior-focused keywords
  if (/\b(interior|inside|adentro|seats|asientos|leather|piel|cuero|smell|olor|clean inside|limpiar adentro|upholstery|tapicería|tapiceria|alfombra|carpet)\b/i.test(lowerText)) {
    return "interior";
  }
  
  // Unsure/general inquiry keywords
  if (/\b(not sure|no sé|no se|unsure|no estoy seguro|don't know|maybe|quizás|quizas|options|opciones|general|basico|básico|simple)\b/i.test(lowerText)) {
    return "unsure";
  }
  
  return null;
}

// ============================================================================
// USAGE CONTEXT DETECTION (STATE 3)
// ============================================================================
function parseUsageContext(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  if (/\b(daily|diario|every day|todos los días|work|trabajo|commute|traslado|regular|frequent)\b/i.test(lowerText)) {
    return "daily";
  }
  
  if (/\b(occasional|ocasional|weekend|fin de semana|sometimes|a veces|special|especial|rarely|rara vez)\b/i.test(lowerText)) {
    return "occasional";
  }
  
  return null;
}

// ============================================================================
// HANDOFF TRIGGER DETECTION (STATE 6)
// ============================================================================
function shouldTriggerHandoff(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // First check if this is a negative/low-intent phrase - if so, don't trigger handoff
  const negativePatterns = [
    /\b(no|not|don't|doesn't|won't|nada|nunca|tampoco)\s+(me interesa|interesado|quiero|thanks|gracias)/i,
    /\b(no me interesa|no estoy interesado|not interested|don't want|no quiero)\b/i,
  ];
  
  if (negativePatterns.some(p => p.test(lowerText))) {
    return false;
  }
  
  const patterns = [
    /\b(interested|interesado|i'm in|me interesa|let's do it|hagámoslo|vamos|proceed|adelante)\b/i,
    /\b(book|reservar|agendar|schedule|programar|cita|appointment)\b/i,
    /\b(yes|sí|si|sounds good|suena bien|perfect|perfecto|next step|siguiente paso)\b/i,
    /\b(availability|disponibilidad|when can|cuándo puedo|cuándo pueden)\b/i,
    /\b(confirm|confirmo|confirmar)\b/i,
  ];
  
  return patterns.some(p => p.test(lowerText));
}

// Detect if user provided contact information (name + phone)
function hasContactInfo(text: string): boolean {
  // Phone number patterns
  const phonePattern = /\b(\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}|\d{10,11}|\+\d{1,3}\s?\d{6,12})\b/;
  
  // Name patterns - common name introductions or just capitalized words before numbers
  const nameIntroPattern = /\b(me llamo|my name is|soy|i'm|i am)\s+([A-Z][a-z]+)/i;
  const capitalizedName = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)?\s*[,\s]+.*\d{3}/;
  
  const hasPhone = phonePattern.test(text);
  const hasName = nameIntroPattern.test(text) || capitalizedName.test(text);
  
  return hasPhone && hasName;
}

// ============================================================================
// SCHEDULE RESPONSE PARSING (STATE_5_SCHEDULE)
// ============================================================================
function parseScheduleResponse(text: string): { day: string | null; time: string | null } {
  const lowerText = text.toLowerCase();
  
  // Day detection (Spanish & English)
  const dayPatterns: Record<string, RegExp> = {
    monday: /\b(monday|lunes)\b/i,
    tuesday: /\b(tuesday|martes)\b/i,
    wednesday: /\b(wednesday|miércoles|miercoles)\b/i,
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
  
  // Time detection (morning/afternoon) - use phrase patterns to handle Spanish expressions
  let detectedTime: string | null = null;
  // Morning patterns: "por la mañana", "en la mañana", "morning", "am", "temprano"
  if (/(?:por\s+la\s+mañana|en\s+la\s+mañana|de\s+la\s+mañana|\bmorning\b|\bam\b|\btemprano\b)/i.test(lowerText)) {
    detectedTime = "morning";
  } 
  // Afternoon patterns: "por la tarde", "en la tarde", "afternoon", "pm"
  else if (/(?:por\s+la\s+tarde|en\s+la\s+tarde|de\s+la\s+tarde|\bafternoon\b|\bpm\b)/i.test(lowerText)) {
    detectedTime = "afternoon";
  }
  
  return { day: detectedDay, time: detectedTime };
}

// ============================================================================
// GET NEXT WEEKDAY DATE FROM DAY NAME
// ============================================================================
function getNextWeekday(dayName: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntil);
  return nextDate;
}

// ============================================================================
// LOW INTENT DETECTION
// ============================================================================
function isLowIntent(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  
  // Very short dismissive responses
  if (/^(no|nah|nope|na|meh|ok|k|bye|adios|chao)$/i.test(lowerText)) {
    return true;
  }
  
  const lowIntentPatterns = [
    /\b(just looking|solo viendo|browsing|curious|curioso|maybe later|después|tal vez después)\b/i,
    /\b(not now|ahora no|no thanks|no gracias|never mind|olvídalo|forget it)\b/i,
    /\b(not interested|no me interesa|no estoy interesado|don't want|no quiero|paso|pass)\b/i,
    /\b(too expensive|muy caro|caro|expensive|later|luego|otro día|another day|pensaré|think about it)\b/i,
    /\b(no need|no necesito|don't need|no hace falta|I'm good|estoy bien)\b/i,
  ];
  
  return lowIntentPatterns.some(p => p.test(lowerText));
}

// ============================================================================
// FLYER TYPE DETECTION - Specific triggers for each flyer type
// ============================================================================
type FlyerType = "menu" | "price_list" | "services_flyer" | null;

function detectFlyerType(text: string): FlyerType {
  const lowerText = text.toLowerCase();
  
  // MENU - Food/drink/restaurant related queries
  const menuPatterns = [
    /\b(menu|menú|food|comida|dishes|platos|eat|comer|drink|bebida|beverage|appetizer|entrée|dessert|postre|cuisine|cocina|order|ordenar|breakfast|desayuno|lunch|almuerzo|dinner|cena|specials|especiales del día)\b/i,
    /\b(what do you (serve|have to eat)|qué (sirven|tienen para comer))\b/i,
  ];
  
  // PRICE LIST - Explicit pricing/cost inquiries
  const priceListPatterns = [
    /\b(price list|lista de precios|pricing|precios|rates|tarifas|cost|costo|how much|cuánto|what.*charge|cobran|fees?|quote|cotización|estimate|estimado|budget|presupuesto)\b/i,
    /\b(price for|precio de|rate for|tarifa de|cost of|costo de)\b/i,
  ];
  
  // SERVICES FLYER - General service inquiries
  const servicesFlyerPatterns = [
    /\b(services|servicios|what (do you|can you) offer|qué (ofrecen|hacen)|your services|sus servicios|packages?|paquetes|options|opciones|treatments?|tratamientos|what's available|qué hay disponible|available services)\b/i,
    /\b(info|information|información|tell me about|cuéntame|details|detalles|more about|más sobre)\b/i,
    /\b(brochure|folleto|catalog|catálogo)\b/i,
  ];
  
  // Check in priority order: menu → price_list → services_flyer
  if (menuPatterns.some(p => p.test(lowerText))) {
    return "menu";
  }
  
  if (priceListPatterns.some(p => p.test(lowerText))) {
    return "price_list";
  }
  
  if (servicesFlyerPatterns.some(p => p.test(lowerText))) {
    return "services_flyer";
  }
  
  return null;
}

// Legacy function for backward compatibility
function isServicesInquiry(text: string): boolean {
  return detectFlyerType(text) !== null;
}

// ============================================================================
// FLYER LOOKUP - Check if business has a flyer matching the detected type
// ============================================================================
interface FlyerResult {
  url: string | null;
  type: string | null;
}

async function lookupServicesFlyer(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  preferredType?: FlyerType
): Promise<FlyerResult> {
  try {
    // If we have a preferred type, try to find that specific type first
    if (preferredType) {
      console.log(`[FLYER] Looking for ${preferredType} flyer for business ${businessId}`);
      
      // First try default of preferred type
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
      
      // Then try any active of preferred type
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
    
    // Fallback: try default of any supported type
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
    
    // Final fallback: get any active flyer
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

// ============================================================================
// CONTACT INFO EXTRACTION FOR LEAD CREATION
// ============================================================================
function extractEmail(text: string): string | null {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d[\d\s().-]{6,}\d)/);
  if (!match) return null;
  const digits = match[0].replace(/[^\d+]/g, "");
  return digits.length >= 8 ? digits : null;
}

// ============================================================================
// LEAD CREATION/UPDATE
// ============================================================================
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
  
  // Extract contact info from message
  const emailFromMessage = extractEmail(messageText);
  const phoneFromMessage = extractPhone(messageText);
  const phone = phoneFromMessage || (customerIdentifier?.startsWith("+") ? customerIdentifier : null);
  
  // Build qualification reason
  const qualificationParts = [];
  if (context.benefitIntent) qualificationParts.push(`intent=${context.benefitIntent}`);
  if (emailFromMessage) qualificationParts.push("contact=email");
  if (phone) qualificationParts.push("contact=phone");
  if (context.handoffRequired) qualificationParts.push("handoff=true");
  const qualificationReason = qualificationParts.join("; ");

  try {
    // Check if lead already exists for this conversation
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("business_id", businessId)
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (existingLead?.id) {
      // Update existing lead
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

    // Create new lead
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

// ============================================================================
// BOOKING CREATION - Auto-create CRM booking when handoff is triggered
// ============================================================================
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
  }
): Promise<string | null> {
  const { businessId, conversationId, customerIdentifier, customerName, channel, context, recommendedService } = params;

  try {
    // Step 1: Find or create customer
    let customerId: string | null = null;
    const phone = customerIdentifier?.startsWith("+") ? customerIdentifier : null;

    if (phone) {
      // Check if customer exists with this phone
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

    // Create customer if not found
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
        return null;
      }

      customerId = newCustomer?.id || null;
      console.log(`[BOOKING] Created new customer ${customerId}`);
    }

    if (!customerId) {
      console.error("[BOOKING] No customer ID available");
      return null;
    }

    // Step 2: Check if booking already exists for this conversation
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .eq("source", "chatbot")
      .eq("status", "pending")
      .is("scheduled_at", null)
      .maybeSingle();

    if (existingBooking?.id) {
      console.log(`[BOOKING] Booking already exists: ${existingBooking.id}`);
      return existingBooking.id;
    }

    // Step 3: Create new booking with scheduled date if available
    const serviceName = recommendedService || context.recommendationSummary || "TBD";
    
    // Calculate scheduled date if day was selected
    let scheduledAt: string | null = null;
    if (context.scheduledDay) {
      const scheduledDate = getNextWeekday(context.scheduledDay);
      // Set time based on morning/afternoon preference (default 10am / 2pm)
      if (context.scheduledTime === "morning") {
        scheduledDate.setHours(10, 0, 0, 0);
      } else if (context.scheduledTime === "afternoon") {
        scheduledDate.setHours(14, 0, 0, 0);
      } else {
        scheduledDate.setHours(10, 0, 0, 0); // Default to morning
      }
      scheduledAt = scheduledDate.toISOString();
      console.log(`[BOOKING] Calculated scheduled_at: ${scheduledAt} from day: ${context.scheduledDay}, time: ${context.scheduledTime || 'default'}`);
    }

    const { data: newBooking, error: bookError } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        service_name: serviceName,
        status: "pending",
        source: "chatbot",
        scheduled_at: scheduledAt,
      })
      .select("id")
      .single();

    if (bookError) {
      console.error("[BOOKING] Failed to create booking:", bookError);
      return null;
    }

    console.log(`[BOOKING] Created new booking ${newBooking?.id} for service: ${serviceName}`);
    return newBooking?.id || null;
  } catch (err) {
    console.error("[BOOKING] Error in createBookingFromConversation:", err);
    return null;
  }
}

// ============================================================================
// EXTRACT RECOMMENDED SERVICE FROM AI RESPONSE OR CONTEXT
// ============================================================================
function extractRecommendedService(
  aiResponse: string,
  services: { name: string; description?: string | null; is_trojan_horse?: boolean }[],
  context: ConversationContext
): string | null {
  if (!services || services.length === 0) return null;
  
  const responseLower = aiResponse.toLowerCase();
  
  // First, try to find an exact service name match in the AI response
  for (const service of services) {
    const serviceName = service.name.toLowerCase();
    if (responseLower.includes(serviceName)) {
      console.log(`[SERVICE MATCH] Found "${service.name}" in AI response`);
      return service.name;
    }
  }
  
  // If benefit intent is known, match to appropriate service
  if (context.benefitIntent) {
    const benefitKeywords: Record<string, string[]> = {
      shine: ["brillo", "shine", "polish", "pulir", "abrillant", "wax", "cera"],
      protection: ["ceramic", "cerámico", "ceramico", "coating", "ppf", "protección", "protection", "sellado"],
      interior: ["interior", "tapicería", "asiento", "seat", "leather", "piel"],
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
  
  // Fall back to Trojan Horse service if available
  const trojanHorse = services.find(s => s.is_trojan_horse);
  if (trojanHorse) {
    console.log(`[SERVICE MATCH] Using Trojan Horse: "${trojanHorse.name}"`);
    return trojanHorse.name;
  }
  
  // Last resort: first active service
  if (services.length > 0) {
    console.log(`[SERVICE MATCH] Defaulting to first service: "${services[0].name}"`);
    return services[0].name;
  }
  
  return null;
}

// ============================================================================
// STALL DETECTION - Detects when customer is passive/non-advancing
// ============================================================================
function isStallResponse(text: string, state: State): boolean {
  const lowerText = text.toLowerCase().trim();
  
  // Very short/vague responses after recommendation/scheduling states
  if (state === STATES.STATE_4_PRESCRIPTION || 
      state === STATES.STATE_5_SCHEDULE || 
      state === STATES.STATE_6_ACTION) {
    const vaguePatterns = [
      /^(ok|okay|hmm|mhm|alright|sure|bien|bueno|está bien|ya|ah|oh|uh huh)\.?$/i,
      /^(i see|i understand|entiendo|ya veo)\.?$/i,
      /^(interesting|interesante)\.?$/i,
      /^(let me think|déjame pensar|lo pienso)\.?$/i,
      /\b(not sure|no sé|no estoy seguro)$/i,
    ];
    
    // Also check for just asking about price without committing
    const priceOnlyPatterns = [
      /^(how much|cuánto|what.*price|precio).*\?$/i,
      /^(price|precio)\??$/i,
    ];
    
    if (vaguePatterns.some(p => p.test(lowerText))) {
      return true;
    }
    
    if (priceOnlyPatterns.some(p => p.test(lowerText))) {
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// BUILD INTENT RECOVERY PROMPT (Value Reframe or Friction Reduction)
// ============================================================================
function buildRecoveryPrompt(
  attemptNumber: number,
  context: ConversationContext,
  language: "en" | "es"
): string {
  const vehicleRef = context.vehicleInfo?.brand
    ? `${context.vehicleInfo.brand} ${context.vehicleInfo.model || ""}`.trim()
    : null;
  const benefitRef = context.benefitIntent || "your needs";
  
  if (attemptNumber === 1) {
    // ATTEMPT 1: Value Reframe - Reinforce recommendation, maintain direction
    return language === "es"
      ? `RECUPERACIÓN DE INTENCIÓN - INTENTO 1 (Reencuadre de Valor):
El cliente parece dudar. Tu objetivo es REFORZAR el valor de tu recomendación.

INSTRUCCIONES:
1. Reconoce brevemente que entiendes su situación ${vehicleRef ? `con su ${vehicleRef}` : ""}
2. Reenmarca el BENEFICIO principal (no características técnicas)
3. Ofrece revisar disponibilidad como siguiente paso natural
4. NO preguntes si quieren algo diferente
5. NO ofrezcas alternativas
6. Mantén el tono confiado pero no agresivo
7. Respuesta CORTA (2-3 oraciones máximo)`
      : `INTENT RECOVERY - ATTEMPT 1 (Value Reframe):
Customer seems hesitant. Your goal is to REINFORCE the value of your recommendation.

INSTRUCTIONS:
1. Briefly acknowledge you understand their situation ${vehicleRef ? `with their ${vehicleRef}` : ""}
2. Reframe the PRIMARY BENEFIT (not technical features)
3. Offer to check availability as natural next step
4. DO NOT ask if they want something different
5. DO NOT offer alternatives
6. Keep tone confident but not pushy
7. SHORT response (2-3 sentences max)`;
  } else {
    // ATTEMPT 2: Friction Reduction - Simplify choice, binary option
    return language === "es"
      ? `RECUPERACIÓN DE INTENCIÓN - INTENTO 2 (Reducción de Fricción):
El cliente sigue dudando. Este es tu ÚLTIMO intento antes de cerrar educadamente.

INSTRUCCIONES:
1. Simplifica radicalmente la elección
2. Ofrece UNA opción binaria clara: "¿Buscas [beneficio principal] o algo más básico por ahora?"
3. Esta pregunta les permite comprometerse O autoseleccionarse
4. Si dicen básico, sugiere un punto de entrada simple
5. Si siguen vagos después de esto, saldrás educadamente
6. NO presiones - sé consultivo
7. Respuesta CORTA (2 oraciones máximo)`
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

// ============================================================================
// GROQ API CALL WITH LATENCY TRACKING
// ============================================================================
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

// ============================================================================
// BUILD CONFIRMED FACTS BLOCK (Context Lock)
// ============================================================================
function buildConfirmedFactsBlock(context: ConversationContext, language: "en" | "es"): string {
  const facts: string[] = [];
  
  if (context.vehicleInfo?.brand || context.vehicleInfo?.model || context.vehicleInfo?.type) {
    const vehicleParts = [
      context.vehicleInfo.brand,
      context.vehicleInfo.model,
      context.vehicleInfo.type ? `(${context.vehicleInfo.type})` : null,
      context.vehicleInfo.sizeClass ? `- ${context.vehicleInfo.sizeClass} size` : null
    ].filter(Boolean).join(" ");
    facts.push(`🚗 VEHICLE: ${vehicleParts}`);
  }
  
  if (context.benefitIntent) {
    const intentMap: Record<string, { en: string; es: string }> = {
      shine: { en: "Make it look like new / shine", es: "Hacerlo lucir como nuevo / brillo" },
      protection: { en: "Long-term protection", es: "Protección a largo plazo" },
      interior: { en: "Interior refresh/cleaning", es: "Renovación/limpieza interior" },
      unsure: { en: "Not sure yet - needs guidance", es: "No está seguro - necesita orientación" }
    };
    const intentText = intentMap[context.benefitIntent]?.[language] || context.benefitIntent;
    facts.push(`🎯 CUSTOMER GOAL: ${intentText}`);
  }
  
  if (context.usageContext) {
    const usageMap: Record<string, { en: string; es: string }> = {
      daily: { en: "Daily driver (frequent use)", es: "Uso diario (frecuente)" },
      occasional: { en: "Occasional/weekend use", es: "Uso ocasional/fin de semana" }
    };
    const usageText = usageMap[context.usageContext]?.[language] || context.usageContext;
    facts.push(`📅 USAGE PATTERN: ${usageText}`);
  }
  
  if (facts.length === 0) {
    return language === "es"
      ? "===== INFORMACIÓN CONFIRMADA =====\nNinguna aún - pregunta por el vehículo.\n=================================="
      : "===== CONFIRMED INFORMATION =====\nNone collected yet - ask for vehicle info.\n==================================";
  }
  
  const header = language === "es"
    ? "===== INFORMACIÓN CONFIRMADA (NO PREGUNTAR DE NUEVO) ====="
    : "===== CONFIRMED FACTS (DO NOT ASK ABOUT THESE AGAIN) =====";
  
  const footer = "=".repeat(header.length);
  
  return `${header}\n${facts.join("\n")}\n${footer}`;
}

// ============================================================================
// BUILD NEGATIVE CONSTRAINTS (What NOT to ask)
// ============================================================================
function buildNegativeConstraints(context: ConversationContext, language: "en" | "es"): string {
  const constraints: string[] = [];
  
  if (context.vehicleInfo?.brand || context.vehicleInfo?.model || context.vehicleInfo?.type) {
    constraints.push(language === "es"
      ? "❌ YA SABES el vehículo. NO preguntes qué carro/vehículo/tipo tienen."
      : "❌ You ALREADY KNOW the vehicle. DO NOT ask what car/vehicle/type they have."
    );
  }
  
  if (context.benefitIntent) {
    constraints.push(language === "es"
      ? "❌ YA SABES su objetivo. NO preguntes qué buscan o qué les gustaría lograr."
      : "❌ You ALREADY KNOW their goal. DO NOT ask what they're looking for or want to achieve."
    );
  }
  
  if (context.usageContext) {
    constraints.push(language === "es"
      ? "❌ YA SABES el uso. NO preguntes si es de uso diario u ocasional."
      : "❌ You ALREADY KNOW the usage. DO NOT ask if daily or occasional use."
    );
  }
  
  if (constraints.length === 0) return "";
  
  const header = language === "es" ? "⚠️ RESTRICCIONES CRÍTICAS:" : "⚠️ CRITICAL RESTRICTIONS:";
  return `${header}\n${constraints.join("\n")}`;
}

// ============================================================================
// AGENT BRAIN - STATIC BEHAVIOR RULES (DetaPRO Sales Agent v1)
// ============================================================================
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
Tu trabajo es DIAGNOSTICAR necesidades y PRESCRIBIR UNA solución, no listar opciones.

REGLAS ABSOLUTAS (NUNCA ROMPER):
1. UNA sola pregunta a la vez - SIEMPRE
2. Respuestas CORTAS (1-3 oraciones máximo)
3. NUNCA listar servicios, paquetes o menús
4. SIEMPRE incluir el precio cuando menciones un servicio
5. NUNCA usar jerga técnica con el cliente
6. NUNCA pedir fotos ni depósitos
7. NUNCA presionar - sé consultivo, no vendedor agresivo
8. SOLO recomienda servicios que existen en tu CONTEXTO DE NEGOCIO
9. Si no hay servicio que aplique, guía hacia handoff humano
10. Sé cálido, profesional y humano - responde en Español`
    : `=== CONSULTATIVE SALES AGENT - CORE RULES ===
IDENTITY: You are a consultative sales advisor, NOT an informational bot.
Your job is to DIAGNOSE needs and PRESCRIBE ONE solution, not list options.

ABSOLUTE RULES (NEVER BREAK):
1. ONE question at a time - ALWAYS
2. SHORT responses (1-3 sentences max)
3. NEVER list services, packages, or menus
4. ALWAYS include the price when mentioning a service
5. NEVER use technical jargon with customers
6. NEVER ask for photos or deposits
7. NEVER pressure - be consultative, not pushy
8. ONLY recommend services that exist in your BUSINESS CONTEXT
9. If no service applies, guide toward human handoff
10. Be warm, professional, and human - reply in English`;

  // State-specific goals
  let stateGoal = "";
  switch (state) {
    case STATES.STATE_0_OPENING:
      stateGoal = language === "es"
        ? `OBJETIVO: Obtener información del vehículo.
Pregunta amablemente qué vehículo tienen (marca, modelo, tipo como sedán/SUV/pickup).
Sé amigable y acogedor.`
        : `GOAL: Get vehicle information.
Ask what vehicle this is for (brand, model, type like sedan/SUV/pickup).
Be friendly and welcoming.`;
      break;
      
    case STATES.STATE_2_BENEFIT:
      stateGoal = language === "es"
        ? `OBJETIVO: Entender qué beneficio/problema quieren resolver.
${vehicleRef ? `Menciona su ${vehicleRef} para mostrar que escuchaste.` : ""}
Pregunta qué buscan lograr: brillo como nuevo, protección, o interior.
NO listes servicios - pregunta por el RESULTADO que desean.`
        : `GOAL: Understand what benefit/problem they want to solve.
${vehicleRef ? `Reference their ${vehicleRef} to show you listened.` : ""}
Ask what they're mainly looking to achieve: new-look shine, protection, or interior.
DO NOT list services - ask about the OUTCOME they want.`;
      break;
      
    case STATES.STATE_3_USAGE:
      stateGoal = language === "es"
        ? `OBJETIVO: Entender patrón de uso (una pregunta rápida).
${vehicleRef ? `Referencia su ${vehicleRef}.` : ""}
Pregunta si es de uso diario o más ocasional.`
        : `GOAL: Understand usage pattern (just one quick question).
${vehicleRef ? `Reference their ${vehicleRef}.` : ""}
Ask if this is a daily-use vehicle or more occasional.`;
      break;
      
    case STATES.STATE_4_PRESCRIPTION:
      stateGoal = language === "es"
        ? `OBJETIVO: Hacer UNA recomendación con PRECIO basada en el CONTEXTO DE NEGOCIO.
1. Breve resumen mostrando que entiendes su situación
2. Enmarca el valor/beneficio (no proceso técnico)
3. Haz UNA recomendación del servicio que MEJOR APLICA de tu contexto
4. INCLUYE el precio exacto del servicio (ej: '$199')
5. Propone días disponibles: "Tenemos disponibilidad lunes, miércoles o viernes"
6. Pregunta cuál día le funciona mejor

IMPORTANTE: Selecciona el servicio que mejor encaja basándote en:
- Vehículo del cliente (tamaño, tipo)
- Objetivo deseado (brillo, protección, interior)
- Patrón de uso (diario vs ocasional)`
        : `GOAL: Make ONE recommendation with PRICE based on BUSINESS CONTEXT.
1. Brief summary showing you understand their situation
2. Frame the value/benefit (not technical process)
3. Make ONE recommendation for the BEST MATCHING service from your context
4. INCLUDE the exact price (e.g., '$199')
5. Propose available days: "We have availability Monday, Wednesday or Friday"
6. Ask which day works best for them

IMPORTANT: Select the service that best fits based on:
- Customer's vehicle (size, type)
- Desired outcome (shine, protection, interior)
- Usage pattern (daily vs occasional)`;
      break;
      
    case STATES.STATE_5_SCHEDULE:
      stateGoal = language === "es"
        ? `OBJETIVO: Proponer cita automáticamente.
1. Si el cliente ya eligió un día, confirma y pregunta mañana o tarde
2. Si no eligió día, propone: "Tenemos disponibilidad lunes, miércoles o viernes"
3. NO requiere confirmación del sistema - asume disponibilidad Lunes a Viernes
4. Respuesta CORTA (2-3 oraciones máximo)`
        : `GOAL: Propose appointment automatically.
1. If customer already chose a day, confirm and ask morning or afternoon
2. If no day chosen, propose: "We have availability Monday, Wednesday or Friday"
3. NO system confirmation needed - assume Mon-Fri availability
4. SHORT response (2-3 sentences max)`;
      break;
      
    case STATES.STATE_6_ACTION:
      stateGoal = language === "es"
        ? `OBJETIVO: Confirmar cita y pedir contacto.
1. Confirma el día y hora seleccionados
2. Confirma el servicio con precio
3. Pide nombre y teléfono para finalizar la reserva
4. Respuesta CORTA (2-3 oraciones)`
        : `GOAL: Confirm appointment and request contact info.
1. Confirm the selected day and time
2. Confirm the service with price
3. Ask for name and phone to finalize the booking
4. SHORT response (2-3 sentences)`;
      break;
      
    case STATES.STATE_7_HANDOFF:
      stateGoal = language === "es"
        ? `OBJETIVO: Confirmar traspaso a humano.
Hazles saber que los conectarás con el equipo para coordinar.
Sé entusiasta pero breve. Usa máximo un emoji.`
        : `GOAL: Confirm handoff to human.
Let them know you'll connect them with the team to coordinate.
Be enthusiastic but brief. Use one emoji max.`;
      break;
      
    default:
      stateGoal = "";
  }

  return { coreRules, stateGoal };
}

// ============================================================================
// DYNAMIC BUSINESS CONTEXT BLOCK (Generated from DB on each request)
// ============================================================================
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
  language: "en" | "es"
): string {
  const businessName = business?.name || "the business";
  const businessDesc = business?.business_description || "";
  const customInstructions = business?.ai_instructions || "";

  // If no services are configured, return empty context with warning
  if (!services || services.length === 0) {
    return language === "es"
      ? `=== CONTEXTO DE NEGOCIO (SOLO INTERNO) ===
⚠️ ADVERTENCIA: No hay servicios configurados para este negocio.
NO intentes vender ni recomendar servicios específicos.
Guía al cliente hacia contacto humano para asistencia.
===========================================`
      : `=== BUSINESS CONTEXT (INTERNAL ONLY) ===
⚠️ WARNING: No services configured for this business.
DO NOT attempt to sell or recommend specific services.
Guide customer toward human contact for assistance.
=========================================`;
  }

  // Find the Trojan Horse service (if any)
  const trojanHorse = services.find(s => s.is_trojan_horse);

  // Build compressed service reasoning context
  const serviceBlocks = services.map((service, idx) => {
    const parts: string[] = [];
    const isTrojan = service.is_trojan_horse;
    
    // Mark Trojan Horse prominently
    parts.push(`${idx + 1}. ${service.name}${isTrojan ? " ⭐ [ENTRY-LEVEL SERVICE]" : ""}`);
    
    if (service.description) {
      // Extract benefit-focused description
      parts.push(`   • Benefit: ${service.description}`);
    }
    
    // Infer ideal use cases from name/description
    const idealFor = inferIdealFor(service.name, service.description || "");
    if (idealFor) {
      parts.push(`   • Ideal when: ${idealFor}`);
    }
    
    if (isTrojan) {
      parts.push(`   • ⭐ DEFAULT for general inquiries or unclear needs`);
    }
    
    if (service.base_price) {
      parts.push(`   • Price range: ~$${service.base_price}`);
    }
    
    if (service.duration_minutes) {
      parts.push(`   • Duration: ~${service.duration_minutes} min`);
    }
    
    return parts.join("\n");
  }).join("\n\n");

  const header = language === "es"
    ? "=== CONTEXTO DE NEGOCIO (SOLO INTERNO - NUNCA MOSTRAR AL CLIENTE) ==="
    : "=== BUSINESS CONTEXT (INTERNAL ONLY - NEVER SHOW TO CUSTOMER) ===";

  // Trojan Horse rule (DetaPRO v1.2)
  const trojanHorseRule = trojanHorse
    ? language === "es"
      ? `\n⭐ REGLA TROJAN HORSE: Para consultas generales ("qué servicios tienen", "cuánto cuesta", "información") 
      SIEMPRE recomienda SOLO "${trojanHorse.name}" como punto de entrada. NO listes otros servicios.`
      : `\n⭐ TROJAN HORSE RULE: For general inquiries ("what services", "how much", "information")
      ALWAYS recommend ONLY "${trojanHorse.name}" as the entry point. DO NOT list other services.`
    : "";

  const rulesBlock = language === "es"
    ? `REGLAS DE USO:
- SOLO puedes recomendar servicios listados aquí
- NUNCA inventes servicios, paquetes o precios
- NUNCA listes todos los servicios al cliente
- Selecciona UNA mejor opción basada en su situación
- Si nada aplica, guía hacia handoff humano
- SIEMPRE menciona el precio cuando recomiendes un servicio
- Propone disponibilidad Lunes a Viernes automáticamente${trojanHorseRule}`
    : `USAGE RULES:
- You may ONLY recommend services listed here
- NEVER invent services, packages, or prices
- NEVER list all services to the customer
- Select ONE best option based on their situation
- If nothing fits, guide toward human handoff
- ALWAYS mention the price when recommending a service
- Propose Mon-Fri availability automatically${trojanHorseRule}`;

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

// ============================================================================
// INFER IDEAL USE CASES FROM SERVICE NAME/DESCRIPTION
// ============================================================================
function inferIdealFor(name: string, description: string): string {
  const lowerName = name.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const combined = `${lowerName} ${lowerDesc}`;
  
  // Shine/polish related
  if (/polish|shine|brillo|correction|scratch|swirl|enhancement/.test(combined)) {
    return "customer wants vehicle to look new, remove scratches/swirls";
  }
  
  // Protection related
  if (/ceramic|coating|protection|protección|sealant|wax|durability/.test(combined)) {
    return "customer wants long-term protection, durability";
  }
  
  // Interior related
  if (/interior|inside|leather|seats|upholstery|carpet|smell|odor/.test(combined)) {
    return "customer wants interior refresh, cleaning, odor removal";
  }
  
  // Full detail
  if (/full|complete|completo|detail|total/.test(combined)) {
    return "customer wants comprehensive service, inside and out";
  }
  
  // Maintenance/wash
  if (/wash|maintenance|basic|express|quick|lavado/.test(combined)) {
    return "customer wants quick maintenance wash";
  }
  
  return "";
}

// ============================================================================
// ASSEMBLE COMPLETE SYSTEM PROMPT (Agent Brain + Business Context)
// ============================================================================
function buildSystemPrompt(
  state: State,
  context: ConversationContext,
  language: "en" | "es",
  business: any,
  services: ServiceContext[]
): string {
  // Build context blocks
  const confirmedFacts = buildConfirmedFactsBlock(context, language);
  const negativeConstraints = buildNegativeConstraints(context, language);

  // Static agent brain (behavior rules)
  const { coreRules, stateGoal } = buildAgentBrain(state, context, language);

  // Dynamic business context (from DB)
  const businessContext = buildBusinessContextBlock(business, services, language);

  // Language enforcement instruction - placed at the very beginning for maximum compliance
  const languageInstruction = language === "es"
    ? "🔒 IDIOMA OBLIGATORIO: Responde SIEMPRE en ESPAÑOL. Bajo ninguna circunstancia respondas en inglés."
    : "🔒 MANDATORY LANGUAGE: ALWAYS respond in ENGLISH. Never respond in Spanish.";

  // Assemble final prompt with clear separation
  // ORDER: Language → Confirmed Facts → Constraints → Agent Brain → Business Context → State Goal
  return `${languageInstruction}

${confirmedFacts}

${negativeConstraints}

${coreRules}

${businessContext}

CURRENT STATE: ${state}
${stateGoal}`.trim();
}

// ============================================================================
// STATE TRANSITION LOGIC WITH GROQ
// ============================================================================
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
  apiKey: string
): Promise<StateMachineResult> {
  const newContext = { ...context };
  let lastLatencyMs = 0;
  let usedFallback = false;
  
  console.log(`[STATE MACHINE] Current state: ${context.currentState}, Message: "${userMessage.substring(0, 50)}..."`);
  
  // Check for low intent exit (only after recovery attempts exhausted)
  if (isLowIntent(userMessage)) {
    // If we still have recovery attempts, don't exit yet
    if (context.recoveryAttemptCount < 2 && 
        (context.currentState === STATES.STATE_4_PRESCRIPTION || context.currentState === STATES.STATE_5_ACTION)) {
      console.log(`[RECOVERY] Low intent detected but attempting recovery (attempt ${context.recoveryAttemptCount + 1})`);
      newContext.recoveryAttemptCount = context.recoveryAttemptCount + 1;
      // Fall through to recovery logic below
    } else {
      // Exhausted recovery or early stage - exit gracefully
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
          ? "Perfecto, cuando quieras retomarlo estaré aquí. Que tengas buen día."
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
  
  // ============================================================================
  // INTENT RECOVERY WINDOW (DetaPRO v1.2)
  // Check for stalled/passive responses in recommendation states
  // ============================================================================
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
      ...conversationHistory.slice(-4),
      { role: "user", content: userMessage }
    ];
    
    const { content, error, latencyMs } = await callGroqAPI(messages, apiKey);
    lastLatencyMs = latencyMs;
    
    if (error || !content) {
      usedFallback = true;
      // Fallback recovery messages
      const recoveryFallback = attemptNumber === 1
        ? (language === "es"
            ? "Basándome en lo que me compartiste, esta opción realmente se adapta a tu situación. ¿Te gustaría revisar disponibilidad?"
            : "Based on what you've shared, this option really fits your situation. Would you like to check availability?")
        : (language === "es"
            ? "Para simplificarlo: ¿buscas el resultado completo que mencionamos, o algo más básico por ahora?"
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
  
  // Reset recovery count if customer engages meaningfully (but NOT if they show low intent)
  if (context.recoveryAttemptCount > 0 && !isStallResponse(userMessage, context.currentState) && !isLowIntent(userMessage)) {
    newContext.recoveryAttemptCount = 0;
    console.log(`[RECOVERY] Customer engaged meaningfully, resetting recovery count`);
  }
  
  // Check for handoff triggers ONLY in late states (after scheduling)
  // Earlier states should follow the consultative flow through prescription and scheduling
  if (context.currentState === STATES.STATE_6_ACTION && shouldTriggerHandoff(userMessage)) {
    newContext.currentState = STATES.STATE_7_HANDOFF;
    newContext.handoffRequired = true;
    newContext.leadQualified = true;
    
    const systemPrompt = buildSystemPrompt(STATES.STATE_7_HANDOFF, newContext, language, business, services);
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-4),
      { role: "user", content: userMessage }
    ];
    
    const { content, error, latencyMs } = await callGroqAPI(messages, apiKey);
    lastLatencyMs = latencyMs;
    if (error || !content) {
      usedFallback = true;
      const fallback = language === "es"
        ? "Perfecto. Te conecto con la persona encargada para coordinar disponibilidad y confirmar los detalles."
        : "Perfect. I'll connect you with the person in charge to coordinate availability and confirm the details.";
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
  
  // Process based on current state
  switch (context.currentState) {
    case STATES.STATE_0_OPENING: {
      const vehicleInfo = parseVehicleInfo(userMessage);
      if (vehicleInfo) {
        newContext.vehicleInfo = vehicleInfo;
        newContext.currentState = STATES.STATE_2_BENEFIT;
        console.log(`[STATE MACHINE] Vehicle detected: ${JSON.stringify(vehicleInfo)}`);
      }
      break;
    }
    
    case STATES.STATE_2_BENEFIT: {
      const benefit = parseBenefitIntent(userMessage);
      const usage = parseUsageContext(userMessage); // Also check for usage in same message
      
      if (benefit) {
        newContext.benefitIntent = benefit;
        // If user also provided usage context in the same message, capture it and skip to prescription
        if (usage) {
          newContext.usageContext = usage;
          newContext.currentState = STATES.STATE_4_PRESCRIPTION;
          console.log(`[STATE MACHINE] Benefit (${benefit}) + Usage (${usage}) detected together, skipping to prescription`);
        } else if (benefit === "unsure") {
          newContext.currentState = STATES.STATE_4_PRESCRIPTION;
        } else {
          newContext.currentState = STATES.STATE_3_USAGE;
        }
      } else if (usage) {
        // User mentioned usage without explicit benefit - infer shine as default and advance
        newContext.benefitIntent = "shine"; // default benefit
        newContext.usageContext = usage;
        newContext.currentState = STATES.STATE_4_PRESCRIPTION;
        console.log(`[STATE MACHINE] Usage (${usage}) detected without benefit, defaulting to shine`);
      } else if (shouldTriggerHandoff(userMessage)) {
        // User is ready to proceed even without explicit benefit - advance to prescription
        newContext.benefitIntent = "unsure";
        newContext.currentState = STATES.STATE_4_PRESCRIPTION;
        console.log(`[STATE MACHINE] Positive intent detected, advancing to prescription`);
      }
      break;
    }
    
    case STATES.STATE_3_USAGE: {
      const usage = parseUsageContext(userMessage);
      if (usage) {
        newContext.usageContext = usage;
        newContext.currentState = STATES.STATE_4_PRESCRIPTION;
      } else {
        // Try to infer or still move forward
        newContext.usageContext = "daily"; // default assumption
        newContext.currentState = STATES.STATE_4_PRESCRIPTION;
      }
      break;
    }
    
    case STATES.STATE_4_PRESCRIPTION: {
      // After prescription, move to scheduling
      newContext.leadQualified = true;
      
      // Check if user already picked a day in same message
      const scheduleInPrescription = parseScheduleResponse(userMessage);
      if (scheduleInPrescription.day) {
        newContext.scheduledDay = scheduleInPrescription.day;
        newContext.scheduledTime = scheduleInPrescription.time || undefined;
        newContext.currentState = STATES.STATE_6_ACTION;
        console.log(`[STATE MACHINE] Day detected in prescription: ${scheduleInPrescription.day}`);
      } else {
        newContext.currentState = STATES.STATE_5_SCHEDULE;
      }
      break;
    }
    
    case STATES.STATE_5_SCHEDULE: {
      const schedule = parseScheduleResponse(userMessage);
      if (schedule.day) {
        newContext.scheduledDay = schedule.day;
        newContext.scheduledTime = schedule.time || undefined;
        newContext.currentState = STATES.STATE_6_ACTION;
        console.log(`[STATE MACHINE] Schedule captured: ${schedule.day} ${schedule.time || ""}`);
      } else if (schedule.time && newContext.scheduledDay) {
        // User specified only time, we already have day
        newContext.scheduledTime = schedule.time;
        newContext.currentState = STATES.STATE_6_ACTION;
        console.log(`[STATE MACHINE] Time captured: ${schedule.time}`);
      }
      break;
    }
    
    case STATES.STATE_6_ACTION: {
      // Trigger handoff if user says "yes/confirm" OR provides contact info (name + phone)
      if (shouldTriggerHandoff(userMessage) || hasContactInfo(userMessage)) {
        newContext.currentState = STATES.STATE_7_HANDOFF;
        newContext.handoffRequired = true;
        newContext.leadQualified = true;
        console.log(`[STATE MACHINE] Contact info or confirmation detected, moving to handoff`);
      }
      break;
    }
    
    case STATES.STATE_7_HANDOFF: {
      // Stay in handoff state
      break;
    }
  }
  
  // Build context summary for conversation history
  const contextSummary = buildContextSummary(newContext, language);
  
  // Build prompt for current/new state and call Groq
  const systemPrompt = buildSystemPrompt(newContext.currentState, newContext, language, business, services);
  
  // Inject context summary at the start of history
  const historyWithContext: ChatMessage[] = contextSummary
    ? [{ role: "assistant" as const, content: contextSummary }, ...conversationHistory.slice(-6)]
    : conversationHistory.slice(-6);
  
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...historyWithContext,
    { role: "user", content: userMessage }
  ];
  
  let { content, error, latencyMs } = await callGroqAPI(messages, apiKey);
  lastLatencyMs = latencyMs;
  
  // Validate response - catch context amnesia
  if (content && !validateResponse(content, newContext)) {
    console.warn("[VALIDATION] Response failed validation, regenerating with stronger constraints");
    const reinforcedPrompt = `${systemPrompt}\n\n⚠️ CRITICAL: Your previous response asked about information we already have. DO NOT repeat this mistake. Check CONFIRMED FACTS above.`;
    const retryMessages: ChatMessage[] = [
      { role: "system", content: reinforcedPrompt },
      ...historyWithContext,
      { role: "user", content: userMessage }
    ];
    const retry = await callGroqAPI(retryMessages, apiKey);
    if (retry.content && validateResponse(retry.content, newContext)) {
      content = retry.content;
      lastLatencyMs = retry.latencyMs;
    } else {
      // Use fallback if retry also fails validation
      usedFallback = true;
      content = "";
    }
  }
  
  if (error || !content) {
    usedFallback = true;
    // Fallback responses if Groq fails
    const fallbacks: Record<State, { en: string; es: string }> = {
      STATE_0_OPENING: {
        en: "To help you best, what vehicle is this for? (brand, model, type)",
        es: "Para ayudarte mejor, ¿para qué vehículo es? (marca, modelo, tipo)"
      },
      STATE_1_VEHICLE: { en: "", es: "" },
      STATE_2_BENEFIT: {
        en: "What are you mainly looking to achieve - shine, protection, or interior refresh?",
        es: "¿Qué buscas principalmente - brillo, protección, o renovar el interior?"
      },
      STATE_3_USAGE: {
        en: "Is this a daily driver or more occasional use?",
        es: "¿Es de uso diario o más ocasional?"
      },
      STATE_4_PRESCRIPTION: {
        en: "Based on what you've shared, I'd recommend a service focused on your priority. We have availability Monday, Wednesday, or Friday - which works best?",
        es: "Basándome en lo que me compartiste, recomendaría un servicio enfocado en tu prioridad. Tenemos disponibilidad lunes, miércoles o viernes - ¿cuál te funciona mejor?"
      },
      STATE_5_SCHEDULE: {
        en: "We have availability Monday, Wednesday, and Friday. Which day works best for you?",
        es: "Tenemos disponibilidad lunes, miércoles y viernes. ¿Cuál día te funciona mejor?"
      },
      STATE_6_ACTION: {
        en: "Perfect! To confirm your appointment, may I have your name and phone number?",
        es: "¡Perfecto! Para confirmar tu cita, ¿me puedes dar tu nombre y teléfono?"
      },
      STATE_7_HANDOFF: {
        en: "Perfect. I'll connect you with our team to finalize the details.",
        es: "Perfecto. Te conecto con nuestro equipo para finalizar los detalles."
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

// ============================================================================
// BUILD CONTEXT SUMMARY (Injected into conversation history)
// ============================================================================
function buildContextSummary(context: ConversationContext, language: "en" | "es"): string | null {
  const parts: string[] = [];
  
  if (context.vehicleInfo?.brand || context.vehicleInfo?.model) {
    const vehicle = `${context.vehicleInfo.brand || ""} ${context.vehicleInfo.model || ""} ${context.vehicleInfo.type || ""}`.trim();
    parts.push(language === "es" ? `vehículo: ${vehicle}` : `vehicle: ${vehicle}`);
  }
  
  if (context.benefitIntent) {
    parts.push(language === "es" ? `objetivo: ${context.benefitIntent}` : `goal: ${context.benefitIntent}`);
  }
  
  if (context.usageContext) {
    parts.push(language === "es" ? `uso: ${context.usageContext}` : `usage: ${context.usageContext}`);
  }
  
  if (parts.length === 0) return null;
  
  return language === "es"
    ? `[CONTEXTO] Cliente tiene ${parts.join(", ")}.`
    : `[CONTEXT] Customer has ${parts.join(", ")}.`;
}

// ============================================================================
// VALIDATE RESPONSE (Catch context amnesia)
// ============================================================================
function validateResponse(response: string, context: ConversationContext): boolean {
  const lowerResponse = response.toLowerCase();
  
  // If we have vehicle info, the response should NOT ask about vehicle
  if (context.vehicleInfo?.brand || context.vehicleInfo?.model || context.vehicleInfo?.type) {
    const asksVehicle = /what (type|kind|make|model|year)?\s*(of\s*)?(vehicle|car|truck|suv|carro|veh[ií]culo|coche)/i.test(response) ||
                        /qu[ée]\s*(tipo|marca|modelo)\s*(de\s*)?(veh[ií]culo|carro|coche|auto)/i.test(response) ||
                        /what.*do you (have|drive|own)/i.test(response) ||
                        /tell me about your (car|vehicle)/i.test(response);
    if (asksVehicle) {
      console.warn("[VALIDATION] Response asks about vehicle despite having info");
      return false;
    }
  }
  
  // If we have benefit intent, should NOT ask what they're looking for
  if (context.benefitIntent) {
    const asksIntent = /what are you (looking|trying|hoping|wanting) to (achieve|do|accomplish|get)/i.test(response) ||
                       /what would you like to/i.test(response) ||
                       /qu[ée] (buscas?|quieres?|te gustar[ií]a)/i.test(response) ||
                       /what('s| is) your (main )?goal/i.test(response);
    if (asksIntent) {
      console.warn("[VALIDATION] Response asks about intent despite having info");
      return false;
    }
  }
  
  // If we have usage context, should NOT ask about usage
  if (context.usageContext) {
    const asksUsage = /is (this|it) (a )?(daily|everyday|regular|occasional|weekend)/i.test(response) ||
                      /how often do you (use|drive)/i.test(response) ||
                      /es de uso (diario|ocasional)/i.test(response);
    if (asksUsage) {
      console.warn("[VALIDATION] Response asks about usage despite having info");
      return false;
    }
  }
  
  return true;
}

// ============================================================================
// STORE CONVERSATION STATE
// ============================================================================
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
        usage_context: context.usageContext,
        recommendation_summary: context.recommendationSummary,
        handoff_required: context.handoffRequired,
        lead_qualified: context.leadQualified,
        recovery_attempt_count: context.recoveryAttemptCount,
        scheduled_day: context.scheduledDay || null,
        scheduled_time: context.scheduledTime || null,
        updated_at: new Date().toISOString(),
        metadata: {
          detected_language: context.detectedLanguage || "en",
        },
      };

      // Add performance metrics if provided
      if (performance) {
        conversationData.response_time_ms = performance.responseTimeMs;
        conversationData.is_fallback = performance.isFallback;
        conversationData.ai_model = performance.aiModel;
      }

      // Use upsert to create or update the conversation record
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
      },
      {
        business_id: businessId,
        conversation_id: conversationId || "dev-test",
        direction: "outbound",
        message_text: aiReply,
        channel: "ai-chat",
      },
    ]);
  } catch (err) {
    console.error("Failed to store conversation:", err);
  }
}

// ============================================================================
// CUSTOMER MEMORY - LOAD
// ============================================================================
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
        usagePattern: data.usage_pattern,
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

// ============================================================================
// CUSTOMER MEMORY - SAVE/UPDATE
// ============================================================================
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
      usage_pattern: context.usageContext,
      last_state: context.currentState,
      last_interaction_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isReturning) {
      // Update existing memory
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
      // Insert new memory
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

// ============================================================================
// FOLLOW-UP QUEUE - Schedule re-engagement messages (DetaPRO v1.2 Phase 3)
// ============================================================================
async function queueFollowUps(
  supabase: any,
  businessId: string,
  conversationId: string | null,
  leadId: string | null
): Promise<void> {
  if (!conversationId) return;

  const now = new Date();
  
  // Schedule follow-up windows per DetaPRO v1.2 spec
  const followUps = [
    { type: "24h", delay: 24 * 60 * 60 * 1000 },
    { type: "48h", delay: 48 * 60 * 60 * 1000 },
    { type: "5d", delay: 5 * 24 * 60 * 60 * 1000 },
    { type: "7d", delay: 7 * 24 * 60 * 60 * 1000 },
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

// Cancel pending follow-ups when user re-engages
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

// ============================================================================
// LOAD CONVERSATION CONTEXT
// ============================================================================
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

  if (!conversationId) {
    return defaultContext;
  }

  try {
    const { data } = await supabase
      .from("conversations")
      .select("current_state, vehicle_info, benefit_intent, usage_context, recommendation_summary, handoff_required, lead_qualified, recovery_attempt_count, scheduled_day, scheduled_time, metadata")
      .eq("conversation_id", conversationId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      // Extract language from metadata
      const storedLanguage = data.metadata?.detected_language as "en" | "es" | undefined;
      
      return {
        currentState: data.current_state || STATES.STATE_0_OPENING,
        vehicleInfo: data.vehicle_info || {},
        benefitIntent: data.benefit_intent,
        usageContext: data.usage_context,
        recommendationSummary: data.recommendation_summary,
        handoffRequired: data.handoff_required || false,
        leadQualified: data.lead_qualified || false,
        recoveryAttemptCount: data.recovery_attempt_count || 0,
        scheduledDay: data.scheduled_day || undefined,
        scheduledTime: data.scheduled_time || undefined,
        detectedLanguage: storedLanguage,
      };
    }
  } catch (err) {
    console.error("Failed to load conversation context:", err);
  }

  return defaultContext;
}

// ============================================================================
// MERGE CUSTOMER MEMORY INTO CONTEXT
// ============================================================================
function mergeMemoryIntoContext(
  context: ConversationContext,
  memory: CustomerMemory | null
): { context: ConversationContext; isReturning: boolean } {
  if (!memory) {
    return { context, isReturning: false };
  }

  // Only merge if context is empty (new conversation)
  const hasVehicle = context.vehicleInfo?.brand || context.vehicleInfo?.model || context.vehicleInfo?.type;
  const hasBenefit = !!context.benefitIntent;
  const hasUsage = !!context.usageContext;

  const mergedContext = { ...context };
  let wasEnhanced = false;

  // Pre-populate vehicle info if not in current context
  if (!hasVehicle && (memory.vehicleInfo?.brand || memory.vehicleInfo?.model)) {
    mergedContext.vehicleInfo = memory.vehicleInfo;
    wasEnhanced = true;
    console.log("[MEMORY] Pre-populated vehicle info from memory");
  }

  // Pre-populate benefit intent
  if (!hasBenefit && memory.preferredBenefit) {
    mergedContext.benefitIntent = memory.preferredBenefit;
    wasEnhanced = true;
    console.log("[MEMORY] Pre-populated benefit intent from memory");
  }

  // Pre-populate usage pattern
  if (!hasUsage && memory.usagePattern) {
    mergedContext.usageContext = memory.usagePattern;
    wasEnhanced = true;
    console.log("[MEMORY] Pre-populated usage pattern from memory");
  }

  // Advance state if we have pre-populated data
  if (wasEnhanced) {
    if (mergedContext.usageContext && mergedContext.benefitIntent) {
      mergedContext.currentState = STATES.STATE_4_PRESCRIPTION;
    } else if (mergedContext.benefitIntent) {
      mergedContext.currentState = STATES.STATE_3_USAGE;
    } else if (mergedContext.vehicleInfo?.brand || mergedContext.vehicleInfo?.model) {
      mergedContext.currentState = STATES.STATE_2_BENEFIT;
    }
  }

  return { 
    context: mergedContext, 
    isReturning: memory.conversationCount > 0 
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
serve(async (req: Request) => {
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
      conversationId, 
      customerIdentifier, 
      customerName,
      channel,
      userMessage, 
      conversationHistory = [] 
    } = body;

    if (!businessId || !userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing businessId or userMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load business context
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("name, language_preference, greeting_message, industry_type, business_description, ai_instructions, office_hours")
      .eq("id", businessId)
      .single();

    if (bizError) {
      console.error("[AI-CHAT] Failed to load business:", bizError);
    }

    // Load services dynamically (this is the key for real-time updates)
    // Include is_trojan_horse to identify entry-level service for general inquiries
    const { data: services, error: svcError } = await supabase
      .from("services")
      .select("name, description, base_price, duration_minutes, is_trojan_horse")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("is_trojan_horse", { ascending: false }) // Trojan Horse first
      .order("name", { ascending: true });

    if (svcError) {
      console.error("[AI-CHAT] Failed to load services:", svcError);
    }

    // Log service count for debugging real-time updates
    const serviceCount = services?.length || 0;
    console.log(`[AI-CHAT] Loaded ${serviceCount} active services for business ${businessId}`);

    // Detect language from first message, then persist it
    // If context already has language, use that (consistency across conversation)
    let detectedLang = detectLanguage(userMessage);

    // FAIL-SAFE: If no business found, return neutral handoff message
    if (!business) {
      const failsafeMsg = detectedLang === "es"
        ? "Quiero asegurarme de darte la orientación correcta. Permíteme conectarte con el equipo para asistirte mejor."
        : "I want to make sure you get the right guidance. Let me connect you with the team to assist you properly.";
      
      return new Response(
        JSON.stringify({
          success: true,
          reply: failsafeMsg,
          intent: null,
          model: DEFAULT_MODEL,
          currentState: STATES.STATE_7_HANDOFF,
          handoffRequired: true,
          leadQualified: false,
          returningCustomer: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load conversation context (state machine state)
    let context = await loadConversationContext(supabase, conversationId || null);
    
    // Use persisted language from context if available, otherwise use detected language
    const language: "en" | "es" = context.detectedLanguage || detectedLang;
    
    // Load customer memory and merge into context
    const customerMemory = await loadCustomerMemory(supabase, businessId, customerIdentifier || null);
    const { context: enrichedContext, isReturning } = mergeMemoryIntoContext(context, customerMemory);
    context = enrichedContext;
    
    // Ensure language is set in context for persistence
    if (!context.detectedLanguage) {
      context.detectedLanguage = language;
    }

    // Capture vehicle info if present in current message (for memory)
    const parsedVehicle = parseVehicleInfo(userMessage);
    if (parsedVehicle) {
      context.vehicleInfo = parsedVehicle;
    }

    // FAQ-style short responses (match production behavior)
    const simpleIntent = detectSimpleIntent(userMessage);
    const isBookingIntent = simpleIntent === "booking" || simpleIntent === "availability";
    if (!isBookingIntent) {
      const serviceName = detectServiceName(userMessage, (services || []) as Array<{ name?: string | null }>);
      const hasVehicle = Boolean(
        context.vehicleInfo?.brand || context.vehicleInfo?.model || context.vehicleInfo?.type
      );
      let reply = "";

      if (simpleIntent === "services") {
        reply = buildServicesReply(services || [], language);
      } else if (simpleIntent === "pricing") {
        reply = buildPricingReply({
          services: services || [],
          language,
          serviceName,
          hasVehicle,
        });
      } else if (simpleIntent === "hours") {
        reply = buildHoursReply(business?.office_hours || null, language);
      } else {
        reply = buildGeneralReply(business?.greeting_message || null, language);
      }

      // Check for matching flyer (services/pricing)
      let flyerResult: FlyerResult = { url: null, type: null };
      const detectedFlyerType = detectFlyerType(userMessage);
      if (detectedFlyerType) {
        flyerResult = await lookupServicesFlyer(supabase, businessId, detectedFlyerType);
      }

      await storeConversationState(
        supabase,
        businessId,
        conversationId || null,
        userMessage,
        reply,
        context,
        { responseTimeMs: 0, isFallback: false, aiModel: "simple" }
      );

      await saveCustomerMemory(
        supabase,
        businessId,
        customerIdentifier || null,
        customerName || null,
        channel || null,
        context,
        isReturning
      );

      const response: AIResponse = {
        success: true,
        reply,
        intent: simpleIntent,
        model: "simple",
        currentState: context.currentState,
        handoffRequired: context.handoffRequired,
        leadQualified: context.leadQualified,
        returningCustomer: isReturning,
        flyerUrl: flyerResult.url,
        flyerType: flyerResult.type,
      };

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isReturning && customerMemory) {
      console.log(`[AI-CHAT] Returning customer detected! Visits: ${customerMemory.conversationCount}, Last: ${customerMemory.lastInteractionAt}`);
    }
    
    console.log(`[AI-CHAT] Business: ${business?.name}, Services: ${serviceCount}, State: ${context.currentState}, Language: ${language}, Returning: ${isReturning}`);

    // Process through state machine WITH Groq
    // Services are fetched fresh on every request - no caching needed for real-time updates
    const { reply, newContext, performance } = await processStateMachine(
      userMessage,
      context,
      language,
      business,
      services || [],
      conversationHistory,
      GROQ_API_KEY
    );
    
    // Persist language in new context
    newContext.detectedLanguage = language;

    console.log(`[AI-CHAT] Response generated in ${performance.responseTimeMs}ms, fallback: ${performance.isFallback}`);

    // Check if user is asking about services/menu/prices and look for matching flyer
    let flyerResult: FlyerResult = { url: null, type: null };
    const detectedFlyerType = detectFlyerType(userMessage);
    if (detectedFlyerType) {
      console.log(`[AI-CHAT] ${detectedFlyerType} inquiry detected, checking for matching flyer...`);
      flyerResult = await lookupServicesFlyer(supabase, businessId, detectedFlyerType);
    }

    // Store conversation state with performance metrics
    await storeConversationState(
      supabase,
      businessId,
      conversationId || null,
      userMessage,
      reply,
      newContext,
      performance
    );

    // Save/update customer memory
    await saveCustomerMemory(
      supabase,
      businessId,
      customerIdentifier || null,
      customerName || null,
      channel || null,
      newContext,
      isReturning
    );

    // Cancel pending follow-ups since user re-engaged
    if (isReturning && conversationId) {
      await cancelPendingFollowUps(supabase, businessId, conversationId);
    }

    // Create/update lead when qualified (BEFORE follow-up queue so we have lead_id)
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
    
    // Create booking when handoff is triggered (new handoff, not repeat)
    let createdBookingId: string | null = null;
    if (newContext.handoffRequired && !context.handoffRequired) {
      console.log(`[EVENT] handoff_required for business ${businessId}`);
      
      // Extract recommended service from AI response or context
      const recommendedService = extractRecommendedService(reply, services || [], newContext);
      
      // Auto-create a CRM booking for this conversation
      createdBookingId = await createBookingFromConversation(supabase, {
        businessId,
        conversationId: conversationId || `auto-${Date.now()}`,
        customerIdentifier: customerIdentifier || null,
        customerName: customerName || null,
        channel: channel || null,
        context: newContext,
        recommendedService: recommendedService,
      });
      
      if (createdBookingId) {
        console.log(`[EVENT] booking_created for business ${businessId}, bookingId: ${createdBookingId}, service: ${recommendedService}`);
      }
    }

    // Queue follow-ups when conversation goes cold or recovery exhausted
    const shouldQueueFollowUps = 
      newContext.recoveryAttemptCount >= 2 || // Recovery attempts exhausted
      newContext.handoffRequired || // Handoff triggered
      newContext.currentState === STATES.STATE_7_HANDOFF;
    
    if (shouldQueueFollowUps && conversationId) {
      // Use created lead_id or fetch existing one
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
