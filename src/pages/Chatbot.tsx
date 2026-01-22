import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  Globe,
  Image,
  Instagram,
  Link2,
  Loader2,
  MessageCircle,
  MessageSquare,
  Phone,
  Play,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  TestTube,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { FlyerManager } from "@/components/chatbot/FlyerManager";

// Industry presets for auto-fill
const INDUSTRY_PRESETS: Record<string, { description: { en: string; es: string }; instructions: { en: string; es: string } }> = {
  general: {
    description: { en: "", es: "" },
    instructions: { en: "", es: "" },
  },
  automotive: {
    description: { 
      en: "We provide professional car care services including detailing, washing, and maintenance.",
      es: "Ofrecemos servicios profesionales de cuidado automotriz incluyendo detallado, lavado y mantenimiento."
    },
    instructions: {
      en: "Ask about vehicle type and preferred appointment times. Recommend appropriate services based on vehicle condition.",
      es: "Pregunta sobre el tipo de vehículo y horarios preferidos. Recomienda servicios apropiados según la condición del vehículo."
    }
  },
  retail_clothing: {
    description: {
      en: "We sell trendy clothing, accessories, and fashion items for all occasions.",
      es: "Vendemos ropa de moda, accesorios y artículos de moda para todas las ocasiones."
    },
    instructions: {
      en: "Help customers find sizes, styles, and shipping info. Ask about their style preferences and occasions.",
      es: "Ayuda a los clientes a encontrar tallas, estilos e información de envío. Pregunta sobre sus preferencias de estilo y ocasiones."
    }
  },
  retail_electronics: {
    description: {
      en: "We sell phones, tablets, computers, and electronic accessories.",
      es: "Vendemos teléfonos, tablets, computadoras y accesorios electrónicos."
    },
    instructions: {
      en: "Help with product specs, compatibility, and warranty info. Ask about use case and budget.",
      es: "Ayuda con especificaciones, compatibilidad e información de garantía. Pregunta sobre el uso y presupuesto."
    }
  },
  restaurant: {
    description: {
      en: "We serve delicious food with a variety of menu options for dine-in and delivery.",
      es: "Servimos comida deliciosa con variedad de opciones para comer aquí o llevar."
    },
    instructions: {
      en: "Help with menu info, hours, reservations, and dietary needs. Be warm and welcoming.",
      es: "Ayuda con información del menú, horarios, reservaciones y necesidades dietéticas. Sé cálido y acogedor."
    }
  },
  healthcare: {
    description: {
      en: "We provide healthcare services focused on patient wellness and care.",
      es: "Proporcionamos servicios de salud enfocados en el bienestar del paciente."
    },
    instructions: {
      en: "Be empathetic and professional. Help with appointment scheduling and general inquiries. Never provide medical advice.",
      es: "Sé empático y profesional. Ayuda con citas y consultas generales. Nunca des consejos médicos."
    }
  },
  beauty: {
    description: {
      en: "We offer beauty and wellness services including hair, nails, skincare, and spa treatments.",
      es: "Ofrecemos servicios de belleza y bienestar incluyendo cabello, uñas, cuidado de piel y tratamientos de spa."
    },
    instructions: {
      en: "Help with appointment booking and service recommendations. Ask about preferences and desired outcomes.",
      es: "Ayuda con reservaciones y recomendaciones de servicios. Pregunta sobre preferencias y resultados deseados."
    }
  },
  real_estate: {
    description: {
      en: "We help clients buy, sell, and rent properties in the area.",
      es: "Ayudamos a clientes a comprar, vender y rentar propiedades en la zona."
    },
    instructions: {
      en: "Qualify leads by asking about budget, location preferences, and timeline. Offer to schedule viewings.",
      es: "Califica leads preguntando sobre presupuesto, preferencias de ubicación y plazos. Ofrece agendar visitas."
    }
  },
  education: {
    description: {
      en: "We provide educational programs and training courses.",
      es: "Proporcionamos programas educativos y cursos de capacitación."
    },
    instructions: {
      en: "Help with course information, enrollment, and scheduling. Ask about learning goals and experience level.",
      es: "Ayuda con información de cursos, inscripción y horarios. Pregunta sobre objetivos de aprendizaje y nivel de experiencia."
    }
  },
  professional_services: {
    description: {
      en: "We provide professional consulting and business services.",
      es: "Proporcionamos servicios profesionales de consultoría y negocios."
    },
    instructions: {
      en: "Qualify leads by understanding their needs. Schedule consultations and explain service offerings.",
      es: "Califica leads entendiendo sus necesidades. Agenda consultas y explica los servicios ofrecidos."
    }
  }
};

type IndustryType = keyof typeof INDUSTRY_PRESETS;

interface KnowledgeSource {
  id: string;
  title: string | null;
  source_type: string;
  created_at: string;
}

export default function ChatbotPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();

  // Settings state
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotLanguage, setChatbotLanguage] = useState<"en" | "es">("en");
  const [greetingMessage, setGreetingMessage] = useState("");
  
  // New industry settings
  const [industryType, setIndustryType] = useState<IndustryType>("general");
  const [businessDescription, setBusinessDescription] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  
  // Integration state
  const [integrationState, setIntegrationState] = useState({
    whatsappAccessToken: "",
    whatsappPhoneNumberId: "",
    instagramAccessToken: "",
    instagramBusinessId: "",
  });
  
  // Knowledge base state
  const [kbSourceType, setKbSourceType] = useState<"url" | "text" | "document">("url");
  const [kbUrl, setKbUrl] = useState("");
  const [kbText, setKbText] = useState("");
  const [kbTitle, setKbTitle] = useState("");
  const [kbFile, setKbFile] = useState<File | null>(null);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbMessage, setKbMessage] = useState<string | null>(null);
  const [kbError, setKbError] = useState<string | null>(null);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [kbSourcesLoading, setKbSourcesLoading] = useState(false);
  
  // Save state
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);

  const copy = isEs
    ? {
        title: "Centro de Chatbot",
        desc: "Configura y optimiza tu asistente de IA",
        quickStart: "Inicio Rápido",
        quickStartDesc: "Sigue estos pasos para configurar tu chatbot",
        steps: [
          { title: "Selecciona tu industria", desc: "Define el tipo de negocio" },
          { title: "Configura el idioma", desc: "Elige español o inglés" },
          { title: "Añade conocimiento", desc: "URL, texto o documentos" },
          { title: "Prueba el flujo", desc: "Usa el simulador" },
        ],
        testSimulator: "Probar Simulador",
        settings: "Configuración",
        settingsDesc: "Ajustes principales del chatbot",
        enabled: "Chatbot Activo",
        enabledDesc: "Respuestas automáticas activadas",
        language: "Idioma Principal",
        greeting: "Mensaje de Saludo",
        greetingPlaceholder: "¡Hola! Gracias por contactarnos.",
        industry: "Tipo de Industria",
        industryDesc: "Selecciona tu tipo de negocio para respuestas optimizadas",
        businessDesc: "Descripción del Negocio",
        businessDescPlaceholder: "Describe brevemente qué hace tu negocio...",
        aiInstructions: "Instrucciones Personalizadas del AI",
        aiInstructionsPlaceholder: "Instrucciones adicionales para el chatbot...",
        applyPreset: "Aplicar Plantilla",
        integrations: "Integraciones",
        integrationsDesc: "Conecta WhatsApp e Instagram",
        whatsappToken: "WhatsApp Access Token",
        whatsappPhone: "WhatsApp Phone ID",
        instagramToken: "Instagram Access Token",
        instagramBusiness: "Instagram Business ID",
        metaLink: "Obtener credenciales de Meta",
        knowledge: "Base de Conocimiento",
        knowledgeDesc: "Añade información para que el chatbot responda mejor",
        existingSources: "Fuentes Existentes",
        noSources: "No hay fuentes de conocimiento",
        sourceType: "Tipo de Fuente",
        sourceUrl: "Sitio Web",
        sourceText: "Texto Largo",
        sourceDocument: "Documento",
        urlLabel: "URL del Sitio",
        urlPlaceholder: "https://tusitio.com",
        textLabel: "Descripción",
        textPlaceholder: "Información sobre tu negocio, servicios, precios...",
        titleLabel: "Título",
        ingestAdd: "Agregar Contenido",
        ingestReplace: "Reemplazar Todo",
        ingestClear: "Eliminar Todo",
        ingesting: "Procesando...",
        ingested: (n: number) => `${n} fragmentos procesados`,
        cleared: (s: number, c: number) => `Eliminado: ${s} fuentes, ${c} fragmentos`,
        webhooks: "Webhooks",
        webhooksDesc: "Endpoints para Meta",
        save: "Guardar Cambios",
        saving: "Guardando...",
        saved: "Guardado correctamente",
        noBusiness: "No hay negocio activo",
        ingestFail: "Error al procesar contenido",
        selectDoc: "Selecciona un documento",
        industries: {
          general: "General",
          automotive: "Automotriz / Detallado",
          retail_clothing: "Tienda de Ropa",
          retail_electronics: "Tienda de Electrónica",
          restaurant: "Restaurante",
          healthcare: "Salud / Médico",
          beauty: "Belleza / Spa",
          real_estate: "Inmobiliaria",
          education: "Educación",
          professional_services: "Servicios Profesionales",
        }
      }
    : {
        title: "Chatbot Center",
        desc: "Configure and optimize your AI assistant",
        quickStart: "Quick Start",
        quickStartDesc: "Follow these steps to set up your chatbot",
        steps: [
          { title: "Select your industry", desc: "Define your business type" },
          { title: "Set language", desc: "Choose English or Spanish" },
          { title: "Add knowledge", desc: "URL, text, or documents" },
          { title: "Test the flow", desc: "Use the simulator" },
        ],
        testSimulator: "Test Simulator",
        settings: "Settings",
        settingsDesc: "Main chatbot configuration",
        enabled: "Chatbot Active",
        enabledDesc: "Automatic replies enabled",
        language: "Primary Language",
        greeting: "Greeting Message",
        greetingPlaceholder: "Hi! Thanks for reaching out.",
        industry: "Industry Type",
        industryDesc: "Select your business type for optimized responses",
        businessDesc: "Business Description",
        businessDescPlaceholder: "Briefly describe what your business does...",
        aiInstructions: "Custom AI Instructions",
        aiInstructionsPlaceholder: "Additional instructions for the chatbot...",
        applyPreset: "Apply Template",
        integrations: "Integrations",
        integrationsDesc: "Connect WhatsApp and Instagram",
        whatsappToken: "WhatsApp Access Token",
        whatsappPhone: "WhatsApp Phone ID",
        instagramToken: "Instagram Access Token",
        instagramBusiness: "Instagram Business ID",
        metaLink: "Get Meta credentials",
        knowledge: "Knowledge Base",
        knowledgeDesc: "Add information so the chatbot can answer better",
        existingSources: "Existing Sources",
        noSources: "No knowledge sources yet",
        sourceType: "Source Type",
        sourceUrl: "Website",
        sourceText: "Long Text",
        sourceDocument: "Document",
        urlLabel: "Website URL",
        urlPlaceholder: "https://yoursite.com",
        textLabel: "Description",
        textPlaceholder: "Information about your business, services, pricing...",
        titleLabel: "Title",
        ingestAdd: "Add Content",
        ingestReplace: "Replace All",
        ingestClear: "Delete All",
        ingesting: "Processing...",
        ingested: (n: number) => `${n} chunks processed`,
        cleared: (s: number, c: number) => `Deleted: ${s} sources, ${c} chunks`,
        webhooks: "Webhooks",
        webhooksDesc: "Endpoints for Meta",
        save: "Save Changes",
        saving: "Saving...",
        saved: "Saved successfully",
        noBusiness: "No active business",
        ingestFail: "Failed to process content",
        selectDoc: "Please select a document",
        industries: {
          general: "General",
          automotive: "Automotive / Detailing",
          retail_clothing: "Clothing Store",
          retail_electronics: "Electronics Store",
          restaurant: "Restaurant",
          healthcare: "Healthcare / Medical",
          beauty: "Beauty / Spa",
          real_estate: "Real Estate",
          education: "Education",
          professional_services: "Professional Services",
        }
      };

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!businessId) return;
      setIntegrationsLoading(true);
      
      const { data: business } = await supabase
        .from("businesses")
        .select("chatbot_enabled, language_preference, greeting_message, industry_type, business_description, ai_instructions")
        .eq("id", businessId)
        .single();
        
      if (business) {
        setChatbotEnabled(business.chatbot_enabled ?? true);
        setChatbotLanguage(
          business.language_preference === "es" || business.language_preference === "en"
            ? business.language_preference
            : "en"
        );
        setGreetingMessage(business.greeting_message ?? "");
        setIndustryType((business.industry_type as IndustryType) || "general");
        setBusinessDescription(business.business_description ?? "");
        setAiInstructions(business.ai_instructions ?? "");
      }

      const { data: integrations } = await supabase
        .from("business_integrations")
        .select("whatsapp_access_token, whatsapp_phone_number_id, instagram_access_token, instagram_business_id")
        .eq("business_id", businessId)
        .maybeSingle();
        
      if (integrations) {
        setIntegrationState({
          whatsappAccessToken: integrations.whatsapp_access_token ?? "",
          whatsappPhoneNumberId: integrations.whatsapp_phone_number_id ?? "",
          instagramAccessToken: integrations.instagram_access_token ?? "",
          instagramBusinessId: integrations.instagram_business_id ?? "",
        });
      }
      setIntegrationsLoading(false);
    };
    loadSettings();
  }, [businessId]);

  // Load knowledge sources
  useEffect(() => {
    const loadKnowledgeSources = async () => {
      if (!businessId) return;
      setKbSourcesLoading(true);
      
      const { data } = await supabase
        .from("knowledge_sources")
        .select("id, title, source_type, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
        
      setKnowledgeSources(data || []);
      setKbSourcesLoading(false);
    };
    loadKnowledgeSources();
  }, [businessId, kbMessage]);

  const handleApplyPreset = () => {
    const preset = INDUSTRY_PRESETS[industryType];
    if (preset) {
      const langKey = isEs ? "es" : "en";
      if (preset.description[langKey]) {
        setBusinessDescription(preset.description[langKey]);
      }
      if (preset.instructions[langKey]) {
        setAiInstructions(preset.instructions[langKey]);
      }
    }
  };

  const handleSave = async () => {
    if (!businessId) {
      setSaveError(copy.noBusiness);
      return;
    }
    setSaveLoading(true);
    setSaveMessage(null);
    setSaveError(null);

    const { error: businessError } = await supabase
      .from("businesses")
      .update({
        chatbot_enabled: chatbotEnabled,
        language_preference: chatbotLanguage,
        greeting_message: greetingMessage.trim() || null,
        industry_type: industryType,
        business_description: businessDescription.trim() || null,
        ai_instructions: aiInstructions.trim() || null,
      })
      .eq("id", businessId);

    if (businessError) {
      setSaveError(businessError.message);
      setSaveLoading(false);
      return;
    }

    const { data: existingIntegration } = await supabase
      .from("business_integrations")
      .select("id")
      .eq("business_id", businessId)
      .maybeSingle();

    const integrationPayload = {
      business_id: businessId,
      whatsapp_access_token: integrationState.whatsappAccessToken.trim() || null,
      whatsapp_phone_number_id: integrationState.whatsappPhoneNumberId.trim() || null,
      instagram_access_token: integrationState.instagramAccessToken.trim() || null,
      instagram_business_id: integrationState.instagramBusinessId.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error: integrationError } = existingIntegration?.id
      ? await supabase.from("business_integrations").update(integrationPayload).eq("id", existingIntegration.id)
      : await supabase.from("business_integrations").insert(integrationPayload);

    if (integrationError) {
      setSaveError(integrationError.message);
      setSaveLoading(false);
      return;
    }

    setSaveMessage(copy.saved);
    setSaveLoading(false);
  };

  const handleClearKnowledge = async () => {
    if (!businessId) {
      setKbError(copy.noBusiness);
      return;
    }
    setKbLoading(true);
    setKbError(null);
    setKbMessage(null);
    
    const response = await fetch(
      "https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/knowledge-clear",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      }
    );
    const result = await response.json().catch(() => null);
    
    if (!response.ok) {
      setKbError(result?.error || copy.ingestFail);
      setKbLoading(false);
      return;
    }
    setKbMessage(copy.cleared(result?.deletedSources ?? 0, result?.deletedChunks ?? 0));
    setKbLoading(false);
  };

  const handleIngest = async (mode: "add" | "replace" = "add") => {
    if (!businessId) {
      setKbError(copy.noBusiness);
      return;
    }
    setKbLoading(true);
    setKbError(null);
    setKbMessage(null);
    
    if (mode === "replace") {
      const clearResponse = await fetch(
        "https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/knowledge-clear",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId }),
        }
      );
      if (!clearResponse.ok) {
        const clearResult = await clearResponse.json().catch(() => null);
        setKbError(clearResult?.error || copy.ingestFail);
        setKbLoading(false);
        return;
      }
    }
    
    if (kbSourceType === "document") {
      if (!kbFile) {
        setKbError(copy.selectDoc);
        setKbLoading(false);
        return;
      }
      const formData = new FormData();
      formData.append("businessId", businessId);
      if (kbTitle.trim()) formData.append("title", kbTitle.trim());
      formData.append("file", kbFile);
      
      const response = await fetch("https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/knowledge-ingest-file", { method: "POST", body: formData });
      const result = await response.json().catch(() => null);
      
      if (!response.ok) {
        setKbError(result?.error || copy.ingestFail);
        setKbLoading(false);
        return;
      }
      setKbMessage(copy.ingested(result?.chunkCount ?? 0));
      setKbLoading(false);
      return;
    }

    const payload = kbSourceType === "url"
      ? { businessId, sourceType: "url", sourceUrl: kbUrl.trim(), title: kbTitle.trim() || undefined }
      : { businessId, sourceType: kbSourceType, content: kbText.trim(), title: kbTitle.trim() || undefined };
      
    const response = await fetch(
      "https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/knowledge-ingest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const result = await response.json().catch(() => null);
    
    if (!response.ok) {
      setKbError(result?.error || copy.ingestFail);
      setKbLoading(false);
      return;
    }
    setKbMessage(copy.ingested(result?.chunkCount ?? 0));
    setKbLoading(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setKbFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setKbText(text);
    };
    if (file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md")) {
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={copy.title}
        description={copy.desc}
        actions={
          <Button asChild className="bg-accent text-white hover:bg-accent/90">
            <Link to="/dev-chatbot">
              <Play className="mr-2 h-4 w-4" />
              {copy.testSimulator}
            </Link>
          </Button>
        }
      />

      {/* Quick Start Guide */}
      <Card className="overflow-hidden border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle>{copy.quickStart}</CardTitle>
              <CardDescription>{copy.quickStartDesc}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.steps.map((step, idx) => (
              <div
                key={idx}
                className="group relative flex items-start gap-3 rounded-xl border bg-card p-4 transition-all hover:border-accent hover:shadow-md"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white font-bold text-sm">
                  {idx + 1}
                </div>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
                {idx < 3 && (
                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity lg:block hidden" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>{copy.settings}</CardTitle>
                <CardDescription>{copy.settingsDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Toggle Card */}
            <div
              className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all ${
                chatbotEnabled ? "border-accent bg-accent/5" : "border-border"
              }`}
              onClick={() => setChatbotEnabled(!chatbotEnabled)}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${chatbotEnabled ? "bg-accent/20" : "bg-muted"}`}>
                  <Bot className={`h-5 w-5 ${chatbotEnabled ? "text-accent" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-semibold">{copy.enabled}</p>
                  <p className="text-xs text-muted-foreground">{copy.enabledDesc}</p>
                </div>
              </div>
              {chatbotEnabled ? (
                <ToggleRight className="h-8 w-8 text-accent" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            {/* Industry Type Selection */}
            <div className="space-y-3 rounded-xl border bg-gradient-to-br from-purple-50/50 to-transparent p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-700">{copy.industry}</span>
              </div>
              <p className="text-xs text-muted-foreground">{copy.industryDesc}</p>
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  value={industryType}
                  onChange={(e) => setIndustryType(e.target.value as IndustryType)}
                >
                  {Object.keys(INDUSTRY_PRESETS).map((key) => (
                    <option key={key} value={key}>
                      {copy.industries[key as keyof typeof copy.industries]}
                    </option>
                  ))}
                </select>
                <Button 
                  variant="outline" 
                  onClick={handleApplyPreset}
                  className="shrink-0"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {copy.applyPreset}
                </Button>
              </div>
            </div>

            {/* Business Description */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {copy.businessDesc}
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder={copy.businessDescPlaceholder}
              />
            </div>

            {/* AI Instructions */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {copy.aiInstructions}
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                placeholder={copy.aiInstructionsPlaceholder}
              />
            </div>

            {/* Language & Greeting */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {copy.language}
                </label>
                <select
                  className="w-full rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  value={chatbotLanguage}
                  onChange={(e) => setChatbotLanguage(e.target.value === "es" ? "es" : "en")}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {copy.greeting}
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  placeholder={copy.greetingPlaceholder}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={saveLoading || integrationsLoading}
                className="bg-accent text-white hover:bg-accent/90"
              >
                {saveLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {saveLoading ? copy.saving : copy.save}
              </Button>
              {saveMessage && <span className="text-sm text-emerald-600 animate-fade-in">{saveMessage}</span>}
              {saveError && <span className="text-sm text-red-600 animate-fade-in">{saveError}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Link2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>{copy.integrations}</CardTitle>
                <CardDescription>{copy.integrationsDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WhatsApp */}
            <div className="space-y-3 rounded-xl border bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-emerald-700">WhatsApp</span>
              </div>
              <input
                type="text"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none"
                value={integrationState.whatsappAccessToken}
                onChange={(e) => setIntegrationState((p) => ({ ...p, whatsappAccessToken: e.target.value }))}
                placeholder={copy.whatsappToken}
              />
              <input
                type="text"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none"
                value={integrationState.whatsappPhoneNumberId}
                onChange={(e) => setIntegrationState((p) => ({ ...p, whatsappPhoneNumberId: e.target.value }))}
                placeholder={copy.whatsappPhone}
              />
            </div>

            {/* Instagram */}
            <div className="space-y-3 rounded-xl border bg-pink-50/50 p-4">
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-pink-600" />
                <span className="font-medium text-pink-700">Instagram</span>
              </div>
              <input
                type="text"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none"
                value={integrationState.instagramAccessToken}
                onChange={(e) => setIntegrationState((p) => ({ ...p, instagramAccessToken: e.target.value }))}
                placeholder={copy.instagramToken}
              />
              <input
                type="text"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors focus:border-accent focus:outline-none"
                value={integrationState.instagramBusinessId}
                onChange={(e) => setIntegrationState((p) => ({ ...p, instagramBusinessId: e.target.value }))}
                placeholder={copy.instagramBusiness}
              />
            </div>

            <a
              href="https://developers.facebook.com/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {copy.metaLink}
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Base */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <Database className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>{copy.knowledge}</CardTitle>
              <CardDescription>{copy.knowledgeDesc}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Existing Sources */}
          {knowledgeSources.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">{copy.existingSources}</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {knowledgeSources.map((source) => (
                  <div 
                    key={source.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {source.source_type === "url" ? (
                        <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : source.source_type === "document" ? (
                        <Upload className="h-4 w-4 text-purple-500 shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="text-sm truncate">
                        {source.title || source.source_type}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                      {source.source_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {kbSourcesLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sources...
            </div>
          )}

          {!kbSourcesLoading && knowledgeSources.length === 0 && (
            <div className="text-sm text-muted-foreground py-2">
              {copy.noSources}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Source Type Cards */}
            {[
              { type: "url" as const, icon: Globe, label: copy.sourceUrl, color: "blue" },
              { type: "text" as const, icon: FileText, label: copy.sourceText, color: "emerald" },
              { type: "document" as const, icon: Upload, label: copy.sourceDocument, color: "purple" },
            ].map((source) => (
              <button
                key={source.type}
                onClick={() => setKbSourceType(source.type)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  kbSourceType === source.type
                    ? `border-${source.color}-500 bg-${source.color}-50`
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <source.icon className={`h-5 w-5 ${kbSourceType === source.type ? `text-${source.color}-600` : "text-muted-foreground"}`} />
                <span className={kbSourceType === source.type ? "font-medium" : ""}>{source.label}</span>
              </button>
            ))}
          </div>

          {/* Input Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {copy.titleLabel}
              </label>
              <input
                type="text"
                className="w-full rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                value={kbTitle}
                onChange={(e) => setKbTitle(e.target.value)}
                placeholder={isEs ? "Nombre del contenido" : "Content name"}
              />
            </div>
            
            {kbSourceType === "url" && (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {copy.urlLabel}
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  value={kbUrl}
                  onChange={(e) => setKbUrl(e.target.value)}
                  placeholder={copy.urlPlaceholder}
                />
              </div>
            )}
            
            {kbSourceType === "document" && (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {copy.sourceDocument}
                </label>
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx"
                  className="w-full rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none"
                  onChange={handleFileSelect}
                />
              </div>
            )}
          </div>

          {(kbSourceType === "text" || kbSourceType === "document") && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {copy.textLabel}
              </label>
              <textarea
                className="min-h-[150px] w-full rounded-lg border bg-background px-4 py-3 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                value={kbText}
                onChange={(e) => setKbText(e.target.value)}
                placeholder={copy.textPlaceholder}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => handleIngest("add")}
              disabled={kbLoading}
              className="bg-accent text-white hover:bg-accent/90"
            >
              {kbLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {kbLoading ? copy.ingesting : copy.ingestAdd}
            </Button>
            <Button onClick={() => handleIngest("replace")} disabled={kbLoading} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              {copy.ingestReplace}
            </Button>
            <Button onClick={handleClearKnowledge} disabled={kbLoading} variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {copy.ingestClear}
            </Button>
            {kbMessage && <span className="text-sm text-emerald-600 animate-fade-in">{kbMessage}</span>}
            {kbError && <span className="text-sm text-red-600 animate-fade-in">{kbError}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Flyer Manager */}
      {businessId && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-pink-100 p-2">
                <Image className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <CardTitle>{lang === "es" ? "Flyers de Servicios" : "Service Flyers"}</CardTitle>
                <CardDescription>
                  {lang === "es" 
                    ? "Imágenes automáticas para preguntas de servicios/precios" 
                    : "Auto-send images for services/pricing questions"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <FlyerManager businessId={businessId} lang={lang} />
          </CardContent>
        </Card>
      )}

      {/* Webhooks Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Globe className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle>{copy.webhooks}</CardTitle>
              <CardDescription>{copy.webhooksDesc}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">WhatsApp Webhook</span>
              </div>
              <code className="text-xs text-muted-foreground break-all">
                https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/webhook-whatsapp
              </code>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Instagram className="h-4 w-4 text-pink-600" />
                <span className="font-medium">Instagram Webhook</span>
              </div>
              <code className="text-xs text-muted-foreground break-all">
                https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/webhook-instagram
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
