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

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
const DEFAULT_CANDIDATE_LIMIT = 12

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i += 1) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function generateEmbedding(text: string, model = DEFAULT_EMBEDDING_MODEL) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const maxChars = 30000
  const input = text.length > maxChars ? text.slice(0, maxChars) : text
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
    }),
  })
  if (!response.ok) {
    return null
  }
  const payload = (await response.json().catch(() => null)) as
    | { data?: Array<{ embedding?: number[] }> }
    | null
  const embedding = payload?.data?.[0]?.embedding
  return Array.isArray(embedding) ? embedding : null
}

async function embedChunks(chunks: string[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return chunks.map(() => null)
  }
  const embeddings: Array<number[] | null> = []
  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk)
      embeddings.push(embedding)
    } catch {
      embeddings.push(null)
    }
  }
  return embeddings
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

  const embeddings = await embedChunks(chunks)
  const payload = chunks.map((content, index) => ({
    business_id: input.businessId,
    source_id: source.id,
    chunk_index: index,
    content,
    embedding: embeddings[index] ?? null,
  }))

  const chunksTable = supabase.from("knowledge_chunks") as any
  const { error: chunkError } = await chunksTable.insert(payload)
  if (chunkError) {
    throw new Error(chunkError.message)
  }

  return { sourceId: source.id, chunkCount: chunks.length }
}

export async function retrieveKnowledgeChunks(
  businessId: string,
  query: string,
  limit = 4
): Promise<KnowledgeChunk[]> {
  const supabase = getSupabaseAdmin()
  const cleaned = normalizeWhitespace(query)
  if (!cleaned) return []

  const embeddingsEnabled = Boolean(process.env.OPENAI_API_KEY)
  const candidateLimit = Math.max(limit * 3, DEFAULT_CANDIDATE_LIMIT)

  const { data: candidates, error } = await supabase
    .from("knowledge_chunks")
    .select("id, content, source_id, embedding")
    .eq("business_id", businessId)
    .textSearch("content_tsv", cleaned, { type: "websearch" })
    .limit(candidateLimit)

  if (error) {
    return []
  }

  let rows = (candidates ?? []) as Array<{
    id: string
    content: string
    source_id: string
    embedding?: number[] | null
  }>
  if (rows.length == 0) {
    const { data: fallback } = await supabase
      .from("knowledge_chunks")
      .select("id, content, source_id, embedding")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(candidateLimit)
    rows = (fallback ?? []) as Array<{
      id: string
      content: string
      source_id: string
      embedding?: number[] | null
    }>
  }
  if (!embeddingsEnabled) {
    return rows.slice(0, limit) as KnowledgeChunk[]
  }

  const queryEmbedding = await generateEmbedding(cleaned)
  if (!queryEmbedding) {
    return rows.slice(0, limit) as KnowledgeChunk[]
  }

  const scored = rows
    .map((row) => {
      const embedding = Array.isArray(row.embedding) ? row.embedding : null
      if (!embedding || embedding.length !== queryEmbedding.length) {
        return null
      }
      return {
        ...row,
        similarity: cosineSimilarity(queryEmbedding, embedding),
      }
    })
    .filter(Boolean) as Array<KnowledgeChunk & { similarity: number }>

  if (scored.length === 0) {
    return rows.slice(0, limit) as KnowledgeChunk[]
  }

  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, limit).map(({ similarity, ...rest }) => rest)
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
