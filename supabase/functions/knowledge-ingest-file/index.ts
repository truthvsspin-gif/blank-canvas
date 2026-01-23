// @ts-nocheck - Deno edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as pdfjs from "npm:pdfjs-dist/legacy/build/pdf.mjs";

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

// Simple but robust PDF text extraction
function extractTextFromPDFRaw(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const textParts: string[] = [];
  
  // Strategy 1: Extract all parenthesis-enclosed strings (PDF literal strings)
  // These contain the actual text in most PDFs
  let i = 0;
  const len = bytes.length;
  
  while (i < len) {
    // Look for opening parenthesis (
    if (bytes[i] === 0x28) { // '('
      let depth = 1;
      let start = i + 1;
      i++;
      
      // Find matching closing parenthesis, accounting for nesting and escapes
      while (i < len && depth > 0) {
        if (bytes[i] === 0x5C) { // backslash - escape next char
          i += 2;
          continue;
        }
        if (bytes[i] === 0x28) depth++; // (
        if (bytes[i] === 0x29) depth--; // )
        i++;
      }
      
      if (depth === 0) {
        const strBytes = bytes.slice(start, i - 1);
        // Decode as latin1 first (handles PDF encoding)
        let str = "";
        for (let j = 0; j < strBytes.length; j++) {
          const b = strBytes[j];
          // Handle escape sequences
          if (b === 0x5C && j + 1 < strBytes.length) {
            const next = strBytes[j + 1];
            if (next === 0x6E) { str += "\n"; j++; continue; } // \n
            if (next === 0x72) { str += "\r"; j++; continue; } // \r
            if (next === 0x74) { str += "\t"; j++; continue; } // \t
            if (next === 0x28) { str += "("; j++; continue; }  // \(
            if (next === 0x29) { str += ")"; j++; continue; }  // \)
            if (next === 0x5C) { str += "\\"; j++; continue; } // \\
            // Octal escape \ddd
            if (next >= 0x30 && next <= 0x37) {
              let octal = String.fromCharCode(next);
              j++;
              if (j + 1 < strBytes.length && strBytes[j + 1] >= 0x30 && strBytes[j + 1] <= 0x37) {
                octal += String.fromCharCode(strBytes[j + 1]);
                j++;
              }
              if (j + 1 < strBytes.length && strBytes[j + 1] >= 0x30 && strBytes[j + 1] <= 0x37) {
                octal += String.fromCharCode(strBytes[j + 1]);
                j++;
              }
              str += String.fromCharCode(parseInt(octal, 8));
              continue;
            }
          }
          str += String.fromCharCode(b);
        }
        
        // Filter: only keep strings that look like text (mostly printable)
        const printable = str.replace(/[^\x20-\x7E\xA0-\xFF\u00C0-\u017F]/g, "");
        if (printable.length > 2 && printable.length > str.length * 0.5) {
          textParts.push(printable);
        }
      }
    } else {
      i++;
    }
  }
  
  // Strategy 2: Also look for hex strings < ... >
  const rawContent = new TextDecoder("latin1").decode(bytes);
  const hexPattern = /<([0-9A-Fa-f\s]+)>/g;
  let hexMatch;
  while ((hexMatch = hexPattern.exec(rawContent)) !== null) {
    const hex = hexMatch[1].replace(/\s/g, "");
    if (hex.length >= 4 && hex.length % 2 === 0) {
      let decoded = "";
      for (let j = 0; j < hex.length; j += 2) {
        const charCode = parseInt(hex.substr(j, 2), 16);
        if (charCode >= 32 && charCode < 127) {
          decoded += String.fromCharCode(charCode);
        }
      }
      if (decoded.length > 2) {
        textParts.push(decoded);
      }
    }
  }
  
  // Clean up: filter out non-text content (PDF operators, etc.)
  const pdfOperators = new Set(["BT", "ET", "Tj", "TJ", "Tf", "Td", "TD", "Tm", "cm", "q", "Q", "re", "f", "S", "n", "W", "gs"]);
  const filtered = textParts.filter(s => {
    const trimmed = s.trim();
    // Skip PDF operators
    if (pdfOperators.has(trimmed)) return false;
    // Skip if mostly numbers/symbols
    const letterCount = (trimmed.match(/[a-zA-ZáéíóúñüÁÉÍÓÚÑÜàèìòùâêîôû]/g) || []).length;
    if (letterCount < trimmed.length * 0.3) return false;
    return trimmed.length > 1;
  });
  
  const result = filtered.join(" ");
  console.log(`PDF extraction: found ${filtered.length} text segments, ${result.length} chars`);
  
  return result;
}

async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
      disableWorker: true,
    });
    const doc = await loadingTask.promise;
    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const items = content.items as Array<{ str?: string }>;
      const line = items.map((item) => item.str || "").join(" ");
      if (line.trim()) pageTexts.push(line);
    }
    const fullText = pageTexts.join(" ");
    if (fullText.trim().length > 0) {
      return fullText;
    }
  } catch (_err) {
    // Fall back to raw string scanning below.
  }
  return extractTextFromPDFRaw(arrayBuffer);
}

// Extract text from Word documents (basic DOCX parsing)
function extractTextFromDocx(arrayBuffer: ArrayBuffer): string {
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
      rawText = extractTextFromDocx(arrayBuffer);
    } else if (fileName.endsWith(".doc") || mimeType === "application/msword") {
      rawText = extractTextFromPlain(arrayBuffer);
    } else if (fileName.endsWith(".txt") || fileName.endsWith(".md") || mimeType.startsWith("text/")) {
      rawText = extractTextFromPlain(arrayBuffer);
    } else {
      rawText = extractTextFromPlain(arrayBuffer);
    }

    const cleaned = normalizeWhitespace(rawText);
    console.log(`Extracted text length: ${cleaned.length} characters`);
    console.log(`First 300 chars: ${cleaned.slice(0, 300)}`);

    if (!cleaned || cleaned.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: "Could not extract text from document. The file may be encrypted, scanned (image-based), or in an unsupported format. Please use 'Paste Text' to manually enter the content." 
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
        raw_text: cleaned.slice(0, 100000),
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

    console.log(`SUCCESS: Ingested ${chunks.length} chunks from document for business ${businessId}`);

    return new Response(
      JSON.stringify({
        success: true,
        sourceId: source.id,
        chunkCount: chunks.length,
        fileName: file.name,
        extractedLength: cleaned.length,
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
