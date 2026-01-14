/**
 * Placeholder AI pipeline for future prompt routing, lead extraction, and response generation.
 */
export type ChatRequest = {
  message: string
  userId?: string
  tenantId?: string
}

export type ChatResponse = {
  reply: string
  leadCaptured?: boolean
}

/**
 * Route the prompt to the correct handler/model. Currently returns a stub.
 */
export async function routePrompt(_input: ChatRequest): Promise<ChatResponse> {
  void _input
  return {
    reply:
      "AI response placeholder. Connect model provider and routing logic here.",
    leadCaptured: false,
  }
}

/**
 * Extract potential lead/contact info from a message. Stubbed for later use.
 */
export async function extractLead(_input: ChatRequest): Promise<void> {
  void _input
  // TODO: implement lead parsing, validation, and persistence.
}

/**
 * Top-level pipeline orchestrator (stub).
 */
export async function processChat(input: ChatRequest): Promise<ChatResponse> {
  // TODO: add guardrails, telemetry, and post-processing.
  return routePrompt(input)
}
