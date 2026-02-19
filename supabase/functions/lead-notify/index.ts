// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const BOOKING_NOTIFY_FROM = Deno.env.get("BOOKING_NOTIFY_FROM") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { businessId, leadId } = await req.json();

    if (!businessId || !leadId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: businessId, leadId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY || !BOOKING_NOTIFY_FROM) {
      return new Response(
        JSON.stringify({ error: "Email not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, business_id, name, email, phone, source, stage, qualification_reason, conversation_id, created_at, customer_id")
      .eq("business_id", businessId)
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (lead.stage !== "qualified") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "stage_not_qualified" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch latest conversation context
    let lastMessages = "";
    if (lead.conversation_id) {
      const { data: convRows } = await supabase
        .from("conversations")
        .select("sender_name, message_text, message_direction, message_timestamp")
        .eq("business_id", businessId)
        .eq("conversation_id", lead.conversation_id)
        .order("message_timestamp", { ascending: false })
        .limit(5);
      if (convRows && convRows.length > 0) {
        lastMessages = convRows.reverse().map((m: any) => {
          const dir = m.message_direction === "outbound" ? "Bot" : (m.sender_name || "Customer");
          const text = (m.message_text || "").substring(0, 200);
          return `<strong>${dir}:</strong> ${text}`;
        }).join("<br/>");
      }
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, owner_user_id")
      .eq("id", businessId)
      .maybeSingle();

    const businessName = business?.name || "Business";

    const memberRows = await supabase
      .from("memberships")
      .select("user_id")
      .eq("business_id", businessId);

    const memberIds = new Set<string>();
    if (business?.owner_user_id) memberIds.add(business.owner_user_id);
    (memberRows.data || []).forEach((m: any) => {
      if (m?.user_id) memberIds.add(m.user_id);
    });

    const userIdList = Array.from(memberIds);
    if (userIdList.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_recipients" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: users } = await supabase
      .from("users")
      .select("id, email, full_name")
      .in("id", userIdList);

    const recipients = (users || [])
      .map((u: any) => u.email)
      .filter((email: string | null) => typeof email === "string" && email.length > 0);

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_valid_emails" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subject = `New qualified lead - ${businessName}`;
    const createdAt = lead.created_at ? new Date(lead.created_at).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "unknown";

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px;">
        <h2 style="color: #1f2937;">New qualified lead</h2>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Name</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${lead.name || "Unknown"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Phone</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${lead.phone || "N/A"}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${lead.email || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Source</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${lead.source || "unknown"}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Qualification Reason</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${lead.qualification_reason || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Created</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${createdAt}</td>
          </tr>
        </table>
        ${lastMessages ? `<div style="margin: 16px 0; padding: 12px; background: #f3f4f6; border-radius: 8px;"><h3 style="margin: 0 0 8px; font-size: 14px; color: #374151;">Last conversation</h3><p style="margin: 0; font-size: 13px; color: #4b5563;">${lastMessages}</p></div>` : ""}
        <p style="color: #6b7280; font-size: 12px;">Business: ${businessName} · Lead ID: ${lead.id}</p>
      </div>
    `.trim();

    const emailPayload = {
      from: BOOKING_NOTIFY_FROM,
      to: recipients,
      subject,
      html,
    };

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return new Response(
        JSON.stringify({ error: "Email send failed", detail: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await emailRes.json().catch(() => ({}));

    return new Response(
      JSON.stringify({ success: true, recipients, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("lead-notify error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
