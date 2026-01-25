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
  STATE_5_ACTION: "STATE_5_ACTION",
  STATE_6_HANDOFF: "STATE_6_HANDOFF",
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
  
  if (/\b(shine|shiny|brillo|brillar|new|nuevo|look|lucir|polish|pulir|scratch|rayón|swirl|detalle|detail)\b/i.test(lowerText)) {
    return "shine";
  }
  
  if (/\b(protect|proteger|protección|ceramic|cerámico|wax|cera|coating|maintain|mantener|durabilidad|durable|long|largo plazo)\b/i.test(lowerText)) {
    return "protection";
  }
  
  if (/\b(interior|inside|adentro|seats|asientos|leather|piel|cuero|smell|olor|clean inside|limpiar adentro|upholstery|tapicería)\b/i.test(lowerText)) {
    return "interior";
  }
  
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
function isLowIntent(text: string): boolean {
  const lowIntentPatterns = [
    /\b(just looking|solo viendo|browsing|curious|curioso|maybe later|después|not now|ahora no|no thanks|no gracias|never mind|olvídalo)\b/i,
  ];
  
  return lowIntentPatterns.some(p => p.test(text));
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
// BUILD SYSTEM PROMPT FOR STATE
// ============================================================================
function buildSystemPrompt(
  state: State,
  context: ConversationContext,
  language: "en" | "es",
  business: any,
  services: any[]
): string {
  const businessName = business?.name || "the business";
  const businessDesc = business?.business_description || "automotive detailing";
  
  const serviceList = services?.length > 0
    ? services.map(s => `${s.name}${s.base_price ? ` ($${s.base_price})` : ""}`).join(", ")
    : "various detailing services";

  // Build context blocks
  const confirmedFacts = buildConfirmedFactsBlock(context, language);
  const negativeConstraints = buildNegativeConstraints(context, language);

  const vehicleRef = context.vehicleInfo?.brand
    ? `${context.vehicleInfo.brand} ${context.vehicleInfo.model || ""} ${context.vehicleInfo.type || ""}`.trim()
    : null;

  const coreRules = language === "es"
    ? `REGLAS PRINCIPALES (NUNCA ROMPER):
- UNA sola pregunta a la vez
- Respuestas CORTAS (1-3 oraciones máximo)
- NUNCA dar información de paquetes o precios adelantados
- NUNCA pedir fotos o depósitos
- NUNCA presionar al cliente
- Sé cálido, profesional y humano
- Enfócate en beneficios, no en procesos técnicos
- Responde en Español`
    : `CORE RULES (NEVER BREAK):
- ONE question at a time only
- SHORT responses (1-3 sentences max)
- NEVER dump information or list packages upfront
- NEVER ask for photos or deposits
- NEVER pressure the customer
- Be warm, professional, and human
- Focus on benefits, not technical processes
- Reply in English`;

  const businessContext = `You are a consultative sales assistant for ${businessName}.
${businessDesc ? `Business: ${businessDesc}` : ""}
Available services: ${serviceList}`;

  // State-specific goals
  let stateGoal = "";
  switch (state) {
    case STATES.STATE_0_OPENING:
      stateGoal = language === "es"
        ? `OBJETIVO ACTUAL: Obtener información del vehículo.
Pregunta amablemente qué vehículo tienen (marca, modelo, tipo como sedán/SUV/pickup).
Sé amigable y acogedor.`
        : `CURRENT GOAL: Get vehicle information.
Ask what vehicle this is for (brand, model, type like sedan/SUV/pickup).
Be friendly and welcoming.`;
      break;
      
    case STATES.STATE_2_BENEFIT:
      stateGoal = language === "es"
        ? `OBJETIVO ACTUAL: Entender qué beneficio/problema quieren resolver.
${vehicleRef ? `Menciona su ${vehicleRef} para mostrar que escuchaste.` : ""}
Pregunta qué buscan lograr: brillo como nuevo, protección, o interior.`
        : `CURRENT GOAL: Understand what benefit/problem they want to solve.
${vehicleRef ? `Reference their ${vehicleRef} to show you listened.` : ""}
Ask what they're mainly looking to achieve: new-look shine, protection, or interior.`;
      break;
      
    case STATES.STATE_3_USAGE:
      stateGoal = language === "es"
        ? `OBJETIVO ACTUAL: Entender patrón de uso (una pregunta rápida).
${vehicleRef ? `Referencia su ${vehicleRef}.` : ""}
Pregunta si es de uso diario o más ocasional.`
        : `CURRENT GOAL: Understand usage pattern (just one quick question).
${vehicleRef ? `Reference their ${vehicleRef}.` : ""}
Ask if this is a daily-use vehicle or more occasional.`;
      break;
      
    case STATES.STATE_4_PRESCRIPTION:
      stateGoal = language === "es"
        ? `OBJETIVO ACTUAL: Hacer UNA recomendación clara.
1. Breve resumen mostrando que entiendes su situación
2. Enmarca el valor/beneficio (no proceso técnico)
3. Haz UNA recomendación conceptual
4. Sugiere revisar disponibilidad como siguiente paso`
        : `CURRENT GOAL: Make ONE clear recommendation.
1. Brief summary showing you understand their situation
2. Frame the value/benefit (not technical process)
3. Make ONE conceptual recommendation
4. Suggest checking availability as next step`;
      break;
      
    case STATES.STATE_5_ACTION:
      stateGoal = language === "es"
        ? `OBJETIVO ACTUAL: Cierre suave - mover hacia acción.
Pregunta si les gustaría avanzar y revisar disponibilidad.
Si tienen objeciones, aborda UNA objeción, luego redirige a acción.`
        : `CURRENT GOAL: Soft close - move toward action.
Ask if they'd like to move forward and check availability.
If they have objections, address ONE objection only, then redirect to action.`;
      break;
      
    case STATES.STATE_6_HANDOFF:
      stateGoal = language === "es"
        ? `OBJETIVO ACTUAL: Confirmar traspaso a humano.
Hazles saber que los conectarás con el equipo para coordinar.
Sé entusiasta pero breve. Usa máximo un emoji.`
        : `CURRENT GOAL: Confirm handoff to human.
Let them know you'll connect them with the team to coordinate.
Be enthusiastic but brief. Use one emoji max.`;
      break;
      
    default:
      stateGoal = "";
  }

  // Assemble final prompt with context lock at the TOP
  return `${confirmedFacts}

${negativeConstraints}

${businessContext}

${coreRules}

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
  
  // Check for low intent exit
  if (isLowIntent(userMessage)) {
    const exitPrompt = buildSystemPrompt(context.currentState, context, language, business, services);
    const messages: ChatMessage[] = [
      { role: "system", content: `${exitPrompt}\n\nThe customer seems to have low intent. Politely exit the conversation. Be gracious and leave the door open for future contact.` },
      { role: "user", content: userMessage }
    ];
    
    const { content, error, latencyMs } = await callGroqAPI(messages, apiKey);
    lastLatencyMs = latencyMs;
    if (error || !content) {
      usedFallback = true;
      const fallback = language === "es"
        ? "No hay problema. Si necesitas ayuda más adelante, con gusto te atiendo. ¡Que tengas buen día! 👋"
        : "No problem at all. If you need help later, feel free to reach out. Have a great day! 👋";
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
  
  // Check for handoff triggers (after STATE_2)
  if (context.currentState !== STATES.STATE_0_OPENING && 
      context.currentState !== STATES.STATE_1_VEHICLE &&
      context.currentState !== STATES.STATE_2_BENEFIT &&
      shouldTriggerHandoff(userMessage)) {
    newContext.currentState = STATES.STATE_6_HANDOFF;
    newContext.handoffRequired = true;
    newContext.leadQualified = true;
    
    const systemPrompt = buildSystemPrompt(STATES.STATE_6_HANDOFF, newContext, language, business, services);
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
        ? "¡Perfecto! 🎉 Te conecto con la persona encargada para coordinar disponibilidad y confirmar los detalles."
        : "Perfect! 🎉 I'll connect you with the person in charge to coordinate availability and confirm the details.";
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
      if (benefit) {
        newContext.benefitIntent = benefit;
        if (benefit === "unsure") {
          newContext.currentState = STATES.STATE_4_PRESCRIPTION;
        } else {
          newContext.currentState = STATES.STATE_3_USAGE;
        }
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
      newContext.leadQualified = true;
      newContext.currentState = STATES.STATE_5_ACTION;
      break;
    }
    
    case STATES.STATE_5_ACTION: {
      if (shouldTriggerHandoff(userMessage)) {
        newContext.currentState = STATES.STATE_6_HANDOFF;
        newContext.handoffRequired = true;
      }
      break;
    }
    
    case STATES.STATE_6_HANDOFF: {
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
        en: "Based on what you've shared, I'd recommend a service focused on your priority. Want to check availability?",
        es: "Basándome en lo que me compartiste, recomendaría un servicio enfocado en tu prioridad. ¿Revisamos disponibilidad?"
      },
      STATE_5_ACTION: {
        en: "Would you like to move forward and check availability?",
        es: "¿Te gustaría avanzar y revisar disponibilidad?"
      },
      STATE_6_HANDOFF: {
        en: "Perfect! I'll connect you with our team to finalize the details. 🎉",
        es: "¡Perfecto! Te conecto con nuestro equipo para finalizar los detalles. 🎉"
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
      const updateData: Record<string, any> = {
        current_state: context.currentState,
        vehicle_info: context.vehicleInfo,
        benefit_intent: context.benefitIntent,
        usage_context: context.usageContext,
        recommendation_summary: context.recommendationSummary,
        handoff_required: context.handoffRequired,
        lead_qualified: context.leadQualified,
        updated_at: new Date().toISOString(),
      };

      // Add performance metrics if provided
      if (performance) {
        updateData.response_time_ms = performance.responseTimeMs;
        updateData.is_fallback = performance.isFallback;
        updateData.ai_model = performance.aiModel;
      }

      await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", conversationId);
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
    
    console.log(`[AI-CHAT] Business: ${business?.name}, State: ${context.currentState}, Language: ${language}, Model: ${DEFAULT_MODEL}`);

    // Process through state machine WITH Groq
    const { reply, newContext, performance } = await processStateMachine(
      userMessage,
      context,
      language,
      business,
      services || [],
      conversationHistory,
      GROQ_API_KEY
    );

    console.log(`[AI-CHAT] Response generated in ${performance.responseTimeMs}ms, fallback: ${performance.isFallback}`);

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
      model: DEFAULT_MODEL,
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
    console.error("[AI-CHAT] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
