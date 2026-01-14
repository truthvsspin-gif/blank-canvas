import { NextResponse } from "next/server"

import { processChat } from "@/services/aiPipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  const message = body?.message
  const userId = body?.userId
  const tenantId = body?.tenantId

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Invalid payload. Provide a 'message' string." },
      { status: 400 }
    )
  }

  // Placeholder pipeline call. Swap with real AI provider + routing later.
  const response = await processChat({ message, userId, tenantId })

  return NextResponse.json({
    reply: response.reply,
    leadCaptured: response.leadCaptured ?? false,
  })
}
