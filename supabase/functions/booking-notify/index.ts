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
      .select("id, business_id, customer_id, vehicle_id, service_name, price, status, scheduled_at, source, created_at, confirmation_notes, assigned_to, lead_id")
      .eq("business_id", businessId)
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["confirmed", "pending"].includes(booking.status)) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "status_not_actionable" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isPending = booking.status === "pending";
    const subjectAction = isPending ? "New booking pending review" : "New booking confirmed";

    // Fetch customer details
    let customerName = "N/A";
    let customerPhone = "N/A";
    let customerEmail = "N/A";
    if (booking.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("full_name, phone, email")
        .eq("id", booking.customer_id)
        .maybeSingle();
      if (customer) {
        customerName = customer.full_name || "N/A";
        customerPhone = customer.phone || "N/A";
        customerEmail = customer.email || "N/A";
      }
    }

    // Fetch vehicle details
    let vehicleInfo = "N/A";
    if (booking.vehicle_id) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("brand, model, size, color, license_plate")
        .eq("id", booking.vehicle_id)
        .maybeSingle();
      if (vehicle) {
        const parts = [vehicle.brand, vehicle.model, vehicle.size, vehicle.color].filter(Boolean);
        vehicleInfo = parts.length > 0 ? parts.join(" · ") : "N/A";
        if (vehicle.license_plate) vehicleInfo += ` (${vehicle.license_plate})`;
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

    const subject = `${subjectAction} - ${businessName}`;
    const scheduledAt = booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "TBD";
    const priceText = booking.price != null ? `$${booking.price}` : "TBD";
    const reviewNote = isPending
      ? `<p style="color: #d97706; font-weight: bold;">⚠️ This booking needs your review. Please confirm or reject it in the CRM.</p>`
      : "";

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px;">
        <h2 style="color: #1f2937;">${subjectAction}</h2>
        ${reviewNote}
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Customer</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Phone</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${customerPhone}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Email</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${customerEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Vehicle</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${vehicleInfo}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Service</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;"><strong>${booking.service_name}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Price</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;"><strong>${priceText}</strong></td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Scheduled</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${scheduledAt}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Status</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${booking.status}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Source</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${booking.source || "manual"}</td>
          </tr>
          ${booking.confirmation_notes ? `<tr><td style="padding: 8px 12px; font-weight: bold; color: #374151; border-bottom: 1px solid #e5e7eb;">Notes</td><td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${booking.confirmation_notes}</td></tr>` : ""}
        </table>
        <p style="color: #6b7280; font-size: 12px;">Business: ${businessName} · Booking ID: ${booking.id}</p>
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
