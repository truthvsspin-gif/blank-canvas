// @ts-nocheck - Deno edge function, uses Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { businessId, period } = await req.json();

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "Missing businessId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    const targetPeriod = period || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    // Fetch usage counters
    const { data: usage, error } = await supabase
      .from("usage_monthly")
      .select("metric, value, period")
      .eq("business_id", businessId)
      .eq("period", targetPeriod);

    if (error) {
      console.error("Usage fetch error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch business limits and plan tier
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("plan_tier, monthly_conversation_limit, monthly_ai_reply_limit")
      .eq("id", businessId)
      .single();

    if (bizError) {
      console.error("Business fetch error:", bizError);
    }

    const counters = {
      conversations_24h: 0,
      qualified_leads: 0,
      ai_replies: 0,
    };

    for (const row of usage || []) {
      if (row.metric === "conversations_24h") {
        counters.conversations_24h = row.value || 0;
      } else if (row.metric === "qualified_leads") {
        counters.qualified_leads = row.value || 0;
      } else if (row.metric === "ai_replies") {
        counters.ai_replies = row.value || 0;
      }
    }

    const limits = {
      conversations_24h: business?.monthly_conversation_limit ?? 50,
      ai_replies: business?.monthly_ai_reply_limit ?? 100,
    };

    return new Response(
      JSON.stringify({
        success: true,
        period: targetPeriod,
        counters,
        limits,
        plan_tier: business?.plan_tier ?? "free",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Get usage error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
