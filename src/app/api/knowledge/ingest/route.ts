import { NextResponse } from "next/server"

import { ingestKnowledgeSource } from "@/services/knowledgeBaseService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type IngestPayload = {
  businessId: string
  sourceType: "url" | "text" | "document"
  sourceUrl?: string
  title?: string
  content?: string
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?[^>]+(>|$)/g, " ")
}

export async function POST(request: Request) {
  let payload: IngestPayload | null = null
  try {
    payload = (await request.json()) as IngestPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  if (!payload?.businessId || !payload?.sourceType) {
    return NextResponse.json(
      { error: "businessId and sourceType are required." },
      { status: 400 }
    )
  }

  let rawText = ""
  let sourceUri: string | null = null
  let title: string | null = payload.title ?? null

  if (payload.sourceType === "url") {
    if (!payload.sourceUrl) {
      return NextResponse.json({ error: "sourceUrl is required." }, { status: 400 })
    }
    sourceUri = payload.sourceUrl
    try {
      const response = await fetch(payload.sourceUrl)
      const html = await response.text()
      rawText = stripHtml(html)
      if (!title) {
        const match = html.match(/<title>(.*?)<\/title>/i)
        title = match ? match[1] : null
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch URL."
      return NextResponse.json({ error: message }, { status: 400 })
    }
  } else {
    rawText = payload.content ?? ""
  }

  try {
    const result = await ingestKnowledgeSource({
      businessId: payload.businessId,
      sourceType: payload.sourceType,
      sourceUri,
      title,
      rawText,
    })
    return NextResponse.json({ status: "ok", ...result })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ingest content."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
