// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { businessId } = await req.json();

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "businessId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Clearing knowledge base for business: ${businessId}`);

    // Initialize Supabase client with service role for deletion
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all knowledge chunks for this business
    const { data: deletedChunks, error: chunksError } = await supabase
      .from("knowledge_chunks")
      .delete()
      .eq("business_id", businessId)
      .select("id");

    if (chunksError) {
      console.error("Error deleting chunks:", chunksError);
      throw chunksError;
    }

    // Delete all knowledge sources for this business
    const { data: deletedSources, error: sourcesError } = await supabase
      .from("knowledge_sources")
      .delete()
      .eq("business_id", businessId)
      .select("id");

    if (sourcesError) {
      console.error("Error deleting sources:", sourcesError);
      throw sourcesError;
    }

    const chunksCount = deletedChunks?.length || 0;
    const sourcesCount = deletedSources?.length || 0;

    console.log(`Deleted ${chunksCount} chunks and ${sourcesCount} sources`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedChunks: chunksCount,
        deletedSources: sourcesCount,
        message: `Cleared ${sourcesCount} knowledge sources and ${chunksCount} chunks`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Knowledge clear error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to clear knowledge base" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
