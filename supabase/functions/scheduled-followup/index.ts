// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FollowUpItem {
  id: string;
  business_id: string;
  conversation_id: string;
  lead_id: string | null;
  follow_up_type: string;
  scheduled_for: string;
}

interface BusinessContext {
  name: string;
  language_preference: string | null;
  greeting_message: string | null;
}

// Follow-up message templates per DetaPRO v1.2 spec
const followUpTemplates = {
  es: {
    "24h": (businessName: string) => 
      `¡Hola! 👋 Ayer estuvimos conversando sobre cómo podemos ayudarte con tu vehículo. ¿Tienes alguna pregunta adicional? Estamos aquí para ayudarte.`,
    "48h": (businessName: string) =>
      `¡Hola de nuevo! Solo quería asegurarme de que recibiste toda la información que necesitabas. Si tienes alguna duda sobre nuestros servicios, no dudes en escribirnos. 🚗✨`,
    "5d": (businessName: string) =>
      `¡Hola! Ha pasado un tiempo desde nuestra última conversación. Si aún estás pensando en darle ese cuidado especial a tu vehículo, aquí estamos para ayudarte cuando estés listo. 😊`,
    "7d": (businessName: string) =>
      `¡Hola! Solo un recordatorio amigable de que seguimos aquí para ayudarte con tu vehículo. Si tienes alguna pregunta o quieres agendar una cita, escríbenos. ¡Que tengas un excelente día! 🌟`,
  },
  en: {
    "24h": (businessName: string) =>
      `Hi there! 👋 We were chatting yesterday about how we can help with your vehicle. Do you have any additional questions? We're here to help.`,
    "48h": (businessName: string) =>
      `Hi again! Just wanted to make sure you got all the information you needed. If you have any questions about our services, don't hesitate to reach out. 🚗✨`,
    "5d": (businessName: string) =>
      `Hi! It's been a while since we last chatted. If you're still thinking about giving your vehicle that special care, we're here to help whenever you're ready. 😊`,
    "7d": (businessName: string) =>
      `Hi! Just a friendly reminder that we're still here to help with your vehicle. If you have any questions or want to schedule an appointment, reach out anytime. Have a great day! 🌟`,
  },
};

async function sendFollowUpMessage(
  supabase: any,
  followUp: FollowUpItem,
  business: BusinessContext
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const lang = business.language_preference === "es" ? "es" : "en";
    const templates = followUpTemplates[lang];
    const messageText = templates[followUp.follow_up_type as keyof typeof templates](business.name);

    // Get the thread info to determine channel and contact
    const { data: thread, error: threadError } = await supabase
      .from("inbox_threads")
      .select("id, channel, contact_handle, contact_name")
      .eq("conversation_id", followUp.conversation_id)
      .eq("business_id", followUp.business_id)
      .maybeSingle();

    if (threadError || !thread) {
      return { success: false, error: `Thread not found: ${threadError?.message || "No thread"}` };
    }

    // Check if conversation has been active recently (user responded) - skip if so
    const { data: recentMessages, error: msgError } = await supabase
      .from("inbox_messages")
      .select("direction, message_timestamp")
      .eq("thread_id", thread.id)
      .order("message_timestamp", { ascending: false })
      .limit(1);

    if (!msgError && recentMessages?.length > 0) {
      const lastMessage = recentMessages[0];
      // If the last message was from the user and recent, skip this follow-up
      if (lastMessage.direction === "inbound") {
        const lastMsgTime = new Date(lastMessage.message_timestamp).getTime();
        const scheduledTime = new Date(followUp.scheduled_for).getTime();
        if (lastMsgTime > scheduledTime - 24 * 60 * 60 * 1000) {
          return { success: false, error: "User responded recently - skipping follow-up" };
        }
      }
    }

    // Call send-reply edge function to actually send the message
    const { data: sendResult, error: sendError } = await supabase.functions.invoke("send-reply", {
      body: {
        businessId: followUp.business_id,
        conversationId: followUp.conversation_id,
        channel: thread.channel,
        messageText: messageText,
        recipientHandle: thread.contact_handle,
      },
    });

    if (sendError) {
      return { success: false, error: `Send failed: ${sendError.message}` };
    }

    return { success: true, message: messageText };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[scheduled-followup] Starting follow-up processing...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all pending follow-ups that are due
    const now = new Date().toISOString();
    const { data: pendingFollowUps, error: fetchError } = await supabase
      .from("follow_up_queue")
      .select(`
        id,
        business_id,
        conversation_id,
        lead_id,
        follow_up_type,
        scheduled_for
      `)
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(50); // Process in batches

    if (fetchError) {
      console.error("[scheduled-followup] Error fetching queue:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pendingFollowUps || pendingFollowUps.length === 0) {
      console.log("[scheduled-followup] No pending follow-ups to process.");
      return new Response(JSON.stringify({ processed: 0, message: "No pending follow-ups" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[scheduled-followup] Processing ${pendingFollowUps.length} follow-ups...`);

    // Get unique business IDs and fetch their info
    const businessIds = [...new Set(pendingFollowUps.map((f) => f.business_id))];
    const { data: businesses, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, language_preference, greeting_message")
      .in("id", businessIds);

    if (bizError) {
      console.error("[scheduled-followup] Error fetching businesses:", bizError);
      return new Response(JSON.stringify({ error: bizError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const businessMap = new Map(businesses?.map((b) => [b.id, b]) || []);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const followUp of pendingFollowUps) {
      const business = businessMap.get(followUp.business_id);
      if (!business) {
        console.warn(`[scheduled-followup] Business ${followUp.business_id} not found, skipping.`);
        skipped++;
        continue;
      }

      const result = await sendFollowUpMessage(supabase, followUp, business);

      if (result.success) {
        // Mark as sent
        await supabase
          .from("follow_up_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            message_sent: result.message,
          })
          .eq("id", followUp.id);
        sent++;
        console.log(`[scheduled-followup] Sent ${followUp.follow_up_type} to ${followUp.conversation_id}`);
      } else {
        // Check if it's a skip vs a real failure
        if (result.error?.includes("skipping")) {
          await supabase
            .from("follow_up_queue")
            .update({ status: "cancelled", error_message: result.error })
            .eq("id", followUp.id);
          skipped++;
        } else {
          await supabase
            .from("follow_up_queue")
            .update({ status: "failed", error_message: result.error })
            .eq("id", followUp.id);
          failed++;
        }
        console.warn(`[scheduled-followup] Failed/skipped ${followUp.id}: ${result.error}`);
      }
    }

    console.log(`[scheduled-followup] Complete. Sent: ${sent}, Failed: ${failed}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({ processed: pendingFollowUps.length, sent, failed, skipped }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("[scheduled-followup] Unhandled error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
