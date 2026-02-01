# Plan: Add Inline Pricing Display & Mon-Fri Scheduling Proposals

## Status: ✅ COMPLETED

## Summary
Updated the chatbot to align with the new specification by:
1. ✅ Displaying prices immediately with service recommendations (not delayed until "value is established")
2. ✅ Automatically proposing Mon-Fri scheduling slots instead of triggering human handoff

---

## Implementation Complete

### Phase 1: Inline Pricing Display ✅
- Updated `buildAgentBrain()` core rules: Changed "NUNCA dar precios sin contexto" → "SIEMPRE incluir el precio"
- Updated `buildBusinessContextBlock()` usage rules: Removed "only mention prices AFTER establishing value"
- Updated STATE_4_PRESCRIPTION goal: Now includes exact price and proposes weekdays

### Phase 2: Scheduling State ✅
- Added `STATE_5_SCHEDULE` between prescription and action
- Added `STATE_6_ACTION` (renamed from 5)  
- Added `STATE_7_HANDOFF` (renamed from 6)
- Added `parseScheduleResponse()` function for day/time detection (Spanish + English)
- Added `getNextWeekday()` function to calculate actual booking date

### Phase 3: State Machine Updates ✅
- STATE_4_PRESCRIPTION now moves to STATE_5_SCHEDULE (or STATE_6_ACTION if day detected in same message)
- STATE_5_SCHEDULE captures day selection, moves to STATE_6_ACTION
- STATE_6_ACTION requests contact info, moves to STATE_7_HANDOFF
- Updated recovery window to include new states
- Updated stall detection to include new states

### Phase 4: Database ✅
- Added `scheduled_day` and `scheduled_time` columns to conversations table
- Updated `storeConversationState()` to persist scheduling fields
- Updated `loadConversationContext()` to load scheduling fields
- Updated `createBookingFromConversation()` to calculate `scheduled_at` from day/time

### Fallbacks Updated ✅
- STATE_4_PRESCRIPTION: Now proposes Mon-Wed-Fri availability
- STATE_5_SCHEDULE: "We have availability Monday, Wednesday, and Friday"
- STATE_6_ACTION: "To confirm your appointment, may I have your name and phone?"
- STATE_7_HANDOFF: Connects with team for final details

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

## Files Modified
- `supabase/functions/ai-chat/index.ts` - All state machine, prompt, and persistence changes
- Database migration - Added `scheduled_day`, `scheduled_time` columns
