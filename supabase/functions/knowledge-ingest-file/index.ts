// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

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

// Decode PDF string escapes
function decodePdfString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

// Extract text from PDF by parsing content streams
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    
    // Decode to string for text extraction
    const rawContent = new TextDecoder("latin1").decode(bytes);
    const textParts: string[] = [];
    
    // Method 1: Extract text from stream objects (handles FlateDecode)
    // Find all stream objects
    const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let streamMatch;
    
    while ((streamMatch = streamPattern.exec(rawContent)) !== null) {
      const streamData = streamMatch[1];
      
      // Check if this might be text content
      if (streamData.includes("BT") && streamData.includes("ET")) {
        // Direct text content
        extractTextOperators(streamData, textParts);
      } else if (streamData.length > 10 && streamData.charCodeAt(0) === 0x78) {
        // Compressed stream (starts with zlib header 0x78)
        try {
          const compressed = new Uint8Array(streamData.length);
          for (let i = 0; i < streamData.length; i++) {
            compressed[i] = streamData.charCodeAt(i);
          }
          
          // Use DecompressionStream for zlib inflate
          const ds = new DecompressionStream("deflate-raw");
          
          // Skip zlib header (2 bytes) and adler32 checksum (4 bytes at end)
          const deflateData = compressed.slice(2, -4);
          
          const writer = ds.writable.getWriter();
          writer.write(deflateData);
          writer.close();
          
          const reader = ds.readable.getReader();
          const chunks: Uint8Array[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          
          const decompressed = new TextDecoder("latin1").decode(result);
          
          if (decompressed.includes("BT") || decompressed.includes("Tj")) {
            extractTextOperators(decompressed, textParts);
          }
        } catch (decompErr) {
          // Decompression failed, skip this stream
        }
      }
    }
    
    // Method 2: Look for text in object content directly
    const objPattern = /(\d+ \d+ obj[\s\S]*?endobj)/g;
    let objMatch;
    
    while ((objMatch = objPattern.exec(rawContent)) !== null) {
      const objContent = objMatch[1];
      if (objContent.includes("BT") && objContent.includes("ET")) {
        extractTextOperators(objContent, textParts);
      }
    }
    
    // Clean up and deduplicate
    const uniqueTexts = [...new Set(textParts.filter(t => t.trim().length > 0))];
    const result = uniqueTexts.join(" ");
    
    console.log(`PDF extraction found ${uniqueTexts.length} text segments, ${result.length} chars`);
    
    if (result.trim().length < 20) {
      throw new Error("Insufficient text extracted from PDF");
    }
    
    return result;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("Failed to extract text from PDF. The file may be scanned/image-based. Please use 'Paste Text' to manually enter the content.");
  }
}

// Extract text from PDF operators (Tj, TJ, etc.)
function extractTextOperators(content: string, textParts: string[]): void {
  // Find BT...ET blocks
  const btPattern = /BT[\s\S]*?ET/g;
  const btMatches = content.match(btPattern) || [content];
  
  for (const block of btMatches) {
    // Extract Tj strings: (text) Tj
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjPattern.exec(block)) !== null) {
      const decoded = decodePdfString(tjMatch[1]);
      if (decoded.trim()) {
        textParts.push(decoded);
      }
    }
    
    // Extract TJ arrays: [(text) -kern (text)] TJ
    const tjArrayPattern = /\[([^\]]*)\]\s*TJ/gi;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayPattern.exec(block)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const stringPattern = /\(([^)]*)\)/g;
      let stringMatch;
      while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
        const decoded = decodePdfString(stringMatch[1]);
        if (decoded.trim()) {
          textParts.push(decoded);
        }
      }
    }
    
    // Extract quoted strings: 'text' Tj pattern (less common)
    const quotedPattern = /'([^']*)'\s*Tj/g;
    let quotedMatch;
    while ((quotedMatch = quotedPattern.exec(block)) !== null) {
      const decoded = decodePdfString(quotedMatch[1]);
      if (decoded.trim()) {
        textParts.push(decoded);
      }
    }
  }
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
