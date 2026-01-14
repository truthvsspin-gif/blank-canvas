"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
}

type InboxMessage = {
  id: string
  direction: "inbound" | "outbound"
  message_text: string
  message_timestamp: string
}

type FlowStep = {
  step: string
  status: "ok" | "skipped" | "failed"
  detail?: string
  data?: Record<string, unknown> | null
}

export default function DevChatbotPage() {
  const { businessId } = useCurrentBusiness()
  const [simChannel, setSimChannel] = useState<"whatsapp" | "instagram">("whatsapp")
  const [simMessage, setSimMessage] = useState("Hi, I want pricing for detailing.")
  const [simSender, setSimSender] = useState("+15551234567")
  const [simSenderName, setSimSenderName] = useState("Dev User")
  const [simLoading, setSimLoading] = useState(false)
  const [simError, setSimError] = useState<string | null>(null)
  const [isProd, setIsProd] = useState(false)
  const [threads, setThreads] = useState<InboxThread[]>([])
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [knowledgeReady, setKnowledgeReady] = useState<boolean | null>(null)
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([])

  useEffect(() => {
    setIsProd(process.env.NODE_ENV === "production")
  }, [])

  const formatTime = (value?: string | null) => {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const refreshKnowledge = useCallback(async () => {
    if (!businessId) return
    const { count, error } = await supabase
      .from("knowledge_sources")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
    if (error) {
      setKnowledgeReady(false)
      return
    }
    setKnowledgeReady((count ?? 0) > 0)
  }, [businessId])

  const refreshThreads = useCallback(async () => {
    if (!businessId) return null
    const { data, error } = await supabase
      .from("inbox_threads")
      .select("id, channel, contact_name, contact_handle, last_message_text, last_message_at")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
    if (error) {
      return null
    }
    const rows = (data ?? []) as InboxThread[]
    setThreads(rows)
    if (!activeThreadId && rows.length > 0) {
      setActiveThreadId(rows[0].id)
    }
    return rows
  }, [activeThreadId, businessId])

  const refreshMessages = useCallback(
    async (threadId: string | null) => {
      if (!threadId) {
        setMessages([])
        return
      }
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("id, direction, message_text, message_timestamp")
        .eq("thread_id", threadId)
        .order("message_timestamp", { ascending: true })
      if (error) {
        setMessages([])
        return
      }
      setMessages((data ?? []) as InboxMessage[])
    },
    []
  )

  useEffect(() => {
    refreshKnowledge()
  }, [refreshKnowledge])

  useEffect(() => {
    refreshThreads()
  }, [refreshThreads])

  useEffect(() => {
    refreshMessages(activeThreadId)
  }, [activeThreadId, refreshMessages])

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads]
  )

  const handleSimulate = async () => {
    if (!businessId) {
      setSimError("No active business.")
      return
    }
    setSimLoading(true)
    setSimError(null)
    await refreshKnowledge()
    const response = await fetch("/api/dev/chatbot-simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        channel: simChannel,
        messageText: simMessage,
        senderHandle: simSender,
        senderName: simSenderName,
      }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setSimError(payload?.error || "Simulation failed.")
      setSimLoading(false)
      return
    }

    setFlowSteps((payload?.steps ?? []) as FlowStep[])

    const updatedThreads = await refreshThreads()
    const matching = (updatedThreads ?? []).find(
      (thread) =>
        thread.channel === simChannel &&
        (thread.contact_handle || "").trim() === simSender.trim()
    )
    if (matching) {
      setActiveThreadId(matching.id)
      await refreshMessages(matching.id)
    }
    setSimLoading(false)
  }

  if (isProd) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Dev Chatbot Simulator"
          description="This page is disabled in production."
          actions={<Badge variant="secondary">Dev</Badge>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dev Chatbot Simulator"
        description="Trigger a full chatbot flow and view logs."
        actions={<Badge variant="secondary">Dev</Badge>}
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Chat Simulation</CardTitle>
          <CardDescription>Pick a channel, send a message, and view the reply.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-slate-700">
              <label className="text-xs font-semibold uppercase text-slate-500">Channel</label>
              <select
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                value={simChannel}
                onChange={(event) =>
                  setSimChannel(event.target.value === "instagram" ? "instagram" : "whatsapp")
                }
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Sender handle
              </label>
              <input
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                value={simSender}
                onChange={(event) => setSimSender(event.target.value)}
              />
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <label className="text-xs font-semibold uppercase text-slate-500">Sender name</label>
              <input
                className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                value={simSenderName}
                onChange={(event) => setSimSenderName(event.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                const existing = threads.find(
                  (thread) =>
                    thread.channel === simChannel &&
                    (thread.contact_handle || "").trim() === simSender.trim()
                )
                if (existing) {
                  setActiveThreadId(existing.id)
                }
              }}
              variant="outline"
              size="sm"
            >
              Start chat
            </Button>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
                Chats
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-500">
                    No chats yet. Send a message to start.
                  </div>
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
                      onClick={() => {
                        setActiveThreadId(thread.id)
                        setSimChannel(thread.channel)
                        if (thread.contact_handle) {
                          setSimSender(thread.contact_handle)
                        }
                        if (thread.contact_name) {
                          setSimSenderName(thread.contact_name)
                        }
                      }}
                    >
                      <div className="mt-1 size-8 rounded-full bg-slate-200" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">
                          {thread.contact_name ?? "Unknown"}
                        </p>
                        <p className="text-xs text-slate-500">{thread.contact_handle}</p>
                        {thread.last_message_text ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {thread.last_message_text.slice(0, 34)}
                          </p>
                        ) : null}
                      </div>
                      {thread.last_message_at ? (
                        <span className="text-[11px] text-slate-400">
                          {formatTime(thread.last_message_at)}
                        </span>
                      ) : null}
                      <Badge variant="outline" className="uppercase">
                        {thread.channel === "whatsapp" ? "WA" : "IG"}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {activeThread?.contact_name ?? "Select a chat"}
                </p>
                <p className="text-xs text-slate-500">
                  {activeThread?.contact_handle ?? "No active chat"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {activeThread?.channel === "instagram" ? "Instagram" : "WhatsApp"}
                </Badge>
                <Button size="sm" variant="outline" onClick={refreshKnowledge}>
                  Refresh knowledge
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!activeThreadId) return
                    await supabase.from("inbox_messages").delete().eq("thread_id", activeThreadId)
                    await supabase
                      .from("inbox_threads")
                      .update({
                        last_message_text: null,
                        last_message_at: null,
                        last_message_direction: null,
                        unread_count: 0,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", activeThreadId)
                    setMessages([])
                  }}
                >
                  Clear chat
                </Button>
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,_#f8f5f2,_#f3efe7)] p-4">
              {knowledgeReady === false ? (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  No content ingested yet. Add knowledge base content to get full answers.
                </div>
              ) : null}
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
                {messages.map((entry) => (
                  <div
                    key={entry.id}
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      entry.direction === "inbound"
                        ? "self-end bg-rose-600 text-white"
                        : "self-start bg-white text-slate-700 shadow-sm"
                    }`}
                  >
                    <div className="space-y-2 whitespace-pre-wrap break-words leading-6">
                      {entry.message_text
                        .split(/\n{2,}/)
                        .map((chunk, index) => (
                          <p key={`${entry.id}-${index}`}>{chunk}</p>
                        ))}
                    </div>
                    <span className="mt-1 block text-[11px] opacity-70">
                      {formatTime(entry.message_timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <textarea
                className="min-h-[44px] flex-1 resize-none rounded-lg border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-200"
                value={simMessage}
                onChange={(event) => setSimMessage(event.target.value)}
                placeholder="Type a message..."
              />
              <Button
                onClick={() => {
                  if (!simMessage.trim()) return
                  handleSimulate()
                }}
                disabled={simLoading}
                className="bg-rose-600 text-white hover:bg-rose-500"
              >
                {simLoading ? "Sending..." : "Send"}
              </Button>
            </div>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Dev Test Flow Logs</CardTitle>
                <CardDescription>Step-by-step results for the simulated run.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {flowSteps.length === 0 ? (
                  <div className="text-sm text-slate-500">Run a simulation to see step logs.</div>
                ) : (
                  flowSteps.map((step) => (
                    <div key={step.step} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{step.step.replace(/_/g, " " )}</p>
                        <Badge variant={step.status === "failed" ? "destructive" : step.status === "ok" ? "secondary" : "outline"}>
                          {step.status}
                        </Badge>
                      </div>
                      {step.detail ? (
                        <p className="mt-1 text-sm text-slate-600">{step.detail}</p>
                      ) : null}
                      {step.data ? (
                        <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 text-xs text-slate-500">
                          {JSON.stringify(step.data, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {simError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                {simError}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
