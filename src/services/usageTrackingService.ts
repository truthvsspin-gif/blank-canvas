import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import type { NormalizedMessage } from "@/services/messageIngest"

export type UsageMonthlyMetric = "conversations_24h" | "qualified_leads"

type UsageCounter = {
  business_id: string
  metric: UsageMonthlyMetric
  value: number
  period: string
}

const MS_IN_24_HOURS = 24 * 60 * 60 * 1000

function getCurrentPeriod(date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function buildConversationKey(message: NormalizedMessage): string | null {
  return message.sender_phone_or_handle || message.conversation_id || null
}

async function incrementMonthlyCounter(params: {
  businessId: string
  metric: UsageMonthlyMetric
  amount?: number
  period?: string
}): Promise<UsageCounter> {
  const { businessId, metric } = params
  const amount = params.amount ?? 1
  const period = params.period ?? getCurrentPeriod()
  const supabase = getSupabaseAdmin()

  const usageTable = supabase.from("usage_monthly") as any
  const { data: existing } = await usageTable
    .select("id, value")
    .eq("business_id", businessId)
    .eq("metric", metric)
    .eq("period", period)
    .maybeSingle()

  if (existing?.id) {
    const nextValue = Number(existing.value ?? 0) + amount
    const { data: updated, error } = await usageTable
      .update({ value: nextValue, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("business_id, metric, value, period")
      .single()

    if (error) {
      throw new Error(error.message)
    }
    return updated as UsageCounter
  }

  const { data: inserted, error } = await usageTable
    .insert({
      business_id: businessId,
      metric,
      value: amount,
      period,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("business_id, metric, value, period")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return inserted as UsageCounter
}

export async function trackConversationWindow(message: NormalizedMessage) {
  const conversationKey = buildConversationKey(message)
  if (!conversationKey) return null

  const supabase = getSupabaseAdmin()
  const threadsTable = supabase.from("inbox_threads") as any
  const { data } = await threadsTable
    .select("id, last_usage_window_at")
    .eq("business_id", message.business_id)
    .eq("channel", message.channel)
    .eq("conversation_id", conversationKey)
    .maybeSingle()

  const thread = data as { id?: string; last_usage_window_at?: string | null } | null
  if (!thread?.id) {
    return null
  }

  const now = new Date(message.timestamp)
  const lastWindow = thread.last_usage_window_at
    ? new Date(thread.last_usage_window_at)
    : null
  const isNewWindow = !lastWindow || now.getTime() - lastWindow.getTime() >= MS_IN_24_HOURS

  if (!isNewWindow) {
    return null
  }

  await threadsTable
    .update({ last_usage_window_at: now.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", thread.id)

  return incrementMonthlyCounter({
    businessId: message.business_id,
    metric: "conversations_24h",
    amount: 1,
    period: getCurrentPeriod(now),
  })
}

export async function incrementQualifiedLeads(businessId: string, amount = 1) {
  return incrementMonthlyCounter({
    businessId,
    metric: "qualified_leads",
    amount,
  })
}

export async function getUsageCounters(businessId: string, period?: string) {
  const supabase = getSupabaseAdmin()
  const targetPeriod = period ?? getCurrentPeriod()
  const { data } = await supabase
    .from("usage_monthly")
    .select("metric, value, period")
    .eq("business_id", businessId)
    .eq("period", targetPeriod)
  return data ?? []
}

export async function evaluateUsageLimits(businessId: string) {
  const counters = await getUsageCounters(businessId)
  return {
    overLimit: false,
    counters,
  }
}

export async function resetMonthlyUsageCounters(targetPeriod?: string) {
  const period = targetPeriod ?? getCurrentPeriod()
  void period
}
