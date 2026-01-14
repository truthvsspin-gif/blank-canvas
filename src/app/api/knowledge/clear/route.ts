import { NextResponse } from "next/server"

import { clearKnowledgeSources } from "@/services/knowledgeBaseService"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let payload: { businessId?: string } | null = null
  try {
    payload = (await request.json()) as { businessId?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  if (!payload?.businessId) {
    return NextResponse.json({ error: "businessId is required." }, { status: 400 })
  }

  try {
    const result = await clearKnowledgeSources(payload.businessId)
    return NextResponse.json({ cleared: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear knowledge."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
