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
    const { businessId, bookingId } = await req.json();

    if (!businessId || !bookingId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: businessId, bookingId" }),
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

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, business_id, customer_id, vehicle_id, service_name, price, status, scheduled_at, source, created_at")
      .eq("business_id", businessId)
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (booking.status !== "confirmed") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "status_not_confirmed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    const subject = `New booking confirmed - ${businessName}`;
    const scheduledAt = booking.scheduled_at ? new Date(booking.scheduled_at).toISOString() : "TBD";
    const priceText = booking.price != null ? `$${booking.price}` : "TBD";

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>New booking confirmed</h2>
        <p><strong>Business:</strong> ${businessName}</p>
        <p><strong>Service:</strong> ${booking.service_name}</p>
        <p><strong>Price:</strong> ${priceText}</p>
        <p><strong>Scheduled:</strong> ${scheduledAt}</p>
        <p><strong>Status:</strong> ${booking.status}</p>
        <p><strong>Source:</strong> ${booking.source || "unknown"}</p>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
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
    console.error("booking-notify error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
