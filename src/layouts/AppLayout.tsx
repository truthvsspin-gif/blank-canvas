import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

import { MainNav } from "@/components/layout/main-nav";
import { UserNav } from "@/components/layout/user-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/providers/language-provider";
import { BusinessGate } from "@/components/business/business-gate";
import { appSections } from "@/config/navigation";

export default function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    Array<{ from: "user" | "bot"; text: string }>
  >([{ from: "bot", text: "Hi! How can I help you today?" }]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const { lang, toggleLang } = useLanguage();
  const isSpanish = lang === "es";
  const copy = {
    brandSubtitle: isSpanish ? "Panel de producto" : "Product Console",
    badge: isSpanish ? "Listo para multiples inquilinos" : "Multi-tenant ready",
    switchTenant: isSpanish ? "Cambiar espacio" : "Switch tenant",
    langLabel: isSpanish ? "ES" : "EN",
    langAlt: isSpanish ? "Cambiar a ingles" : "Switch to Spanish",
    sessionCheck: isSpanish ? "Verificando tu sesion..." : "Checking your session...",
    menuLabel: isSpanish ? "Abrir menu" : "Open menu",
  };

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;
    setChatMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to send message.");
      }
      const reply = typeof payload?.reply === "string" ? payload.reply : "Thanks for your message.";
      setChatMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chatbot failed.";
      setChatError(message);
      setChatMessages((prev) => [...prev, { from: "bot", text: "Sorry, something went wrong." }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        {copy.sessionCheck}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg border bg-muted text-sm font-semibold overflow-hidden">
              <img
                src="/4.png"
                alt="Detapro logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Detapro</p>
              <p className="text-sm font-semibold">{copy.brandSubtitle}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {copy.badge}
              </Badge>
              <Button variant="outline" size="sm">
                {copy.switchTenant}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="border border-input"
                aria-label={copy.langAlt}
                onClick={() => toggleLang()}
              >
                {copy.langLabel}
              </Button>
              <UserNav />
            </div>
            <div className="flex items-center gap-2 sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="border border-input"
                aria-label={copy.langAlt}
                onClick={() => toggleLang()}
              >
                {copy.langLabel}
              </Button>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="border border-input"
                  aria-label={copy.menuLabel}
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <Menu className="size-5" />
                </Button>
                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white p-2 shadow-lg">
                    <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-slate-800">
                      <span>{copy.badge}</span>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                      {copy.switchTenant}
                    </Button>
                    <div className="mt-2 grid gap-2">
                      {appSections.map((section) => (
                        <Link
                          key={section.href}
                          to={section.href}
                          className="rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-slate-100"
                          onClick={() => setMenuOpen(false)}
                        >
                          {section.name[lang]}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-6 pb-3 md:hidden">
          <MainNav className="w-full justify-start overflow-x-auto" />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-10">
        <aside className="sticky top-20 hidden h-[calc(100vh-120px)] w-64 flex-none overflow-hidden rounded-2xl border bg-card/50 backdrop-blur-sm shadow-xl shadow-black/5 md:block">
          <div className="flex h-full flex-col p-4 overflow-y-auto scrollbar-thin">
            <SidebarNav />
          </div>
        </aside>
        <main className="flex-1 space-y-8">
          <BusinessGate>
            <Outlet />
          </BusinessGate>
        </main>
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        {chatOpen ? (
          <div className="w-[320px] max-w-[90vw] overflow-hidden rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Chatbot</p>
                <p className="text-xs text-slate-500">Quick support</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-600 hover:text-slate-900"
                onClick={() => setChatOpen(false)}
                aria-label="Close chatbot"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3 text-sm">
              {chatMessages.map((message, idx) => (
                <div
                  key={`${message.from}-${idx}`}
                  className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                      message.from === "user"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              {chatLoading ? (
                <div className="text-xs text-slate-400">Sending...</div>
              ) : null}
              {chatError ? (
                <div className="text-xs text-rose-500">{chatError}</div>
              ) : null}
            </div>
            <div className="border-t px-3 py-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-xs">
                <input
                  className="flex-1 bg-transparent text-sm text-slate-800 outline-none"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSendChat();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full bg-slate-900 text-white hover:bg-slate-800"
                  onClick={handleSendChat}
                  aria-label="Send message"
                >
                  <Send className="size-4" />
                </Button>
              </div>
              <div className="mt-2 text-xs text-slate-500">
                For full settings, open{" "}
                <Link to="/chatbot" className="underline">
                  Chatbot
                </Link>
                .
              </div>
            </div>
          </div>
        ) : null}

        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-rose-600 text-white shadow-lg hover:bg-rose-500"
          aria-label="Open chatbot"
          onClick={() => setChatOpen((prev) => !prev)}
        >
          <MessageCircle className="size-5" />
        </Button>
      </div>
    </div>
  );
}
