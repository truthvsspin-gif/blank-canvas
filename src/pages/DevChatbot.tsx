import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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
};

export default function DevChatbotPage() {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const { businessId, loading: bizLoading } = useCurrentBusiness();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      isEs
        ? {
            title: "Simulador de Chatbot",
            desc: "Prueba el flujo de respuestas del chatbot en tiempo real.",
            placeholder: "Escribe un mensaje...",
            send: "Enviar",
            sending: "Enviando...",
            noBusiness: "No hay negocio activo.",
            errorFetch: "Error al enviar el mensaje.",
            hint: "Los mensajes se procesan con la misma logica que WhatsApp/Instagram.",
          }
        : {
            title: "Chatbot Simulator",
            desc: "Test the chatbot response flow in real time.",
            placeholder: "Type a message...",
            send: "Send",
            sending: "Sending...",
            noBusiness: "No active business.",
            errorFetch: "Failed to send message.",
            hint: "Messages are processed with the same logic as WhatsApp/Instagram.",
          },
    [isEs]
  );

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    if (!businessId) {
      setError(copy.noBusiness);
      return;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dev/chatbot-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, message: trimmed }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || copy.errorFetch);
      }

      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "bot",
        text: data?.reply || "...",
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorFetch);
    } finally {
      setLoading(false);
    }
  }, [input, loading, businessId, copy]);

  if (bizLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={copy.title} description={copy.desc} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.hint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-96 min-h-[200px] space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {isEs ? "Sin mensajes aun." : "No messages yet."}
              </p>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground border"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border bg-background px-4 py-2 text-sm text-muted-foreground">
                  <Loader2 className="inline-block size-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={copy.placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              <span className="ml-2 hidden sm:inline">{loading ? copy.sending : copy.send}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
