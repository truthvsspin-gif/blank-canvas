// @ts-nocheck - Deno edge function, uses Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { businessId } = await req.json();
    if (!businessId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing businessId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership?.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Access denied for this workspace." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: integration, error: integrationError } = await supabase
      .from("business_integrations")
      .select("whatsapp_access_token, whatsapp_phone_number_id")
      .eq("business_id", businessId)
      .maybeSingle();

    if (integrationError) {
      throw integrationError;
    }

    const token = integration?.whatsapp_access_token;
    const phoneNumberId = integration?.whatsapp_phone_number_id;

    if (!token || !phoneNumberId) {
      return new Response(
        JSON.stringify({ success: false, error: "WhatsApp credentials are not configured." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage = payload?.error?.message || "Failed to fetch WhatsApp quality data from Meta.";
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        display_phone_number: payload?.display_phone_number || null,
        verified_name: payload?.verified_name || null,
        quality_rating: payload?.quality_rating || null,
        messaging_limit_tier: payload?.messaging_limit_tier || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("[whatsapp-health] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
