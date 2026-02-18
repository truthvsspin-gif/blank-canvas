// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SCOPES = "https://www.googleapis.com/auth/calendar";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // --- ACTION: initiate ---
    // Returns a Google OAuth URL for the user to authorize
    if (action === "initiate") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => ({}));
      const businessId = body.businessId;
      const redirectUri = body.redirectUri;
      if (!businessId || !redirectUri) {
        return new Response(JSON.stringify({ error: "businessId and redirectUri are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // state carries businessId so callback knows which business to link
      const state = JSON.stringify({ businessId, userId: claims.claims.sub });

      const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      googleAuthUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
      googleAuthUrl.searchParams.set("response_type", "code");
      googleAuthUrl.searchParams.set("scope", SCOPES);
      googleAuthUrl.searchParams.set("access_type", "offline");
      googleAuthUrl.searchParams.set("prompt", "consent");
      googleAuthUrl.searchParams.set("state", state);

      return new Response(JSON.stringify({ url: googleAuthUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: callback ---
    // Exchanges auth code for tokens and stores refresh token
    if (action === "callback") {
      const body = await req.json().catch(() => ({}));
      const { code, redirectUri, state } = body;

      if (!code || !redirectUri || !state) {
        return new Response(JSON.stringify({ error: "code, redirectUri, and state are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let parsedState: { businessId: string; userId: string };
      try {
        parsedState = JSON.parse(state);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("Google token exchange failed:", tokenData);
        return new Response(JSON.stringify({ error: "Token exchange failed", details: tokenData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refreshToken = tokenData.refresh_token;
      const accessToken = tokenData.access_token;

      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: "No refresh token returned. Make sure you revoked prior access or use prompt=consent." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get primary calendar ID
      const calRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const calData = await calRes.json();
      const calendarId = calData.id || "primary";

      // Store in business_integrations
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: upsertErr } = await supabaseAdmin
        .from("business_integrations")
        .upsert(
          {
            business_id: parsedState.businessId,
            google_calendar_refresh_token: refreshToken,
            google_calendar_id: calendarId,
            google_calendar_connected: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id" }
        );

      if (upsertErr) {
        console.error("Failed to save Google Calendar tokens:", upsertErr);
        return new Response(JSON.stringify({ error: "Failed to save tokens" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, calendarId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: disconnect ---
    if (action === "disconnect") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json().catch(() => ({}));
      const businessId = body.businessId;
      if (!businessId) {
        return new Response(JSON.stringify({ error: "businessId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { error: updateErr } = await supabaseAdmin
        .from("business_integrations")
        .update({
          google_calendar_refresh_token: null,
          google_calendar_id: null,
          google_calendar_connected: false,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);

      if (updateErr) {
        return new Response(JSON.stringify({ error: "Failed to disconnect" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: status ---
    if (action === "status") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
      if (claimsErr || !claims?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const businessId = url.searchParams.get("businessId");
      if (!businessId) {
        return new Response(JSON.stringify({ error: "businessId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error: fetchErr } = await supabase
        .from("business_integrations")
        .select("google_calendar_connected, google_calendar_id")
        .eq("business_id", businessId)
        .maybeSingle();

      if (fetchErr) {
        return new Response(JSON.stringify({ error: fetchErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          connected: data?.google_calendar_connected ?? false,
          calendarId: data?.google_calendar_id ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: initiate, callback, disconnect, status" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("google-calendar-auth error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
