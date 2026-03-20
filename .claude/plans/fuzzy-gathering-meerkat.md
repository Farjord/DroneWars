# UX: Increase AI "Thinking" Delay (300ms → 800ms)

## Context

The AI takes its turns too quickly — actions and animations resolve before the player even registers it's the AI's turn. The cosmetic delay constant `AI_TURN_COSMETIC_DELAY_MS` is set to 300ms, which feels instant. This is a separate issue from the blocking retry fix we just implemented.

## Fix

**File:** `src/managers/AIPhaseProcessor.js` (line 35)

Increase `AI_TURN_COSMETIC_DELAY_MS` from `300` to `800`.

This single constant controls the delay for:
- First turn entry (line 237 via `checkForAITurn`)
- Continuation turns (line 320, when AI goes again)

800ms gives the player enough time to register the turn change while still feeling responsive.

## Verification

1. Run `npx vitest run src/managers/__tests__/AIPhaseProcessor.test.js` — the test at line 869 that checks "300ms delay" will need updating to 800ms
2. Run `npx vitest run` — full suite passes
3. Manual test: start single-player game, confirm AI actions feel paced naturally
