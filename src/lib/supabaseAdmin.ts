import { createClient } from "@supabase/supabase-js"

import { env } from "@/config/env"

let adminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (adminClient) return adminClient
  if (!env.supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for webhook ingestion.")
  }
  adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  return adminClient
}
