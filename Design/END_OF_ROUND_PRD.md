# End of Round Phase PRD

## 1. Overview

### Problem

`ON_ROUND_START` triggers fired during `RoundInitializationProcessor` step 3b at the *start* of the next round. This was semantically wrong:

- **Threat generation** (Signal Beacon) appeared to happen at round start, but conceptually belongs to the round the drone was active during
- **Auto-destruct** (tech entities like Jammers) destroyed at round start, meaning they persisted through a full extra round of play before cleanup
- **Player ordering** was hardcoded to `['player2', 'player1']` regardless of who went first that round
- The triggers ran *after* resource reset and first-player determination, meaning effects applied to the new round's state rather than resolving the old round

### Goal

Add a dedicated non-interactive "End of Round" phase that fires after both players pass in the Action phase. Triggers resolve against the round that just completed, with correct semantic timing and dynamic player ordering.

### Scope

- Rename `ON_ROUND_START` constant to `ON_ROUND_END` across the entire codebase
- Add `roundEnd` as an automatic phase in the game flow
- Create `processRoundEnd()` method in GameFlowManager
- Remove trigger processing from RoundInitializationProcessor
- Add dynamic player ordering via `firstPlayerOfRound` parameter

---

## 2. Architecture

### New Flow

```
Action Phase (both players pass)
  -> onSequentialPhaseComplete('action')
    -> ACTION PHASE COMPLETE announcement (unchanged)
    -> transitionToPhase('roundEnd')
      -> processAutomaticPhase('roundEnd')
        -> processRoundEnd()
          -> END OF ROUND banner announcement
          -> Process ON_ROUND_END triggers (first player of current round first)
          -> startNewRound()
          -> return null
```

### Previous Flow (replaced)

```
Action Phase (both players pass)
  -> onSequentialPhaseComplete('action')
    -> ACTION PHASE COMPLETE announcement
    -> startNewRound()
      -> ROUND announcement
      -> transitionToPhase(firstRequiredPhase)
        -> processAutomaticPhase('roundInitialization')
          -> RoundInitializationProcessor.process()
            -> ... step 3b: process ON_ROUND_START triggers (REMOVED)
```

### Phase Classification

`roundEnd` is NOT added to `ROUND_PHASES`. It fires *between* rounds — after action completes, before `startNewRound()`. It's triggered explicitly via `transitionToPhase('roundEnd')`, not via the round phase skip/require loop.

Registered in:
- `PhaseManager.VALID_PHASES` — allows phase transitions
- `GameFlowManager.AUTOMATIC_PHASES` — routes through `processAutomaticPhase()`
- `StateValidationService.automaticPhases` — validation allows ActionProcessor usage
- `StateValidationService.validTransitions` — `roundEnd` can reach all phases `startNewRound()` targets

### Multiplayer

No special multiplayer handling needed. `roundEnd` follows the same pattern as `roundInitialization`:
- Host processes it (guarded by `isPhaseAuthority`)
- PhaseManager broadcasts the transition to guests
- Guests receive state updates through the standard server push pipeline

---

## 3. Trigger Constant Rename

| Old | New |
|-|-|
| `ON_ROUND_START` | `ON_ROUND_END` |
| `processRoundStartTriggers` | `processRoundEndTriggers` |
| `hasThreatOnRoundStart` | `hasThreatOnRoundEnd` |
| `roundStartTriggers` (action type) | `roundEndTriggers` (action type) |

All references updated in source and test files. Design documents in `Design/` retain historical references (e.g., `TRIGGER_SYSTEM_PRD.md` still says `ON_ROUND_START` — these are archived specs for completed work).

---

## 4. Dynamic Player Ordering

### Previous Behavior

Hardcoded `['player2', 'player1']` — AI always processed first regardless of round's first player.

### New Behavior

`processRoundEndTriggers()` accepts a `firstPlayerOfRound` parameter:
- First player of the round processes triggers first
- Other player processes second
- Within each player: tech slots before drones, lane1 -> lane2 -> lane3
- Defaults to `'player2'` for backward compatibility

---

## 5. Files Modified

### Source Files

| File | Change |
|-|-|
| `src/logic/triggers/triggerConstants.js` | `ON_ROUND_START` -> `ON_ROUND_END` in constant, JSDoc, SELF_TRIGGER_TYPES |
| `src/data/droneData.js` | Signal Beacon and War Machine trigger strings |
| `src/data/techData.js` | Jammer and Thruster Inhibitor auto-destruct trigger strings |
| `src/logic/round/RoundManager.js` | Renamed method, added `firstPlayerOfRound` param, dynamic ordering |
| `src/logic/actions/StateUpdateStrategy.js` | Renamed function, updated debug labels |
| `src/managers/ActionProcessor.js` | Renamed import, strategy mapping, and method |
| `src/managers/PhaseManager.js` | Added `'roundEnd'` to `VALID_PHASES` |
| `src/managers/GameFlowManager.js` | Added to `AUTOMATIC_PHASES`, new `processRoundEnd()`, rewired `onSequentialPhaseComplete` |
| `src/managers/RoundInitializationProcessor.js` | Removed step 3b trigger block |
| `src/logic/state/StateValidationService.js` | Added to `automaticPhases`, expanded `roundEnd` transition targets |
| `src/logic/ai/helpers/keywordHelpers.js` | Renamed `hasThreatOnRoundStart` -> `hasThreatOnRoundEnd` |
| `src/logic/ai/scoring/targetScoring.js` | Updated import |
| `src/logic/ai/decisions/deploymentDecision.js` | Updated import and call |
| `src/logic/ai/cardEvaluators/statusEffectCards.js` | Updated trigger string in ability check |
| `src/data/descriptions/glossaryDescriptions.js` | Renamed key and description text |
| `src/data/descriptions/codePatternDescriptions.js` | Renamed key and fields |
| `src/logic/ai/aiConstants.js` | Comment update |
| `src/logic/effects/IncreaseThreatEffectProcessor.js` | Comment update |

### Test Files

| File | Change |
|-|-|
| `src/logic/round/__tests__/RoundManager.roundEnd.test.js` | Renamed from `.roundStart.test.js`, all references updated, 3 new ordering tests |
| `src/logic/round/__tests__/RoundManager.rapid-assault.test.js` | Updated mock trigger type |
| `src/logic/triggers/__tests__/TriggerProcessor.test.js` | Updated trigger strings and TRIGGER_TYPES references |
| `src/managers/__tests__/RoundInitializationProcessor.test.js` | Removed step 3b tests, updated mock |
| `src/managers/__tests__/ActionProcessor.mapAnimationEvents.test.js` | Updated mock |
| `src/managers/__tests__/GameFlowManager.endOfRound.test.js` | **NEW** — 9 tests covering phase classification, routing, banner, triggers, flow |

---

## 6. Verification

- Full test suite: 283 files, 4242 tests passed, 0 failures
- Zero `ON_ROUND_START` references remain in `src/`
- Zero `processRoundStartTriggers` references remain in `src/`
- Zero `hasThreatOnRoundStart` references remain in `src/`
