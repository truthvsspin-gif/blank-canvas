"use client"

import { Save } from "lucide-react"
import { useEffect, useState } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useLanguage } from "@/components/providers/language-provider"
import { supabase } from "@/lib/supabaseClient"
import { useCurrentBusiness } from "@/hooks/use-current-business"

export default function ChatbotPage() {
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const { businessId } = useCurrentBusiness()
  const [chatbotEnabled, setChatbotEnabled] = useState(true)
  const [chatbotLanguage, setChatbotLanguage] = useState<"en" | "es">("en")
  const [greetingMessage, setGreetingMessage] = useState("")
  const [integrationState, setIntegrationState] = useState({
    whatsappAccessToken: "",
    whatsappPhoneNumberId: "",
    instagramAccessToken: "",
    instagramBusinessId: "",
  })
  const [kbSourceType, setKbSourceType] = useState<"url" | "text" | "document">("url")
  const [kbUrl, setKbUrl] = useState("")
  const [kbText, setKbText] = useState("")
  const [kbTitle, setKbTitle] = useState("")
  const [kbFileName, setKbFileName] = useState("")
  const [kbFile, setKbFile] = useState<File | null>(null)
  const [kbLoading, setKbLoading] = useState(false)
  const [kbMessage, setKbMessage] = useState<string | null>(null)
  const [kbError, setKbError] = useState<string | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [integrationsLoading, setIntegrationsLoading] = useState(false)

  const copy = isEs
    ? {
        title: "Chatbot",
        desc: "Configuracion del chatbot y sus integraciones.",
        guideTitle: "Guia rapida para principiantes",
        guideDesc: "Sigue estos pasos en orden. Si solo haces uno, empieza por activar el chatbot y guardar.",
        guideSteps: [
          "Activa el chatbot.",
          "Elige el idioma principal.",
          "Escribe un saludo simple.",
          "Agrega una descripcion o URL de tu negocio.",
          "Conecta WhatsApp o Instagram cuando estes listo.",
          "Prueba el flujo con el simulador.",
        ],
        guideNote:
          "No necesitas completar integraciones para probar respuestas. Con la base de conocimiento ya funciona.",
        exampleTitle: "Ejemplos de mensajes para probar",
        exampleDesc: "Copia y pega uno de estos mensajes en el simulador.",
        examples: [
          "Hola, quiero saber precios de lavado premium.",
          "Tienen citas disponibles el viernes?",
          "Cuanto cuesta el ceramic coating?",
          "Necesito direccion y horarios.",
        ],
        settingsTitle: "Configuracion del chatbot",
        settingsDesc: "Controla idioma, saludo e integraciones.",
        testTitle: "Prueba el chatbot",
        testDesc: "Usa el simulador para probar todo el flujo.",
        testCta: "Abrir simulador",
        enabledLabel: "Chatbot activado",
        enabledDesc: "Activa respuestas automaticas.",
        languageLabel: "Idioma principal",
        greetingLabel: "Mensaje de saludo",
        greetingPlaceholder: "Hola! Gracias por escribirnos.",
        integrationsTitle: "Integraciones",
        integrationsDesc: "Guarda tokens por negocio para mensajes salientes.",
        integrationsHelp:
          "WhatsApp: Meta Business Dashboard > WhatsApp > API Setup > Temporary access token / Phone number ID. Instagram: Meta Business Dashboard > Instagram Messaging > API Setup > Access token / Business ID.",
        integrationsLinkLabel: "Acceso a Meta Developers",
        integrationsLinkDesc:
          "Abre Meta Developers, crea o selecciona tu app y luego entra a WhatsApp o Instagram Messaging para generar los tokens.",
        integrationsLinkText: "https://developers.facebook.com/",
        whatsappToken: "WhatsApp access token",
        whatsappPhone: "WhatsApp phone number ID",
        instagramToken: "Instagram access token",
        instagramTokenHelp:
          "Meta Business Dashboard > Instagram Messaging > API Setup > Access token.",
        instagramBusiness: "Instagram business ID",
        instagramBusinessHelp:
          "Meta Business Dashboard > Instagram Messaging > API Setup > Business ID.",
        knowledgeTitle: "Base de conocimiento",
        knowledgeDesc: "Carga una web o descripcion larga para que el chatbot responda con contexto.",
        sourceLabel: "Fuente",
        titleLabel: "Titulo",
        urlLabel: "URL del sitio",
        urlPlaceholder: "https://example.com",
        documentLabel: "Documento (txt, md)",
        documentHint: "Se extraera texto de PDF o DOCX. TXT y MD se leen directo.",
        documentPlaceholder: "Contenido del documento.",
        textLabel: "Descripcion",
        textPlaceholder:
          "Escribe informacion de tu negocio, servicios, precios y procesos.",
        sourceUrl: "Sitio web",
        sourceText: "Descripcion larga",
        sourceDocument: "Documento",
        ingest: "Ingestar contenido",
        ingestAdd: "Agregar contenido",
        ingestReplace: "Reemplazar contenido",
        ingestClear: "Eliminar contenido",
        ingestHint:
          "Usa Agregar para sumar informacion nueva, Reemplazar para borrar todo e ingestar de nuevo, o Eliminar para limpiar la base.",
        ingesting: "Ingestando...",
        ingested: (count: number) => `Ingestado ${count} chunks.`,
        cleared: (sources: number, chunks: number) =>
          `Contenido eliminado (${sources} fuentes, ${chunks} chunks).`,
        webhooksTitle: "Webhooks y verificacion",
        webhooksDesc: "Configura los webhooks en Meta para recibir mensajes.",
        verifyToken: "Token de verificacion",
        verifyTokenDesc: "Define un token fijo y usalo en Meta.",
        save: "Guardar ajustes",
        saving: "Guardando...",
        saveSuccess: "Configuracion actualizada.",
        noBusiness: "No hay negocio activo.",
        selectDoc: "Selecciona un documento.",
        ingestFail: "No se pudo ingestar el contenido.",
      }
    : {
        title: "Chatbot",
        desc: "Chatbot configuration and integrations.",
        guideTitle: "Beginner quickstart",
        guideDesc: "Follow these steps in order. If you only do one, enable the chatbot and save.",
        guideSteps: [
          "Enable the chatbot.",
          "Pick the primary language.",
          "Write a simple greeting.",
          "Add a business description or URL.",
          "Connect WhatsApp or Instagram when ready.",
          "Test the flow with the simulator.",
        ],
        guideNote:
          "You do not need integrations to test replies. The knowledge base is enough to start.",
        exampleTitle: "Example messages to test",
        exampleDesc: "Copy and paste one of these in the simulator.",
        examples: [
          "Hi, what is the price for a premium wash?",
          "Do you have availability on Friday?",
          "How much is ceramic coating?",
          "What are your hours and address?",
        ],
        settingsTitle: "Chatbot settings",
        settingsDesc: "Control language, greeting, and integrations.",
        testTitle: "Test the chatbot",
        testDesc: "Use the simulator to test the full flow.",
        testCta: "Open simulator",
        enabledLabel: "Chatbot enabled",
        enabledDesc: "Enable automated replies.",
        languageLabel: "Primary language",
        greetingLabel: "Greeting message",
        greetingPlaceholder: "Hi! Thanks for reaching out.",
        integrationsTitle: "Integrations",
        integrationsDesc: "Store per-business tokens for outbound messaging.",
        integrationsHelp:
          "WhatsApp: Meta Business Dashboard > WhatsApp > API Setup > Temporary access token / Phone number ID. Instagram: Meta Business Dashboard > Instagram Messaging > API Setup > Access token / Business ID.",
        integrationsLinkLabel: "Meta Developers link",
        integrationsLinkDesc:
          "Open Meta Developers, create or pick your app, then go to WhatsApp or Instagram Messaging to generate tokens.",
        integrationsLinkText: "https://developers.facebook.com/",
        whatsappToken: "WhatsApp access token",
        whatsappPhone: "WhatsApp phone number ID",
        instagramToken: "Instagram access token",
        instagramTokenHelp:
          "Meta Business Dashboard > Instagram Messaging > API Setup > Access token.",
        instagramBusiness: "Instagram business ID",
        instagramBusinessHelp:
          "Meta Business Dashboard > Instagram Messaging > API Setup > Business ID.",
        knowledgeTitle: "Knowledge base",
        knowledgeDesc: "Ingest a website or long description so the chatbot can answer with context.",
        sourceLabel: "Source type",
        titleLabel: "Title",
        urlLabel: "Website URL",
        urlPlaceholder: "https://example.com",
        documentLabel: "Document (txt, md)",
        documentHint: "Text is extracted from PDF/DOCX. TXT and MD are read directly.",
        documentPlaceholder: "Document content.",
        textLabel: "Description",
        textPlaceholder: "Paste information about your business, services, pricing, and policies.",
        sourceUrl: "Website URL",
        sourceText: "Long description",
        sourceDocument: "Document",
        ingest: "Ingest content",
        ingestAdd: "Add content",
        ingestReplace: "Replace content",
        ingestClear: "Delete content",
        ingestHint:
          "Use Add to append new info, Replace to clear everything and ingest again, or Delete to wipe the knowledge base.",
        ingesting: "Ingesting...",
        ingested: (count: number) => `Ingested ${count} chunks.`,
        cleared: (sources: number, chunks: number) =>
          `Content cleared (${sources} sources, ${chunks} chunks).`,
        webhooksTitle: "Webhooks & verification",
        webhooksDesc: "Configure Meta webhooks to receive messages.",
        verifyToken: "Verify token",
        verifyTokenDesc: "Set a fixed token and use it in Meta.",
        save: "Save settings",
        saving: "Saving...",
        saveSuccess: "Chatbot settings updated.",
        noBusiness: "No active business.",
        selectDoc: "Please select a document.",
        ingestFail: "Failed to ingest content.",
      }

  useEffect(() => {
    const loadSettings = async () => {
      if (!businessId) return
      setIntegrationsLoading(true)
      const { data: business } = await supabase
        .from("businesses")
        .select("chatbot_enabled, language_preference, greeting_message")
        .eq("id", businessId)
        .single()
      if (business) {
        setChatbotEnabled(business.chatbot_enabled ?? true)
        setChatbotLanguage(
          business.language_preference === "es" || business.language_preference === "en"
            ? business.language_preference
            : "en"
        )
        setGreetingMessage(business.greeting_message ?? "")
      }

      const { data: integrations } = await supabase
        .from("business_integrations")
        .select(
          "whatsapp_access_token, whatsapp_phone_number_id, instagram_access_token, instagram_business_id"
        )
        .eq("business_id", businessId)
        .maybeSingle()
      if (integrations) {
        setIntegrationState({
          whatsappAccessToken: integrations.whatsapp_access_token ?? "",
          whatsappPhoneNumberId: integrations.whatsapp_phone_number_id ?? "",
          instagramAccessToken: integrations.instagram_access_token ?? "",
          instagramBusinessId: integrations.instagram_business_id ?? "",
        })
      }
      setIntegrationsLoading(false)
    }
    loadSettings()
  }, [businessId])

  const handleSave = async () => {
    if (!businessId) {
      setSaveError(copy.noBusiness)
      return
    }
    setSaveLoading(true)
    setSaveMessage(null)
    setSaveError(null)

    const { error: businessError } = await supabase
      .from("businesses")
      .update({
        chatbot_enabled: chatbotEnabled,
        language_preference: chatbotLanguage,
        greeting_message: greetingMessage.trim() || null,
      })
      .eq("id", businessId)

    if (businessError) {
      setSaveError(businessError.message)
      setSaveLoading(false)
      return
    }

    const { data: existingIntegration } = await supabase
      .from("business_integrations")
      .select("id")
      .eq("business_id", businessId)
      .maybeSingle()

    const integrationPayload = {
      business_id: businessId,
      whatsapp_access_token: integrationState.whatsappAccessToken.trim() || null,
      whatsapp_phone_number_id: integrationState.whatsappPhoneNumberId.trim() || null,
      instagram_access_token: integrationState.instagramAccessToken.trim() || null,
      instagram_business_id: integrationState.instagramBusinessId.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const { error: integrationError } = existingIntegration?.id
      ? await supabase
          .from("business_integrations")
          .update(integrationPayload)
          .eq("id", existingIntegration.id)
      : await supabase.from("business_integrations").insert(integrationPayload)

    if (integrationError) {
      setSaveError(integrationError.message)
      setSaveLoading(false)
      return
    }

    setSaveMessage(copy.saveSuccess)
    setSaveLoading(false)
  }

  const handleClearKnowledge = async () => {
    if (!businessId) {
      setKbError(copy.noBusiness)
      return
    }
    setKbLoading(true)
    setKbError(null)
    setKbMessage(null)
    const response = await fetch("/api/knowledge/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setKbError(result?.error || copy.ingestFail)
      setKbLoading(false)
      return
    }
    setKbMessage(copy.cleared(result?.sourceCount ?? 0, result?.chunkCount ?? 0))
    setKbLoading(false)
  }

  const handleIngest = async (mode: "add" | "replace" = "add") => {
    if (!businessId) {
      setKbError(copy.noBusiness)
      return
    }
    setKbLoading(true)
    setKbError(null)
    setKbMessage(null)
    if (mode === "replace") {
      const clearResponse = await fetch("/api/knowledge/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      })
      const clearResult = await clearResponse.json().catch(() => null)
      if (!clearResponse.ok) {
        setKbError(clearResult?.error || copy.ingestFail)
        setKbLoading(false)
        return
      }
    }
    if (kbSourceType === "document") {
      if (!kbFile) {
        setKbError(copy.selectDoc)
        setKbLoading(false)
        return
      }
      const formData = new FormData()
      formData.append("businessId", businessId)
      if (kbTitle.trim()) {
        formData.append("title", kbTitle.trim())
      }
      formData.append("file", kbFile)
      const response = await fetch("/api/knowledge/ingest-file", {
        method: "POST",
        body: formData,
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        setKbError(result?.error || copy.ingestFail)
        setKbLoading(false)
        return
      }
      setKbMessage(copy.ingested(result?.chunkCount ?? 0))
      setKbLoading(false)
      return
    }

    const payload =
      kbSourceType === "url"
        ? {
            businessId,
            sourceType: "url",
            sourceUrl: kbUrl.trim(),
            title: kbTitle.trim() || undefined,
          }
        : {
            businessId,
            sourceType: kbSourceType,
            content: kbText.trim(),
            title: kbTitle.trim() || kbFileName || undefined,
          }
    const response = await fetch("/api/knowledge/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) {
      setKbError(result?.error || copy.ingestFail)
      setKbLoading(false)
      return
    }
    setKbMessage(copy.ingested(result?.chunkCount ?? 0))
    setKbLoading(false)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setKbFileName(file.name)
    setKbFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      setKbText(text)
    }
    if (file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md")) {
      reader.readAsText(file)
    } else {
      setKbText("")
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={copy.title} description={copy.desc} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{copy.guideTitle}</CardTitle>
          <CardDescription>{copy.guideDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div className="grid gap-3 md:grid-cols-2">
            <ol className="space-y-2">
              {copy.guideSteps.map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 rounded-full bg-slate-900" />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{copy.exampleTitle}</p>
              <p className="text-xs text-slate-600">{copy.exampleDesc}</p>
              <div className="space-y-2 text-sm text-slate-700">
                {copy.examples.map((example) => (
                  <div key={example} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    {example}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {copy.guideNote}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{copy.settingsTitle}</CardTitle>
          <CardDescription>{copy.settingsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">{copy.testTitle}</p>
              <p className="text-xs text-slate-600">{copy.testDesc}</p>
            </div>
            <Button asChild className="bg-rose-600 text-white hover:bg-rose-500">
              <a href="/dev-chatbot">{copy.testCta}</a>
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div>
              <p className="font-medium">{copy.enabledLabel}</p>
              <p className="text-xs text-slate-500">{copy.enabledDesc}</p>
            </div>
            <input
              type="checkbox"
              className="size-4 rounded border border-input text-rose-600"
              checked={chatbotEnabled}
              onChange={(event) => setChatbotEnabled(event.target.checked)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                {copy.languageLabel}
              </label>
              <select
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                value={chatbotLanguage}
                onChange={(event) => setChatbotLanguage(event.target.value === "es" ? "es" : "en")}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                {copy.greetingLabel}
              </label>
              <input
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                value={greetingMessage}
                onChange={(event) => setGreetingMessage(event.target.value)}
                placeholder={copy.greetingPlaceholder}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{copy.integrationsTitle}</p>
              <p className="text-xs text-slate-500">{copy.integrationsDesc}</p>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {copy.integrationsHelp}
              </div>
              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                <p className="font-semibold text-slate-700">{copy.integrationsLinkLabel}</p>
                <p className="mt-1">{copy.integrationsLinkDesc}</p>
                <a
                  href={copy.integrationsLinkText}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-rose-600 underline"
                >
                  {copy.integrationsLinkText}
                </a>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.whatsappToken}
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={integrationState.whatsappAccessToken}
                  onChange={(event) =>
                    setIntegrationState((prev) => ({
                      ...prev,
                      whatsappAccessToken: event.target.value,
                    }))
                  }
                  placeholder="EAAG..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.whatsappPhone}
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={integrationState.whatsappPhoneNumberId}
                  onChange={(event) =>
                    setIntegrationState((prev) => ({
                      ...prev,
                      whatsappPhoneNumberId: event.target.value,
                    }))
                  }
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.instagramToken}
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={integrationState.instagramAccessToken}
                  onChange={(event) =>
                    setIntegrationState((prev) => ({
                      ...prev,
                      instagramAccessToken: event.target.value,
                    }))
                  }
                  placeholder="EAAG..."
                />
                <p className="text-xs text-slate-500">{copy.instagramTokenHelp}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.instagramBusiness}
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={integrationState.instagramBusinessId}
                  onChange={(event) =>
                    setIntegrationState((prev) => ({
                      ...prev,
                      instagramBusinessId: event.target.value,
                    }))
                  }
                  placeholder="1234567890"
                />
                <p className="text-xs text-slate-500">{copy.instagramBusinessHelp}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{copy.knowledgeTitle}</p>
              <p className="text-xs text-slate-500">{copy.knowledgeDesc}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.sourceLabel}
                </label>
                <select
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={kbSourceType}
                  onChange={(event) =>
                    setKbSourceType(
                      event.target.value === "document"
                        ? "document"
                        : event.target.value === "text"
                          ? "text"
                          : "url"
                    )
                  }
                >
                  <option value="url">{copy.sourceUrl}</option>
                  <option value="text">{copy.sourceText}</option>
                  <option value="document">{copy.sourceDocument}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.titleLabel}
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={kbTitle}
                  onChange={(event) => setKbTitle(event.target.value)}
                  placeholder={isEs ? "Servicios Detapro" : "Detapro services"}
                />
              </div>
            </div>
            {kbSourceType === "url" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.urlLabel}
                </label>
                <input
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={kbUrl}
                  onChange={(event) => setKbUrl(event.target.value)}
                  placeholder={copy.urlPlaceholder}
                />
              </div>
            ) : kbSourceType === "document" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.documentLabel}
                </label>
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.doc,.docx"
                  className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-slate-500">{copy.documentHint}</p>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={kbText}
                  onChange={(event) => setKbText(event.target.value)}
                  placeholder={copy.documentPlaceholder}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">
                  {copy.textLabel}
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={kbText}
                  onChange={(event) => setKbText(event.target.value)}
                  placeholder={copy.textPlaceholder}
                />
              </div>
            )}
            <div className="space-y-2">
              <div className="text-xs text-slate-500">{copy.ingestHint}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => handleIngest("add")}
                  disabled={kbLoading}
                  className="bg-rose-600 text-white hover:bg-rose-500"
                >
                  {kbLoading ? copy.ingesting : copy.ingestAdd}
                </Button>
                <Button
                  onClick={() => handleIngest("replace")}
                  disabled={kbLoading}
                  variant="outline"
                >
                  {copy.ingestReplace}
                </Button>
                <Button
                  onClick={handleClearKnowledge}
                  disabled={kbLoading}
                  variant="ghost"
                  className="text-rose-600"
                >
                  {copy.ingestClear}
                </Button>
              </div>
              {kbMessage ? <span className="text-emerald-700">{kbMessage}</span> : null}
              {kbError ? <span className="text-rose-600">{kbError}</span> : null}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{copy.webhooksTitle}</p>
              <p className="text-xs text-slate-500">{copy.webhooksDesc}</p>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="font-semibold text-slate-700">WhatsApp webhook</p>
                <p>/api/webhooks/whatsapp</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="font-semibold text-slate-700">Instagram webhook</p>
                <p>/api/webhooks/instagram</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="font-semibold text-slate-700">{copy.verifyToken}</p>
                <p>{copy.verifyTokenDesc}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saveLoading || integrationsLoading}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              <Save className="mr-2 size-4" />
              {saveLoading ? copy.saving : copy.save}
            </Button>
            {saveMessage ? <span className="text-emerald-700">{saveMessage}</span> : null}
            {saveError ? <span className="text-rose-600">{saveError}</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
