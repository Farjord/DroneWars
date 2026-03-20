# Animation System Deep Audit

> Replaces the shallow audit of 2026-03-18. Every finding is backed by specific line references from full file reads.
> Audit date: 2026-03-18 | Scope: ~9,300 LOC across 35+ files | Method: 8 agents, full file reads, cross-file tracing

---

## Executive Summary

The animation system is architecturally sound — the core two-timeline orchestration pattern works correctly and the effect pipeline follows state->animation->cascade ordering throughout. However, the deep audit reveals issues the shallow scan missed or understated:

1. **`splitByTiming()` is partially vestigial** — its `independent` and `preState` arrays are never used for execution dispatch (AnimationManager L276 vs L300-303)
2. **Sound and animation are fully independent systems** — not just "not co-located" but completely disconnected with duplicated type string contracts
3. **Animation components can't be restructured into folders without addressing keyframe coupling** — 6+ components silently depend on globally-loaded `animations.css` keyframe names without importing the file
4. **8+ deep clones per card play** in EffectChainProcessor alone — performance scales with board size
5. **Three distinct DOM lookup strategies coexist** in handler files — `getElementFromLogicalPosition`, direct `droneRefs.current[id]`, and `document.querySelector`
6. **AnimationLayer receives 24 props (not 30+)** — still excessive, but the shallow audit overcounted
7. **useAnimationSetup has an incomplete useEffect dependency array** — several state setters missing from deps
8. **TriggerProcessor execution is breadth-first across siblings, depth-first within cascades** — not purely depth-first as the shallow audit claimed

---

## Core Pipeline Execution Traces

### Trace 1: Card Play -> Animations -> State Update

```
Card played by user
  |
  v
EffectChainProcessor.processEffectChain() [L192]
  |-- Pay costs, deep-clone state [L197]
  |-- Build preamble: CARD_REVEAL + optional CARD_VISUAL [L211-277]
  |-- If card has cost: emit STATE_SNAPSHOT [L282-290]
  |-- Per-effect loop [L293-471]:
  |     |-- Alive check [L296]
  |     |-- Resolve refs from selections [L305]
  |     |-- Process PRE conditionals [L310]
  |     |-- Route effect (mutates currentStates) [L380]
  |     |-- Process POST conditionals [L400]
  |     |-- If deferred triggers: resolve now [L419-431]
  |     |-- Collect animation step [L446]
  |-- Fire ON_CARD_PLAY triggers [L476-495]
  |-- AnimationSequenceBuilder.buildAnimationSequence() [L497]
  |     |-- Per step: actionEvents -> STATE_SNAPSHOT -> postSnapshotEvents -> TRIGGER_CHAIN_PAUSE -> triggerEvents [ASB L31-43]
  |-- Snapshot card-hiding mutation [L507-511]
  |-- finishCardPlay: discard card, determine shouldEndTurn [L514]
  |-- Return { newPlayerStates, shouldEndTurn, animationEvents } [L524-528]
  |
  v
GameClient._processResponse() receives server state
  |-- _extractAndQueueAnnouncements() separates PHASE/PASS announcements [L108-109, L259-272]
  |-- Set pendingServerState on executor [L170-180]
  |-- Call animationManager.executeWithStateUpdate(animationEvents, executor) [L183]
  |
  v
AnimationManager.executeWithStateUpdate() [L243]
  |-- splitByTiming() classifies anims (result partially unused) [L276]
  |-- Build preAnimations = all where timing !== 'post-state' [L300-303]
  |-- await executeAnimations(preAnimations) [L304-317]
  |     |-- Dispatch loop (while, L522):
  |     |     STATE_SNAPSHOT -> executor.applyIntermediateState() [L526-537]
  |     |     TRIGGER_CHAIN_PAUSE -> pure delay [L540-547]
  |     |     ANIMATION_SEQUENCE -> Promise.all with staggered startAt [L550-606]
  |     |     Damage types (6) -> group consecutive, Promise.all [L608-646]
  |     |     Buff types (2) -> group consecutive, Promise.all [L648-685]
  |     |     Everything else -> sequential, one at a time [L686-733]
  |-- executor.applyPendingStateUpdate() — STATE MUTATION HAPPENS HERE [L325]
  |-- If post-state animations exist:
  |     |-- await waitForReactRender() (double rAF) [L334-342, L401-407]
  |     |-- Split into TELEPORT_IN vs other post-state [L345-346]
  |     |-- Execute non-teleport post-state [L354-367]
  |     |-- Execute TELEPORT_IN with mid-animation reveal at 70% [L370-382]
  |-- executor.revealTeleportedDrones() [L205-214]
```

**Key finding**: State updates happen FIRST in the effect pipeline (L380 mutates before L446 collects animations), but the *visual* state update is deferred until after pre-state animations play (L325 runs after L304-317 completes). This is the two-timeline contract.

### Trace 2: Trigger Resolution + Cascade

```
TriggerProcessor.fireTrigger(triggerType, context) [L103]
  |
  |-- findMatchingTriggers() [L261-342]
  |     Tier 0: Self-triggers (triggering drone's own abilities) [L261-296]
  |     Tier 0.5: Tech slot triggers (both players) [L298-312]
  |     Tier 1: Actor's lane drones (excluding source) [L316-318]
  |     Tier 2: Opponent's lane drones [L322-325]
  |     Controller: All 3 lanes if CONTROLLER_TRIGGER_TYPE [L329-338]
  |     Sort by tier (stable within tier = deployment order) [L342]
  |
  |-- For each matched trigger [L120]:
  |     |-- Pair guard check: "reactorId:sourceId" in shared Set [L130-138, L606-609]
  |     |-- Chain depth check: < MAX_CHAIN_DEPTH (20) [L89-92]
  |     |-- executeTriggerEffects() [L393]
  |     |     |-- Emit TRIGGER_FIRED [L393-406]
  |     |     |-- Route each effect via EffectRouter [L448, L542]
  |     |     |-- If cascade occurs (nested fireTrigger):
  |     |     |     |-- Capture preCascadePlayerStates [L455]
  |     |     |     |-- Insert TRIGGER_CHAIN_PAUSE (400ms) [L459]
  |     |     |     |-- Append cascade animation events [L460-461]
  |     |     |-- Determine ordering:
  |     |           Destructive: [...effectAnims, STATE_SNAPSHOT] [L186-187]
  |     |           Additive: [TRIGGER_FIRED, STATE_SNAPSHOT, ...effectAnims] [L195-200]
  |     |-- Strip trailing TRIGGER_CHAIN_PAUSE events [L228-231]
  |
  |-- Return { newPlayerStates, triggerAnimationEvents }
```

**Key finding**: Execution is **breadth-first across sibling triggers** (for-loop at L120 iterates all matched triggers sequentially) but **depth-first within cascades** (nested `fireTrigger` resolves fully before parent loop continues). The shallow audit incorrectly stated "depth-first" without qualification.

### Trace 3: Movement with Deferred Triggers

```
EffectChainProcessor calls executeSingleMove({ deferTriggers: true }) [L548-551]
  |
  v
MovementEffectProcessor.executeSingleMove() [L216]
  |-- Clone playerStates [L172 via BaseEffectProcessor]
  |-- Validate: INERT [L249], INHIBIT [L261], capacity [L272], maxPerLane [L296]
  |-- Mutate: splice from source lane, insert into dest [L312-323]
  |-- Snapshot postMovementState [L341] *** REDUNDANT in deferred path ***
  |-- Build DRONE_MOVEMENT animation [L344-349]
  |-- deferTriggers=true: return deferredTriggerContext [L369-374]
  |     (captures: movedDrones, lanes, pairSet, chainDepth — by reference)
  |
  v
Back in EffectChainProcessor:
  |-- Process POST conditionals (e.g., shield grants) [L400]
  |-- resolveDeferredTriggers(context, currentStates) [L419-431]
  |     |-- Deep-clone currentStates (post-conditional) [L559-561]
  |     |-- _resolvePostMoveTriggers():
  |           ON_MOVE [L442] -> ON_LANE_MOVEMENT_OUT [L469]
  |           -> aura update [L495] -> ON_LANE_MOVEMENT_IN [L518]
  |           (Creates new TriggerProcessor per call at L435)
  |-- Capture preTriggerState [L420] *** Overwrites L341's snapshot ***
```

**Key finding**: The `postMovementState` clone at L341 is **wasted in the deferred path** — EffectChainProcessor captures its own `preTriggerState` at L420 which is the one actually used for animation sequencing.

### Trace 4: Sound Flow (Independent System)

```
Four disconnected trigger paths -> SoundManager.play(soundId):

Path A: phaseAnimationQueue.on('animationStarted')
        -> getSoundForEvent('phaseAnimation', phaseName) [soundConfig L138-145]

Path B: actionProcessor.subscribe() -> filter 'action_completed'
        -> getSoundForEvent('actionCompleted', actionType) [soundConfig L148-150]

Path C: gameStateManager.subscribe() -> ANIMATION_STARTED event
        -> lookup animationType in soundConfig [L153-163]
        -> fallback to visualType via cardVisualStarted map [L166-168]

Path D: combatStateManager.subscribe()
        -> getSoundForEvent('stateChange', eventType) [soundConfig L176-179]
```

**Key finding**: Sound timing depends on when `ANIMATION_STARTED` is emitted by gameStateManager, NOT on when the visual animation actually renders or starts its CSS transition. These can drift. The string-based animation type contract is duplicated between AnimationManager's registry and soundConfig with no shared constants.

---

## Layer-by-Layer Findings

### A. Core Orchestration — AnimationManager.js (749 LOC)

**Animation Metadata Registry**: 30 registered animation types. Each entry defines: name, handler key (type), timing classification, duration (ms), and config object. Sound is NOT in the registry — it lives in soundConfig.js's `SOUND_EVENT_MAP`.

**`splitByTiming()` is partially vestigial** (L452-476): Classifies into three buckets (preState, postState, independent), but only `postState` is used for execution. The actual pre-animation filter at L300-303 re-derives the split: `timing !== 'post-state'`. The `independent` and `preState` arrays from `splitByTiming` are consumed only in debug logging (L279, L286, L291-294).

**ANIMATION_SEQUENCE serves a real purpose** (L550-606): Enables overlapping/staggered child animations with precise `startAt` offsets — needed for choreographed multi-step effects like railgun (turret deploy + beam fire). However, every handler call has a double-resolve pattern (both `onComplete` callback AND `setTimeout` fallback) duplicated in 4 places (L596-599, L641, L681, L723).

**Missing handler behavior**: Silently swallowed in all 3 dispatch paths (L581-584, L628-629, L698-702). Warning logged, animation skipped with zero delay. A missing handler for a pre-state animation causes the state update to arrive sooner than intended.

**Unregistered type**: `TRIGGER_CHAIN_PAUSE` is handled in dispatch (L540-547) but has no entry in the animation registry (L14-230).

**Near-identical code**: Damage grouping (L608-646) and buff grouping (L648-685) are structurally identical — ~38 lines duplicated with only the filter array differing.

### B. Effect Chain — EffectChainProcessor.js (600 LOC) + AnimationSequenceBuilder.js (60 LOC)

**State-first contract verified**: Each effect mutates `currentStates` at L380, then animation events are collected at L446. `buildAnimationSequence` at L497 runs after all mutations complete. The returned `newPlayerStates` is the fully-mutated final state.

**AnimationSequenceBuilder ordering contract** (ASB L31-43): Strictly enforces per-step: `actionEvents -> STATE_SNAPSHOT -> postSnapshotEvents -> TRIGGER_CHAIN_PAUSE -> triggerEvents`. Clean, single-responsibility. No changes needed.

**Snapshot card-hiding mutation** (L507-511): Every `STATE_SNAPSHOT` event is mutated in-place via `_removeCardFromSnapshot` (L143-151) to filter the played card from `acting.hand` and add to `discardPile`. This is because snapshots are captured before `finishCardPlay` runs (L514). Fragile — could break if snapshots are ever shared.

**8+ deep clones per card play**: `JSON.parse(JSON.stringify(...))` at L158-159, L172-173, L287, L420, L443, L476, L539-541, L573-575. Performance cost scales with board state size.

**God method**: `processEffectChain` is 337 lines (L192-529) with 5+ responsibilities. Hard to test in isolation.

**pseudoCard hack** (L545): Builds fake card objects to satisfy `MovementEffectProcessor`'s API — signals interface mismatch between the two processors.

### C. Trigger System — TriggerProcessor.js (1,244 LOC)

**Trigger collection** is a tiered scan (L261-342): Self -> Tech -> Actor lane -> Opponent lane -> Controller. Sorted by tier at L342; within same tier, order is insertion (deployment) order.

**Pair-guard mechanism** (L130-138, L606-609): `Set<string>` of `"reactorId:sourceId"` keys, shared by reference across the entire chain. Effective but relies on stable drone IDs.

**Destructive vs additive event ordering** (L186-201):
- Destructive (damage/destroy): `[...effectAnims, STATE_SNAPSHOT]` — targets must remain in DOM during damage animations
- Additive (buffs/draws): `[TRIGGER_FIRED, STATE_SNAPSHOT, ...effectAnims]` — stat values update first so buff overlays show new values

**O(n) lookup concern**: `allDroneDefinitions.find()` at L262, L755, L795, L834 is O(n) per drone per trigger check. On boards with many drones/definitions, this is a hot path that should be a Map.

**No input mutation guard**: L94 never deep-clones `playerStates`. Comment at L1093 says "Mutates currentStates directly" — callers must guarantee a working copy. Direct `splice()` mutation at L1174 corrupts the source if not pre-cloned.

**Magic fallback seed**: L1028 has `gameSeed ?? 12345` — if gameSeed is accidentally null, targeting becomes deterministically fixed.

### D. Client + Action Processing — GameClient.js (293 LOC) + ActionProcessor.js (799 LOC)

**stateProvider protocol** (GC L21-232): Duck-typed interface with `applyPendingStateUpdate()`, `revealTeleportedDrones()`, `applyIntermediateState()`. No interface definition — any method rename breaks silently.

**Response queue serialization** (GC L25-96): Simple mutex pattern — `_processingResponse` flag + queue drain loop with `await`. Prevents concurrent broadcasts from overlapping.

**Announcement extraction** (GC L108-109, L259-272): Splits `PHASE_ANNOUNCEMENT` and `PASS_ANNOUNCEMENT` into `phaseAnimationQueue` while visual animations go to AnimationManager.

**mapAnimationEvents()** (AP L221-257): Raw events mapped to `{ animationName, timing, payload }`. STATE_SNAPSHOT and TRIGGER_CHAIN_PAUSE get hardcoded `'pre-state'` timing. Others look up from `animationManager.animations[event.type]`, defaulting to `'pre-state'`.

**Duplicate triggerSyncId stamping — confirmed**:
- Path 1 (AP L712-715): Stamps `Date.now()` on TRIGGER_FIRED in `executeAndCaptureAnimations()`
- Path 2 (AP L537-543): Safety net in `processAction()` for animations captured via `captureAnimations`
- Comment at AP L272 says "exclusively" about Path 1 — misleading

**Date.now() collision risk**: Both paths use `Date.now()` — two triggers within 1ms get the same syncId.

**Singleton returns stale instance** (AP L138-141): `new ActionProcessor(gsm)` silently returns existing instance whose `gameStateManager` reference may be outdated.

### E. Animation Handlers — 5 files (1,088 LOC total)

| File | LOC | Handlers |
|-|-|-|
| useCardAnimations.js | 172 | CARD_VISUAL_EFFECT, CARD_REVEAL_EFFECT, STATUS_CONSUMPTION_EFFECT |
| useMovementAnimations.js | 93 | DRONE_MOVEMENT_EFFECT |
| useProjectileAnimations.js | 441 | DRONE_FLY, OVERFLOW_PROJECTILE, SPLASH_EFFECT, BARRAGE_IMPACT, RAILGUN_TURRET, RAILGUN_BEAM |
| useStatusAnimations.js | 184 | FLASH_EFFECT, HEAL_EFFECT, EXPLOSION_EFFECT, SHAKE_EFFECT, STAT_CHANGE_EFFECT |
| useNotificationAnimations.js | 198 | PASS_NOTIFICATION_EFFECT, GO_AGAIN_NOTIFICATION_EFFECT, TRIGGER_FIRED_EFFECT, MOVEMENT_BLOCKED_EFFECT, SHIP_ABILITY_REVEAL_EFFECT, TELEPORT_EFFECT |

**Three DOM lookup strategies coexist**:
1. `getElementFromLogicalPosition` — used by useCardAnimations, useProjectileAnimations (10 calls), useStatusAnimations (4 calls)
2. Direct `droneRefs.current[id]` — useMovementAnimations (entire file), useStatusAnimations SHAKE_EFFECT (L131), useNotificationAnimations (L72, L100, L165)
3. `document.querySelector` by data attributes — useMovementAnimations (L38), useNotificationAnimations (L73, L101, L166)

useMovementAnimations doesn't even accept `getElementFromLogicalPosition` as a parameter.

**BARRAGE_IMPACT uses raw setTimeout** (useProjectileAnimations L270-275): `setTimeout` manages cleanup and calls `onComplete` outside animation orchestration. Unmount before timeout = leaked state setter.

**SHAKE_EFFECT manipulates DOM directly** (useStatusAnimations L134-137): `classList.add/remove('animate-shake-damage')` with raw setTimeout. Bypasses React's state-driven rendering.

**TELEPORT uses requestAnimationFrame hack** (useNotificationAnimations L162): Entire handler wrapped in `requestAnimationFrame` with comment "ensure React has finished rendering." rAF does not guarantee React has committed — if placeholder hasn't rendered, handler silently no-ops (L170).

**Perspective calculation duplicated ~10 times**: `localPlayerId` + `sourcePlayer === localPlayerId` pattern appears across useCardAnimations (L32-34, L50, L78-79, L132-133, L152), useProjectileAnimations (L117-118, L291-293, L362-364), useNotificationAnimations (L33-34, L51, L134-135, L179-180).

**`placedSections` lookup pattern repeated 3x in one file**: useProjectileAnimations L141-149, L291-296, L362-367 — identical 3-step pattern.

### F. Movement Effect Processor — MovementEffectProcessor.js (586 LOC)

**Complete flow verified**: Entry at L43 -> validation (L248-309) -> state mutation (L312-323) -> snapshot (L341) -> animation (L344-349) -> trigger deferral check (L353-376) -> trigger resolution (L379-408).

**Deferred context captures by reference** (L369-374): `logCallback`, `placedSections`, `pairSet` are references — currently safe since callbacks are stable, but fragile. `movedDrones` is a shallow copy of one drone object.

**`resolveDeferredTriggers` correctly uses post-conditional state** (L557-572): Deep-clones the caller's `currentPlayerStates` (which includes POST conditional effects like shield grants), then spreads `deferredContext` into `_resolvePostMoveTriggers`. Context restoration is correct.

**Redundant deep clone confirmed**: `postMovementState` at L341 is overwritten by EffectChainProcessor's own `preTriggerState` capture at ECP L420 in the deferred path. Only used in the non-deferred (inline) path.

**TriggerProcessor instantiation per movement confirmed** (L435): Creates `new TriggerProcessor()` inside `_resolvePostMoveTriggers()`. Constructor only creates an EffectRouter, so cost is minimal. ECP holds `this.triggerProcessor` that goes unused for movement triggers.

**`pairSet || new Set()` fallback duplicated 4 times** (L453, L480, L529, and in deferred context).

### G. Sound + UI Wiring

**SoundEventBridge.js** (134 LOC): Subscribes to 4 event sources independently. The `subscribeToActionProcessor()` method (L113-118) deliberately excludes the action listener from the `unsubscribers` array (L115) — relying on `clearQueue()` for cleanup. On `disconnect()` (L123-131), this listener is never explicitly unsubscribed.

**soundConfig.js** (216 LOC): Declarative routing tables mapping event types to sound IDs. Animation type strings (`TELEPORT_IN`, `DRONE_ATTACK_START`, etc.) are duplicated from AnimationManager with no shared constants.

**AnimationLayer.jsx** (274 LOC): Receives **24 props** (not 30+ as shallow audit claimed) — 22 data arrays/objects + `animationBlocking` + `setBarrageImpacts`. The `setBarrageImpacts` setter prop breaks the "no state or effects" contract stated at L3.

**useAnimationSetup.js** (124 LOC): Accepts **34 parameters**. Single `useEffect` (L11-123) that:
- Creates `AnimationManager` instance (L14) — **never disposed on unmount**
- Builds `getElementFromLogicalPosition` closure (L26-45)
- Registers 5 handler modules (L58-97)
- **Incomplete dependency array** (L123): ~26 entries but several setters missing (`setShipAbilityReveals`, `setGoAgainNotifications`, `setTriggerFiredNotifications`, `setMovementBlockedNotifications`, `setStatusConsumptions`, `setStatChangeEffects`)

### H. Animation Components (23 files, ~3,100 LOC)

**No component exports metadata.** Every file has only `export default`. AnimationLayer (L6-27) hard-codes 22 imports. Adding a new animation type requires editing AnimationLayer and threading a new prop through the parent.

**Three style strategies**:
1. `src/styles/animations.css` (51 keyframes) — used by TeleportEffect, CardVisualEffect, HealEffect, ExplosionEffect, StatBuffEffect, KPIChangePopup, PhaseAnnouncementOverlay
2. `index.css` (38 keyframes) — UI-level animations, none used by animation components
3. Inline `<style>` tags — RailgunTurret (L75-120: 4 keyframes), GoAgainOverlay (L103), PassNotificationOverlay (L85)

**6+ components silently depend on globally-loaded `animations.css`** keyframe names without importing the file (e.g., TeleportEffect references `teleportRing` at L65).

**KPIChangePopup bypasses AnimationLayer** — imported directly by GameHeader.jsx, inconsistent with all other animations.

**z-Index chaos** — 5 tiers with no shared constants: 9997, 9998, 9999, 10000, 99999.

**Restructuring into co-located folders is NOT straightforward**:
1. Keyframe coupling — 6+ components silently depend on globally-loaded keyframe names
2. AnimationLayer is a manual hub — 22 imports, 24 props, no registry
3. CardRevealOverlay imports ActionCard (L9) — cross-component dependency
4. KPIChangePopup bypasses AnimationLayer entirely
5. Inline `<style>` tags inject global keyframes at render time — potential collision risk

---

## Consolidated Duplication Catalog

| Pattern | Locations | Count |
|-|-|-|
| Perspective calc (`sourcePlayer === localPlayerId`) | useCardAnimations L32,50,78,132,152; useProjectileAnimations L117,291,362; useNotificationAnimations L33,51,134,179 | ~12 |
| `placedSections` lookup + laneIndex parse | useProjectileAnimations L141-149, L291-296, L362-367 | 3 |
| `parseInt(targetLane.replace('lane',''))-1` | useProjectileAnimations L149,295,366; useCardAnimations L77 | 4 |
| `getBoundingClientRect` center calc (manual) | useCardAnimations L64-66,103-106; useStatusAnimations L59,108 | 4 |
| Fallback to game area center | useCardAnimations L43-46, L70-73 | 2 |
| `droneRefs.current[id]` + querySelector fallback | useNotificationAnimations L72-73, L100-101, L165-166 | 3 |
| Damage grouping vs buff grouping logic | AnimationManager L608-646 vs L648-685 | 2 (~38 LOC each) |
| `pairSet \|\| new Set()` | MovementEffectProcessor L453, L480, L529, deferred context | 4 |
| Double-resolve pattern (onComplete + setTimeout) | AnimationManager L596-599, L641, L681, L723 | 4 |
| `JSON.parse(JSON.stringify(...))` deep clone | EffectChainProcessor L158,172,287,420,443,476,539,573 | 8 |

---

## Consolidated Issue Catalog

### Issues That Affect Players (Visual Bugs)

| Issue | Player Impact | Trigger Condition | Likelihood |
|-|-|-|-|
| SHAKE_EFFECT DOM manipulation (useStatusAnimations L134) | Shake animation cut short or persists too long — drone appears to "freeze" or "jitter" | React re-renders during 500ms shake window (STATE_SNAPSHOT mid-animation) | Latent — edge case in rapid trigger chains |
| TELEPORT rAF hack (useNotificationAnimations L162) | Teleport glow animation silently doesn't play — drone just appears | React hasn't committed placeholder element when single rAF fires | Latent — rapid deployments or slow render frames |
| DOM lookup inconsistency across handlers | Animation targets wrong element or fires at wrong position | Two handlers target same drone using different lookup strategies during rapid state changes | Real — observable in complex trigger cascades |
| Missing handler silently swallowed (AM L581-584) | State update arrives sooner than intended — visual "jumps" without animation | A registered animation type has no visual handler (e.g., after refactoring) | Latent — only on handler removal/rename |

### Issues That Cost Developer Time (Extensibility Friction)

Adding a new animation type today requires touching **7 files, ~150-180 LOC**. The vision goal is "create a folder."

| Issue | Developer Cost | Vision Goal | Gap |
|-|-|-|-|
| No animation registry / manual AnimationLayer hub | Adding new animation: 7 files, ~150 LOC, manual prop threading through App→AnimationLayer→handler | "Create folder = add animation" | 7 files vs 1 folder |
| Sound disconnected from animation metadata | Adding sound: 2-3 files, must match string constants by hand | Sound metadata exported from animation unit | Fragile string contract |
| Perspective logic duplicated ~12x across 5 handler files | Changing board layout: 15-20 hardcoded locations to find and update | Centralized position utility | Every layout change is a scavenger hunt |
| Three DOM lookup strategies | New handler author must guess which lookup to use; wrong choice = misaligned animations | Single consistent DOM resolution | No guidance, no central function covers all cases |
| processEffectChain god method (337 lines) | Any bug fix in preamble/routing/triggers risks regressions in other phases; can't unit test phases independently | Testable, maintainable processing | One change = re-read 337 lines for context |

### Issues That Are Landmines (Dormant Correctness Risks)

| Issue | What Goes Wrong | Why It Hasn't Happened Yet | What Would Trigger It |
|-|-|-|-|
| TriggerProcessor no input mutation guard (TP L94, L1174) | `splice()` corrupts caller's lane array — drones vanish from board state | All current callers pre-clone before calling `fireTrigger` | Any new code path that calls `fireTrigger` without cloning |
| ActionProcessor singleton stale instance (AP L138-141) | `new ActionProcessor(gsm)` returns old instance with outdated gameStateManager ref | GameStateManager instance is stable today | Restarting/reconnecting a game session without full page reload |
| Date.now() triggerSyncId collision (AP L712, L541) | Two triggers within 1ms get identical syncId — UI groups them incorrectly | Triggers are usually >1ms apart | Fast machines + simple trigger chains |
| Magic seed fallback 12345 (TP L1028) | If gameSeed is null, all "random" targeting becomes deterministic — same drone always targeted | gameSeed is always provided today | Server-side change or edge case where seed isn't set |
| Snapshot card-hiding in-place mutation (ECP L507-511) | If any code shares the snapshot reference, played card reappears in hand during animation | Snapshots are currently created fresh each time | Any optimization that reuses snapshot objects |
| AnimationManager never disposed on unmount | Old instance fires into dead React state; new instance created on remount; memory leak | Users don't navigate away mid-game | Adding game-exit, lobby-return, or spectator-mode features |

### Issues That Are Non-Issues (Downgraded from Previous Audit)

These were flagged as problems but are actually fine:

| Issue | Why It's Fine |
|-|-|
| BARRAGE_IMPACT setTimeout | Manager tracks completion correctly; both `onComplete` and safety `setTimeout` resolve the promise. Working as designed. |
| Incomplete useEffect deps (useAnimationSetup L123) | React state setters are identity-stable. Missing deps don't cause stale closures. Lint violation only — add eslint-disable comment. |
| Sound timing (fires before visual renders) | Intentional design — sound is perceptual "instant" while CSS transitions take a frame to start. Feels correct to the player. |
| TriggerProcessor instantiation per movement (MEP L435) | Constructor cost is trivial (creates one EffectRouter). Convention smell, not performance issue. |
| 8+ deep clones per card play | Board state is ~2-5KB. 8 clones = ~40KB allocation. Negligible on any modern device. Only revisit if board state grows 10x+. |

---

## Gap Analysis vs Vision

### Verified Claims (Shallow audit was correct)

- Two-timeline orchestration works as designed
- AnimationSequenceBuilder is clean, single-responsibility, needs nothing
- Handler registration pattern is sound
- Response queue serialization prevents concurrent broadcasts
- Deferred trigger pattern correctly captures pre-trigger state

### Corrected Claims (Shallow audit was wrong or imprecise)

| Shallow Claim | Deep Audit Finding |
|-|-|
| "AnimationLayer receives 30+ props" | 24 props — still excessive but not 30+ |
| "Depth-first trigger resolution" | Breadth-first across siblings, depth-first within cascades |
| "ANIMATION_SEQUENCE over-engineered" | Serves real purpose (staggered timing) but has duplication issues |
| "Unnecessary deep cloning in MEP L558-561" | That clone IS necessary; the redundant one is at MEP L341 |
| "Restructuring into folders is straightforward for 14 small components" | Not straightforward — keyframe coupling, AnimationLayer hub, and cross-dependencies are blockers |
| "TriggerProcessor instantiation per movement is wasteful" | Cost is minimal (constructor only creates EffectRouter); it's a convention issue, not performance |

### Structural Gaps (Severity-ranked)

| # | Gap | Severity | Evidence |
|-|-|-|-|
| 1 | Sound completely disconnected from animations | High | Four independent trigger paths, duplicated type strings, no shared contract |
| 2 | Animation components can't be restructured without keyframe decoupling | High | 6+ components reference globally-loaded keyframe names without imports |
| 3 | [FIXED] AnimationLayer is a manual hub (22 imports, 24 props, no registry) | High | Replaced with registry-driven render loop. 4 props remain (animationState, explosions, cardPlayWarning, animationBlocking) |
| 4 | Three DOM lookup strategies in handlers | Medium | getElementFromLogicalPosition vs droneRefs vs querySelector |
| 5 | Perspective/position logic duplicated ~12x | Medium | See duplication catalog |
| 6 | `splitByTiming()` partially vestigial | Medium | preState/independent arrays unused for execution |
| 7 | No explicit boundary handshake | Low | Implicit via blocking flag; works but not verifiable |

---

## Recommendations

### Tier 1: Fix Real Bugs

**1. Unify DOM lookup strategy**
- **Solves**: DOM lookup inconsistency (real visual bug) + developer guesswork for new handlers
- **Fix**: Extend `getElementFromLogicalPosition` (currently in useAnimationSetup closure, L26-45) to handle all three current patterns: logical position lookup, drone ID ref lookup, and data-attribute fallback. Export as a shared utility. Refactor useMovementAnimations and useNotificationAnimations to use it instead of direct `droneRefs.current[id]` / `document.querySelector`.
- **Files**: Create `src/utils/animationPositioning.js` (~40 LOC). Edit 3 handler files to consume it. Remove direct querySelector calls.
- **After**: Every handler resolves DOM elements the same way. New handlers have one function to call.
- **Inaction cost**: Animations occasionally target wrong elements in complex trigger chains; every new handler relearns the lookup.

**2. Fix SHAKE_EFFECT to use React state**
- **Solves**: Shake cut short / persists on React re-render during 500ms window
- **Fix**: Convert from `classList.add/remove` to React state: `setShakeTargets(prev => [...prev, targetId])`, render shake via className in JSX driven by state, use `onComplete` callback for cleanup instead of raw setTimeout.
- **Files**: `useStatusAnimations.js` (~15 LOC change)
- **After**: Shake animation survives React re-renders; follows same pattern as every other handler.
- **Inaction cost**: Intermittent visual glitch in trigger-heavy games.

**3. Fix TELEPORT to wait for React commit**
- **Solves**: Teleport glow silently not appearing on rapid deployments
- **Fix**: Replace single `requestAnimationFrame` with the same double-rAF pattern AnimationManager already uses at L401-407 (`waitForReactRender`). Or better: have the handler check for element existence and retry once after a frame.
- **Files**: `useNotificationAnimations.js` (~5 LOC change)
- **After**: Teleport always shows its glow effect.
- **Inaction cost**: Occasional missing teleport animation — player sees drone appear without visual fanfare.

### Tier 2: Reduce Developer Friction

**4. Extract perspective + position utility** [FIXED]
- **Solves**: 15-20 hardcoded perspective/position calculations across 5 handler files
- **Resolution**: Created `src/utils/animationPositioning.js` with `isLocalPlayer()`, `parseLaneIndex()`, `getTopCenterPosition()`. Refactored useNotificationAnimations, useCardAnimations, useProjectileAnimations to consume them. Standardized overlay position format to `{ x, y }`.

**5. Add AnimationManager cleanup on unmount** [FIXED]
- **Solves**: Memory leak + stale callbacks when navigating away from game
- **Resolution**: Added `dispose()` method with `disposed` flag pattern. Guards on `executeWithStateUpdate`, `executeAnimations` (entry + while-loop + finally), `setBlocking`, `executeTeleportAnimations` setTimeout, and `waitForReactRender`. Updated `useAnimationSetup` cleanup to call `dispose()` and null ActionProcessor reference. 6 unit tests in `AnimationManager.test.js`.

**6. [FIXED] Create shared animation type constants**
- **Solves**: String duplication between AnimationManager registry and soundConfig
- **Fix**: Created `src/config/animationTypes.js` exporting 34 animation NAME constants. All ~44 production files that produce or consume animation events import from it.
- **After**: Typo in animation name string caught at import time, not silently at runtime. Drift test in `animationTypes.test.js` catches new AnimationManager registry keys missing a constant.

### Tier 3: Structural (Do When Ready)

**7. [FIXED] Replace AnimationLayer prop threading with registry**
- **Solved**: 20 `useState` calls in App.jsx replaced with single `useReducer`. AnimationLayer uses `ANIMATION_REGISTRY` for automatic rendering. `useAnimationSetup` passes single `animationDispatch` instead of 20 individual setters. New animation = create component + add to registry + add to initial state (~2 files).
- **Files changed**: `useAnimationState.js` (new), `animationRegistry.js` (new), `AnimationLayer.jsx`, `useAnimationSetup.js`, `App.jsx`, 5 handler files, `RailgunTurret.jsx`.

**8. [FIXED] Decouple keyframes before folder restructuring**
- **Solves**: 6+ components silently depend on globally-loaded animations.css keyframes
- **Fix**: Moved each component's keyframes into co-located CSS files. Each affected component now explicitly imports its CSS. Duplicate keyframe block in `index.css` (lines 520-806) removed. Dead CSS (`.explosion`, `.phase-announcement-text`) removed.
- **Files**: 8 co-located CSS files created, 10 JSX components updated, `animations.css` and `index.css` cleaned.
- **After**: Each component's style dependencies are explicit. Folder restructuring is now safe.

### Don't Do

| Item | Why |
|-|-|
| Optimize deep clones | 40KB/card-play is negligible. Measure before optimizing. |
| Cache TriggerProcessor instance | Constructor cost is trivial. Convention preference, not problem. |
| Split processEffectChain god method | Real issue, but high risk for low immediate value. Flag for when the method next needs significant changes. |
| Add explicit boundary handshake | Current implicit system works. Complexity not justified until multiplayer sync issues arise. |
| Fix useEffect dependency lint warning | Add eslint-disable comment. Setters are stable; "fixing" it risks infinite re-render loops. |
