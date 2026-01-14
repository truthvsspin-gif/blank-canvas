import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  Globe,
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

export default function ChatbotPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId } = useCurrentBusiness();

  // Settings state
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotLanguage, setChatbotLanguage] = useState<"en" | "es">("en");
  const [greetingMessage, setGreetingMessage] = useState("");
  
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
          { title: "Activa el chatbot", desc: "Habilita respuestas automáticas" },
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
        integrations: "Integraciones",
        integrationsDesc: "Conecta WhatsApp e Instagram",
        whatsappToken: "WhatsApp Access Token",
        whatsappPhone: "WhatsApp Phone ID",
        instagramToken: "Instagram Access Token",
        instagramBusiness: "Instagram Business ID",
        metaLink: "Obtener credenciales de Meta",
        knowledge: "Base de Conocimiento",
        knowledgeDesc: "Añade información para que el chatbot responda mejor",
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
      }
    : {
        title: "Chatbot Center",
        desc: "Configure and optimize your AI assistant",
        quickStart: "Quick Start",
        quickStartDesc: "Follow these steps to set up your chatbot",
        steps: [
          { title: "Enable chatbot", desc: "Turn on automatic replies" },
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
        integrations: "Integrations",
        integrationsDesc: "Connect WhatsApp and Instagram",
        whatsappToken: "WhatsApp Access Token",
        whatsappPhone: "WhatsApp Phone ID",
        instagramToken: "Instagram Access Token",
        instagramBusiness: "Instagram Business ID",
        metaLink: "Get Meta credentials",
        knowledge: "Knowledge Base",
        knowledgeDesc: "Add information so the chatbot can answer better",
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
      };

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!businessId) return;
      setIntegrationsLoading(true);
      
      const { data: business } = await supabase
        .from("businesses")
        .select("chatbot_enabled, language_preference, greeting_message")
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
    
    const response = await fetch("/api/knowledge/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    const result = await response.json().catch(() => null);
    
    if (!response.ok) {
      setKbError(result?.error || copy.ingestFail);
      setKbLoading(false);
      return;
    }
    setKbMessage(copy.cleared(result?.sourceCount ?? 0, result?.chunkCount ?? 0));
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
      const clearResponse = await fetch("/api/knowledge/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
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
      
      const response = await fetch("/api/knowledge/ingest-file", { method: "POST", body: formData });
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
      
    const response = await fetch("/api/knowledge/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
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
              {copy.ingestClear}
            </Button>
            {kbMessage && <span className="text-sm text-emerald-600 animate-fade-in">{kbMessage}</span>}
            {kbError && <span className="text-sm text-red-600 animate-fade-in">{kbError}</span>}
          </div>
        </CardContent>
      </Card>

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
              <code className="text-xs text-muted-foreground break-all">/api/webhooks/whatsapp</code>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Instagram className="h-4 w-4 text-pink-600" />
                <span className="font-medium">Instagram Webhook</span>
              </div>
              <code className="text-xs text-muted-foreground break-all">/api/webhooks/instagram</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
