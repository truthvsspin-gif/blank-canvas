import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Instagram,
  Loader2,
  MessageSquare,
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

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
};

const quickPrompts = {
  es: [
    "¿Cuáles son sus precios?",
    "¿Tienen disponibilidad hoy?",
    "Quiero reservar una cita",
    "¿Cuál es su horario?",
  ],
  en: [
    "What are your prices?",
    "Do you have availability today?",
    "I want to book an appointment",
    "What are your hours?",
  ],
};

export default function DevChatbotPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId, loading: bizLoading } = useCurrentBusiness();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
            title: "Simulador de Chatbot",
            desc: "Prueba las respuestas del chatbot en tiempo real",
            placeholder: "Escribe un mensaje...",
            send: "Enviar",
            sending: "Enviando...",
            noBusiness: "No hay negocio activo.",
            errorFetch: "Error al enviar el mensaje.",
            hint: "Las respuestas usan la misma lógica que WhatsApp e Instagram",
            quickPrompts: "Prueba rápida",
            clearChat: "Limpiar chat",
            typing: "Escribiendo...",
            noMessages: "Inicia una conversación",
            noMessagesDesc: "Envía un mensaje o usa una de las sugerencias rápidas",
            poweredBy: "Impulsado por IA",
            selectChannel: "Canal de prueba",
            whatsapp: "WhatsApp",
            instagram: "Instagram",
          }
        : {
            title: "Chatbot Simulator",
            desc: "Test chatbot responses in real time",
            placeholder: "Type a message...",
            send: "Send",
            sending: "Sending...",
            noBusiness: "No active business.",
            errorFetch: "Failed to send message.",
            hint: "Responses use the same logic as WhatsApp and Instagram",
            quickPrompts: "Quick prompts",
            clearChat: "Clear chat",
            typing: "Typing...",
            noMessages: "Start a conversation",
            noMessagesDesc: "Send a message or use one of the quick prompts",
            poweredBy: "Powered by AI",
            selectChannel: "Test Channel",
            whatsapp: "WhatsApp",
            instagram: "Instagram",
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

      try {
        const res = await fetch("/api/dev/chatbot-simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, message: trimmed, channel: selectedChannel }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || copy.errorFetch);
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
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.errorFetch);
      } finally {
        setLoading(false);
        setIsTyping(false);
      }
    },
    [input, loading, businessId, copy, selectedChannel]
  );

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isEs ? "es-ES" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
            <Sparkles className="h-3 w-3" />
            {copy.poweredBy}
          </Badge>
        }
      />

      {/* Channel Selector - Below header */}
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
          </CardHeader>
          <CardContent className="space-y-2">
            {quickPrompts[isEs ? "es" : "en"].map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="w-full text-left rounded-lg border border-dashed border-border/60 bg-muted/30 px-3 py-2.5 text-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent disabled:opacity-50"
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
                    AI Assistant
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
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="rounded-full bg-accent/10 p-6 mb-4">
                  <MessageSquare className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-lg font-medium">{copy.noMessages}</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {copy.noMessagesDesc}
                </p>
              </div>
            ) : (
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
                  className="w-full rounded-full border bg-muted/50 px-4 py-3 pr-12 text-sm transition-all focus:bg-background focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder={copy.placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                size="icon"
                className="h-12 w-12 rounded-full bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/25 transition-all hover:shadow-accent/40"
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
