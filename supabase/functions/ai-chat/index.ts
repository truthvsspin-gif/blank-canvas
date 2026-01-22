// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Groq API configuration
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";
const ESCALATION_MODEL = "llama-3.3-70b-versatile";

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
  model?: string;
  temperature?: number;
  escalate?: boolean;
}

interface AIResponse {
  success: boolean;
  reply: string;
  intent: string | null;
  model: string;
  error?: string;
}

// Intent detection patterns
const INTENT_PATTERNS = {
  booking: /\b(book|schedule|appointment|reserv|agendar|cita|reserva|disponib|available|when can)\b/i,
  pricing: /\b(price|cost|how much|cuánto|precio|rate|fee|charge|estimate|quote|cotiza)\b/i,
  services: /\b(service|what do you|ofrec|servicio|detail|wash|clean|polish|ceramic|tint)\b/i,
  hours: /\b(hour|open|close|horario|abierto|cerrado|when are you|schedule|time)\b/i,
  info: /\b(info|tell me|about|location|address|donde|ubicación|dirección)\b/i,
  complaint: /\b(complaint|problem|issue|unhappy|disappointed|queja|problema|mal)\b/i,
};

function detectIntent(text: string): string {
  for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
    if (pattern.test(text)) {
      return intent;
    }
  }
  return "general";
}

function detectLanguage(text: string): "en" | "es" {
  const spanishPatterns = /\b(hola|buenos|gracias|por favor|quiero|necesito|cuánto|cómo|dónde|qué|tiene|pueden|está|servicio|cita|reserva)\b/i;
  return spanishPatterns.test(text) ? "es" : "en";
}

function buildSystemPrompt(business: any, services: any[], language: "en" | "es"): string {
  const businessName = business?.name || "our business";
  const greeting = business?.greeting_message || "";
  const industryType = business?.industry_type || "general";
  const businessDescription = business?.business_description || "";
  const aiInstructions = business?.ai_instructions || "";
  
  const serviceList = services?.length > 0
    ? services.map((s: any) => 
        `- ${s.name}: ${s.description || "No description"} - $${s.base_price || "TBD"} (${s.duration_minutes || "?"} min)`
      ).join("\n")
    : null;

  // Industry-specific context
  const industryContexts: Record<string, { en: string; es: string }> = {
    general: {
      en: "a business",
      es: "un negocio"
    },
    automotive: {
      en: "an automotive/car care business",
      es: "un negocio de cuidado automotriz"
    },
    retail_clothing: {
      en: "a clothing and fashion retail store",
      es: "una tienda de ropa y moda"
    },
    retail_electronics: {
      en: "an electronics and technology store",
      es: "una tienda de electrónica y tecnología"
    },
    restaurant: {
      en: "a restaurant and food service",
      es: "un restaurante y servicio de comida"
    },
    healthcare: {
      en: "a healthcare and medical services provider",
      es: "un proveedor de servicios de salud"
    },
    beauty: {
      en: "a beauty and wellness business",
      es: "un negocio de belleza y bienestar"
    },
    real_estate: {
      en: "a real estate agency",
      es: "una agencia inmobiliaria"
    },
    education: {
      en: "an education and training provider",
      es: "un proveedor de educación y capacitación"
    },
    professional_services: {
      en: "a professional services firm",
      es: "una firma de servicios profesionales"
    }
  };

  const industryContext = industryContexts[industryType] || industryContexts.general;
  const businessType = language === "es" ? industryContext.es : industryContext.en;

  if (language === "es") {
    let prompt = `Eres un asistente de atención al cliente profesional y amigable para ${businessName}, ${businessDescription || businessType}.

Tu objetivo es:
1. Responder preguntas sobre productos, servicios, precios y horarios
2. Calificar leads identificando interés en compras o reservas
3. Hacer preguntas de seguimiento cuando sea necesario
4. Mantener respuestas cortas (1-3 oraciones), profesionales y orientadas al negocio

${greeting ? `Saludo personalizado: ${greeting}` : ""}
${businessDescription ? `\nDescripción del negocio: ${businessDescription}` : ""}`;

    if (serviceList) {
      prompt += `\n\nServicios/Productos disponibles:\n${serviceList}`;
    }

    prompt += `\n\nReglas:
- Sé conciso y directo
- Si el cliente muestra interés en comprar/reservar, pregunta por detalles relevantes
- Si no conoces información específica, ofrece contactar al negocio directamente
- Nunca inventes precios o productos que no estén listados`;

    if (aiInstructions) {
      prompt += `\n\nInstrucciones adicionales:\n${aiInstructions}`;
    }

    return prompt;
  }

  let prompt = `You are a professional and friendly customer service assistant for ${businessName}, ${businessDescription || businessType}.

Your goals:
1. Answer questions about products, services, pricing, and hours
2. Qualify leads by identifying purchase or booking interest
3. Ask follow-up questions when needed
4. Keep responses short (1-3 sentences), professional, and business-oriented

${greeting ? `Custom greeting: ${greeting}` : ""}
${businessDescription ? `\nBusiness description: ${businessDescription}` : ""}`;

  if (serviceList) {
    prompt += `\n\nAvailable services/products:\n${serviceList}`;
  }

  prompt += `\n\nRules:
- Be concise and direct
- If customer shows interest in purchasing/booking, ask for relevant details
- If you don't know specific information, offer to have the business contact them directly
- Never make up prices or products not listed`;

  if (aiInstructions) {
    prompt += `\n\nAdditional instructions:\n${aiInstructions}`;
  }

  return prompt;
}

async function callGroqAPI(
  messages: ChatMessage[],
  model: string,
  temperature: number,
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
        temperature,
        max_tokens: 300,
        top_p: 1,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      
      if (response.status === 429) {
        return { content: "", error: "Rate limit exceeded. Please try again later." };
      }
      if (response.status === 401) {
        return { content: "", error: "Invalid API key." };
      }
      return { content: "", error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return { content };
  } catch (err) {
    console.error("Groq API call failed:", err);
    return { content: "", error: "Failed to connect to AI service." };
  }
}

async function storeConversation(
  supabase: any,
  businessId: string,
  conversationId: string | null,
  customerId: string | null,
  userMessage: string,
  aiReply: string,
  intent: string
): Promise<void> {
  try {
    // Store user message
    if (conversationId) {
      await supabase.from("inbox_messages").insert({
        thread_id: conversationId,
        sender_type: "customer",
        message_text: userMessage,
        sent_at: new Date().toISOString(),
      });

      // Store AI reply
      await supabase.from("inbox_messages").insert({
        thread_id: conversationId,
        sender_type: "bot",
        message_text: aiReply,
        sent_at: new Date().toISOString(),
      });
    }

    // Also log to messages table for analytics
    await supabase.from("messages").insert([
      {
        business_id: businessId,
        direction: "inbound",
        content: userMessage,
        channel: "ai-chat",
        metadata: { intent, customer_id: customerId },
      },
      {
        business_id: businessId,
        direction: "outbound",
        content: aiReply,
        channel: "ai-chat",
        metadata: { intent, customer_id: customerId, ai_generated: true },
      },
    ]);
  } catch (err) {
    console.error("Failed to store conversation:", err);
  }
}

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
    const {
      businessId,
      conversationId,
      customerId,
      userMessage,
      conversationHistory = [],
      model,
      temperature = 0.7,
      escalate = false,
    } = body;

    if (!businessId || !userMessage) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing businessId or userMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load business context with new industry fields
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

    // Load knowledge base for context - get all chunks for this business
    const { data: knowledgeChunks } = await supabase
      .from("knowledge_chunks")
      .select("content")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(10);
    
    const hasKnowledge = knowledgeChunks && knowledgeChunks.length > 0;
    console.log(`Loaded ${knowledgeChunks?.length || 0} knowledge chunks for business ${businessId}`);

    // Detect language and intent
    const language = detectLanguage(userMessage);
    const intent = detectIntent(userMessage);

    // If no knowledge content, return a message prompting to add content
    if (!hasKnowledge && (!services || services.length === 0)) {
      const noContentMessage = language === "es"
        ? "⚠️ Aún no hay contenido configurado para este chatbot. Por favor, ve a la página de configuración del Chatbot y añade contenido a la base de conocimientos para que pueda responder preguntas sobre tu negocio."
        : "⚠️ No content has been configured for this chatbot yet. Please go to the Chatbot settings page and add content to the knowledge base so I can answer questions about your business.";
      
      const response: AIResponse = {
        success: true,
        reply: noContentMessage,
        intent: "no_content",
        model: "none",
      };

      return new Response(
        JSON.stringify(response),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Combine all knowledge chunks (up to ~6000 chars to include more context)
    const knowledgeContext = (knowledgeChunks || []).map((k: any) => k.content).join("\n\n");
    const truncatedKnowledge = knowledgeContext.slice(0, 6000);

    // Build messages for Groq - focused on being the business's chatbot
    let systemPrompt = buildSystemPrompt(business, services || [], language);
    
    // Add knowledge base context - this is CRITICAL for responding as the company
    if (truncatedKnowledge) {
      systemPrompt += `\n\n--- KNOWLEDGE BASE (IMPORTANT: Use this as your PRIMARY source for answering questions) ---\n${truncatedKnowledge}`;
      systemPrompt += language === "es" 
        ? `\n\nIMPORTANTE: Responde SOLO con información de la base de conocimientos y servicios listados arriba. NO inventes información. Si no encuentras la respuesta, indica amablemente que puedes ayudar con lo que está disponible.`
        : `\n\nIMPORTANT: Respond ONLY with information from the knowledge base and services listed above. Do NOT make up information. If you can't find the answer, kindly indicate what you CAN help with.`;
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    // Select model (escalate for complex queries)
    const selectedModel = escalate ? ESCALATION_MODEL : (model || DEFAULT_MODEL);

    // Call Groq API
    const { content: reply, error } = await callGroqAPI(
      messages,
      selectedModel,
      temperature,
      GROQ_API_KEY
    );

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store conversation
    await storeConversation(
      supabase,
      businessId,
      conversationId || null,
      customerId || null,
      userMessage,
      reply,
      intent
    );

    const response: AIResponse = {
      success: true,
      reply,
      intent,
      model: selectedModel,
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
