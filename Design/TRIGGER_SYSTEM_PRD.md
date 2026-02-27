# Trigger System PRD

## 1. Overview

### Problem
The trigger system is fragmented across 6+ files with inconsistent patterns. Some triggers route through EffectRouter, some bypass it entirely. Two ability patterns (AFTER_ATTACK, RALLY_BEACON) use bespoke mechanisms rather than the trigger system. The system cannot support new trigger types (ON_CARD_PLAY, ON_LANE_MOVEMENT_OUT), sub-filtering (card type/subType), drone stat filtering, or explicit affected-player specification. There are no rules governing trigger ordering, cascading, or loop prevention.

### Goal
Unify all trigger processing into a single `TriggerProcessor` that routes effects through the existing `EffectRouter`. Establish deterministic ordering and cascade rules. Add new trigger capabilities. Deprecate legacy patterns. Ensure all trigger chains are visually sequenced in the UI.

### Scope
- Refactor all existing triggered abilities to use unified processor
- Deprecate AFTER_ATTACK and RALLY_BEACON patterns
- Add ON_CARD_PLAY, ON_LANE_MOVEMENT_OUT trigger types
- Add card subType field and trigger sub-filtering
- Add drone stat filtering for lane triggers
- Add explicit triggerOwner to all triggers
- Add Anansi drone
- Implement trigger chain animations (hard requirement)
- Create comprehensive test coverage

---

## 2. Trigger Types

### 2.1 Self Triggers
These fire when the trigger drone itself performs an action. No `triggerOwner` is needed — the drone is always the actor.

| Trigger | Fires When | Current Users |
|-|-|-|
| ON_MOVE | The drone itself moves (including forced movement via cards) | Specter (Phase Shift), Osiris (Regeneration Protocol) |
| ON_DEPLOY | The drone itself is deployed to the board | Scanner (Target Scanner) |
| ON_ROUND_START | The drone is on the board at the start of a round | Signal Beacon (Threat Signal), War Machine (Combat Escalation) |
| ON_ATTACK | The drone itself attacks | Threat Transmitter (Alert Broadcast), Firefly (Self-Destruct) [converting from AFTER_ATTACK], Gladiator (Veteran Instincts) [converting from AFTER_ATTACK] |

### 2.2 Controller Triggers
These fire when the trigger drone's controller (or opponent) performs a game action. Use `triggerOwner` to specify whose actions trigger it.

| Trigger | Fires When | triggerOwner Values | Current Users |
|-|-|-|-|
| ON_CARD_DRAWN | A player draws a card during the action phase | CONTROLLER / OPPONENT / ANY | Odin (All-Seeing Eye) — CONTROLLER |
| ON_ENERGY_GAINED | A player gains energy during the action phase | CONTROLLER / OPPONENT / ANY | Thor (Storm Surge) — CONTROLLER |
| ON_CARD_PLAY | A card is played (with optional type/subType filtering) | CONTROLLER / OPPONENT / ANY | Anansi (Web Sensor) [new] — CONTROLLER |

### 2.3 Lane Triggers
These fire when another drone performs an action in the trigger drone's lane. Use `triggerOwner` to specify whose drones trigger it.

**Important — Mine ownership model:** When Player A plays a mine card targeting Player B's lane, the mine token is placed on Player B's `dronesOnBoard`. The mine visually appears as a hostile drone on Player B's side. `LANE_OWNER` means "drones belonging to the player whose board this trigger drone sits on." For mines, this means the opponent's drones (from the mine placer's perspective) trigger it — which is the intended behavior.

| Trigger | Fires When | triggerOwner Values | Current Users |
|-|-|-|-|
| ON_LANE_MOVEMENT_IN | Another drone moves into this lane | LANE_OWNER / LANE_ENEMY / ANY | Proximity Mine — LANE_OWNER, Rally Beacon [converting] — LANE_OWNER |
| ON_LANE_MOVEMENT_OUT | A drone moves out of this lane | LANE_OWNER / LANE_ENEMY / ANY | (none yet — added for completeness) |
| ON_LANE_DEPLOYMENT | Another drone is deployed to this lane | LANE_OWNER / LANE_ENEMY / ANY | Inhibitor Mine — LANE_OWNER |
| ON_LANE_ATTACK | Another drone attacks in this lane | LANE_OWNER / LANE_ENEMY / ANY | Jitter Mine — LANE_OWNER |

---

## 3. Trigger Resolution Ordering

### 3.1 Three-Tier Priority: Self > Actor > Reactor

When an action occurs, triggers fire in this order:

1. **Self-triggers** on the acting drone (e.g., Osiris's ON_MOVE heal when Osiris moves)
2. **Acting player's lane triggers**, left-to-right in lane position order
3. **Opponent's lane triggers**, left-to-right in lane position order

"Left-to-right" means the order drones appear in the lane array, which corresponds to deployment order (earliest deployed = leftmost).

### 3.2 Acting Player Definition

The **acting player** is the player who initiated the original action:
- Player moves a drone → acting player = the player who moved it
- Player plays a card that forces an opponent's drone to move → acting player = the card player
- The acting player maintains priority throughout the entire trigger cascade chain — it does NOT shift based on whose drone caused a cascading event

### 3.3 Forced Movement

When Player A plays a card (e.g., Forced Reposition) that moves Player B's drone:
- The moved drone's ON_MOVE self-trigger still fires (it moved, its ability triggers regardless of who initiated)
- Player A (acting player) gets lane trigger priority
- Player B's lane triggers fire second

### 3.4 Example

Player A moves Osiris into lane 2. Lane 2 contains Player A's BuffBot (ON_LANE_MOVEMENT_IN → +1 shield) and Player B's Proximity Mine (ON_LANE_MOVEMENT_IN → 4 damage).

Resolution order:
1. Osiris ON_MOVE → heals self (self-trigger)
2. BuffBot ON_LANE_MOVEMENT_IN → buffs shield (acting player's lane trigger, left of any other Player A triggers)
3. Proximity Mine ON_LANE_MOVEMENT_IN → deals 4 damage (opponent's lane trigger)

---

## 4. Depth-First Cascade Resolution

### 4.1 Rule

When a trigger fires and its effect causes a new event (e.g., gaining power, drawing a card), all cascading triggers from that new event fully resolve before the next trigger at the original level fires. This is standard stack-based resolution.

### 4.2 Example

Lane contains (L→R): Odin (ON_CARD_DRAWN → +1 power), Loki (ON_CARD_DRAWN → gain energy). A card draw occurs.

1. Odin reacts to card draw → gains power → (any cascading triggers from power gain fully resolve here)
2. **Then** Loki reacts to the same card draw → gains energy → (cascading triggers from energy gain resolve)

Odin's entire cascade resolves before Loki even begins.

---

## 5. Loop Guard: Per (Reactor, Source) Pair

### 5.1 Rule

Each (reacting drone, source drone) pair can fire **at most once** per trigger chain. A "trigger chain" begins when the first trigger fires from a player action and ends when all cascading triggers have resolved.

- **Reactor**: the drone whose triggered ability is firing
- **Source**: the drone whose trigger effect caused the event that the reactor is responding to

This prevents infinite loops (A triggers B triggers A triggers B...) while allowing rich multi-drone combos where different sources trigger the same drone.

### 5.2 Detailed Walkthrough

**Setup — Lane (L→R):** HypoDrone, Odin, Loki, Thor, MovedDrone

Abilities:
- MovedDrone: ON_MOVE → draw a card
- HypoDrone: ON_POWER_GAIN → draw a card
- Odin: ON_CARD_DRAWN → +1 power
- Loki: ON_CARD_DRAWN → gain energy
- Thor: ON_ENERGY_GAINED → +1 power

**Pair tracker:** Tracks (reactor ← source) pairs. Each pair fires once.

**Chain execution:**

```
MovedDrone moves in → ON_MOVE → draws a card [CHAIN STARTS]

EVENT: Card Drawn (source: MovedDrone)
  Scan ON_CARD_DRAWN L→R: Odin, Loki

  ▸ Odin reacts (Odin ← MovedDrone: NEW ✓) → +1 power
  │
  │  EVENT: Power Gained (source: Odin)
  │    Scan ON_POWER_GAIN: HypoDrone
  │
  │    ▸ HypoDrone reacts (HypoDrone ← Odin: NEW ✓) → draws a card
  │    │
  │    │  EVENT: Card Drawn (source: HypoDrone)
  │    │    Scan ON_CARD_DRAWN: Odin, Loki
  │    │
  │    │    ▸ Odin reacts (Odin ← HypoDrone: NEW ✓) → +1 power
  │    │    │
  │    │    │  EVENT: Power Gained (source: Odin)
  │    │    │    Scan ON_POWER_GAIN: HypoDrone
  │    │    │    ▸ HypoDrone ← Odin: BLOCKED ✗ (already fired)
  │    │    │
  │    │    ▸ Loki reacts (Loki ← HypoDrone: NEW ✓) → gains energy
  │    │    │
  │    │    │  EVENT: Energy Gained (source: Loki)
  │    │    │    Scan ON_ENERGY_GAINED: Thor
  │    │    │
  │    │    │    ▸ Thor reacts (Thor ← Loki: NEW ✓) → +1 power
  │    │    │    │
  │    │    │    │  EVENT: Power Gained (source: Thor)
  │    │    │    │    Scan ON_POWER_GAIN: HypoDrone
  │    │    │    │
  │    │    │    │    ▸ HypoDrone reacts (HypoDrone ← Thor: NEW ✓) → draws a card
  │    │    │    │    │
  │    │    │    │    │  EVENT: Card Drawn (source: HypoDrone)
  │    │    │    │    │    Scan ON_CARD_DRAWN: Odin, Loki
  │    │    │    │    │    ▸ Odin ← HypoDrone: BLOCKED ✗
  │    │    │    │    │    ▸ Loki ← HypoDrone: BLOCKED ✗
  │    │    │    │    │    [Dead end]

  [Unwind back to original event — Loki hasn't reacted to the first card draw yet]

  ▸ Loki reacts (Loki ← MovedDrone: NEW ✓) → gains energy
  │
  │  EVENT: Energy Gained (source: Loki)
  │    Scan ON_ENERGY_GAINED: Thor
  │    ▸ Thor ← Loki: BLOCKED ✗ (already fired)
  │    [Dead end]

CHAIN COMPLETE.
```

**Final tally:**

| Drone | Result |
|-|-|
| Odin | +2 power (from MovedDrone's draw + HypoDrone's draw) |
| HypoDrone | Drew 2 cards (from Odin's power gain + Thor's power gain) |
| Loki | Gained energy twice (from HypoDrone's draw + MovedDrone's draw) |
| Thor | +1 power (from Loki's first energy gain; second blocked) |
| Total cards drawn | 3 (1 original + 2 from HypoDrone) |

The chain is rich (6 levels deep, 4 drones interacting) but terminates naturally as (reactor, source) pairs are exhausted. No arbitrary depth cap is needed.

### 5.3 Cross-Player Cascades

The same pair rule applies when triggers belong to different players. If Player B's SentinelBot has ON_POWER_GAIN → deal 1 damage, and Player A's Odin gains power, the cascade works identically:

1. Odin gains power (source: whatever triggered it)
2. SentinelBot reacts (SentinelBot ← Odin: checked against pair set)
3. SentinelBot's damage effect resolves
4. Any cascading triggers from that damage resolve

The acting player (whoever initiated the original action) maintains trigger priority at every level of the cascade, regardless of which player's drones are involved.

---

## 6. Multi-Move Resolution

When a card (e.g., Reposition) moves multiple drones, each drone is an **independent move action** that fully resolves before the next drone begins moving.

### 6.1 Rules
- Move order = **player selection order** (the order the player clicked/selected drones)
- Each drone's move fully resolves: movement → self-triggers → lane triggers → cascades → all complete
- Arrival order in the destination lane = selection order (first selected = leftmost)
- Self-destructing triggers (mines) affect only the first drone to trigger them

### 6.2 Example

Player selects Drone A, Drone B, Drone C for multi-move into a lane with a Proximity Mine:

1. **Drone A moves** → ON_MOVE resolves → ON_LANE_MOVEMENT_IN triggers → Proximity Mine fires, deals 4 damage to Drone A, mine self-destructs. Full cascade resolves.
2. **Drone B moves** → ON_MOVE resolves → ON_LANE_MOVEMENT_IN triggers → no mine left. Safe.
3. **Drone C moves** → same as Drone B. Safe.

The player has meaningful agency: put the tankiest drone first to absorb the mine.

---

## 7. Trigger Data Structure

### 7.1 Unified Ability Format

All triggered abilities use this structure in drone data:

```js
{
  name: 'Ability Name',
  description: 'Human-readable description of when and what.',
  type: 'TRIGGERED',
  trigger: 'ON_CARD_PLAY',              // Trigger type (see Section 2)

  // --- Who/what triggers it ---
  triggerOwner: 'CONTROLLER',            // See Section 2 for valid values per trigger category
  triggerScope: 'SAME_LANE',             // SAME_LANE | ANY_LANE | SELF

  // --- Optional sub-filters ---
  triggerFilter: {
    cardType: 'Ordnance',               // For ON_CARD_PLAY: filter by card.type
    cardSubType: 'Mine',                 // For ON_CARD_PLAY: filter by card.subType
    droneStatFilter: {                   // For ON_LANE_X: filter by triggering drone's stats
      stat: 'cpu',                       //   attack | hull | shields | speed | cpu
      comparator: '>=',                  //   >= | <= | ==
      value: 2
    }
  },

  // --- Effects (standard EffectRouter-compatible) ---
  effects: [
    { type: 'DRAW', value: 1 }
  ],

  // --- Optional modifiers ---
  destroyAfterTrigger: true,             // Self-destruct after firing (mines)
  scalingDivisor: 2,                     // For scaling triggers (Thor: per N energy)
  grantsGoAgain: true,                   // Grants go-again to the acting player (Rally Beacon)
  conditionalEffects: [...]              // For conditional triggers (Threat Transmitter)
}
```

### 7.2 Card SubType Field

Action cards gain an optional `subType` string field. Initial values:
- `subType: 'Mine'` on: Deploy Proximity Mine, Deploy Inhibitor Mine, Deploy Jitter Mine
- Other cards: no subType (field omitted)

SubType is a free-form tag for trigger filtering, not a core game mechanic like card type (Ordnance/Support/Tactic/Upgrade).

### 7.3 ON_CARD_PLAY Lane Matching

For ON_CARD_PLAY with `triggerScope: 'SAME_LANE'`, the lane match is based on the **card's target lane**, not which player's board the resulting effect lands on. A mine card targeting lane 2 (which places a mine token on the opponent's side of lane 2) still counts as "played in lane 2" for trigger matching.

---

## 8. Deprecations

### 8.1 AFTER_ATTACK → ON_ATTACK

**Current state:** Firefly and Gladiator use `ability.effect.type === 'AFTER_ATTACK'` in PASSIVE abilities, processed by `AttackProcessor.calculateAfterAttackStateAndEffects`.

**New state:** Both convert to `type: 'TRIGGERED', trigger: 'ON_ATTACK'` and route through TriggerProcessor.

| Drone | Current | New |
|-|-|-|
| Firefly | PASSIVE, AFTER_ATTACK, subEffect: DESTROY_SELF | TRIGGERED, ON_ATTACK, effects: [{ type: 'DESTROY', scope: 'SELF' }] |
| Gladiator | PASSIVE, AFTER_ATTACK, subEffect: PERMANENT_STAT_MOD | TRIGGERED, ON_ATTACK, effects: [{ type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } }] |

### 8.2 RALLY_BEACON Keyword → ON_LANE_MOVEMENT_IN Trigger

**Current state:** Rally Beacon uses `GRANT_KEYWORD: RALLY_BEACON` passive, checked by `rallyBeaconHelper.js` scanning the lane by token name.

**New state:** Converts to a triggered ability:
```js
{
  name: 'Rally Point',
  type: 'TRIGGERED',
  trigger: 'ON_LANE_MOVEMENT_IN',
  triggerOwner: 'LANE_OWNER',    // Rally Beacon is on friendly board; friendly drones trigger it
  effects: [],                    // No direct effect
  grantsGoAgain: true
}
```

---

## 9. New Content

### 9.1 Anansi Drone

| Stat | Value |
|-|-|
| Name | Anansi |
| CPU | 2 |
| Attack | 1 |
| Hull | 2 |
| Shields | 2 |
| Speed | 2 |
| Rarity | Rare |
| Limit | 1 |
| Rebuild Rate | 0.5 |
| Upgrade Slots | 2 |

**Ability — Web Sensor:** "When you play a 'Mine' card in this lane, draw a card."

```js
{
  name: 'Web Sensor',
  description: "When you play a 'Mine' card in this lane, draw a card.",
  type: 'TRIGGERED',
  trigger: 'ON_CARD_PLAY',
  triggerOwner: 'CONTROLLER',
  triggerScope: 'SAME_LANE',
  triggerFilter: { cardSubType: 'Mine' },
  effects: [{ type: 'DRAW', value: 1 }]
}
```

---

## 10. Trigger Animations (Hard Requirement)

Trigger chain animations are **not optional polish** — they are a core requirement. A trigger chain that the player cannot follow is effectively broken regardless of logical correctness.

### 10.1 Requirements

- Every trigger firing produces a visible animation event
- Each step in a cascade is visually distinct with delays between steps
- The player must be able to follow the chain from start to finish
- The action log must record each trigger firing with source, ability name, and effect

### 10.2 Animation Event Structure

Each trigger produces an animation event:
```js
{
  type: 'TRIGGER_FIRED',
  sourceId: 'drone-uuid',           // The drone whose ability triggered
  sourceName: 'Odin',
  abilityName: 'All-Seeing Eye',
  effectDescription: '+1 attack',   // Human-readable effect summary
  chainDepth: 2,                    // Nesting depth in the cascade (0 = first trigger)
  lane: 'lane2',
  timestamp: Date.now()
}
```

### 10.3 Minimum Visual Treatment

At minimum: text overlay on the triggering drone showing the trigger name and effect. More elaborate animations (glow, particle effects) can be added later, but the text overlay is the baseline requirement.

---

## 11. Existing Drone Trigger Reference

Complete reference for all drones being migrated or modified:

| Drone | Current Pattern | Trigger Type | Effect | Migration Needed |
|-|-|-|-|-|
| Specter | TRIGGERED/ON_MOVE in abilityHelpers | ON_MOVE | +1 attack, +1 speed permanent | Route through TriggerProcessor |
| Osiris | TRIGGERED/ON_MOVE in abilityHelpers | ON_MOVE | Heal 4 hull to self | Route through TriggerProcessor |
| Scanner | TRIGGERED/ON_DEPLOY via EffectRouter | ON_DEPLOY | Mark random unmarked enemy same lane | Route through TriggerProcessor |
| Signal Beacon | TRIGGERED/ON_ROUND_START via RoundManager | ON_ROUND_START | +2 threat | Route through TriggerProcessor |
| War Machine | TRIGGERED/ON_ROUND_START via RoundManager | ON_ROUND_START | +1 attack permanent | Route through TriggerProcessor |
| Threat Transmitter | TRIGGERED/ON_ATTACK in AttackProcessor | ON_ATTACK | +4 threat if ship hull damaged | Route through TriggerProcessor |
| Odin | TRIGGERED/ON_CARD_DRAWN in abilityHelpers | ON_CARD_DRAWN | +1 attack per card drawn | Route through TriggerProcessor |
| Thor | TRIGGERED/ON_ENERGY_GAINED in abilityHelpers | ON_ENERGY_GAINED | +1 attack per 2 energy | Route through TriggerProcessor |
| Proximity Mine | TRIGGERED/ON_LANE_MOVEMENT_IN in MineTriggeredEffectProcessor | ON_LANE_MOVEMENT_IN | 4 damage, self-destruct | Route through TriggerProcessor |
| Inhibitor Mine | TRIGGERED/ON_LANE_DEPLOYMENT in MineTriggeredEffectProcessor | ON_LANE_DEPLOYMENT | Exhaust drone, self-destruct | Route through TriggerProcessor |
| Jitter Mine | TRIGGERED/ON_LANE_ATTACK in MineTriggeredEffectProcessor | ON_LANE_ATTACK | -4 attack permanent, self-destruct | Route through TriggerProcessor |
| Firefly | PASSIVE/AFTER_ATTACK in AttackProcessor | ON_ATTACK (new) | Destroy self after attacking | Convert from PASSIVE to TRIGGERED |
| Gladiator | PASSIVE/AFTER_ATTACK in AttackProcessor | ON_ATTACK (new) | +1 attack permanent after attacking | Convert from PASSIVE to TRIGGERED |
| Rally Beacon | PASSIVE/GRANT_KEYWORD in rallyBeaconHelper | ON_LANE_MOVEMENT_IN (new) | Go-again on friendly move-in | Convert from keyword to TRIGGERED |

---

## 12. Multiplayer Safety

### 12.1 Architecture

Host-authoritative with optimistic client prediction (Trystero/WebRTC P2P). Both host and guest execute the same game logic via `ActionProcessor.processAction()`.

**How it works today:**
- Guest calls `processActionWithGuestRouting()` in `useActionRouting.js` (line 37-64)
- This runs the **full game logic locally** (same ActionProcessor → Strategy → EffectChainProcessor pipeline as host)
- `OptimisticActionService` tracks animations for deduplication (it does NOT execute logic itself)
- Host later broadcasts authoritative state; guest reconciles via `compareGameStates()` and `applyHostState()`

### 12.2 Rules for TriggerProcessor

1. **Guest executes triggers optimistically.** TriggerProcessor runs on BOTH host and guest — identical code path via ActionProcessor. No guest-side delay.
2. **Fully deterministic.** Same inputs must produce identical outputs on both sides. No randomness, no timing-dependent behavior, no host-only state dependencies. Given identical game state + action, trigger cascades must resolve identically.
3. **Deterministic ordering.** The three-tier priority (Self > Actor > Reactor) and left-to-right lane ordering produce the same result regardless of which side executes — ordering depends only on board state and acting player, both of which are synchronized.
4. **Loop guard determinism.** The `pairSet` (Set of "reactorId:sourceId" strings) is built during cascade execution. Since both sides start from identical state and use identical ordering, the pairSet evolves identically — no divergence risk.
5. **Animation deduplication.** TriggerProcessor emits `TRIGGER_FIRED` animation events. Guest's `OptimisticActionService.filterAnimations()` deduplicates them against the host's broadcast using structural comparison (animationName, payload fields). Animation event payloads must include stable identifiers (droneId, abilityName) for matching.
6. **State reconciliation.** `GuestMessageQueueService.compareGameStates()` validates energy, shields, health, hand, drones-per-lane. Trigger side effects (stat mods, destroyed drones, drawn cards) are reflected in these checks. No additional reconciliation fields needed.
7. **`TRIGGER_FIRED` animation type** must be registered in AnimationManager so both host and guest can render trigger overlays.
8. **Pure game logic.** TriggerProcessor lives in `src/logic/triggers/` — no React dependencies, no network dependencies, no side effects beyond state mutation. This is enforced by code standards (`src/logic/` = pure game logic).
