import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { threadId, messageText, businessId } = await req.json();

    if (!threadId || !messageText || !businessId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: threadId, messageText, businessId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get thread details
    const { data: thread, error: threadError } = await supabase
      .from("inbox_threads")
      .select("id, channel, contact_handle, conversation_id, business_id")
      .eq("id", threadId)
      .eq("business_id", businessId)
      .single();

    if (threadError || !thread) {
      return new Response(
        JSON.stringify({ error: "Thread not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const recipientHandle = thread.contact_handle;

    // Record the outbound message
    await supabase.from("inbox_messages").insert({
      business_id: businessId,
      thread_id: threadId,
      channel: thread.channel,
      conversation_id: thread.conversation_id,
      direction: "outbound",
      sender_name: "Agent",
      sender_handle: recipientHandle,
      message_text: messageText,
      message_timestamp: now,
      metadata: { source: "manual_reply" },
    });

    await supabase.from("messages").insert({
      business_id: businessId,
      conversation_id: thread.conversation_id,
      direction: "outbound",
      sender: "Agent",
      message_text: messageText,
      timestamp: now,
      channel: thread.channel,
    });

    // Update thread
    await supabase
      .from("inbox_threads")
      .update({
        last_message_text: messageText,
        last_message_direction: "outbound",
        last_message_at: now,
        unread_count: 0,
        updated_at: now,
      })
      .eq("id", threadId);

    // Send via appropriate channel
    let sendResult = { sent: false, error: null as string | null };

    if (thread.channel === "whatsapp" && recipientHandle) {
      sendResult = await sendWhatsAppMessage(supabase, businessId, recipientHandle, messageText);
    } else if (thread.channel === "instagram" && recipientHandle) {
      sendResult = await sendInstagramMessage(supabase, businessId, recipientHandle, messageText);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: crypto.randomUUID(),
        sent: sendResult.sent,
        sendError: sendResult.error,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send reply error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendWhatsAppMessage(
  supabase: any,
  businessId: string,
  to: string,
  text: string
): Promise<{ sent: boolean; error: string | null }> {
  const { data: integration } = await supabase
    .from("business_integrations")
    .select("whatsapp_access_token, whatsapp_phone_number_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const token = integration?.whatsapp_access_token;
  const phoneNumberId = integration?.whatsapp_phone_number_id;

  if (!token || !phoneNumberId) {
    return { sent: false, error: "WhatsApp not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { sent: false, error: error?.error?.message || "WhatsApp send failed" };
    }

    return { sent: true, error: null };
  } catch (error) {
    return { sent: false, error: error.message };
  }
}

async function sendInstagramMessage(
  supabase: any,
  businessId: string,
  recipientId: string,
  text: string
): Promise<{ sent: boolean; error: string | null }> {
  const { data: integration } = await supabase
    .from("business_integrations")
    .select("instagram_access_token, instagram_business_id")
    .eq("business_id", businessId)
    .maybeSingle();

  const token = integration?.instagram_access_token;
  const igBusinessId = integration?.instagram_business_id;

  if (!token || !igBusinessId) {
    return { sent: false, error: "Instagram not configured" };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${igBusinessId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_type: "RESPONSE",
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return { sent: false, error: error?.error?.message || "Instagram send failed" };
    }

    return { sent: true, error: null };
  } catch (error) {
    return { sent: false, error: error.message };
  }
}
