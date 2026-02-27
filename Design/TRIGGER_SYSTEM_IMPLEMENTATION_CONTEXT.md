# Trigger System Implementation Context

> Generated from codebase exploration. Reference for implementing the Trigger System PRD.

---

## 1. Current Architecture Overview

### 1.1 File Map — Where Triggers Live Today

| File | Role | Lines |
|-|-|-|
| `src/logic/EffectRouter.js` | Central dispatcher routing 30+ effect types to modular processors | 138 |
| `src/logic/effects/BaseEffectProcessor.js` | Abstract base class for all effect processors | 125 |
| `src/logic/effects/MineTriggeredEffectProcessor.js` | Standalone mine trigger processor (NOT routed through EffectRouter) | 272 |
| `src/logic/utils/abilityHelpers.js` | `applyOnMoveEffects`, `applyOnCardDrawnEffects`, `applyOnEnergyGainedEffects` | 224 |
| `src/logic/utils/rallyBeaconHelper.js` | `checkRallyBeaconGoAgain` — scans lane for Rally Beacon by token name | 37 |
| `src/logic/combat/AttackProcessor.js` | `calculateAfterAttackStateAndEffects` for AFTER_ATTACK (Firefly, Gladiator) + mine trigger hookup | 760 |
| `src/logic/round/RoundManager.js` | `processRoundStartTriggers` — iterates drones with ON_ROUND_START, routes effects through EffectRouter | ~236 |
| `src/logic/deployment/DeploymentProcessor.js` | ON_DEPLOY triggers via EffectRouter + mine trigger hookup | ~430 |
| `src/logic/effects/MovementEffectProcessor.js` | ON_MOVE via `applyOnMoveEffects` + Rally Beacon check + mine trigger hookup | 631 |
| `src/logic/effects/cards/DrawEffectProcessor.js` | Calls `applyOnCardDrawnEffects` after drawing cards | ~80 |
| `src/logic/effects/energy/GainEnergyEffectProcessor.js` | Calls `applyOnEnergyGainedEffects` after gaining energy | ~65 |
| `src/data/droneData.js` | All drone definitions including trigger ability data | 993 |
| `src/data/cardData.js` | Card definitions including mine deployment cards | 1914 |

### 1.2 Current Trigger Processing Patterns

There are **6 distinct patterns** for handling triggers:

#### Pattern 1: abilityHelpers direct call (ON_MOVE, ON_CARD_DRAWN, ON_ENERGY_GAINED)
- `applyOnMoveEffects()` called from `MovementEffectProcessor.executeSingleMove` (line 382) and `executeMultiMove` (line 568)
- `applyOnCardDrawnEffects()` called from `DrawEffectProcessor` (line 74)
- `applyOnEnergyGainedEffects()` called from `GainEnergyEffectProcessor` (line 60)
- Each helper deep-clones state, iterates all lanes/drones, checks baseDrone abilities, and applies effects manually

#### Pattern 2: MineTriggeredEffectProcessor (ON_LANE_MOVEMENT_IN, ON_LANE_DEPLOYMENT, ON_LANE_ATTACK)
- Standalone `processTrigger()` function (not a class, not routed through EffectRouter)
- Called from: MovementEffectProcessor (line 416), DeploymentProcessor (line 390), AttackProcessor (line 327)
- Scans triggering player's board for mine tokens, validates `triggerOwner`, applies effects via `applyMineEffect()` switch statement
- Has its own damage/exhaust/stat-mod application logic (duplicates what EffectRouter processors do)

#### Pattern 3: calculateAfterAttackStateAndEffects (AFTER_ATTACK)
- In `AttackProcessor.js` lines 37-111
- Scans baseDrone abilities for `ability.effect?.type === 'AFTER_ATTACK'`
- Handles two subEffect types: `DESTROY_SELF` and `PERMANENT_STAT_MOD`
- Called at line 625 after attack resolution completes

#### Pattern 4: EffectRouter routing (ON_DEPLOY, ON_ROUND_START)
- `DeploymentProcessor` (line 333): iterates drone abilities, finds ON_DEPLOY triggers, routes each effect through `new EffectRouter().routeEffect()`
- `RoundManager.processRoundStartTriggers` (line 167): iterates all drones on board, finds ON_ROUND_START, routes through `effectRouter.routeEffect()`

#### Pattern 5: Rally Beacon keyword scan (RALLY_BEACON)
- `rallyBeaconHelper.checkRallyBeaconGoAgain()` — scans lane for a drone with `isToken && name === 'Rally Beacon'`
- Called from MovementEffectProcessor after movement completes (lines 406-407, 584-585)
- Returns boolean for go-again; does NOT use the ability system at all

#### Pattern 6: Threat Transmitter conditional ON_ATTACK
- Data defines: `trigger: 'ON_ATTACK'` with `conditionalEffects` array containing `condition: { type: 'ON_SHIP_SECTION_HULL_DAMAGE' }`
- **Currently appears to be handled by the AI system only** (for attack scoring), NOT by the combat system for actual effect resolution
- The AI uses `keywordHelpers.js` to detect `isThreatAbilityDrone()` (line 93) for scoring purposes
- The actual trigger effect would need to be processed by the new TriggerProcessor

---

## 2. Current Drone Ability Data Structures

### 2.1 Self Trigger Drones

**Specter (ON_MOVE)** — `droneData.js:245-266`
```js
{
    name: 'Phase Shift',
    type: 'TRIGGERED',
    trigger: 'ON_MOVE',
    effects: [
        { type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } },
        { type: 'PERMANENT_STAT_MOD', mod: { stat: 'speed', value: 1, type: 'permanent' } }
    ]
}
```

**Osiris (ON_MOVE)** — `droneData.js:268-287`
```js
{
    name: 'Regeneration Protocol',
    type: 'TRIGGERED',
    trigger: 'ON_MOVE',
    effects: [{ type: 'HEAL_HULL', value: 4, scope: 'SELF' }]
}
```

**Scanner (ON_DEPLOY)** — `droneData.js:344-361`
```js
{
    name: 'Target Scanner',
    type: 'TRIGGERED',
    trigger: 'ON_DEPLOY',
    effect: { type: 'MARK_RANDOM_ENEMY', scope: 'SAME_LANE', filter: 'NOT_MARKED' }
}
// NOTE: Uses singular `effect` not `effects` array
```

**Signal Beacon (ON_ROUND_START)** — `droneData.js:688-706`
```js
{
    name: 'Threat Signal',
    type: 'TRIGGERED',
    trigger: 'ON_ROUND_START',
    effect: { type: 'INCREASE_THREAT', value: 2 }
}
// NOTE: Uses singular `effect` not `effects` array
```

**War Machine (ON_ROUND_START)** — `droneData.js:734-751`
```js
{
    name: 'Combat Escalation',
    type: 'TRIGGERED',
    trigger: 'ON_ROUND_START',
    effects: [{ type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1 } }]
}
```

**Threat Transmitter (ON_ATTACK)** — `droneData.js:709-731`
```js
{
    name: 'Alert Broadcast',
    type: 'TRIGGERED',
    trigger: 'ON_ATTACK',
    conditionalEffects: [{
        timing: 'POST',
        condition: { type: 'ON_SHIP_SECTION_HULL_DAMAGE' },
        grantedEffect: { type: 'INCREASE_THREAT', value: 4 }
    }]
}
// NOTE: Uses `conditionalEffects` instead of `effects` — unique pattern
```

**Odin (ON_CARD_DRAWN)** — `droneData.js:952-969`
```js
{
    name: 'All-Seeing Eye',
    type: 'TRIGGERED',
    trigger: 'ON_CARD_DRAWN',
    effects: [{ type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
}
```

**Thor (ON_ENERGY_GAINED)** — `droneData.js:972-990`
```js
{
    name: 'Storm Surge',
    type: 'TRIGGERED',
    trigger: 'ON_ENERGY_GAINED',
    scalingDivisor: 2,
    effects: [{ type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } }]
}
```

### 2.2 AFTER_ATTACK Drones (Deprecating)

**Firefly** — `droneData.js:92-108`
```js
{
    name: 'Self-Destruct',
    type: 'PASSIVE',
    effect: { type: 'AFTER_ATTACK', subEffect: { type: 'DESTROY_SELF' } }
}
```

**Gladiator** — `droneData.js:176-192`
```js
{
    name: 'Veteran Instincts',
    type: 'PASSIVE',
    effect: { type: 'AFTER_ATTACK', subEffect: { type: 'PERMANENT_STAT_MOD', mod: { stat: 'attack', value: 1, type: 'permanent' } } }
}
```

### 2.3 Lane Trigger Drones (Mines)

**Proximity Mine (ON_LANE_MOVEMENT_IN)** — `droneData.js:834-870`
```js
{
    name: 'Proximity Detonation',
    type: 'TRIGGERED',
    trigger: 'ON_LANE_MOVEMENT_IN',
    triggerOwner: 'LANE_OWNER',
    destroyAfterTrigger: true,
    effect: { type: 'DAMAGE', value: 4 }
}
```

**Inhibitor Mine (ON_LANE_DEPLOYMENT)** — `droneData.js:873-909`
```js
{
    name: 'Inhibitor Detonation',
    type: 'TRIGGERED',
    trigger: 'ON_LANE_DEPLOYMENT',
    triggerOwner: 'LANE_OWNER',
    destroyAfterTrigger: true,
    effect: { type: 'EXHAUST_DRONE' }
}
```

**Jitter Mine (ON_LANE_ATTACK)** — `droneData.js:912-948`
```js
{
    name: 'Jitter Detonation',
    type: 'TRIGGERED',
    trigger: 'ON_LANE_ATTACK',
    triggerOwner: 'LANE_OWNER',
    destroyAfterTrigger: true,
    effect: { type: 'MODIFY_STAT', mod: { stat: 'attack', value: -4, type: 'permanent' } }
}
```

### 2.4 Rally Beacon (Keyword Pattern — Deprecating)

**Rally Beacon** — `droneData.js:754-787`
```js
abilities: [
    {
        name: 'Rally Point',
        type: 'PASSIVE',
        effect: { type: 'GRANT_KEYWORD', keyword: 'RALLY_BEACON' }
    },
    { name: 'Inert', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'INERT' } },
    { name: 'Passive', type: 'PASSIVE', effect: { type: 'GRANT_KEYWORD', keyword: 'PASSIVE' } }
]
```

---

## 3. Call Sites — Where Triggers Are Invoked

### 3.1 ON_MOVE
- `MovementEffectProcessor.executeSingleMove` (line 382): `applyOnMoveEffects(droneOwnerState, movedDrone, fromLane, toLane, logCallback)`
- `MovementEffectProcessor.executeMultiMove` (line 568): Same call per moved drone in a loop
- `CombatActionStrategy.js` (line 311): `gameEngine.applyOnMoveEffects()` — Strategy-layer execution for the move-then-attack combat flow
- Both MovementEffectProcessor calls only fire for friendly drone moves (`if (!isMovingEnemyDrone)`) — contradicts PRD Section 3.3

### 3.2 ON_CARD_DRAWN
- `DrawEffectProcessor.process` (line 74): `applyOnCardDrawnEffects(actingPlayerState, actualCardsDrawn, logCallback)`

### 3.3 ON_ENERGY_GAINED
- `GainEnergyEffectProcessor.process` (line 60): `applyOnEnergyGainedEffects(actingPlayerState, actualEnergyGained, logCallback)`

### 3.4 ON_DEPLOY
- `DeploymentProcessor` (line 333): iterates drone abilities, matches `ability.type === 'TRIGGERED' && ability.trigger === 'ON_DEPLOY'`, routes through EffectRouter

### 3.5 ON_ROUND_START
- `RoundManager.processRoundStartTriggers` (line 167): iterates all drones, matches ON_ROUND_START, routes through EffectRouter
- Called from `RoundInitializationProcessor` (line 146)
- Also referenced in `StateUpdateStrategy.processRoundStartTriggers` (line 69) — just setState wrapper

### 3.6 ON_LANE_MOVEMENT_IN (mines)
- `MovementEffectProcessor.executeSingleMove` (line 416): `processMineTrigger('ON_LANE_MOVEMENT_IN', ...)`
- `MovementEffectProcessor.executeMultiMove` (line 595): Same, per drone in loop (breaks after first mine triggers)
- `CombatActionStrategy.js` (line 352): `processMineTrigger('ON_LANE_MOVEMENT_IN', ...)` — move-then-attack combat flow

### 3.7 ON_LANE_DEPLOYMENT (mines)
- `DeploymentProcessor` (line 390): `processMineTrigger('ON_LANE_DEPLOYMENT', ...)`

### 3.8 ON_LANE_ATTACK (mines)
- `AttackProcessor.resolveAttack` (line 327): `processMineTrigger('ON_LANE_ATTACK', ...)`

### 3.9 AFTER_ATTACK
- `AttackProcessor.resolveAttack` (line 625): `calculateAfterAttackStateAndEffects(newPlayerStates[attackingPlayerId], attacker, attackingPlayerId)`

### 3.10 Rally Beacon
- `MovementEffectProcessor.executeSingleMove` (line 407): `checkRallyBeaconGoAgain(...)`
- `MovementEffectProcessor.executeMultiMove` (line 584): Same
- `CombatActionStrategy.js` (line 410): `checkRallyBeaconGoAgain(...)` — move-then-attack combat flow

### 3.11 Dead Callback — CardActionStrategy.js
- `CardActionStrategy.js` (line 61): passes `applyOnMoveEffectsCallback: gameEngine.applyOnMoveEffects` in callbacks to `EffectChainProcessor.processEffectChain()`
- **Dead code** — EffectChainProcessor never consumes this callback. MovementEffectProcessor imports `applyOnMoveEffects` directly.
- Remove in Phase 3 when `applyOnMoveEffects` is deleted from abilityHelpers.

---

## 4. Data Structure Inconsistencies

### 4.1 `effect` vs `effects` — Mixed Usage
- Scanner, Signal Beacon, Mines: use singular `effect: {...}`
- Specter, Osiris, War Machine, Odin, Thor: use plural `effects: [...]`
- Threat Transmitter: uses `conditionalEffects: [...]`
- RoundManager (line 212) handles both: `const effects = ability.effects || (ability.effect ? [ability.effect] : []);`

### 4.2 No `triggerOwner` on Self/Controller Triggers
- Only mines have `triggerOwner: 'LANE_OWNER'`
- Self triggers (ON_MOVE, ON_DEPLOY, ON_ATTACK) don't need triggerOwner — the acting drone IS the trigger
- Controller triggers (ON_CARD_DRAWN, ON_ENERGY_GAINED) don't have triggerOwner yet — they implicitly use CONTROLLER

### 4.3 No `triggerScope` Field
- Currently all triggers are implicitly scoped:
  - Self triggers: SELF (only the acting drone)
  - Mines: SAME_LANE (scan same lane for triggers)
  - ON_CARD_DRAWN/ON_ENERGY_GAINED: ANY_LANE (scan all lanes)

### 4.4 No `triggerFilter` Field
- No card type/subType filtering exists
- No drone stat filtering exists

---

## 5. Card Data — Mine Cards

All three mine cards are in `cardData.js` as `type: 'Ordnance'`:

```js
// Deploy_Inhibitor_Mine (line 636)
{ id: 'Deploy_Inhibitor_Mine', name: 'Deploy Inhibitor Mine', type: 'Ordnance', cost: 2,
  effects: [{ type: 'CREATE_TOKENS', tokenName: 'Inhibitor Mine', targetOwner: 'OPPONENT', ... }] }

// Deploy_Jitter_Mine (line 658)
{ id: 'Deploy_Jitter_Mine', name: 'Deploy Jitter Mine', type: 'Ordnance', cost: 2,
  effects: [{ type: 'CREATE_TOKENS', tokenName: 'Jitter Mine', targetOwner: 'OPPONENT', ... }] }

// Deploy_Proximity_Mine (line 680)
{ id: 'Deploy_Proximity_Mine', name: 'Deploy Proximity Mine', type: 'Ordnance', cost: 2,
  effects: [{ type: 'CREATE_TOKENS', tokenName: 'Proximity Mine', targetOwner: 'OPPONENT', ... }] }
```

**No `subType` field exists yet** — PRD requires adding `subType: 'Mine'` to these three cards.

---

## 6. EffectRouter — Current Processors

The EffectRouter (`src/logic/EffectRouter.js`) maps effect types to processor instances:

| Effect Type | Processor |
|-|-|
| DRAW | DrawEffectProcessor |
| GAIN_ENERGY | GainEnergyEffectProcessor |
| READY_DRONE | ReadyDroneEffectProcessor |
| HEAL_HULL | HullHealProcessor |
| HEAL_SHIELDS | ShieldHealProcessor |
| RESTORE_SECTION_SHIELDS | ShipShieldRestoreProcessor |
| DAMAGE, DAMAGE_SCALING, SPLASH_DAMAGE, OVERFLOW_DAMAGE | DamageEffectProcessor |
| CONDITIONAL_SECTION_DAMAGE | ConditionalSectionDamageProcessor |
| DESTROY | DestroyEffectProcessor |
| MODIFY_STAT | ModifyStatEffectProcessor |
| MODIFY_DRONE_BASE | ModifyDroneBaseEffectProcessor |
| DESTROY_UPGRADE | DestroyUpgradeEffectProcessor |
| SINGLE_MOVE, MULTI_MOVE | MovementEffectProcessor |
| REPEATING_EFFECT | RepeatingEffectProcessor |
| COMPOSITE_EFFECT | CompositeEffectProcessor |
| CREATE_TOKENS | TokenCreationProcessor |
| SEARCH_AND_DRAW | SearchAndDrawProcessor |
| DRAW_THEN_DISCARD | DrawThenDiscardProcessor |
| MARK_DRONE, MARK_RANDOM_ENEMY | MarkingEffectProcessor |
| INCREASE_THREAT | IncreaseThreatEffectProcessor |
| DISCARD | DiscardEffectProcessor |
| DRAIN_ENERGY | DrainEnergyEffectProcessor |
| EXHAUST_DRONE | ExhaustDroneEffectProcessor |
| APPLY_CANNOT_MOVE, APPLY_CANNOT_ATTACK, etc. | StatusEffectProcessor |
| CLEAR_ALL_STATUS | StatusEffectProcessor |

All processors extend `BaseEffectProcessor` and implement `process(effect, context)`.
The context object shape: `{ actingPlayerId, playerStates, placedSections, target, callbacks, lane, ... }`

---

## 7. Debug Logger Categories

Relevant existing categories in `src/utils/debugLogger.js`:

| Category | Enabled | Description |
|-|-|-|
| COMBAT | false | Combat resolution |
| DEPLOYMENT | false | Drone deployment tracking |
| EFFECT_PROCESSING | false | Effect processor execution |
| EFFECT_CHAIN_DEBUG | true | Effect chain investigation (temp) |
| CARD_PLAY_TRACE | true | Card play milestone trace |
| ROUND_START | (via PHASE_TRANSITIONS) | Round start processing |
| MOVEMENT_EFFECT | false | Movement effect execution |

New category to add: `TRIGGERS` for the unified trigger system.

---

## 8. AI System References

The AI system references trigger abilities in several places that will need updating:

| File | Reference | Purpose |
|-|-|-|
| `src/logic/ai/attackEvaluators/droneAttack.js:100` | `ability.effect?.type === 'AFTER_ATTACK'` | Detects Gladiator self-buff for attack scoring |
| `src/logic/ai/attackEvaluators/droneAttack.js:91` | Threat Transmitter penalty | Penalizes drone attacks for Threat Transmitter |
| `src/logic/ai/attackEvaluators/shipAttack.js:113` | Threat Transmitter bonus | Rewards ship attacks for Threat Transmitter |
| `src/logic/ai/helpers/keywordHelpers.js:70-94` | `isThreatAbilityDrone()` | Checks ON_ROUND_START threat + ON_SHIP_SECTION_HULL_DAMAGE |
| `src/logic/ai/scoring/targetScoring.js:188` | Rally Beacon attack priority | AI targets Rally Beacon tokens for destruction |
| `src/logic/ai/cardEvaluators/droneCards.js:566` | ON_ATTACK trigger detection | Evaluates drone value for card play |
| `src/logic/ai/cardEvaluators/statusEffectCards.js:154-156` | `ability.effect?.type === 'AFTER_ATTACK'` | Ability bonus scoring — will break after Phase 6 data migration |
| `src/logic/ai/cardEvaluators/statusEffectCards.js:321` | ON_ROUND_START/ON_ATTACK detection | Status effect card targeting |
| `src/logic/ai/aiConstants.js:425` | RALLY_BEACON_ATTACK_PRIORITY | AI priority for attacking Rally Beacon |
| `src/data/descriptions/codePatternDescriptions.js:19` | 'AFTER_ATTACK' | Glossary description for AFTER_ATTACK |
| `src/data/descriptions/glossaryDescriptions.js:29,72` | DESTROY_SELF, AFTER_ATTACK | Glossary descriptions |

---

## 9. Existing Test Files

| Test File | Tests |
|-|-|
| `src/logic/combat/__tests__/AttackProcessor.test.js` | AFTER_ATTACK abilities, mine triggers during attack |
| `src/logic/deployment/__tests__/DeploymentProcessor.*.test.js` | ON_DEPLOY triggers, mine deployment triggers |
| `src/logic/round/__tests__/RoundManager.roundStart.test.js` | ON_ROUND_START trigger processing |
| `src/logic/effects/movement/__tests__/MovementEffectProcessor.test.js` | Movement + ON_MOVE + mine triggers |
| `src/logic/effects/conditional/__tests__/ConditionEvaluator.test.js` | ON_SHIP_SECTION_HULL_DAMAGE condition |
| `src/managers/__tests__/ActionProcessor.test.js` | Integration tests with mock triggers |
| `src/managers/__tests__/ActionProcessor.combat.test.js` | Combat integration with mock triggers |
| `src/managers/__tests__/ActionProcessor.commitments.test.js` | Commitment phase with mock triggers |
| `src/logic/ai/attackEvaluators/__tests__/droneAttack.test.js` | AFTER_ATTACK scoring tests |

---

## 10. Execution Order — Current Movement Flow Example

When a drone moves (executeSingleMove, lines 260-445):

1. **Validate** (cannotMove, INERT, INHIBIT_MOVEMENT, maxPerLane)
2. **Remove** drone from source lane
3. **Set exhaustion** (respecting DO_NOT_EXHAUST, INFILTRATE)
4. **Add** drone to destination lane
5. **Log** the movement
6. **ON_MOVE** — `applyOnMoveEffects()` (only for friendly drones)
7. **Update auras**
8. **Rally Beacon** — `checkRallyBeaconGoAgain()` (only for friendly drones)
9. **Snapshot** pre-mine state
10. **Mine trigger** — `processMineTrigger('ON_LANE_MOVEMENT_IN', ...)` (only for friendly drones)
11. **Return** result with `shouldEndTurn`, animation events

The PRD changes the order to: Self trigger → Acting player's lane triggers → Opponent's lane triggers

---

## 11. Key Design Decisions from PRD

### 11.1 TriggerProcessor Location
Per code standards, this should go in `src/logic/effects/` as it's pure game logic for effect processing.
Alternatively `src/logic/triggers/` as a new domain directory with the processor + tests.

### 11.2 Effect Routing
All trigger effects route through existing EffectRouter — no duplicate effect application logic.

### 11.3 Trigger Chain State
The TriggerProcessor maintains a per-chain `firedPairs` set tracking (reactor, source) pairs for loop prevention.

### 11.4 Animation Events
Each trigger firing produces a `TRIGGER_FIRED` animation event that the UI can consume.

### 11.5 Backward Compatibility
- Normalize `effect` → `effects` array in TriggerProcessor (don't change data files yet, or do both)
- Support `conditionalEffects` pattern (Threat Transmitter)
- `destroyAfterTrigger` handled by TriggerProcessor instead of MineTriggeredEffectProcessor
