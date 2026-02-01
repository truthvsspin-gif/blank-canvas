

# Plan: Add Inline Pricing Display & Mon-Fri Scheduling Proposals

## Overview
Update the chatbot to align with the new specification by:
1. Displaying prices immediately with service recommendations (not delayed until "value is established")
2. Automatically proposing Mon-Fri scheduling slots instead of triggering human handoff

---

## Current vs. Target Behavior

| Feature | Current Behavior | Target Behavior |
|---------|-----------------|-----------------|
| **Pricing** | Delayed until STATE_4 with "value-first" framing | Immediate with every service mention |
| **Scheduling** | Human handoff at STATE_6 | Bot proposes weekdays (Mon-Fri) and asks user to pick |
| **Handoff** | Required for all bookings | Only after schedule is confirmed |

---

## Phase 1: Inline Pricing Display

### 1.1 Update System Prompt Rules
**File:** `supabase/functions/ai-chat/index.ts`

Modify the `buildAgentBrain()` function to remove "value-first" pricing delay rule and enforce immediate pricing:

```text
Before (lines 943-944):
"4. NUNCA dar precios sin contexto de valor primero"

After:
"4. SIEMPRE incluir el precio cuando menciones un servicio"
```

### 1.2 Update STATE_4_PRESCRIPTION Goal
**File:** `supabase/functions/ai-chat/index.ts` (lines 1001-1025)

Change the prescription state to include price directly:

```text
Before:
"4. Si hay rango de precio, menciona como 'generalmente entre X-Y'"

After:
"4. INCLUYE el precio exacto del servicio recomendado (ej: '$199')"
```

### 1.3 Update Business Context Block
**File:** `supabase/functions/ai-chat/index.ts` (lines 1141-1157)

Remove the rule "Only mention prices AFTER establishing value" and replace with:
```text
"SIEMPRE menciona el precio cuando recomiendes un servicio"
```

---

## Phase 2: Add Scheduling State (STATE_5_SCHEDULE)

### 2.1 Add New State to State Machine
**File:** `supabase/functions/ai-chat/index.ts`

Insert a new state between ACTION and HANDOFF:

```typescript
const STATES = {
  STATE_0_OPENING: "STATE_0_OPENING",
  STATE_1_VEHICLE: "STATE_1_VEHICLE",
  STATE_2_BENEFIT: "STATE_2_BENEFIT",
  STATE_3_USAGE: "STATE_3_USAGE",
  STATE_4_PRESCRIPTION: "STATE_4_PRESCRIPTION",
  STATE_5_SCHEDULE: "STATE_5_SCHEDULE",    // NEW
  STATE_6_ACTION: "STATE_6_ACTION",         // Renamed from 5
  STATE_7_HANDOFF: "STATE_7_HANDOFF",       // Renamed from 6
} as const;
```

### 2.2 Add Schedule Goal to Agent Brain
**File:** `supabase/functions/ai-chat/index.ts` (within `buildAgentBrain()`)

Add a new case for the scheduling state:

```typescript
case STATES.STATE_5_SCHEDULE:
  stateGoal = language === "es"
    ? `OBJETIVO: Proponer cita automáticamente.
1. Confirma el servicio recomendado con su precio
2. Propone días concretos: "Tenemos disponibilidad lunes, miércoles o viernes"
3. Pregunta cuál día le funciona mejor
4. NO requiere confirmación del sistema - asume disponibilidad Lunes a Viernes
5. Respuesta CORTA (2-3 oraciones)`
    : `GOAL: Propose appointment automatically.
1. Confirm the recommended service with price
2. Propose specific days: "We have availability Monday, Wednesday or Friday"
3. Ask which day works best
4. NO system confirmation needed - assume Mon-Fri availability
5. SHORT response (2-3 sentences)`;
  break;
```

### 2.3 Add Date/Day Detection Function
**File:** `supabase/functions/ai-chat/index.ts`

Create a new function to detect when user picks a day:

```typescript
function parseScheduleResponse(text: string): { day: string | null; time: string | null } {
  const lowerText = text.toLowerCase();
  
  // Day detection (Spanish & English)
  const dayPatterns: Record<string, RegExp> = {
    monday: /\b(monday|lunes)\b/i,
    tuesday: /\b(tuesday|martes)\b/i,
    wednesday: /\b(wednesday|miércoles|miercoles)\b/i,
    thursday: /\b(thursday|jueves)\b/i,
    friday: /\b(friday|viernes)\b/i,
  };
  
  let detectedDay: string | null = null;
  for (const [day, pattern] of Object.entries(dayPatterns)) {
    if (pattern.test(lowerText)) {
      detectedDay = day;
      break;
    }
  }
  
  // Time detection (morning/afternoon)
  let detectedTime: string | null = null;
  if (/\b(morning|mañana|am|temprano)\b/i.test(lowerText)) {
    detectedTime = "morning";
  } else if (/\b(afternoon|tarde|pm)\b/i.test(lowerText)) {
    detectedTime = "afternoon";
  }
  
  return { day: detectedDay, time: detectedTime };
}
```

### 2.4 Update State Transitions
**File:** `supabase/functions/ai-chat/index.ts` (within `processStateMachine()`)

Update the flow so:
- After prescription acceptance → Move to STATE_5_SCHEDULE
- After user picks a day → Move to STATE_6_ACTION (confirm)
- After confirmation → Move to STATE_7_HANDOFF

```typescript
case STATES.STATE_4_PRESCRIPTION: {
  // User responds positively to prescription
  if (shouldTriggerHandoff(userMessage)) {
    newContext.leadQualified = true;
    newContext.currentState = STATES.STATE_5_SCHEDULE; // Go to scheduling, not handoff
  }
  break;
}

case STATES.STATE_5_SCHEDULE: {
  const schedule = parseScheduleResponse(userMessage);
  if (schedule.day) {
    newContext.scheduledDay = schedule.day;
    newContext.scheduledTime = schedule.time;
    newContext.currentState = STATES.STATE_6_ACTION;
  }
  break;
}

case STATES.STATE_6_ACTION: {
  // User confirms the booking
  if (shouldTriggerHandoff(userMessage)) {
    newContext.currentState = STATES.STATE_7_HANDOFF;
    newContext.handoffRequired = true;
  }
  break;
}
```

### 2.5 Add Scheduling Context to ConversationContext
**File:** `supabase/functions/ai-chat/index.ts`

Extend the interface:

```typescript
interface ConversationContext {
  // ... existing fields
  scheduledDay?: string;
  scheduledTime?: string;
}
```

### 2.6 Update Booking Creation to Include Scheduled Day
**File:** `supabase/functions/ai-chat/index.ts` (within `createBookingFromConversation()`)

Calculate the actual date based on the day selected:

```typescript
function getNextWeekday(dayName: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  const today = new Date();
  const currentDay = today.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntil);
  return nextDate;
}
```

---

## Phase 3: Update Prompt Templates

### 3.1 Remove "Value-First" Language
Remove all references to delayed pricing across:
- `buildAgentBrain()` core rules
- `buildBusinessContextBlock()` usage rules
- STATE_4_PRESCRIPTION goal

### 3.2 Add Scheduling Language to Fallbacks
Update fallback messages to include scheduling proposals:

```typescript
STATE_5_SCHEDULE: {
  en: "We have availability Monday, Wednesday, and Friday. Which day works best for you?",
  es: "Tenemos disponibilidad lunes, miércoles y viernes. ¿Cuál día te funciona mejor?"
}
```

---

## Phase 4: Database Updates

### 4.1 Add Scheduling Fields to Conversations Table
Store the proposed schedule in conversation state:

```sql
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS scheduled_day text,
ADD COLUMN IF NOT EXISTS scheduled_time text;
```

### 4.2 Update Conversation Persistence
Ensure `scheduled_day` and `scheduled_time` are saved/loaded with conversation context.

---

## Implementation Summary

| Component | Changes |
|-----------|---------|
| **State Machine** | Add STATE_5_SCHEDULE between prescription and handoff |
| **Agent Brain** | Update rules to enforce immediate pricing |
| **Scheduling Logic** | New `parseScheduleResponse()` function |
| **Booking Creation** | Calculate actual date from day name |
| **Database** | Add `scheduled_day`, `scheduled_time` columns |
| **Prompts** | Remove "value-first" delays, add weekday proposals |

---

## Expected Flow After Changes

```text
1. User: "Hola, tengo un BMW X5"
2. Bot: "¡Excelente! ¿Qué buscas para tu BMW X5 - brillo, protección, o interior?"
3. User: "Protección"
4. Bot: "Para tu BMW X5, recomiendo Ceramic Coating - $199. Protección duradera. 
        Tenemos disponibilidad lunes, miércoles o viernes. ¿Cuál te funciona?"
5. User: "Viernes"
6. Bot: "Perfecto, ¿viernes por la mañana o por la tarde?"
7. User: "Por la mañana"
8. Bot: "¡Listo! Viernes por la mañana para Ceramic Coating. 
        Comparte tu nombre y teléfono para confirmar."
```

---

## Files to Modify

1. `supabase/functions/ai-chat/index.ts` - Core logic changes
2. Database migration - Add scheduling columns

## Estimated Time
25-30 minutes to implement all changes

