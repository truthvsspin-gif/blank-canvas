import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Car,
  CheckCircle2,
  HandMetal,
  Instagram,
  Loader2,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { useCurrentBusiness } from "@/hooks/use-current-business";
import { supabase } from "@/lib/supabaseClient";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
};

type ConversationState = {
  currentState: string;
  handoffRequired: boolean;
  leadQualified: boolean;
};

// State display names
const STATE_LABELS: Record<string, { en: string; es: string }> = {
  STATE_0_OPENING: { en: "Opening", es: "Apertura" },
  STATE_1_VEHICLE: { en: "Vehicle Info", es: "Info Vehículo" },
  STATE_2_BENEFIT: { en: "Benefit Discovery", es: "Descubrimiento" },
  STATE_3_USAGE: { en: "Usage Context", es: "Contexto de Uso" },
  STATE_4_PRESCRIPTION: { en: "Recommendation", es: "Recomendación" },
  STATE_5_ACTION: { en: "Closing", es: "Cierre" },
  STATE_6_HANDOFF: { en: "Human Handoff", es: "Transferencia" },
};

// Consultative sales quick prompts (aligned with state machine)
const salesPrompts: { en: string[]; es: string[] } = {
  en: [
    "Hi, I need help with my car",
    "Toyota Camry sedan",
    "BMW X5 SUV",
    "Ford F-150 pickup",
    "I want it to look like new",
    "I want to protect it long-term",
    "The interior needs work",
    "It's my daily driver",
    "Weekend car only",
    "Yes, let's move forward",
    "What about pricing?",
  ],
  es: [
    "Hola, necesito ayuda con mi carro",
    "Toyota Camry sedán",
    "BMW X5 SUV",
    "Ford F-150 pickup",
    "Quiero que luzca como nuevo",
    "Quiero protegerlo a largo plazo",
    "El interior necesita trabajo",
    "Es mi carro de diario",
    "Solo de fin de semana",
    "Sí, avancemos",
    "¿Cuánto cuesta?",
  ],
};

export default function DevChatbotPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId, loading: bizLoading } = useCurrentBusiness();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State machine tracking
  const [conversationState, setConversationState] = useState<ConversationState>({
    currentState: "STATE_0_OPENING",
    handoffRequired: false,
    leadQualified: false,
  });

  // Get prompts for consultative sales flow
  const currentPrompts = useMemo(() => {
    return isEs ? salesPrompts.es : salesPrompts.en;
  }, [isEs]);

  const initialMessage: Message = useMemo(() => ({
    id: "welcome",
    role: "bot" as const,
    text: isEs 
      ? "¡Perfecto, con gusto te ayudo! 🚗\n\nPara orientarte mejor, ¿para qué vehículo es?\n(Marca, modelo, y si es sedán, SUV o pickup)"
      : "Perfect, happy to help! 🚗\n\nTo guide you properly, what vehicle is this for?\n(Brand, model, and whether it's a sedan, SUV, or pickup)",
    timestamp: new Date(),
  }), [isEs]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<"whatsapp" | "instagram">("whatsapp");

  const copy = useMemo(
    () =>
      isEs
        ? {
            title: "Simulador de Ventas Consultivas",
            desc: "Prueba el chatbot de ventas con máquina de estados",
            placeholder: "Escribe un mensaje...",
            send: "Enviar",
            sending: "Enviando...",
            noBusiness: "No hay negocio activo.",
            errorFetch: "Error al enviar el mensaje.",
            hint: "Flujo de ventas consultivas - NO es un bot de FAQ",
            quickPrompts: "Simulador de flujo",
            clearChat: "Reiniciar conversación",
            typing: "Escribiendo...",
            noMessages: "Inicia una conversación",
            noMessagesDesc: "Envía un mensaje o usa una de las sugerencias rápidas",
            poweredBy: "Ventas Consultivas",
            selectChannel: "Canal de prueba",
            whatsapp: "WhatsApp",
            instagram: "Instagram",
            currentState: "Estado actual",
            leadQualified: "Lead calificado",
            handoffReady: "Listo para transferir",
            handoffMessage: "Conversación transferida a humano. El bot ya no responderá.",
          }
        : {
            title: "Consultative Sales Simulator",
            desc: "Test the sales chatbot with state machine",
            placeholder: "Type a message...",
            send: "Send",
            sending: "Sending...",
            noBusiness: "No active business.",
            errorFetch: "Failed to send message.",
            hint: "Consultative sales flow - NOT an FAQ bot",
            quickPrompts: "Flow Simulator",
            clearChat: "Reset conversation",
            typing: "Typing...",
            noMessages: "Start a conversation",
            noMessagesDesc: "Send a message or use one of the quick prompts",
            poweredBy: "Consultative Sales",
            selectChannel: "Test Channel",
            whatsapp: "WhatsApp",
            instagram: "Instagram",
            currentState: "Current state",
            leadQualified: "Lead qualified",
            handoffReady: "Ready for handoff",
            handoffMessage: "Conversation handed off to human. Bot will no longer respond.",
          },
    [isEs]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const trimmed = (messageText || input).trim();
      if (!trimmed || loading) return;
      
      // Don't allow sending if handoff is required
      if (conversationState.handoffRequired) {
        return;
      }

      if (!businessId) {
        setError(copy.noBusiness);
        return;
      }

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setIsTyping(true);
      setError(null);

      // Retry logic for cold-start issues
      const maxRetries = 2;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

          const res = await fetch(
            "https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/ai-chat",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                businessId,
                userMessage: trimmed,
                conversationHistory: messages.map((m) => ({
                  role: m.role === "user" ? "user" : "assistant",
                  content: m.text,
                })),
              }),
              signal: controller.signal,
            }
          );
          clearTimeout(timeoutId);

          const data = await res.json().catch(() => null);

          if (!res.ok) {
            throw new Error(data?.error || copy.errorFetch);
          }

          // Update conversation state from response
          if (data) {
            setConversationState({
              currentState: data.currentState || "STATE_0_OPENING",
              handoffRequired: data.handoffRequired || false,
              leadQualified: data.leadQualified || false,
            });
          }

          // Simulate typing delay for better UX
          await new Promise((resolve) => setTimeout(resolve, 500));

          const botMsg: Message = {
            id: crypto.randomUUID(),
            role: "bot",
            text: data?.reply || "...",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMsg]);
          setLoading(false);
          setIsTyping(false);
          return; // Success - exit loop
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(copy.errorFetch);
          
          // If it's a timeout or network error and we have retries left, wait and retry
          if (attempt < maxRetries && (err instanceof Error && (err.name === 'AbortError' || err.message === 'Failed to fetch'))) {
            console.log(`[Retry ${attempt + 1}/${maxRetries}] Edge function call failed, retrying...`);
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
            continue;
          }
          break;
        }
      }

      // All retries exhausted
      setError(lastError?.message || copy.errorFetch);
      setLoading(false);
      setIsTyping(false);
    },
    [input, loading, businessId, copy, conversationState.handoffRequired, messages]
  );

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
    setConversationState({
      currentState: "STATE_0_OPENING",
      handoffRequired: false,
      leadQualified: false,
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isEs ? "es-ES" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const currentStateLabel = STATE_LABELS[conversationState.currentState] || STATE_LABELS.STATE_0_OPENING;

  if (bizLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-accent/20 animate-pulse" />
            <Bot className="absolute inset-0 m-auto h-8 w-8 text-accent" />
          </div>
          <p className="text-muted-foreground">{isEs ? "Cargando..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={copy.title}
        description={copy.desc}
        actions={
          <Badge variant="outline" className="gap-1.5 border-accent/50 text-accent">
            <Car className="h-3 w-3" />
            {copy.poweredBy}
          </Badge>
        }
      />

      {/* State Machine Status Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-card border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{copy.currentState}:</span>
          <Badge 
            variant="outline" 
            className={`${
              conversationState.currentState === "STATE_6_HANDOFF"
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                : conversationState.currentState === "STATE_5_ACTION"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : "bg-accent/10 text-accent border-accent/30"
            }`}
          >
            {isEs ? currentStateLabel.es : currentStateLabel.en}
          </Badge>
        </div>
        
        {conversationState.leadQualified && (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {copy.leadQualified}
          </Badge>
        )}
        
        {conversationState.handoffRequired && (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
            <HandMetal className="h-3 w-3" />
            {copy.handoffReady}
          </Badge>
        )}
      </div>

      {/* Channel Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">{copy.selectChannel}:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedChannel("whatsapp")}
            className={`flex items-center gap-2 rounded-full py-2 px-4 text-sm font-medium transition-all duration-200 ${
              selectedChannel === "whatsapp"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : "bg-card border border-border text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-500"
            }`}
          >
            <Phone className="h-4 w-4" />
            {copy.whatsapp}
          </button>
          <button
            onClick={() => setSelectedChannel("instagram")}
            className={`flex items-center gap-2 rounded-full py-2 px-4 text-sm font-medium transition-all duration-200 ${
              selectedChannel === "instagram"
                ? "bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white shadow-lg shadow-pink-500/25"
                : "bg-card border border-border text-muted-foreground hover:border-pink-500/50 hover:text-pink-500"
            }`}
          >
            <Instagram className="h-4 w-4" />
            {copy.instagram}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar - Quick Prompts */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              {copy.quickPrompts}
            </CardTitle>
            <CardDescription className="text-xs">
              {isEs 
                ? "Sigue el flujo de ventas paso a paso"
                : "Follow the sales flow step by step"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {currentPrompts.map((prompt: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading || conversationState.handoffRequired}
                className="w-full text-left rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs transition-all hover:border-accent hover:bg-accent/5 hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
            
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                className="w-full mt-4 text-muted-foreground hover:text-destructive"
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                {copy.clearChat}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="lg:col-span-3 flex flex-col overflow-hidden">
          <CardHeader className={`border-b ${
            selectedChannel === "whatsapp" 
              ? "bg-gradient-to-r from-emerald-500/10 to-transparent" 
              : "bg-gradient-to-r from-pink-500/10 to-transparent"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    selectedChannel === "whatsapp"
                      ? "bg-emerald-500/20 text-emerald-500"
                      : "bg-pink-500/20 text-pink-500"
                  }`}>
                    {selectedChannel === "whatsapp" ? (
                      <Phone className="h-5 w-5" />
                    ) : (
                      <Instagram className="h-5 w-5" />
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {isEs ? "Asistente de Ventas" : "Sales Assistant"}
                    <Badge className={`text-[10px] ${
                      selectedChannel === "whatsapp"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-pink-500/10 text-pink-500 border-pink-500/20"
                    }`}>
                      {selectedChannel === "whatsapp" ? "WhatsApp" : "Instagram"}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">{copy.hint}</CardDescription>
                </div>
              </div>
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[500px] bg-gradient-to-b from-muted/20 to-transparent">
            {/* Always show welcome message first */}
            <div className="flex gap-3 animate-fade-in">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="group relative max-w-[75%]">
                <div className="rounded-2xl px-4 py-2.5 shadow-sm bg-card border rounded-bl-md">
                  <p className="text-sm whitespace-pre-wrap">{initialMessage.text}</p>
                </div>
              </div>
            </div>

            {messages.length === 0 ? null : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 animate-fade-in ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        msg.role === "user"
                          ? "bg-foreground text-background"
                          : "bg-accent/20 text-accent"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`group relative max-w-[75%] ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                          msg.role === "user"
                            ? "bg-foreground text-background rounded-br-md"
                            : "bg-card border rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      <span
                        className={`text-[10px] text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                          msg.role === "user" ? "text-right block" : ""
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-3 animate-fade-in">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-accent" />
                    </div>
                    <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Handoff Warning */}
          {conversationState.handoffRequired && (
            <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-700">{copy.handoffMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t p-4 bg-background">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  className="w-full rounded-full border bg-muted/50 px-4 py-3 pr-12 text-sm transition-all focus:bg-background focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={conversationState.handoffRequired 
                    ? (isEs ? "Conversación transferida..." : "Conversation handed off...") 
                    : copy.placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading || conversationState.handoffRequired}
                />
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={loading || !input.trim() || conversationState.handoffRequired}
                size="icon"
                className="h-12 w-12 rounded-full bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/25 transition-all hover:shadow-accent/40 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
