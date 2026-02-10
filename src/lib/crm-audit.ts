import { SupabaseClient } from "@supabase/supabase-js"

type AuditPayload = {
  businessId: string
  actorUserId?: string | null
  entityType: string
  entityId: string
  action: string
  details?: Record<string, unknown>
}

export async function logCrmAudit(supabase: SupabaseClient, payload: AuditPayload) {
  const { businessId, actorUserId, entityType, entityId, action, details } = payload
  const { error } = await supabase.from("crm_audit_logs").insert({
    business_id: businessId,
    actor_user_id: actorUserId || null,
    entity_type: entityType,
    entity_id: entityId,
    action,
    details: details || {},
  })
  if (error) {
    console.error("Audit log failed", error)
  }
}
