// This module is intended for server-side use only (edge functions).
// In a Vite frontend build, we provide a stub that throws if accessed.

import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;
  
  // These would come from edge function environment, not from frontend
  const url = import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = ""; // Service role key should never be in frontend
  
  if (!serviceRoleKey) {
    throw new Error(
      "getSupabaseAdmin() is only available in edge functions. " +
      "SUPABASE_SERVICE_ROLE_KEY must be set as a server secret."
    );
  }
  
  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return adminClient;
}
