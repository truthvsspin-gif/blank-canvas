

# Usage Limits and WhatsApp API Volume Control

## Overview
Add per-business usage limits so you can control how many conversations and WhatsApp API calls each business can use monthly. When a business exceeds its limit, the chatbot stops auto-replying and the business owner sees a notification.

## How It Works

1. **Each business gets a plan tier** with monthly limits (e.g., Free = 50 conversations, Pro = 500)
2. **Every incoming WhatsApp/Instagram message** checks the limit before calling `ai-chat`
3. **If over limit**, the webhook skips AI reply and tags the thread so the owner knows
4. **The CRM dashboard** shows current usage vs. limits with a progress bar

## Technical Details

### Step 1: Add plan columns to `businesses` table
New migration adding:
- `plan_tier` (text, default `'free'`) -- e.g., `free`, `starter`, `pro`, `unlimited`
- `monthly_conversation_limit` (integer, default `50`) -- max 24h conversation windows per month
- `monthly_ai_reply_limit` (integer, default `100`) -- max AI-generated replies per month

This keeps limits configurable per business rather than hardcoded.

### Step 2: Add `ai_replies` metric tracking
Update the `ai-chat` edge function to increment a new `ai_replies` counter in `usage_monthly` each time it generates a reply. This tracks actual WhatsApp API usage (each outbound message = 1 API call).

### Step 3: Enforce limits in webhooks
In both `webhook-whatsapp` and `webhook-instagram`, before delegating to `ai-chat`:

```text
1. Read business.monthly_conversation_limit and business.monthly_ai_reply_limit
2. Read current usage_monthly counters for this period
3. If conversations_24h >= limit OR ai_replies >= limit:
   - Skip ai-chat delegation
   - Update inbox_thread with a tag like "limit_reached"
   - Log the skip event
   - Still store the inbound message (don't lose data)
```

### Step 4: Update `get-usage` edge function
Return limits alongside counters so the frontend can display progress:

```text
Response:
{
  period: "2026-02",
  counters: { conversations_24h: 47, ai_replies: 89 },
  limits: { conversations_24h: 50, ai_replies: 100 },
  plan_tier: "free"
}
```

### Step 5: Usage bar in CRM dashboard
Add a usage indicator to the Chatbot settings page or Dashboard showing:
- Conversations used: 47 / 50
- AI replies used: 89 / 100
- Visual progress bar that turns yellow at 80% and red at 95%
- "Upgrade" prompt when approaching or exceeding limits

### Files to modify

| File | Change |
|---|---|
| New migration SQL | Add `plan_tier`, `monthly_conversation_limit`, `monthly_ai_reply_limit` to `businesses` |
| `supabase/functions/webhook-whatsapp/index.ts` | Add limit check before `ai-chat` delegation |
| `supabase/functions/webhook-instagram/index.ts` | Same limit check |
| `supabase/functions/ai-chat/index.ts` | Increment `ai_replies` counter in `usage_monthly` after generating a reply |
| `supabase/functions/get-usage/index.ts` | Return limits and plan_tier alongside counters |
| `src/pages/Chatbot.tsx` or `src/pages/Dashboard.tsx` | Add usage progress bar component |

### What this does NOT change
- Inbound messages are always stored regardless of limits (no data loss)
- Manual replies from the CRM inbox are not affected by limits
- Existing conversation tracking logic stays the same

