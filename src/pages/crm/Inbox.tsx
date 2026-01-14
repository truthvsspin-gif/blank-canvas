import { useEffect, useMemo, useState } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrentBusiness } from "@/hooks/use-current-business"
import { supabase } from "@/lib/supabaseClient"

type InboxThread = {
  id: string
  channel: "whatsapp" | "instagram"
  contact_name: string | null
  contact_handle: string | null
  last_message_text: string | null
  last_message_at: string | null
  last_intent: string | null
}

type InboxMessage = {
  id: string
  direction: "inbound" | "outbound"
  message_text: string
  message_timestamp: string
}

export default function CrmInboxPage() {
  const { businessId } = useCurrentBusiness()
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) return
    const loadThreads = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("inbox_threads")
        .select("id, channel, contact_name, contact_handle, last_message_text, last_message_at, last_intent")
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
        .select("id, direction, message_text, message_timestamp")
        .eq("thread_id", activeThreadId)
        .order("message_timestamp", { ascending: true })
      if (!error) {
        setMessages((data ?? []) as InboxMessage[])
      }
    }
    loadMessages()
  }, [activeThreadId])

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  )

  const formatTime = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM Inbox"
        description="View WhatsApp and Instagram conversations by business."
        actions={<Badge variant="secondary">Inbox</Badge>}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Grouped by conversation ID for quick follow-up.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
              Inbox
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {loading ? (
                <div className="px-3 py-4 text-xs text-slate-500">Loading conversations...</div>
              ) : threads.length === 0 ? (
                <div className="px-3 py-4 text-xs text-slate-500">No conversations yet.</div>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left text-sm ${
                      activeThreadId === thread.id
                        ? "bg-slate-100"
                        : "bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <div className="mt-1 size-8 rounded-full bg-slate-200" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">
                        {thread.contact_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">{thread.contact_handle}</p>
                      {thread.last_message_text ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {thread.last_message_text.slice(0, 40)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[11px] text-slate-400">
                        {formatTime(thread.last_message_at)}
                      </span>
                      <Badge variant="outline" className="uppercase">
                        {thread.channel === "whatsapp" ? "WA" : "IG"}
                      </Badge>
                      {thread.last_intent ? (
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {thread.last_intent.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">
                {activeThread?.contact_name ?? "Select a conversation"}
              </p>
              <p className="text-xs text-slate-500">
                {activeThread?.contact_handle ?? ""}
              </p>
            </div>

            <div className="flex-1 rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#f8f5f2,_#f3efe7)] p-4">
              <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-xs text-slate-500">No messages yet.</div>
                ) : (
                  messages.map((entry) => (
                    <div
                      key={entry.id}
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        entry.direction === "inbound"
                          ? "self-end bg-rose-600 text-white"
                          : "self-start bg-white text-slate-700 shadow-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words leading-6">
                        {entry.message_text}
                      </div>
                      <span className="mt-1 block text-[11px] opacity-70">
                        {formatTime(entry.message_timestamp)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

