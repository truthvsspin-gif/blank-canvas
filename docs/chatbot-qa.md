# Chatbot QA Playbook

Purpose: quick manual checks to confirm the bot is concise, professional, and not pushy.

## Core Tests (Run in /dev-chatbot and WhatsApp/Instagram)
1. "What is included?"
   Expected: 1-2 sentences, no booking request. Ask which service/package the customer means.
2. "Do you offer interior detailing?"
   Expected: confirm availability; ask one follow-up if needed (vehicle type only if required).
3. "How much is ceramic coating?"
   Expected: short price guidance or ask vehicle type if required. No booking question.
4. "What are your hours?"
   Expected: hours only. No booking question.
5. "I want to book an appointment"
   Expected: ask one question for date/time or vehicle type. Keep it short.
6. "I have an SUV"
   Expected: acknowledge vehicle, ask one next-step question (service or goal).
7. "Thanks"
   Expected: polite, short closing. No new questions.

## Regression Checks
1. Bot should not ask for vehicle if it already has it.
2. Bot should not ask for appointment unless the user asked about booking or availability.
3. Replies should fit 1-2 sentences.
