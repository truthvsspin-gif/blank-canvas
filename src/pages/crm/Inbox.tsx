import { useEffect, useMemo, useState } from "react"
import { 
  MessageSquare, 
  Search, 
  Phone, 
  Instagram, 
  Send,
  MoreVertical,
  CheckCheck,
  Clock,
  Sparkles,
  Filter,
  ArrowLeft,
  User,
  AtSign,
  Zap
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { useLanguage } from "@/components/providers/language-provider"
import { supabase } from "@/lib/supabaseClient"

type InboxThread = {
  id: string
  channel: "whatsapp" | "instagram"
  contact_name: string | null
  contact_handle: string | null
  last_message_text: string | null
  last_message_at: string | null
  last_intent: string | null
  unread_count?: number
}

type InboxMessage = {
  id: string
  direction: "inbound" | "outbound"
  message_text: string
  message_timestamp: string
  message_type?: "text" | "image" | "document"
  file_url?: string | null
}

export default function CrmInboxPage() {
  const { businessId } = useCurrentBusiness()
  const { lang } = useLanguage()
  const isEs = lang === "es"
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterChannel, setFilterChannel] = useState<"all" | "whatsapp" | "instagram">("all")
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)

  const copy = isEs
    ? {
        title: "Bandeja de Entrada",
        subtitle: "Gestiona conversaciones de WhatsApp e Instagram",
        search: "Buscar conversaciones...",
        noConversations: "No hay conversaciones aún",
        noMessages: "Selecciona una conversación para ver los mensajes",
        loading: "Cargando...",
        all: "Todos",
        unread: "No leído",
        typeMessage: "Escribe un mensaje...",
        send: "Enviar",
        today: "Hoy",
        yesterday: "Ayer",
        aiSuggestion: "Sugerencia IA",
      }
    : {
        title: "Inbox",
        subtitle: "Manage WhatsApp and Instagram conversations",
        search: "Search conversations...",
        noConversations: "No conversations yet",
        noMessages: "Select a conversation to view messages",
        loading: "Loading...",
        all: "All",
        unread: "Unread",
        typeMessage: "Type a message...",
        send: "Send",
        today: "Today",
        yesterday: "Yesterday",
        aiSuggestion: "AI Suggestion",
      }

  useEffect(() => {
    if (!businessId) return
    const loadThreads = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("inbox_threads")
        .select("id, channel, contact_name, contact_handle, last_message_text, last_message_at, last_intent, unread_count")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
      if (!error) {
        const rows = (data ?? []) as InboxThread[]
        setThreads(rows)
        if (!activeThreadId && rows.length > 0) {
          setActiveThreadId(rows[0].id)
        }
      }
      setLoading(false)
    }
    loadThreads()
  }, [activeThreadId, businessId])

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([])
      return
    }
    const loadMessages = async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("id, direction, message_text, message_timestamp, message_type, file_url")
        .eq("thread_id", activeThreadId)
        .order("message_timestamp", { ascending: true })
      if (!error) {
        setMessages((data ?? []) as InboxMessage[])
      }
    }
    loadMessages()
    // Load AI suggestion
    if (activeThreadId && businessId) {
      fetchAiSuggestion()
    }
  }, [activeThreadId])

  const fetchAiSuggestion = async () => {
    if (!activeThreadId || !businessId) return
    setAiSuggestion(null)
    try {
      const response = await fetch(`https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/ai-suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeThreadId, businessId, lastMessages: messages.slice(-5) }),
      })
      const data = await response.json()
      if (data.suggestion) setAiSuggestion(data.suggestion)
    } catch (e) {
      console.error("AI suggestion error:", e)
    }
  }

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeThreadId || !businessId || sending) return
    setSending(true)
    try {
      const response = await fetch(`https://ybifjdlelpvgzmzvgwls.supabase.co/functions/v1/send-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeThreadId, messageText: replyText.trim(), businessId }),
      })
      if (response.ok) {
        // Optimistically add message
        const newMessage: InboxMessage = {
          id: crypto.randomUUID(),
          direction: "outbound",
          message_text: replyText.trim(),
          message_timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, newMessage])
        setReplyText("")
        // Update thread list
        setThreads((prev) => prev.map((t) => 
          t.id === activeThreadId ? { ...t, last_message_text: replyText.trim(), unread_count: 0 } : t
        ))
      }
    } catch (e) {
      console.error("Send error:", e)
    }
    setSending(false)
  }

  const handleMarkAsRead = async () => {
    if (!activeThreadId || !businessId) return
    await supabase.from("inbox_threads").update({ unread_count: 0 }).eq("id", activeThreadId)
    setThreads((prev) => prev.map((t) => t.id === activeThreadId ? { ...t, unread_count: 0 } : t))
  }

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  )

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const matchesSearch = !searchQuery || 
        thread.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.contact_handle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.last_message_text?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesChannel = filterChannel === "all" || thread.channel === filterChannel
      return matchesSearch && matchesChannel
    })
  }, [threads, searchQuery, filterChannel])

  const formatTime = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = date.toDateString() === yesterday.toDateString()
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    if (isYesterday) {
      return isEs ? "Ayer" : "Yesterday"
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  const formatMessageTime = (value: string) => {
    const date = new Date(value)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getChannelIcon = (channel: "whatsapp" | "instagram") => {
    return channel === "whatsapp" ? (
      <Phone className="size-4" />
    ) : (
      <Instagram className="size-4" />
    )
  }

  const getChannelColor = (channel: "whatsapp" | "instagram") => {
    return channel === "whatsapp" 
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
      : "bg-pink-500/10 text-pink-500 border-pink-500/20"
  }

  const totalUnread = useMemo(() => {
    return threads.reduce((acc, t) => acc + (t.unread_count ?? 0), 0)
  }, [threads])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={copy.title}
        description={copy.subtitle}
        actions={
          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <Badge className="bg-primary text-primary-foreground animate-pulse">
                {totalUnread} {copy.unread}
              </Badge>
            )}
            <Badge variant="outline" className="border-border">
              <MessageSquare className="size-3 mr-1" />
              {threads.length}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr] h-[calc(100vh-220px)] min-h-[600px]">
        {/* Thread List */}
        <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
          {/* Search & Filter */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={copy.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterChannel === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterChannel("all")}
                className={filterChannel === "all" ? "bg-foreground text-background" : "border-border"}
              >
                {copy.all}
              </Button>
              <Button
                variant={filterChannel === "whatsapp" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterChannel("whatsapp")}
                className={filterChannel === "whatsapp" ? "bg-emerald-500 text-white hover:bg-emerald-600" : "border-border"}
              >
                <Phone className="size-3 mr-1" />
                WhatsApp
              </Button>
              <Button
                variant={filterChannel === "instagram" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterChannel("instagram")}
                className={filterChannel === "instagram" ? "bg-pink-500 text-white hover:bg-pink-600" : "border-border"}
              >
                <Instagram className="size-3 mr-1" />
                Instagram
              </Button>
            </div>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-primary animate-bounce" />
                  <div className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <div className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.2s" }} />
                </div>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <MessageSquare className="size-8 mb-2 opacity-50" />
                <p className="text-sm">{copy.noConversations}</p>
              </div>
            ) : (
              filteredThreads.map((thread, index) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full flex items-start gap-3 p-4 text-left transition-all duration-200 border-b border-border/50 hover:bg-accent/50 animate-fade-in ${
                    activeThreadId === thread.id ? "bg-accent" : ""
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className={`size-12 rounded-full flex items-center justify-center ${getChannelColor(thread.channel)}`}>
                      {getChannelIcon(thread.channel)}
                    </div>
                    {(thread.unread_count ?? 0) > 0 && (
                      <div className="absolute -top-1 -right-1 size-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                        {thread.unread_count}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground truncate">
                        {thread.contact_name || "Unknown"}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(thread.last_message_at)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {thread.contact_handle}
                    </p>
                    {thread.last_message_text && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {thread.last_message_text}
                      </p>
                    )}
                    {thread.last_intent && (
                      <Badge variant="secondary" className="mt-2 text-[10px] uppercase">
                        <Zap className="size-3 mr-1" />
                        {thread.last_intent.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Message View */}
        <Card className="border-border bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col">
          {activeThread ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-full flex items-center justify-center ${getChannelColor(activeThread.channel)}`}>
                    {getChannelIcon(activeThread.channel)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{activeThread.contact_name || "Unknown"}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <AtSign className="size-3" />
                      {activeThread.contact_handle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getChannelColor(activeThread.channel)}>
                    {activeThread.channel === "whatsapp" ? "WhatsApp" : "Instagram"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                    <MoreVertical className="size-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-muted/20 to-muted/5">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="size-12 mb-3 opacity-30" />
                    <p className="text-sm">{copy.noMessages}</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"} animate-fade-in`}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                          message.direction === "outbound"
                            ? "bg-foreground text-background rounded-br-sm"
                            : "bg-card text-foreground border border-border rounded-bl-sm"
                        }`}
                      >
                        {message.message_type === "image" && message.file_url ? (
                          <img 
                            src={message.file_url} 
                            alt={message.message_text}
                            className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90"
                            onClick={() => window.open(message.file_url!, "_blank")}
                          />
                        ) : null}
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {message.message_text}
                        </p>
                        <div className={`flex items-center gap-1 mt-1.5 ${
                          message.direction === "outbound" ? "justify-end" : "justify-start"
                        }`}>
                          <span className="text-[11px] opacity-60">
                            {formatMessageTime(message.message_timestamp)}
                          </span>
                          {message.direction === "outbound" && (
                            <CheckCheck className="size-3.5 opacity-60" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* AI Suggestion */}
              {aiSuggestion && (
                <div className="px-4 py-2 border-t border-border bg-primary/5">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="size-4 text-primary" />
                    <span className="text-primary font-medium">{copy.aiSuggestion}:</span>
                    <span className="text-muted-foreground truncate flex-1">{aiSuggestion}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setReplyText(aiSuggestion)}
                      className="ml-auto text-primary hover:text-primary hover:bg-primary/10"
                    >
                      {isEs ? "Usar" : "Use"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder={copy.typeMessage}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                    className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <Button 
                    onClick={handleSendReply} 
                    disabled={sending || !replyText.trim()}
                    className="bg-foreground text-background hover:bg-foreground/90 rounded-xl px-6"
                  >
                    <Send className="size-4 mr-2" />
                    {sending ? "..." : copy.send}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <div className="grid size-20 place-items-center rounded-2xl bg-muted/50 mb-4">
                <MessageSquare className="size-10 opacity-50" />
              </div>
              <p className="text-lg font-medium text-foreground mb-1">
                {isEs ? "Bienvenido a tu Bandeja" : "Welcome to your Inbox"}
              </p>
              <p className="text-sm text-muted-foreground">
                {copy.noMessages}
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
