// @ts-nocheck - Deno edge function, uses Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const allowedRequesterRoles = new Set(["owner", "admin", "manager"]);
const allowedTargetRoles = new Set(["member", "manager", "admin"]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") return null;
  return token;
}

async function findAuthUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  let page = 1;
  const perPage = 200;

  while (page <= 25) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const found = users.find((row) => (row.email || "").toLowerCase() === email);
    if (found) return found;
    if (users.length < perPage) return null;

    page += 1;
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return json({ error: "Missing authorization token" }, 401);
    }

    const { businessId, email, fullName, role, redirectTo } = await req.json();

    if (!businessId || !email) {
      return json({ error: "Missing required fields: businessId, email" }, 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const targetRole = allowedTargetRoles.has(role) ? role : "member";

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: requesterData, error: requesterError } = await adminClient.auth.getUser(token);
    if (requesterError || !requesterData?.user?.id) {
      return json({ error: "Unauthorized" }, 401);
    }
    const requesterUserId = requesterData.user.id;

    const { data: requesterMembership, error: requesterMembershipError } = await adminClient
      .from("memberships")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", requesterUserId)
      .maybeSingle();

    if (requesterMembershipError) {
      return json({ error: requesterMembershipError.message }, 500);
    }

    if (!requesterMembership?.role || !allowedRequesterRoles.has(requesterMembership.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const existingAuthUser = await findAuthUserByEmail(adminClient, normalizedEmail);
    let invited = false;
    let targetUserId: string | null = existingAuthUser?.id || null;

    if (!targetUserId) {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          full_name: fullName || null,
        },
        redirectTo: redirectTo || undefined,
      });

      if (inviteError) {
        return json({ error: inviteError.message }, 500);
      }

      targetUserId = inviteData?.user?.id || null;
      invited = true;
    }

    if (!targetUserId) {
      return json({ error: "Could not resolve target user" }, 500);
    }

    const { error: userUpsertError } = await adminClient.from("users").upsert({
      id: targetUserId,
      email: normalizedEmail,
      full_name: fullName || null,
    });

    if (userUpsertError) {
      return json({ error: userUpsertError.message }, 500);
    }

    const { error: membershipError } = await adminClient
      .from("memberships")
      .upsert(
        {
          business_id: businessId,
          user_id: targetUserId,
          role: targetRole,
        },
        { onConflict: "business_id,user_id" }
      );

    if (membershipError) {
      return json({ error: membershipError.message }, 500);
    }

    return json({
      success: true,
      invited,
      email: normalizedEmail,
      userId: targetUserId,
      role: targetRole,
    });
  } catch (error) {
    console.error("invite-team-member error", error);
    return json({ error: error?.message || "Unexpected error" }, 500);
  }
});
