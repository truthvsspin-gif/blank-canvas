import { createBrowserClient } from "@supabase/auth-helpers-nextjs"

import { env } from "@/config/env"

// Single browser client that stores auth in cookies, keeping middleware/server checks in sync
export const supabase = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
