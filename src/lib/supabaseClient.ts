import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://ybifjdlelpvgzmzvgwls.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaWZqZGxlbHB2Z3ptenZnd2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Mjg2NTUsImV4cCI6MjA4MTAwNDY1NX0.uriVOIaURJbw8z3JJ0GIlrdPo96XfyZlUsOudd7-Qjg"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
