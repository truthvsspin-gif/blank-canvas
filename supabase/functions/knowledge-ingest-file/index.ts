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

// Extract text from PDF using pdf-parse library
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamic import of pdf-parse for Deno
    const pdfParse = (await import("https://esm.sh/pdf-parse@1.1.1")).default;
    
    // Convert ArrayBuffer to Buffer-like object for pdf-parse
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const data = await pdfParse(uint8Array);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new Error("No text content found in PDF");
    }
    
    console.log(`PDF parsed: ${data.numpages} pages, ${data.text.length} characters`);
    return data.text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    
    // Fallback: Try basic text extraction for simple PDFs
    try {
      console.log("Attempting fallback PDF extraction...");
      const text = await extractTextFromPDFFallback(arrayBuffer);
      if (text && text.length > 50) {
        return text;
      }
    } catch (fallbackError) {
      console.error("Fallback extraction also failed:", fallbackError);
    }
    
    throw new Error("Failed to extract text from PDF. The file may be scanned/image-based. Please use 'Paste Text' to manually enter the content.");
  }
}

// Fallback extraction for simple PDFs
async function extractTextFromPDFFallback(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  
  const textParts: string[] = [];
  
  // Look for text between BT (begin text) and ET (end text) markers
  const btPattern = /BT[\s\S]*?ET/g;
  const matches = text.match(btPattern) || [];
  
  for (const match of matches) {
    // Extract text from Tj and TJ operators
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjPattern.exec(match)) !== null) {
      const decoded = tjMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\");
      if (decoded.trim()) {
        textParts.push(decoded);
      }
    }
    
    // Handle TJ arrays
    const tjArrayPattern = /\[(.*?)\]\s*TJ/g;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayPattern.exec(match)) !== null) {
      const content = tjArrayMatch[1];
      const stringPattern = /\(([^)]*)\)/g;
      let stringMatch;
      while ((stringMatch = stringPattern.exec(content)) !== null) {
        const decoded = stringMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        if (decoded.trim()) {
          textParts.push(decoded);
        }
      }
    }
  }
  
  return textParts.join(" ");
}

// Extract text from Word documents (basic DOCX parsing)
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    
    const textParts: string[] = [];
    
    // Match w:t elements (Word text elements)
    const wtPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = wtPattern.exec(text)) !== null) {
      if (match[1].trim()) {
        textParts.push(match[1]);
      }
    }
    
    // Fallback: extract all readable text
    if (textParts.length === 0) {
      const readable = text.replace(/<[^>]+>/g, " ").replace(/[^\x20-\x7EáéíóúñüÁÉÍÓÚÑÜ\n\r\t]/g, " ");
      const words = readable.split(/\s+/).filter(w => w.length > 2);
      textParts.push(words.join(" "));
    }
    
    return textParts.join(" ");
  } catch (error) {
    console.error("DOCX extraction error:", error);
    throw new Error("Failed to extract text from Word document");
  }
}

// Extract text from plain text files
function extractTextFromPlain(arrayBuffer: ArrayBuffer): string {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(arrayBuffer);
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

    // Parse multipart form data
    const formData = await req.formData();
    const businessId = formData.get("businessId") as string;
    const title = formData.get("title") as string | null;
    const file = formData.get("file") as File | null;

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: "Missing businessId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    let rawText = "";
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();

    // Determine file type and extract text
    if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
      rawText = await extractTextFromPDF(arrayBuffer);
    } else if (fileName.endsWith(".docx") || mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      rawText = await extractTextFromDocx(arrayBuffer);
    } else if (fileName.endsWith(".doc") || mimeType === "application/msword") {
      // Old .doc format - try basic extraction
      rawText = extractTextFromPlain(arrayBuffer);
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md") || mimeType.startsWith("text/")) {
      rawText = extractTextFromPlain(arrayBuffer);
    } else {
      // Try as plain text for unknown types
      rawText = extractTextFromPlain(arrayBuffer);
    }

    const cleaned = normalizeWhitespace(rawText);
    console.log(`Extracted text length: ${cleaned.length} characters`);
    console.log(`First 200 chars: ${cleaned.slice(0, 200)}`);

    if (!cleaned || cleaned.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: "Could not extract text from document. The file may be encrypted, scanned, or in an unsupported format. Please use 'Paste Text' to manually enter the content instead." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert knowledge source
    const { data: source, error: sourceError } = await supabase
      .from("knowledge_sources")
      .insert({
        business_id: businessId,
        source_type: "document",
        source_uri: file.name,
        title: title || file.name,
        raw_text: cleaned.slice(0, 100000), // Limit stored raw text
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

    // Insert chunks
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

    console.log(`Ingested ${chunks.length} chunks from document for business ${businessId}`);

    return new Response(
      JSON.stringify({
        success: true,
        sourceId: source.id,
        chunkCount: chunks.length,
        fileName: file.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Knowledge file ingest error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
