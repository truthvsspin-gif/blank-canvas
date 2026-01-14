import { getSupabaseAdmin } from "@/lib/supabaseAdmin"

export type BusinessContext = {
  business_id: string
  business_name: string | null
  services: Array<{
    name: string
    description: string | null
    base_price: number | null
    duration_minutes: number | null
  }>
  office_hours: string | null
  language_preference: "en" | "es" | null
  booking_rules: Record<string, unknown>
}

type CachedContext = {
  value: BusinessContext
  expiresAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000
const contextCache = new Map<string, CachedContext>()

function readCache(businessId: string): BusinessContext | null {
  const cached = contextCache.get(businessId)
  if (!cached) return null
  if (cached.expiresAt < Date.now()) {
    contextCache.delete(businessId)
    return null
  }
  return cached.value
}

function writeCache(businessId: string, value: BusinessContext) {
  contextCache.set(businessId, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

export function clearBusinessContextCache(businessId?: string) {
  if (!businessId) {
    contextCache.clear()
    return
  }
  contextCache.delete(businessId)
}

export async function loadBusinessContext(businessId: string): Promise<BusinessContext> {
  const cached = readCache(businessId)
  if (cached) return cached

  const supabase = getSupabaseAdmin()
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, language_preference, office_hours, booking_rules")
    .eq("id", businessId)
    .single()

  const { data: services } = await supabase
    .from("services")
    .select("name, description, base_price, duration_minutes")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("name", { ascending: true })

  const businessRecord = business as
    | {
        name?: string | null
        language_preference?: string | null
        office_hours?: string | null
        booking_rules?: Record<string, unknown> | null
      }
    | null
  const serviceRecords = (services as BusinessContext["services"]) ?? []

  const context: BusinessContext = {
    business_id: businessId,
    business_name: businessRecord?.name ?? null,
    services: serviceRecords,
    office_hours: businessRecord?.office_hours ?? null,
    language_preference:
      businessRecord?.language_preference === "es" ||
      businessRecord?.language_preference === "en"
        ? businessRecord.language_preference
        : null,
    booking_rules:
      businessRecord?.booking_rules && typeof businessRecord.booking_rules === "object"
        ? (businessRecord.booking_rules as Record<string, unknown>)
        : {},
  }

  writeCache(businessId, context)
  return context
}
