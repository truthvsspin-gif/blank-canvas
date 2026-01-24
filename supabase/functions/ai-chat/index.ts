// @ts-nocheck - Deno edge function
// DetaPRO Sales Agent v1 - Consultative Sales Chatbot with State Machine
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
  STATE_5_ACTION: "STATE_5_ACTION",
  STATE_6_HANDOFF: "STATE_6_HANDOFF",
} as const;

type State = typeof STATES[keyof typeof STATES];

interface ConversationContext {
  currentState: State;
  vehicleInfo: {
    brand?: string;
    model?: string;
    type?: string; // sedan, suv, pickup, etc.
    sizeClass?: string; // small, medium, large
  };
  benefitIntent?: string; // shine, protection, interior, unsure
  usageContext?: string; // daily, occasional
  recommendationSummary?: string;
  handoffRequired: boolean;
  leadQualified: boolean;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIRequest {
  businessId: string;
  conversationId?: string;
  customerId?: string;
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
  error?: string;
}

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================
function detectLanguage(text: string): "en" | "es" {
  const spanishPatterns = /\b(hola|buenos|gracias|por favor|quiero|necesito|cuánto|cómo|dónde|qué|tiene|pueden|está|servicio|cita|reserva|vehículo|carro|coche|auto|camioneta)\b/i;
  return spanishPatterns.test(text) ? "es" : "en";
}

// ============================================================================
// VEHICLE PARSING (STATE 1 - Internal)
// ============================================================================
function parseVehicleInfo(text: string): ConversationContext["vehicleInfo"] | null {
  const lowerText = text.toLowerCase();
  
  // Common vehicle brands
  const brands = [
    "toyota", "honda", "ford", "chevrolet", "chevy", "nissan", "hyundai", "kia",
    "bmw", "mercedes", "audi", "volkswagen", "vw", "mazda", "subaru", "lexus",
    "jeep", "dodge", "ram", "gmc", "cadillac", "buick", "tesla", "volvo",
    "porsche", "jaguar", "land rover", "range rover", "infiniti", "acura"
  ];
  
  // Vehicle types
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
  
  // Detect brand
  for (const brand of brands) {
    if (lowerText.includes(brand)) {
      detectedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }
  
  // Detect type
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(text)) {
      detectedType = type;
      break;
    }
  }
  
  // Extract potential model (words after brand, numbers, common model names)
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
  
  // Classify size based on type
  let sizeClass = "medium";
  if (detectedType === "pickup" || detectedType === "suv") {
    sizeClass = "large";
  } else if (detectedType === "coupe" || detectedType === "hatchback") {
    sizeClass = "small";
  }
  
  // Only return if we have at least brand or type
  if (detectedBrand || detectedType) {
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
  
  // Shine / Look like new
  if (/\b(shine|shiny|brillo|brillar|new|nuevo|look|lucir|polish|pulir|scratch|rayón|swirl|detalle|detail)\b/i.test(lowerText)) {
    return "shine";
  }
  
  // Protection
  if (/\b(protect|proteger|protección|ceramic|cerámico|wax|cera|coating|maintain|mantener|durabilidad|durable|long|largo plazo)\b/i.test(lowerText)) {
    return "protection";
  }
  
  // Interior
  if (/\b(interior|inside|adentro|seats|asientos|leather|piel|cuero|smell|olor|clean inside|limpiar adentro|upholstery|tapicería)\b/i.test(lowerText)) {
    return "interior";
  }
  
  // Unsure
  if (/\b(not sure|no sé|unsure|no estoy seguro|don't know|no se|maybe|quizás|options|opciones)\b/i.test(lowerText)) {
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
  const patterns = [
    /\b(interested|interesado|i'm in|me interesa|let's do it|hagámoslo|vamos|proceed|adelante|book|reservar|agendar|schedule|programar|yes|sí|si|sounds good|suena bien|perfect|perfecto|next step|siguiente paso|availability|disponibilidad|when can|cuándo puedo)\b/i,
  ];
  
  return patterns.some(p => p.test(text));
}

// ============================================================================
// LOW INTENT DETECTION
// ============================================================================
function isLowIntent(text: string, context: ConversationContext): boolean {
  const lowIntentPatterns = [
    /\b(just looking|solo viendo|browsing|curious|curioso|maybe later|después|not now|ahora no|no thanks|no gracias|never mind|olvídalo)\b/i,
  ];
  
  return lowIntentPatterns.some(p => p.test(text));
}

// ============================================================================
// STATE MACHINE MESSAGES
// ============================================================================
function getStateMessage(
  state: State,
  language: "en" | "es",
  context: ConversationContext,
  business: any,
  services: any[]
): string {
  const messages: Record<State, { en: string; es: string }> = {
    STATE_0_OPENING: {
      en: "Perfect, happy to help! 🚗\n\nTo guide you properly, what vehicle is this for?\n(Brand, model, and whether it's a sedan, SUV, or pickup)",
      es: "¡Perfecto, con gusto te ayudo! 🚗\n\nPara orientarte mejor, ¿para qué vehículo es?\n(Marca, modelo, y si es sedán, SUV o pickup)",
    },
    STATE_1_VEHICLE: {
      // This state is internal - should not have a message
      en: "",
      es: "",
    },
    STATE_2_BENEFIT: {
      en: "Thanks! What are you mainly looking to achieve?\n\n• 🌟 Make it look like new / increase shine\n• 🛡️ Protect it and keep it looking good over time\n• 🧹 Improve or renew the interior\n• 🤔 I'm not completely sure yet",
      es: "¡Gracias! ¿Qué buscas principalmente lograr?\n\n• 🌟 Que luzca como nuevo / más brillo\n• 🛡️ Protegerlo y mantenerlo bien a largo plazo\n• 🧹 Mejorar o renovar el interior\n• 🤔 Aún no estoy completamente seguro",
    },
    STATE_3_USAGE: {
      en: "Got it. Is this a daily-use vehicle or more occasional?",
      es: "Entendido. ¿Es un vehículo de uso diario o más ocasional?",
    },
    STATE_4_PRESCRIPTION: {
      // This will be generated dynamically
      en: "",
      es: "",
    },
    STATE_5_ACTION: {
      en: "Would you like to move forward and check availability, or would you prefer to clarify something first?",
      es: "¿Te gustaría avanzar y revisar disponibilidad, o prefieres aclarar algo primero?",
    },
    STATE_6_HANDOFF: {
      en: "Perfect! 🎉 I'll connect you with the person in charge to coordinate availability and confirm the details. They'll reach out shortly.",
      es: "¡Perfecto! 🎉 Te conecto con la persona encargada para coordinar disponibilidad y confirmar los detalles. Te contactarán pronto.",
    },
  };
  
  return messages[state][language];
}

// ============================================================================
// BUILD PRESCRIPTION (STATE 4)
// ============================================================================
function buildPrescription(
  context: ConversationContext,
  language: "en" | "es",
  business: any,
  services: any[]
): string {
  const { vehicleInfo, benefitIntent, usageContext } = context;
  
  // Build vehicle description
  const vehicleDesc = language === "es"
    ? `${vehicleInfo.brand || ""} ${vehicleInfo.model || ""} ${vehicleInfo.type ? `(${vehicleInfo.type})` : ""}`.trim() || "tu vehículo"
    : `${vehicleInfo.brand || ""} ${vehicleInfo.model || ""} ${vehicleInfo.type ? `(${vehicleInfo.type})` : ""}`.trim() || "your vehicle";
  
  // Map benefit intent to recommendation
  const recommendations: Record<string, { en: string; es: string; benefit: { en: string; es: string } }> = {
    shine: {
      en: "a paint correction and enhancement service",
      es: "un servicio de corrección y realce de pintura",
      benefit: {
        en: "This will bring back the deep gloss and eliminate swirls and light scratches, making it look showroom-new",
        es: "Esto devolverá el brillo profundo y eliminará remolinos y rayones leves, dejándolo como de agencia",
      },
    },
    protection: {
      en: "a protective coating application",
      es: "una aplicación de recubrimiento protector",
      benefit: {
        en: "This creates a durable barrier that keeps the paint protected from the elements and makes maintenance much easier",
        es: "Esto crea una barrera duradera que protege la pintura de los elementos y facilita mucho el mantenimiento",
      },
    },
    interior: {
      en: "a deep interior restoration",
      es: "una restauración profunda del interior",
      benefit: {
        en: "This will refresh and protect all interior surfaces, eliminating odors and bringing back that new-car feel",
        es: "Esto refrescará y protegerá todas las superficies interiores, eliminando olores y trayendo esa sensación de carro nuevo",
      },
    },
    unsure: {
      en: "a complete assessment to determine the best approach",
      es: "una evaluación completa para determinar el mejor enfoque",
      benefit: {
        en: "We'll identify exactly what your vehicle needs and recommend the most effective solution",
        es: "Identificaremos exactamente lo que necesita tu vehículo y recomendaremos la solución más efectiva",
      },
    },
  };
  
  const rec = recommendations[benefitIntent || "unsure"];
  const usageNote = language === "es"
    ? usageContext === "daily" 
      ? "Como es de uso diario, esto es especialmente importante para mantenerlo en óptimas condiciones."
      : "Al ser de uso ocasional, este tratamiento le dará una protección duradera entre usos."
    : usageContext === "daily"
      ? "Since it's a daily driver, this is especially important to keep it in optimal condition."
      : "Being an occasional-use vehicle, this treatment will give it lasting protection between uses.";
  
  if (language === "es") {
    return `Basándome en lo que me compartiste, tu prioridad es **${benefitIntent === "shine" ? "el brillo y apariencia" : benefitIntent === "protection" ? "la protección a largo plazo" : benefitIntent === "interior" ? "el interior" : "encontrar la mejor opción"}** para tu ${vehicleDesc}.

En este caso, lo más adecuado sería **${rec.es}**.

${rec.benefit.es}. ${usageNote}

Si te parece bien, el siguiente paso es revisar disponibilidad y ver qué horario te funciona mejor.`;
  }
  
  return `Based on what you shared, your priority is **${benefitIntent === "shine" ? "shine and appearance" : benefitIntent === "protection" ? "long-term protection" : benefitIntent === "interior" ? "the interior" : "finding the best option"}** for your ${vehicleDesc}.

In this case, the most suitable approach would be **${rec.en}**.

${rec.benefit.en}. ${usageNote}

If that sounds good, the next step is to check availability and see what timing works best for you.`;
}

// ============================================================================
// STATE TRANSITION LOGIC
// ============================================================================
async function processStateMachine(
  userMessage: string,
  context: ConversationContext,
  language: "en" | "es",
  business: any,
  services: any[],
  supabase: any,
  conversationId: string | null
): Promise<{ reply: string; newContext: ConversationContext }> {
  let reply = "";
  const newContext = { ...context };
  
  console.log(`[STATE MACHINE] Current state: ${context.currentState}, Message: "${userMessage.substring(0, 50)}..."`);
  
  // Check for low intent exit
  if (isLowIntent(userMessage, context)) {
    reply = language === "es"
      ? "No hay problema. Si necesitas ayuda más adelante, con gusto te atiendo. ¡Que tengas buen día! 👋"
      : "No problem at all. If you need help later, feel free to reach out. Have a great day! 👋";
    return { reply, newContext };
  }
  
  // Check for handoff triggers at any state (after STATE_2)
  if (context.currentState !== STATES.STATE_0_OPENING && 
      context.currentState !== STATES.STATE_1_VEHICLE &&
      context.currentState !== STATES.STATE_2_BENEFIT &&
      shouldTriggerHandoff(userMessage)) {
    newContext.currentState = STATES.STATE_6_HANDOFF;
    newContext.handoffRequired = true;
    newContext.leadQualified = true;
    reply = getStateMessage(STATES.STATE_6_HANDOFF, language, newContext, business, services);
    return { reply, newContext };
  }
  
  switch (context.currentState) {
    case STATES.STATE_0_OPENING: {
      // Check if user provided vehicle info
      const vehicleInfo = parseVehicleInfo(userMessage);
      if (vehicleInfo) {
        // Move to STATE_1 (internal classification) then immediately to STATE_2
        newContext.vehicleInfo = vehicleInfo;
        newContext.currentState = STATES.STATE_2_BENEFIT;
        reply = getStateMessage(STATES.STATE_2_BENEFIT, language, newContext, business, services);
        console.log(`[STATE MACHINE] Vehicle detected: ${JSON.stringify(vehicleInfo)}`);
      } else {
        // Stay in STATE_0, ask for vehicle again gently
        reply = language === "es"
          ? "Para poder orientarte mejor, ¿me podrías indicar qué vehículo es? (marca, modelo, y tipo como sedán, SUV, etc.)"
          : "To guide you better, could you tell me what vehicle this is for? (brand, model, and type like sedan, SUV, etc.)";
      }
      break;
    }
    
    case STATES.STATE_2_BENEFIT: {
      // Check for benefit intent
      const benefit = parseBenefitIntent(userMessage);
      if (benefit) {
        newContext.benefitIntent = benefit;
        
        if (benefit === "unsure") {
          // For unsure, skip usage context and go to gentle prescription
          newContext.currentState = STATES.STATE_4_PRESCRIPTION;
          reply = buildPrescription(newContext, language, business, services);
          newContext.currentState = STATES.STATE_5_ACTION;
          reply += "\n\n" + getStateMessage(STATES.STATE_5_ACTION, language, newContext, business, services);
        } else {
          // Move to STATE_3 for usage context
          newContext.currentState = STATES.STATE_3_USAGE;
          reply = getStateMessage(STATES.STATE_3_USAGE, language, newContext, business, services);
        }
      } else {
        // Try to infer from message or ask again
        reply = language === "es"
          ? "¿Qué resultado te gustaría lograr principalmente?\n\n• Que luzca como nuevo (brillo, corrección)\n• Protección a largo plazo\n• Mejorar el interior\n• No estoy seguro aún"
          : "What result would you mainly like to achieve?\n\n• Make it look like new (shine, correction)\n• Long-term protection\n• Improve the interior\n• I'm not sure yet";
      }
      break;
    }
    
    case STATES.STATE_3_USAGE: {
      // Check for usage context
      const usage = parseUsageContext(userMessage);
      newContext.usageContext = usage || "daily"; // Default to daily if not clear
      
      // Move to STATE_4 - build prescription
      newContext.currentState = STATES.STATE_4_PRESCRIPTION;
      reply = buildPrescription(newContext, language, business, services);
      
      // Immediately append STATE_5 action question
      newContext.currentState = STATES.STATE_5_ACTION;
      newContext.recommendationSummary = reply;
      reply += "\n\n" + getStateMessage(STATES.STATE_5_ACTION, language, newContext, business, services);
      newContext.leadQualified = true;
      break;
    }
    
    case STATES.STATE_4_PRESCRIPTION:
    case STATES.STATE_5_ACTION: {
      // Handle objections or questions
      if (shouldTriggerHandoff(userMessage)) {
        newContext.currentState = STATES.STATE_6_HANDOFF;
        newContext.handoffRequired = true;
        reply = getStateMessage(STATES.STATE_6_HANDOFF, language, newContext, business, services);
      } else if (/\b(price|pricing|cost|cuánto|precio|how much|cotiza)\b/i.test(userMessage)) {
        // Handle pricing question with context
        reply = language === "es"
          ? `El precio depende del estado actual del vehículo y el nivel de servicio que elijas. Para tu ${newContext.vehicleInfo.brand || ""} ${newContext.vehicleInfo.type || "vehículo"}, típicamente está en un rango que varía según la complejidad.\n\n¿Te gustaría coordinar una evaluación para darte un presupuesto exacto?`
          : `The price depends on the current condition of the vehicle and the service level you choose. For your ${newContext.vehicleInfo.brand || ""} ${newContext.vehicleInfo.type || "vehicle"}, it typically falls within a range that varies by complexity.\n\nWould you like to coordinate an assessment for an exact quote?`;
      } else if (/\b(other option|otra opción|alternative|alternativa|something else|algo más)\b/i.test(userMessage)) {
        // Only provide second option if explicitly asked
        reply = language === "es"
          ? `Entiendo. Una alternativa sería un servicio de mantenimiento más básico, que te da buenos resultados a menor inversión. Sin embargo, para tu objetivo de ${newContext.benefitIntent === "shine" ? "brillo máximo" : newContext.benefitIntent === "protection" ? "protección duradera" : "renovación completa"}, la primera opción sería más efectiva.\n\n¿Qué te parece si avanzamos y te orientamos con más detalle?`
          : `I understand. An alternative would be a more basic maintenance service, which gives you good results at a lower investment. However, for your goal of ${newContext.benefitIntent === "shine" ? "maximum shine" : newContext.benefitIntent === "protection" ? "lasting protection" : "complete renewal"}, the first option would be more effective.\n\nHow about we move forward and guide you with more details?`;
      } else {
        // Address the question/objection briefly, then redirect to action
        reply = language === "es"
          ? `Buena pregunta. ${userMessage.length < 20 ? "Con gusto te aclaro cualquier duda." : ""} Lo mejor es que hables directamente con nuestro especialista quien puede resolver todas tus inquietudes.\n\n¿Te conecto con ellos?`
          : `Good question. ${userMessage.length < 20 ? "Happy to clarify any doubts." : ""} The best thing is to speak directly with our specialist who can address all your concerns.\n\nShall I connect you with them?`;
      }
      break;
    }
    
    case STATES.STATE_6_HANDOFF: {
      // Bot stops responding meaningfully - just acknowledge
      reply = language === "es"
        ? "Tu solicitud ya está siendo atendida. Pronto te contactará nuestro equipo. 🙌"
        : "Your request is being handled. Our team will contact you shortly. 🙌";
      break;
    }
    
    default: {
      // Reset to opening if unknown state
      newContext.currentState = STATES.STATE_0_OPENING;
      reply = getStateMessage(STATES.STATE_0_OPENING, language, newContext, business, services);
    }
  }
  
  return { reply, newContext };
}

// ============================================================================
// GROQ API CALL (for fallback/escalation scenarios)
// ============================================================================
async function callGroqAPI(
  messages: ChatMessage[],
  model: string,
  apiKey: string
): Promise<{ content: string; error?: string }> {
  try {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      return { content: "", error: `API error: ${response.status}` };
    }

    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || "" };
  } catch (err) {
    console.error("Groq API call failed:", err);
    return { content: "", error: "Failed to connect to AI service." };
  }
}

// ============================================================================
// STORE CONVERSATION STATE
// ============================================================================
async function storeConversationState(
  supabase: any,
  businessId: string,
  conversationId: string | null,
  userMessage: string,
  aiReply: string,
  context: ConversationContext
): Promise<void> {
  try {
    if (conversationId) {
      // Update existing conversation
      await supabase
        .from("conversations")
        .update({
          current_state: context.currentState,
          vehicle_info: context.vehicleInfo,
          benefit_intent: context.benefitIntent,
          usage_context: context.usageContext,
          recommendation_summary: context.recommendationSummary,
          handoff_required: context.handoffRequired,
          lead_qualified: context.leadQualified,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    }

    // Log to messages table
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
  };

  if (!conversationId) {
    return defaultContext;
  }

  try {
    const { data } = await supabase
      .from("conversations")
      .select("current_state, vehicle_info, benefit_intent, usage_context, recommendation_summary, handoff_required, lead_qualified")
      .eq("id", conversationId)
      .single();

    if (data) {
      return {
        currentState: data.current_state || STATES.STATE_0_OPENING,
        vehicleInfo: data.vehicle_info || {},
        benefitIntent: data.benefit_intent,
        usageContext: data.usage_context,
        recommendationSummary: data.recommendation_summary,
        handoffRequired: data.handoff_required || false,
        leadQualified: data.lead_qualified || false,
      };
    }
  } catch (err) {
    console.error("Failed to load conversation context:", err);
  }

  return defaultContext;
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
      return new Response(
        JSON.stringify({ success: false, error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AIRequest = await req.json();
    const { businessId, conversationId, userMessage, conversationHistory = [] } = body;

    if (!businessId || !userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing businessId or userMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load business context
    const { data: business } = await supabase
      .from("businesses")
      .select("name, language_preference, greeting_message, industry_type, business_description, ai_instructions")
      .eq("id", businessId)
      .single();

    const { data: services } = await supabase
      .from("services")
      .select("name, description, base_price, duration_minutes")
      .eq("business_id", businessId)
      .eq("is_active", true);

    // Detect language
    const language = detectLanguage(userMessage);

    // Load conversation context (state machine state)
    const context = await loadConversationContext(supabase, conversationId || null);
    
    console.log(`[AI-CHAT] Business: ${business?.name}, State: ${context.currentState}, Language: ${language}`);

    // Process through state machine
    const { reply, newContext } = await processStateMachine(
      userMessage,
      context,
      language,
      business,
      services || [],
      supabase,
      conversationId || null
    );

    // Store conversation state
    await storeConversationState(
      supabase,
      businessId,
      conversationId || null,
      userMessage,
      reply,
      newContext
    );

    // Emit events if needed
    if (newContext.leadQualified && !context.leadQualified) {
      console.log(`[EVENT] lead_qualified for business ${businessId}`);
    }
    if (newContext.handoffRequired && !context.handoffRequired) {
      console.log(`[EVENT] handoff_required for business ${businessId}`);
    }

    const response: AIResponse = {
      success: true,
      reply,
      intent: newContext.benefitIntent || null,
      model: "state-machine-v1",
      currentState: newContext.currentState,
      handoffRequired: newContext.handoffRequired,
      leadQualified: newContext.leadQualified,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
