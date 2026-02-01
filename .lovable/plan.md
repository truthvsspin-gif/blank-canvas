
# Professional Chatbot Upgrade Plan

## Overview
Transform the chatbot from basic/childish behavior to a professional consultative sales agent by fixing configuration, data quality, and state persistence issues.

---

## Phase 1: Fix Critical Data Issues

### 1.1 Clean Up Duplicate Services
Remove the duplicate service entries that are confusing the AI. Keep only one record per service type.

**Action:** Write a database cleanup migration to deduplicate services

### 1.2 Set Trojan Horse Entry Service
Configure "Lavado Premium" as the entry-level Trojan Horse service so the chatbot recommends it for general inquiries instead of listing expensive options like Ceramic Coating or PPF.

**Action:** Update one service to have `is_trojan_horse = true`

### 1.3 Update Business Configuration
- Set `industry_type` to `detailing_premium`
- Add custom `ai_instructions` with specific guidance for your business

---

## Phase 2: Fix State Persistence

### 2.1 Add Conversation ID Tracking
The simulator currently doesn't track conversation sessions. Each message is treated independently, so the bot can't remember:
- What vehicle the customer mentioned
- What benefit they're looking for
- What stage of the sales flow they're in

**Action:** Generate and persist a `conversationId` in the simulator that's sent with every message

### 2.2 Pass Customer Identifier
For returning customer recognition, pass a stable customer identifier (phone/handle simulation).

---

## Phase 3: Enhance Business Context

### 3.1 Improve Service Descriptions
Current service descriptions are too brief (e.g., "Exterior e interior"). The AI needs benefit-focused descriptions to make intelligent recommendations.

**Action:** Update service descriptions with:
- Clear benefit statements
- Ideal customer scenarios
- Differentiation from other services

### 3.2 Add AI Custom Instructions
Configure business-specific instructions in the Chatbot settings page:
```
Somos Lamipint Detailing. Nos especializamos en servicios premium de detallado automotriz.
- Siempre comienza identificando el vehiculo
- Recomienda Lavado Premium como entrada para clientes nuevos
- No menciones precios hasta establecer valor
- Enfocate en el resultado que el cliente quiere lograr
```

---

## Phase 4: Code Changes

### 4.1 Simulator State Persistence
Update `src/pages/DevChatbot.tsx` to:
1. Generate a unique `conversationId` on component mount
2. Persist it across messages in the session
3. Pass it to the edge function with every request
4. Reset it when user clicks "Clear Chat"

### 4.2 Customer Identifier Simulation
Add a simulated phone number or handle to test returning customer memory functionality.

---

## Technical Implementation Details

### Database Changes
```sql
-- Deduplicate services (keep first of each name per business)
WITH duplicates AS (
  SELECT id, name, business_id,
    ROW_NUMBER() OVER (PARTITION BY business_id, name ORDER BY created_at ASC) as rn
  FROM services
  WHERE business_id = '5bc08537-786d-451b-8dd2-f09666266028'
)
DELETE FROM services
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Set Lavado Premium as Trojan Horse
UPDATE services
SET is_trojan_horse = true
WHERE business_id = '5bc08537-786d-451b-8dd2-f09666266028'
AND name = 'Lavado Premium'
AND is_trojan_horse = false
LIMIT 1;

-- Update business configuration
UPDATE businesses
SET 
  industry_type = 'detailing_premium',
  ai_instructions = 'Eres el asistente de ventas de Lamipint Detailing. Especialistas en detallado automotriz premium. Siempre identifica el vehiculo primero. Recomienda Lavado Premium como servicio de entrada. Nunca listes todos los servicios - prescribe UNO basado en la situacion del cliente.'
WHERE id = '5bc08537-786d-451b-8dd2-f09666266028';
```

### Code Changes (DevChatbot.tsx)
1. Add `conversationId` state with UUID generation
2. Include `conversationId` in API request body
3. Add simulated `customerIdentifier` for memory testing
4. Reset conversation ID on clear chat

---

## Expected Results After Implementation

| Before | After |
|--------|-------|
| Bot lists multiple services | Bot recommends ONE service based on context |
| No memory between messages | Full state persistence across conversation |
| Generic greetings | Consultative sales flow with vehicle focus |
| Suggests expensive services first | Leads with Trojan Horse entry service |
| Forgets what customer said | Remembers vehicle, intent, and usage |
| "Childish" FAQ-style responses | Professional consultative diagnosis |

---

## Files to Modify
- `src/pages/DevChatbot.tsx` - Add conversation ID tracking
- Database - Clean duplicates, set Trojan Horse, update business config

## Estimated Time
15-20 minutes to implement all changes
