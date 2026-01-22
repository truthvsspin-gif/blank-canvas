import { getSupabaseAdmin } from "@/lib/supabaseAdmin"

export type KnowledgeSourceInput = {
  businessId: string
  sourceType: "url" | "text" | "document"
  sourceUri?: string | null
  title?: string | null
  rawText: string
}

export type KnowledgeChunk = {
  id: string
  content: string
  source_id: string
}

const DEFAULT_CHUNK_SIZE = 800
const DEFAULT_OVERLAP = 120
const DEFAULT_CANDIDATE_LIMIT = 12

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

/**
 * Extract keywords from text for better search matching.
 * Simple keyword extraction without external AI.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare",
    "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "and", "but", "if", "or",
    "because", "until", "while", "about", "against", "this", "that", "these",
    "those", "what", "which", "who", "whom", "whose", "i", "you", "he", "she",
    "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his",
    "its", "our", "their", "que", "de", "en", "el", "la", "los", "las", "un",
    "una", "y", "o", "por", "para", "con", "sin", "sobre", "como", "es", "son"
  ])
  
  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúñü]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
  
  // Get unique keywords
  return [...new Set(words)]
}

/**
 * Generate search terms for Postgres text search.
 */
function buildSearchQuery(query: string): string {
  const keywords = extractKeywords(query)
  if (keywords.length === 0) {
    return query.trim().split(/\s+/).slice(0, 5).join(" | ")
  }
  // Use OR matching for flexibility
  return keywords.slice(0, 8).join(" | ")
}

export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_OVERLAP
) {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return []
  const words = normalized.split(" ")
  const chunks: string[] = []
  let start = 0
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length)
    chunks.push(words.slice(start, end).join(" "))
    if (end === words.length) break
    start = Math.max(0, end - overlap)
  }
  return chunks
}

/**
 * Generate a simple keyword summary for each chunk to improve search.
 */
function generateChunkKeywords(content: string): string {
  const keywords = extractKeywords(content)
  return keywords.slice(0, 20).join(" ")
}

export async function ingestKnowledgeSource(input: KnowledgeSourceInput) {
  const supabase = getSupabaseAdmin()
  const cleaned = normalizeWhitespace(input.rawText)
  if (!cleaned) {
    throw new Error("No content to ingest.")
  }

  const sources = supabase.from("knowledge_sources") as any
  const { data: source, error: sourceError } = await sources
    .insert({
      business_id: input.businessId,
      source_type: input.sourceType,
      source_uri: input.sourceUri ?? null,
      title: input.title ?? null,
      raw_text: cleaned,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (sourceError) {
    throw new Error(sourceError.message)
  }

  const chunks = chunkText(cleaned)
  if (chunks.length === 0) {
    throw new Error("Failed to chunk content.")
  }

  // Generate keyword summaries for better search (no AI needed)
  const payload = chunks.map((content, index) => ({
    business_id: input.businessId,
    source_id: source.id,
    chunk_index: index,
    content,
    keywords: generateChunkKeywords(content),
  }))

  const chunksTable = supabase.from("knowledge_chunks") as any
  const { error: chunkError } = await chunksTable.insert(payload)
  if (chunkError) {
    throw new Error(chunkError.message)
  }

  return { sourceId: source.id, chunkCount: chunks.length }
}

/**
 * Score chunk relevance based on keyword overlap.
 */
function scoreRelevance(query: string, content: string): number {
  const queryKeywords = new Set(extractKeywords(query))
  const contentKeywords = extractKeywords(content)
  
  if (queryKeywords.size === 0) return 0
  
  let matches = 0
  for (const keyword of contentKeywords) {
    if (queryKeywords.has(keyword)) {
      matches++
    }
  }
  
  return matches / queryKeywords.size
}

export async function retrieveKnowledgeChunks(
  businessId: string,
  query: string,
  limit = 4
): Promise<KnowledgeChunk[]> {
  const supabase = getSupabaseAdmin()
  const cleaned = normalizeWhitespace(query)
  if (!cleaned) return []

  const candidateLimit = Math.max(limit * 3, DEFAULT_CANDIDATE_LIMIT)
  const searchQuery = buildSearchQuery(cleaned)

  // Try text search first
  const { data: candidates, error } = await supabase
    .from("knowledge_chunks")
    .select("id, content, source_id")
    .eq("business_id", businessId)
    .textSearch("content_tsv", searchQuery, { type: "websearch" })
    .limit(candidateLimit)

  if (error) {
    console.error("Knowledge search error:", error)
    return []
  }

  let rows = (candidates ?? []) as Array<{
    id: string
    content: string
    source_id: string
  }>

  // Fallback to recent chunks if no text search results
  if (rows.length === 0) {
    const { data: fallback } = await supabase
      .from("knowledge_chunks")
      .select("id, content, source_id")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(candidateLimit)
    rows = (fallback ?? []) as Array<{
      id: string
      content: string
      source_id: string
    }>
  }

  if (rows.length === 0) {
    return []
  }

  // Score and rank by keyword relevance
  const scored = rows.map(row => ({
    ...row,
    score: scoreRelevance(cleaned, row.content)
  }))

  // Sort by relevance score
  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map(({ score, ...rest }) => rest)
}

export async function hasKnowledgeSources(businessId: string) {
  const supabase = getSupabaseAdmin()
  const { count, error } = await supabase
    .from("knowledge_sources")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
  if (error) {
    return false
  }
  return (count ?? 0) > 0
}

export async function clearKnowledgeSources(businessId: string) {
  const supabase = getSupabaseAdmin()
  const chunksTable = supabase.from("knowledge_chunks") as any
  const sourcesTable = supabase.from("knowledge_sources") as any

  const { error: chunkError, count: chunkCount } = await chunksTable
    .delete({ count: "exact" })
    .eq("business_id", businessId)
  if (chunkError) {
    throw new Error(chunkError.message)
  }

  const { error: sourceError, count: sourceCount } = await sourcesTable
    .delete({ count: "exact" })
    .eq("business_id", businessId)
  if (sourceError) {
    throw new Error(sourceError.message)
  }

  return {
    sourceCount: sourceCount ?? 0,
    chunkCount: chunkCount ?? 0,
  }
}
