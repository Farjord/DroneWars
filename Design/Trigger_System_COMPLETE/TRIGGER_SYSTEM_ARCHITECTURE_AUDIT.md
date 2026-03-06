# Trigger System Architecture Audit

**Date**: 2026-03-01
**Scope**: Audit only — no implementation changes
**Motivation**: 10+ recent commits fixing timing bugs suggest accumulated architectural complexity

## User's Ideal Model

A trigger chain should work like a **sequential checklist**:

1. **Build phase**: Collect ALL triggers that will fire, in priority order
2. **Execute phase**: Walk the list one-by-one — update state, animate, pause
3. **Atomicity**: Each step fully completes before the next begins
4. **Pacing**: Suitable pauses between steps for player comprehension
5. **Per-trigger atomicity**: The initiating action resolves fully (e.g., "Draw 3" = 3 cards appear at once), then each subsequent trigger fires as its own complete step (state + animation + pause). Cascading triggers each get their own visible step.

---

## Where the System ALIGNS with the Ideal

| Aspect | Implementation | Verdict |
|-|-|-|
| Trigger collection | `findMatchingTriggers()` scans the board and returns a sorted array (Self > Actor > Opponent, L-to-R) | Matches |
| Sequential execution | `for (const match of matchingTriggers)` loop processes one trigger at a time | Matches |
| Animation playback | `AnimationManager.executeAnimations()` uses a `while` loop with `await` — strictly sequential | Matches |
| Pacing | `TRIGGER_CHAIN_PAUSE` (400ms) inserted between trigger steps | Matches |
| Safety guards | Pair guard (reactor:source fires once), liveness check (skip dead drones) | Solid |

---

## Where the System DEVIATES from the Ideal

### Deviation 1: Triggers Are NOT Collected Upfront

**Ideal**: One big ordered checklist built before anything executes.

**Reality**: Triggers fire from multiple scattered call sites during effect processing:

| Call Site | Trigger Type | When It Fires |
|-|-|-|
| `DrawEffectProcessor.process()` | `ON_CARD_DRAWN` | During DRAW effect execution |
| `MovementEffectProcessor._resolvePostMoveTriggers()` | `ON_MOVE`, `ON_LANE_MOVEMENT_IN/OUT` | During movement execution |
| `GainEnergyEffectProcessor.process()` | `ON_ENERGY_GAINED` | During energy gain |
| `EffectChainProcessor` (line 398) | `ON_CARD_PLAY` | After all card effects resolve |
| `AttackProcessor` | `ON_ATTACK` | During attack resolution |

Each call site independently calls `TriggerProcessor.fireTrigger()` at the moment the triggering event occurs. The system can't show the player "here's everything that's about to happen" because it doesn't know yet.

### Deviation 2: Cascading Triggers Are Depth-First (Recursive), Not Queued

**Ideal**: Flat checklist executed in order.

**Reality**: When trigger A causes an effect (e.g., DRAW) that itself fires trigger B (e.g., ON_CARD_DRAWN), trigger B resolves **immediately inside** trigger A's execution via a nested `fireTrigger()` call. The result is a recursive tree:

```
Card Play
  -> DRAW effect (DrawEffectProcessor)
    -> ON_CARD_DRAWN fires (nested fireTrigger)
      -> Odin: +1 attack (nested execution)
  -> ON_CARD_PLAY fires (EffectChainProcessor line 398)
    -> Shrike: stat boost (nested execution)
```

Animation events from nested triggers are collected as `triggerAnimationEvents` and deferred, but state mutations happen immediately during the logic phase.

### Deviation 3: Compute-All-Then-Animate (Not Compute-One-Animate-One)

**Ideal**: Execute trigger -> update state -> animate -> pause -> next trigger.

**Reality**: Two distinct phases:

1. **Logic phase** (synchronous): ALL state mutations happen. All triggers resolve. All cascades complete. Final game state is computed.
2. **Animation phase** (async): Collected animation events are played back in sequence, with `STATE_SNAPSHOT` events applying intermediate states to create the *illusion* of step-by-step execution.

This is the **root cause** of timing complexity. Because state is fully resolved before animations begin, the system needs `STATE_SNAPSHOT` events to reconstruct what the board "should look like" at each point during playback.

### Deviation 4: Accumulated Timing Workarounds

The two-phase architecture requires multiple timing mechanisms to simulate sequential behavior:

| Mechanism | Purpose | Origin |
|-|-|-|
| `STATE_SNAPSHOT` | Apply intermediate state during animation playback | Core architecture |
| `TRIGGER_CHAIN_PAUSE` (400ms) | Breathing room between trigger steps | Commit `2cf7464f` |
| `preCascadePlayerStates` | Snapshot before cascade so nested changes don't flash early | Commit `f9e7f8c6` |
| Additive vs destructive ordering | Different event ordering based on trigger type (snapshot-first vs events-first) | `TriggerProcessor.js` lines 133-144 |
| Post-process card removal from snapshots | Remove played card from intermediate `STATE_SNAPSHOT` hand states | `EffectChainProcessor.js` lines 418-428, 470-480 |
| `stateBeforeTriggers` capture | Capture state before any trigger mutations for intermediate snapshot | `EffectChainProcessor.js` lines 185, 337, 446 |
| Breathing room pause before deferred triggers | Extra `TRIGGER_CHAIN_PAUSE` after TELEPORT before triggers start | `EffectChainProcessor.js` lines 459-462 |

Each exists because the fundamental architecture (compute-all-then-animate) doesn't naturally produce sequential behavior. They are patches to make a batch system look sequential.

---

## Critical Bug: Pair Guard Does Not Propagate Across Cascade Boundaries

### The Bug

Every effect processor that fires triggers (`DrawEffectProcessor`, `GainEnergyEffectProcessor`, `MovementEffectProcessor`) creates a **new** `TriggerProcessor` instance and calls `fireTrigger()` with **no `pairSet` and no `chainDepth`**. Each cascade level starts with a fresh pair guard.

**Verified locations:**

| File | Line | Creates fresh TriggerProcessor |
|-|-|-|
| `DrawEffectProcessor.js` | 83-85 | Yes — no `pairSet` passed |
| `GainEnergyEffectProcessor.js` | 64-66 | Yes — no `pairSet` passed |
| `MovementEffectProcessor.js` | 582-585 | Yes — no `pairSet` passed |
| `EffectChainProcessor.js` | 398 | Uses instance `triggerProcessor`, no `pairSet` passed |

### What This Means

With two ON_CARD_DRAWN drones (Alpha and Beta) in a lane where "Draw 3" is played:

```
Card plays "Draw 3"
  -> fireTrigger(ON_CARD_DRAWN) — pairSet = {} (fresh)
    -> Alpha fires (draws 1) — pairSet = {alpha:system}
      -> NEW fireTrigger(ON_CARD_DRAWN) — pairSet = {} (FRESH!)
        -> Alpha fires (draws 1) — pairSet = {alpha:system}
          -> NEW fireTrigger(ON_CARD_DRAWN) — pairSet = {} (FRESH AGAIN!)
            -> ...until deck empties or stack overflows
```

### Three Specific Issues

| Issue | Severity | File | Detail |
|-|-|-|-|
| `pairSet` not propagated through EffectRouter to cascading effect processors | CRITICAL | `DrawEffectProcessor.js:85` | Each cascade gets fresh `new Set()` |
| No `MAX_CHAIN_DEPTH` enforcement | CRITICAL | `TriggerProcessor.js:52` | `chainDepth` is tracked but never checked against a limit |
| `sourceId` always `'system'` for card draws | IMPORTANT | `DrawEffectProcessor.js:85` | No `triggeringDrone` passed — prevents correct pair-key generation for cascades |

**Same pattern exists in**: `GainEnergyEffectProcessor.js` and `MovementEffectProcessor.js`.

### Correct Behavior (Design Decision)

With proper `sourceId` tracking (reactor drone, not `'system'`), the 5-step model applies:

1. Initial: Alpha fires (`alpha:system`), Beta fires (`beta:system`)
2. Alpha reacting to Beta's draw: `alpha:beta` (new pair)
3. Beta reacting to Alpha's draw: `beta:alpha` (new pair)
4. All pairs exhausted -> stops

Requirements for fix:
- `sourceId` must track the reactor drone that caused the cascade
- `pairSet` must propagate across cascade boundaries (through EffectRouter)
- A `MAX_CHAIN_DEPTH` safety limit is still needed as a guardrail
- The pair guard logic itself is correct — it just needs propagation and correct sourceId

---

## Why the Current Architecture Was Chosen

1. **React rendering model**: Can't pause mid-reducer — state updates are batched
2. **Trigger evaluation needs current state**: Each trigger must see results of prior triggers to evaluate correctly
3. **Multiplayer sync**: Both players need identical final state; animation is presentation-only
4. **Determinism**: Pure logic phase is deterministic; animation phase is fire-and-forget

Reasons 2-4 are legitimate constraints that must be preserved in any redesign.

---

## Recommendation: Structured Action List

### Core Insight

The logic phase already processes triggers sequentially (the `for` loop in `fireTrigger`). The problem is that animation events are collected and played back separately, requiring complex intermediate state reconstruction.

### Proposed Architecture

**Keep**: Synchronous logic phase that computes all state changes (reasons 2-4 above).

**Change**: Instead of a flat animation array with `STATE_SNAPSHOT`s embedded, build a **structured action list** where each entry is a self-contained step:

```javascript
// Current: flat array of mixed animation events
[CARD_REVEAL, CARD_VISUAL, STATE_SNAPSHOT, TELEPORT_IN, TRIGGER_CHAIN_PAUSE,
 STATE_SNAPSHOT, TRIGGER_CHAIN_PAUSE, TRIGGER_FIRED, STATE_SNAPSHOT, TRIGGER_FIRED, ...]

// Proposed: structured action list
[
  { type: 'CARD_EFFECT', label: 'Play Tactical Resupply',
    animations: [CARD_REVEAL, CARD_VISUAL], stateAfter: {...} },
  { type: 'TRIGGER', label: 'Alpha: ON_CARD_DRAWN (draw 1)',
    animations: [TRIGGER_FIRED], stateAfter: {...} },
  { type: 'TRIGGER', label: 'Beta: ON_CARD_DRAWN (draw 1)',
    animations: [TRIGGER_FIRED], stateAfter: {...} },
]
```

Each step carries its own `stateAfter` snapshot. The animation player:
1. Applies `stateAfter` for step N (React renders)
2. Waits for React render
3. Plays step N's animations
4. Pauses (300-500ms for comprehension)
5. Moves to step N+1

### Granularity Rules

| Action | Granularity | Example |
|-|-|-|
| Card play (initiating) | 1 step — all card effects resolve | "Draw 3" = 1 step showing 3 new cards |
| Drone deployment | 1 step | Deploy + teleport animation |
| Trigger fires | 1 step per trigger firing | Odin +1 attack = 1 step |
| Cascade trigger | 1 step per cascade firing | Trigger A reacting to trigger B = 1 step |
| Attack (initiating) | 1 step — damage + destruction | Attack animation + result |
| Mine trigger | 1 step — damage + self-destruct | Mine fires, damage, mine removed |

### What This Eliminates

| Workaround | Why It's No Longer Needed |
|-|-|
| `STATE_SNAPSHOT` pseudo-events | State is per-step, not inline |
| `TRIGGER_CHAIN_PAUSE` pseudo-events | Pausing is the player's job, not embedded in events |
| `preCascadePlayerStates` | Each step snapshots naturally |
| Additive vs destructive ordering | Each step is self-contained |
| Post-processing card removal from snapshots | Finalized at step creation time |
| `stateBeforeTriggers` capture | No intermediate reconstruction needed |

### Performance Note

Each `stateAfter` snapshot requires deep cloning (~50-200KB per step). For typical chains (2-4 triggers) this is negligible. For cascade chains of 5-6 triggers, profiling is recommended but should remain manageable.

### Key Files That Would Change

| File | Role |
|-|-|
| `src/logic/triggers/TriggerProcessor.js` | Return per-trigger state snapshots alongside animation events |
| `src/logic/cards/EffectChainProcessor.js` | Build structured action list instead of flat animation array |
| `src/managers/AnimationManager.js` | New `executeActionList()` method |
| `src/managers/ActionProcessor.js` | Wire up new execution path |
| `src/logic/effects/cards/DrawEffectProcessor.js` | Propagate trigger steps upward |
| `src/logic/effects/energy/GainEnergyEffectProcessor.js` | Propagate trigger steps upward |
| `src/logic/effects/MovementEffectProcessor.js` | Propagate trigger steps upward |

---

## Action Items

### Must Fix (Before or During Refactor)

1. [FIXED] **Propagate `pairSet` across cascade boundaries** — pairSet/chainDepth passed through TriggerProcessor → EffectRouter → effect processors → nested fireTrigger
2. [FIXED] **Enforce `MAX_CHAIN_DEPTH`** — Added MAX_CHAIN_DEPTH=20 in triggerConstants.js, depth guard in fireTrigger()
3. [FIXED] **Track `sourceId` correctly** — triggeringDrone=reactorDrone passed through EffectRouter context into nested fireTrigger calls

### Refactor (Structured Action List)

4. [FIXED] Build step-based action list in logic phase — triggerSteps returned from fireTrigger/executeTriggerEffects alongside animationEvents
5. [FIXED] Replace `STATE_SNAPSHOT` insertion with per-step `stateAfter` — each triggerStep carries stateAfter snapshot
6. [FIXED] New animation player method that walks the action list — AnimationManager.executeActionSteps()
7. **Partially done** — Old workarounds kept for non-card-play consumers (attacks, deployments, round-start). CardActionStrategy uses new path when actionSteps present.
8. Not yet profiled — typical chains (2-4 triggers) expected to be negligible
