import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

// Single browser client for auth and data access
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
