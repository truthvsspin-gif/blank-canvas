// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 120;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "to", "of",
    "in", "for", "on", "with", "at", "by", "from", "as", "into", "through",
    "during", "before", "after", "above", "below", "between", "under",
    "again", "further", "then", "once", "here", "there", "when", "where",
    "why", "how", "all", "each", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
    "very", "just", "and", "but", "if", "or", "because", "until", "while",
    "about", "against", "this", "that", "these", "those", "what", "which",
    "who", "whom", "whose", "i", "you", "he", "she", "it", "we", "they",
    "que", "de", "en", "el", "la", "los", "las", "un", "una", "y", "o",
    "por", "para", "con", "sin", "sobre", "como", "es", "son"
  ]);

  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúñü]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  return [...new Set(words)];
}

function chunkText(text: string, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];
  
  const words = normalized.split(" ");
  const chunks: string[] = [];
  let start = 0;
  
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = Math.max(0, end - overlap);
  }
  
  return chunks;
}

function generateChunkKeywords(content: string): string {
  const keywords = extractKeywords(content);
  return keywords.slice(0, 20).join(" ");
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KnowledgeBot/1.0)",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Simple HTML to text extraction
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    return normalizeWhitespace(text);
  } catch (error) {
    console.error("URL fetch error:", error);
    throw new Error(`Failed to fetch content from URL: ${error.message}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { businessId, sourceType, sourceUrl, content, title } = body;

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "Missing businessId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawText = "";
    let sourceUri = null;

    if (sourceType === "url" && sourceUrl) {
      rawText = await fetchUrlContent(sourceUrl);
      sourceUri = sourceUrl;
    } else if (content) {
      rawText = content;
    } else {
      return new Response(
        JSON.stringify({ error: "No content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleaned = normalizeWhitespace(rawText);
    if (!cleaned || cleaned.length < 10) {
      return new Response(
        JSON.stringify({ error: "Content too short or empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert knowledge source
    const { data: source, error: sourceError } = await supabase
      .from("knowledge_sources")
      .insert({
        business_id: businessId,
        source_type: sourceType || "text",
        source_uri: sourceUri,
        title: title || null,
        raw_text: cleaned,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sourceError) {
      console.error("Source insert error:", sourceError);
      return new Response(
        JSON.stringify({ error: sourceError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chunk the content
    const chunks = chunkText(cleaned);
    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to chunk content" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert chunks with keywords
    const chunkPayload = chunks.map((chunkContent, index) => ({
      business_id: businessId,
      source_id: source.id,
      chunk_index: index,
      content: chunkContent,
    }));

    const { error: chunkError } = await supabase
      .from("knowledge_chunks")
      .insert(chunkPayload);

    if (chunkError) {
      console.error("Chunk insert error:", chunkError);
      return new Response(
        JSON.stringify({ error: chunkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Ingested ${chunks.length} chunks for business ${businessId}`);

    return new Response(
      JSON.stringify({
        success: true,
        sourceId: source.id,
        chunkCount: chunks.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Knowledge ingest error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
