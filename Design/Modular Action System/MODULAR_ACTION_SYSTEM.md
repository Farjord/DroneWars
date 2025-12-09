# Modular Action System Architecture

## Executive Summary

This document specifies a unified, modular action system for Drone Wars where **all actions** (card play, drone abilities, ship abilities) follow an identical execution flow. The system prioritizes:

1. **Full Modularity**: Every action defined in data files with explicit targeting and sequenced effects
2. **Animation Preservation**: Zero changes to animation system - effects continue emitting animationEvents
3. **Multiplayer Integrity**: ActionProcessor becomes specialized coordinator for network sync
4. **Atomic Effects**: All effects are composable, sequenceable primitives

**Current State**: 3 separate action flows (cards in CardPlayManager, drone abilities in AbilityResolver, ship abilities in 4 processors)
**Target State**: Single unified flow through ActionOrchestrator
**Migration**: Big bang refactor, no backward compatibility

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Unified Action Flow](#unified-action-flow)
4. [Effect Sequencing](#effect-sequencing)
5. [Targeting System](#targeting-system)
6. [Animation System Integration](#animation-system-integration)
7. [Data Format Specification](#data-format-specification)
8. [Code Examples](#code-examples)
9. [ActionProcessor Role Post-Refactor](#actionprocessor-role-post-refactor)

---

## Architecture Overview

### Current Architecture (3 Separate Flows)

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Card Play      │      │ Drone Abilities │      │ Ship Abilities  │
│  CardPlayMgr    │      │ AbilityResolver │      │ 4 Processors    │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ├── Own targeting        ├── Own targeting        ├── Own targeting
         ├── Own cost payment    ├── Own cost payment    ├── Own cost payment
         ├── Own effect exec     ├── Own effect exec     ├── Own effect exec
         └── Own turn logic      └── Own turn logic      └── Own turn logic
```

**Problems**:
- 3x code duplication for targeting, costs, turn ending
- Inconsistent effect handling (some composite, some atomic)
- Can't sequence effects across different action types
- Ship abilities use different patterns (2-action vs 1-action)
- Multiplayer sync logic scattered across all three

### Target Architecture (Unified Flow)

```
┌──────────────────────────────────────────────────────────────┐
│                     ActionProcessor                           │
│            (Multiplayer Coordinator & Queue Manager)          │
│  - Queue serialization    - Network sync                      │
│  - Animation batching     - Commitment system                 │
│  - Pass/AI coordination   - State broadcasting                │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    Delegates to ↓
┌──────────────────────────────────────────────────────────────┐
│                    ActionOrchestrator (NEW)                   │
│                  (Unified Action Execution)                   │
│                                                               │
│  1. Targeting Phase  ──→  TargetingRouter (existing)         │
│  2. Confirmation     ──→  (UI layer)                          │
│  3. Cost Payment     ──→  (energy, shields, etc.)            │
│  4. Effect Sequence  ──→  EffectSequencer (NEW)              │
│  5. Turn Ending      ──→  GameFlowManager                     │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    Uses ↓
┌──────────────────────────────────────────────────────────────┐
│                    EffectSequencer (NEW)                      │
│              (Sequential Effect Processing)                   │
│                                                               │
│  for each effect in action.effects:                          │
│    1. Route to processor via EffectRouter                     │
│    2. If requires player selection → PAUSE & return          │
│    3. Collect animationEvents                                 │
│    4. If failed → skip, continue                              │
│    5. Update game state                                       │
│  return: { state, animations, shouldEndTurn }                │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    Routes to ↓
┌──────────────────────────────────────────────────────────────┐
│                      EffectRouter                             │
│                  (Effect Type Dispatcher)                     │
│                      90% Complete                             │
│                                                               │
│  DAMAGE → DamageEffectProcessor                               │
│  DRAW → DrawEffectProcessor                                   │
│  DISCARD → DiscardEffectProcessor (NEW)                       │
│  HEAL → HealEffectProcessor                                   │
│  RECALL_DRONE → RecallDroneEffectProcessor (NEW)             │
│  ... 21 total effect types                                    │
└───────────────────────────────────────────────────────────────┘
```

---

## Core Components

### ActionOrchestrator (NEW)

**Responsibility**: Execute any action (card, drone ability, ship ability) through unified 5-phase flow

**Interface**:
```javascript
class ActionOrchestrator {
  /**
   * Execute an action through the unified flow
   *
   * @param {Object} action - Action definition from data files
   * @param {Object} context - Execution context
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents, mandatoryAction? }
   */
  async executeAction(action, context) {
    // Phase 1: Validate targeting (already done by UI)
    // Phase 2: Validate costs
    // Phase 3: Pay costs (energy, shields, etc.)
    // Phase 4: Execute effect sequence
    // Phase 5: Determine turn ending
  }
}
```

**Key Features**:
- Single entry point for all actions
- Delegates targeting validation to TargetingRouter
- Delegates effect execution to EffectSequencer
- Handles cost payment consistently
- Returns shouldEndTurn based on action.goAgain

### EffectSequencer (NEW)

**Responsibility**: Execute effect arrays sequentially with pause/resume support for player selection

**Interface**:
```javascript
class EffectSequencer {
  /**
   * Process an array of effects sequentially
   *
   * @param {Array} effects - Array of effect definitions
   * @param {Object} context - Execution context
   * @returns {Object} { newPlayerStates, animationEvents, mandatoryAction?, paused }
   */
  async executeSequence(effects, context) {
    const allAnimations = [];
    let currentState = context.playerStates;

    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];

      // Route to processor
      const processor = EffectRouter.getProcessor(effect.type);
      const result = processor.process(effect, {
        ...context,
        playerStates: currentState
      });

      // If requires player selection, pause and return
      if (result.requiresPlayerSelection) {
        return {
          newPlayerStates: currentState,
          animationEvents: allAnimations,
          mandatoryAction: result.mandatoryAction,
          paused: true,
          resumeFrom: i + 1 // Resume from next effect
        };
      }

      // If failed, skip and continue
      if (!result.success) {
        debugLog('EFFECT', `Effect ${effect.type} failed: ${result.error}`);
        continue;
      }

      // Update state and collect animations
      currentState = result.newPlayerStates;
      allAnimations.push(...(result.animationEvents || []));
    }

    return {
      newPlayerStates: currentState,
      animationEvents: allAnimations,
      paused: false
    };
  }

  /**
   * Resume sequence after player selection completed
   */
  async resumeSequence(sequenceState, selectionResult, context) {
    // Continue from resumeFrom index
    // Merge selection result into state
    // Execute remaining effects
  }
}
```

**Key Features**:
- Processes effects in order
- Pauses immediately when player selection needed
- Collects animations from all effects
- Continues on failure (skip failed effect)
- Maintains resumption state for multi-step flows

### EffectRouter (Existing - 90% Complete)

**Current State**: Already routes 18 effect types to processors

**Required Changes**:
1. Add `DISCARD` effect type → DiscardEffectProcessor (NEW)
2. Add `RECALL_DRONE` effect type → RecallDroneEffectProcessor (NEW)
3. Remove composite effects (DRAW_THEN_DISCARD) - break into sequences
4. Add sequence support (array of effects)

**Example Addition**:
```javascript
// In EffectRouter.js
import DiscardEffectProcessor from './effects/cards/DiscardEffectProcessor.js';
import RecallDroneEffectProcessor from './effects/drones/RecallDroneEffectProcessor.js';

this.processors.set('DISCARD', DiscardEffectProcessor);
this.processors.set('RECALL_DRONE', RecallDroneEffectProcessor);
```

### TargetingRouter (Existing - 100% Complete)

**Current State**: Already handles 7 targeting types, no changes needed

**Targeting Types**:
- `SINGLE_ENEMY_DRONE`: Select one enemy drone
- `SINGLE_FRIENDLY_DRONE`: Select one friendly drone
- `ALL_ENEMY_DRONES`: No selection (auto-target)
- `ALL_FRIENDLY_DRONES`: No selection (auto-target)
- `ENEMY_SHIP_SECTION`: Select enemy ship section
- `FRIENDLY_SHIP_SECTION`: Select friendly ship section
- `SELF`: No selection (auto-target self)

**New Additions for Multi-Targeting**:
- `PLAYER_SELECTION`: Special type for shield reallocation UI flow
- `SECONDARY_TARGET`: For effects with multiple targets (see Multi-Targeting section)

---

## Unified Action Flow

All actions follow this identical 5-phase flow:

### Phase 1: Targeting

**When**: User clicks action button (card, ability button, ship section)
**What**: UI enters targeting mode (if required)
**Validation**: TargetingRouter validates target selection
**Example**: Play "Missile Strike" → Click enemy drone → Valid target confirmed

```javascript
// In App.jsx - handleCardClick
const targetingType = action.targeting.type;
const validation = TargetingRouter.validate(targetingType, selectedTarget, context);

if (!validation.valid) {
  showError(validation.error);
  return;
}

// Proceed to confirmation
setConfirmation({ action, target: selectedTarget });
```

**Special Cases**:
- `SELF` targeting: Skip targeting phase, proceed directly to confirmation
- Multi-step targeting (shield reallocation): Custom UI flow, then confirmation

### Phase 2: Confirmation

**When**: After targeting validated (or immediately for SELF-targeted actions)
**What**: Show confirmation modal with action details, costs, effects
**UI**: Modal shows card art, description, energy cost, target summary

```javascript
// In ConfirmationModal.jsx
<Modal>
  <CardArt card={action} />
  <Description>{action.description}</Description>
  <Cost>Energy: {action.cost.energy}</Cost>
  <Target>Target: {formatTarget(target)}</Target>
  <Button onClick={handleConfirm}>Confirm</Button>
  <Button onClick={handleCancel}>Cancel</Button>
</Modal>
```

### Phase 3: Cost Payment

**When**: Immediately after user confirms (before effects execute)
**What**: Deduct energy, shields, or other costs
**Failure**: If insufficient resources, abort action (return to hand/ready state)

```javascript
// In ActionOrchestrator.executeAction()
async executeAction(action, context) {
  // Phase 3: Pay Costs
  const costResult = this.payCosts(action.cost, context.playerStates, context.playerId);

  if (!costResult.success) {
    return {
      success: false,
      error: costResult.error,
      newPlayerStates: context.playerStates // No changes
    };
  }

  // Update state with costs paid
  let currentState = costResult.newPlayerStates;

  // Continue to Phase 4...
}

payCosts(cost, playerStates, playerId) {
  const newStates = JSON.parse(JSON.stringify(playerStates));
  const player = newStates[playerId];

  // Validate energy
  if (cost.energy && player.energy < cost.energy) {
    return { success: false, error: 'Insufficient energy' };
  }

  // Deduct energy
  if (cost.energy) {
    player.energy -= cost.energy;
  }

  // Handle other costs (shields, etc.)

  return { success: true, newPlayerStates: newStates };
}
```

**Cost Types**:
- `energy`: Deduct from player.energy
- `shields`: Deduct from specific ship section
- `sacrifice`: Remove drone from board
- Future: `discard`, `exhaust`, etc.

### Phase 4: Effect Sequence

**When**: After costs paid successfully
**What**: Execute effects array via EffectSequencer
**Pausing**: If effect requires player selection, pause and return mandatoryAction
**Animations**: Collect animationEvents from all effects

```javascript
// In ActionOrchestrator.executeAction()
async executeAction(action, context) {
  // ... Phase 3 completed, costs paid ...

  // Phase 4: Execute Effect Sequence
  const sequenceResult = await this.effectSequencer.executeSequence(
    action.effects,
    { ...context, playerStates: currentState }
  );

  // If paused for player selection
  if (sequenceResult.paused) {
    return {
      newPlayerStates: sequenceResult.newPlayerStates,
      animationEvents: sequenceResult.animationEvents,
      mandatoryAction: sequenceResult.mandatoryAction,
      shouldEndTurn: false, // Don't end turn until resumed
      sequenceState: sequenceResult // Store for resumption
    };
  }

  // Continue to Phase 5...
  currentState = sequenceResult.newPlayerStates;
  const allAnimations = sequenceResult.animationEvents;
}
```

**Effect Execution**:
1. EffectSequencer processes effects in array order
2. Each effect routed to processor via EffectRouter
3. Processor returns: `{ success, newPlayerStates, animationEvents, requiresPlayerSelection?, mandatoryAction? }`
4. If `requiresPlayerSelection: true`, sequencer pauses and returns
5. If `success: false`, sequencer logs error and continues to next effect
6. All animationEvents collected into single array

**Player Selection Effects**:
- `DISCARD`: Player must select cards from hand
- `SEARCH_AND_DRAW`: Player must select card from deck
- `CHOOSE_EFFECT`: Player must choose between effect branches

**Example - Simple Effect Sequence**:
```javascript
// Card: "Tactical Strike"
{
  name: "Tactical Strike",
  effects: [
    { type: 'DAMAGE', target: 'PRIMARY', value: 3 },
    { type: 'DRAW', target: 'SELF', value: 1 }
  ]
}

// Execution:
// 1. DamageEffectProcessor.process() → { animationEvents: [DAMAGE_ANIM], ... }
// 2. DrawEffectProcessor.process() → { animationEvents: [DRAW_ANIM], ... }
// 3. Return: { animationEvents: [DAMAGE_ANIM, DRAW_ANIM], ... }
```

**Example - Pausing Effect Sequence**:
```javascript
// Card: "Strategic Recon"
{
  name: "Strategic Recon",
  effects: [
    { type: 'DRAW', target: 'SELF', value: 2 },
    { type: 'DISCARD', target: 'SELF', value: 1 } // ← PAUSES HERE
  ]
}

// Execution:
// 1. DrawEffectProcessor.process() → draws 2 cards
// 2. DiscardEffectProcessor.process() → { requiresPlayerSelection: true, mandatoryAction: {...} }
// 3. EffectSequencer pauses, returns mandatoryAction
// 4. UI shows discard selection modal
// 5. Player selects card, confirms
// 6. EffectSequencer.resumeSequence() continues from step 3
```

### Phase 5: Turn Ending

**When**: After all effects completed (or paused)
**What**: Determine if turn ends based on action.goAgain
**Logic**: If `goAgain: true`, player keeps turn; otherwise end turn

```javascript
// In ActionOrchestrator.executeAction()
async executeAction(action, context) {
  // ... Phase 4 completed, effects executed ...

  // Phase 5: Determine Turn Ending
  const shouldEndTurn = !action.goAgain;

  return {
    newPlayerStates: currentState,
    animationEvents: allAnimations,
    shouldEndTurn: shouldEndTurn
  };
}
```

**goAgain Property**:
- Default: `false` (action ends turn)
- Set to `true` for: Free actions, cantrip effects, bonus attacks
- Examples: "Swift Strike" (goAgain: true), "Final Blow" (goAgain: false)

---

## Effect Sequencing

### Atomic Effects

All effects are **atomic primitives** that can be composed in any order:

| Effect Type | Description | Returns Animation? | Requires Selection? |
|-------------|-------------|-------------------|---------------------|
| `DAMAGE` | Deal damage to target | Yes (DAMAGE_FLASH) | No |
| `HEAL` | Restore HP to target | Yes (HEAL_GLOW) | No |
| `DRAW` | Draw cards | Yes (DRAW_CARD) | No |
| `DISCARD` | Discard cards | Yes (DISCARD_CARD) | **Yes** (human only) |
| `SHIELD_ADD` | Add shields to section | No | No |
| `SHIELD_REMOVE` | Remove shields from section | No | No |
| `MARK_DRONE` | Mark drone for bonus damage | No | No |
| `RECALL_DRONE` | Return drone to hand | Yes (TELEPORT_OUT) | No |
| `MOVE_DRONE` | Move drone between lanes | Yes (MOVE_ANIMATION) | No |
| `ENERGY_GAIN` | Add energy | Yes (ENERGY_PARTICLE) | No |
| `ENERGY_DRAIN` | Remove opponent energy | Yes (ENERGY_DRAIN) | No |
| `DESTROY` | Destroy drone/section | Yes (EXPLOSION) | No |
| `SUMMON` | Create drone token | Yes (SPAWN_IN) | No |
| `BUFF` | Add stat modifier | Yes (BUFF_GLOW) | No |
| `DEBUFF` | Add negative modifier | Yes (DEBUFF_GLOW) | No |
| `SEARCH_DECK` | Find card in deck | No | **Yes** |
| `SHUFFLE` | Shuffle deck | Yes (SHUFFLE_ANIM) | No |
| `REVEAL` | Reveal cards | Yes (REVEAL_ANIM) | No |

**New Effects to Implement**:
1. **DISCARD**: Human player selection required, AI auto-selects
2. **RECALL_DRONE**: Move drone from board to hand (extracted from RecallAbilityProcessor)

### Effect Sequencing Rules

1. **Sequential Execution**: Effects execute in array order, never parallel
2. **State Propagation**: Each effect receives state from previous effect
3. **Failure Isolation**: Failed effects are skipped, sequence continues
4. **Animation Collection**: All animationEvents collected into single array
5. **Pause on Selection**: Sequence pauses immediately when player selection needed
6. **Resumption State**: Paused sequences store resumption index + partial state

**Example - Complex Sequence**:
```javascript
// Card: "Overwhelming Assault"
{
  name: "Overwhelming Assault",
  effects: [
    { type: 'DAMAGE', target: 'PRIMARY', value: 2 },
    { type: 'DAMAGE', target: 'SECONDARY', value: 2 }, // Multi-target
    { type: 'DRAW', target: 'SELF', value: 1 },
    { type: 'DISCARD', target: 'SELF', value: 1 }  // Pauses here for human
  ]
}

// Execution for Human Player:
// Step 1: Deal 2 damage to primary target
// Step 2: Deal 2 damage to secondary target
// Step 3: Draw 1 card
// Step 4: PAUSE - show discard modal
// [Player selects card]
// Step 5: Resume - discard selected card
// Step 6: End turn

// Execution for AI:
// Step 1-4: Execute all effects immediately (AI auto-discards)
// Step 5: End turn
```

### Breaking Composite Effects

**Old Approach** (Remove):
```javascript
// DrawThenDiscardProcessor.js - COMPOSITE EFFECT (BAD)
class DrawThenDiscardProcessor {
  process(effect, context) {
    // Draw cards
    const drawResult = drawProcessor.process({ type: 'DRAW', value: 2 }, context);

    // Discard cards
    const discardResult = discardProcessor.process({ type: 'DISCARD', value: 1 }, drawResult);

    return discardResult;
  }
}
```

**New Approach** (Use):
```javascript
// In card data - SEQUENCED ATOMIC EFFECTS (GOOD)
{
  name: "Tactical Analysis",
  effects: [
    { type: 'DRAW', target: 'SELF', value: 2 },
    { type: 'DISCARD', target: 'SELF', value: 1 }
  ]
}
```

**Benefits**:
- Effects can be reordered: `[DISCARD, DRAW]` vs `[DRAW, DISCARD]`
- Effects can be conditional: `if (targetHasShields) { sequence.push(SHIELD_REMOVE) }`
- Effects can be inserted: `[DRAW, BUFF, DISCARD]`
- No code changes for new combinations

---

## Targeting System

### Primary Targeting

**Definition**: The main target of an action (selected during Phase 1)

**Properties in Action Data**:
```javascript
{
  name: "Missile Strike",
  targeting: {
    type: 'SINGLE_ENEMY_DRONE',
    required: true
  }
}
```

**TargetingRouter Validation**:
```javascript
const validation = TargetingRouter.validate('SINGLE_ENEMY_DRONE', selectedDrone, context);

if (!validation.valid) {
  // Show error: "Must target an enemy drone"
}
```

### Multi-Targeting

**Definition**: Actions that affect multiple targets (primary + secondary targets)

**Current Examples from Cards** (to analyze):
1. **Chain Lightning**: Damage primary drone, then jump to adjacent drones
2. **Inspiring Command**: Heal primary drone, buff all friendly drones
3. **Disruption Field**: Damage primary section, drain opponent energy

**Proposed Multi-Target Format**:
```javascript
{
  name: "Chain Lightning",
  targeting: {
    type: 'SINGLE_ENEMY_DRONE',
    required: true
  },
  effects: [
    {
      type: 'DAMAGE',
      target: 'PRIMARY', // ← Explicit: use primary selected target
      value: 3
    },
    {
      type: 'DAMAGE',
      target: 'ADJACENT_TO_PRIMARY', // ← Secondary: auto-resolved
      value: 1,
      condition: 'hasAdjacentEnemies'
    }
  ]
}
```

**Target Resolution Types**:
- `PRIMARY`: Use the target selected in Phase 1
- `SELF`: Current player (acting player)
- `OPPONENT`: Opponent player
- `ADJACENT_TO_PRIMARY`: Auto-resolve adjacent drones
- `ALL_FRIENDLY`: Auto-resolve all friendly drones
- `ALL_ENEMY`: Auto-resolve all enemy drones
- `SECONDARY_SELECTION`: Pause for second target selection (rare)

**Example - Heal Primary, Buff All**:
```javascript
{
  name: "Inspiring Command",
  targeting: {
    type: 'SINGLE_FRIENDLY_DRONE',
    required: true
  },
  effects: [
    {
      type: 'HEAL',
      target: 'PRIMARY', // ← Selected drone
      value: 3
    },
    {
      type: 'BUFF',
      target: 'ALL_FRIENDLY', // ← Auto-resolve all friendly drones
      stat: 'attack',
      value: 1,
      duration: 'endOfTurn'
    }
  ]
}
```

**Example - Damage Section, Drain Energy**:
```javascript
{
  name: "Disruption Field",
  targeting: {
    type: 'ENEMY_SHIP_SECTION',
    required: true
  },
  effects: [
    {
      type: 'DAMAGE',
      target: 'PRIMARY', // ← Selected ship section
      value: 2
    },
    {
      type: 'ENERGY_DRAIN',
      target: 'OPPONENT', // ← Opponent player (no selection needed)
      value: 1
    }
  ]
}
```

### Special Targeting: Shield Reallocation

**Problem**: Shield reallocation requires custom multi-step UI flow (remove shields, then add shields)

**Solution**: Treat as special targeting type with custom UI, then execute as normal action

**Flow**:
1. Player clicks "Reallocate Shields"
2. UI enters removal mode → Player removes up to 2 shields
3. Player clicks "Continue"
4. UI enters addition mode → Player adds removed shields
5. Player clicks "Confirm" → Confirmation modal
6. Confirm → Execute action via ActionOrchestrator

**Action Data**:
```javascript
{
  name: "Reallocate Shields",
  targeting: {
    type: 'PLAYER_SELECTION', // ← Special: UI handles targeting
    customFlow: 'shieldReallocation'
  },
  cost: {
    energy: 1
  },
  effects: [
    {
      type: 'SHIELD_REALLOCATE', // ← Special effect processor
      // State changes already applied during targeting phase
      // This just validates and returns success
    }
  ],
  goAgain: false
}
```

**Alternative Approach** (simpler):
```javascript
// Shield reallocation handled entirely in targeting phase
// No effects needed - state changes already applied
{
  name: "Reallocate Shields",
  targeting: {
    type: 'PLAYER_SELECTION',
    customFlow: 'shieldReallocation'
  },
  cost: {
    energy: 1
  },
  effects: [], // ← Empty - state changes done in targeting
  goAgain: false
}
```

---

## Animation System Integration

**Critical Requirement**: Animation system must remain **unchanged**. Effect processors continue emitting animationEvents in same format.

### Current Animation Flow

```
Effect Processor
    ↓ emits animationEvents array
ActionProcessor.processAction()
    ↓ collects animations
PhaseAnimationQueue.queueAnimations()
    ↓ batches by phase
AnimationManager.playAnimations()
    ↓ plays sequentially
useAnimationSetup hook
    ↓ renders to canvas
```

### Post-Refactor Animation Flow

```
Effect Processor (UNCHANGED)
    ↓ emits animationEvents array (same format)
EffectSequencer.executeSequence()
    ↓ collects animations from all effects
ActionOrchestrator.executeAction()
    ↓ returns { animationEvents: [...] }
ActionProcessor.processAction()
    ↓ receives animations (SAME FORMAT)
PhaseAnimationQueue.queueAnimations()
    ↓ batches by phase (UNCHANGED)
AnimationManager.playAnimations()
    ↓ plays sequentially (UNCHANGED)
useAnimationSetup hook
    ↓ renders to canvas (UNCHANGED)
```

**Key Points**:
1. Effect processors still return `animationEvents` arrays
2. EffectSequencer collects animations (new responsibility)
3. ActionProcessor receives collected animations (same as before)
4. PhaseAnimationQueue, AnimationManager, useAnimationSetup: **ZERO CHANGES**

### Animation Event Format

**Unchanged** - Effect processors continue emitting same events:

```javascript
// In DamageEffectProcessor.process()
return {
  success: true,
  newPlayerStates: updatedStates,
  animationEvents: [
    {
      type: 'DAMAGE_FLASH',
      targetId: targetDrone.id,
      laneId: laneName,
      damage: damageDealt,
      timestamp: Date.now()
    }
  ]
};
```

### Animation Collection Example

**Simple Action** (1 effect):
```javascript
// Card: "Missile Strike"
{
  effects: [
    { type: 'DAMAGE', target: 'PRIMARY', value: 3 }
  ]
}

// DamageEffectProcessor emits:
animationEvents: [
  { type: 'DAMAGE_FLASH', targetId: 'drone_123', damage: 3 }
]

// ActionOrchestrator returns:
{
  animationEvents: [
    { type: 'DAMAGE_FLASH', targetId: 'drone_123', damage: 3 }
  ]
}
```

**Complex Action** (4 effects):
```javascript
// Card: "Overwhelming Assault"
{
  effects: [
    { type: 'DAMAGE', target: 'PRIMARY', value: 2 },
    { type: 'DAMAGE', target: 'SECONDARY', value: 2 },
    { type: 'DRAW', target: 'SELF', value: 1 },
    { type: 'DISCARD', target: 'SELF', value: 1 }
  ]
}

// EffectSequencer collects:
animationEvents: [
  { type: 'DAMAGE_FLASH', targetId: 'drone_123', damage: 2 },
  { type: 'DAMAGE_FLASH', targetId: 'drone_456', damage: 2 },
  { type: 'DRAW_CARD', count: 1 },
  { type: 'DISCARD_CARD', cardId: 'card_789' }
]

// ActionOrchestrator returns same array
// ActionProcessor batches into PhaseAnimationQueue (UNCHANGED)
```

### Paused Sequences and Animations

**Question**: What happens to animations when sequence pauses for player selection?

**Answer**: Animations for completed effects are queued immediately, remaining effects emit animations after resume

**Example**:
```javascript
// Card with pause:
{
  effects: [
    { type: 'DRAW', value: 2 },      // ← Emits DRAW_CARD animation
    { type: 'DISCARD', value: 1 }    // ← PAUSES (human player)
  ]
}

// First execution (before pause):
animationEvents: [
  { type: 'DRAW_CARD', count: 2 }
]
// These animations play immediately

// After player selects card and confirms:
animationEvents: [
  { type: 'DISCARD_CARD', cardId: 'selected_card' }
]
// These animations play after resume
```

---

## Data Format Specification

### Action Data Structure (Universal)

**All actions** (cards, drone abilities, ship abilities) use this format:

```javascript
{
  // Identity
  id: "unique_id",
  name: "Action Name",
  type: "card" | "droneAbility" | "shipAbility",

  // Targeting
  targeting: {
    type: 'SINGLE_ENEMY_DRONE' | 'SELF' | 'PLAYER_SELECTION' | ...,
    required: true | false,
    customFlow?: 'shieldReallocation' | ... // For special UI flows
  },

  // Costs
  cost: {
    energy?: number,
    shields?: number,
    sacrifice?: 'SELF' | 'ANY_FRIENDLY',
    discard?: number,
    // Future: exhaust, health, etc.
  },

  // Effects (sequenced)
  effects: [
    {
      type: 'DAMAGE' | 'HEAL' | 'DRAW' | ...,
      target: 'PRIMARY' | 'SELF' | 'OPPONENT' | 'ALL_FRIENDLY' | ...,
      value?: number,
      condition?: 'hasShields' | 'ifMarked' | ...,
      // Effect-specific properties
    }
  ],

  // Turn control
  goAgain: true | false, // Default: false

  // UI/flavor
  description: "Text description",
  art: "path/to/art.png",
  flavor?: "Flavor text"
}
```

### Migration Examples

#### Example 1: Simple Damage Card

**Before** (Current Format):
```javascript
// In actionCardData.js
{
  id: 1,
  name: "Missile Strike",
  type: "action",
  cost: { energy: 2 },
  description: "Deal 3 damage to target enemy drone",
  art: "/assets/cards/missile-strike.png",

  // Effect as function (OLD)
  effect: (playerStates, droneToTarget, playerId) => {
    const damage = 3;
    const targetDrone = droneToTarget;
    // ... damage logic ...
    return { newPlayerStates, animationEvents: [...] };
  },

  goAgain: false
}
```

**After** (New Format):
```javascript
// In actionCardData.js
{
  id: 1,
  name: "Missile Strike",
  type: "card",

  targeting: {
    type: 'SINGLE_ENEMY_DRONE',
    required: true
  },

  cost: {
    energy: 2
  },

  effects: [
    {
      type: 'DAMAGE',
      target: 'PRIMARY',
      value: 3
    }
  ],

  goAgain: false,

  description: "Deal 3 damage to target enemy drone",
  art: "/assets/cards/missile-strike.png"
}
```

#### Example 2: Draw + Discard Card

**Before** (Current Format):
```javascript
{
  id: 5,
  name: "Tactical Analysis",
  type: "action",
  cost: { energy: 1 },
  description: "Draw 2 cards, then discard 1 card",

  // Uses DrawThenDiscardProcessor (composite effect)
  effect: (playerStates, target, playerId) => {
    return DrawThenDiscardProcessor.process({
      type: 'DRAW_THEN_DISCARD',
      drawCount: 2,
      discardCount: 1
    }, { playerStates, playerId });
  },

  goAgain: false
}
```

**After** (New Format):
```javascript
{
  id: 5,
  name: "Tactical Analysis",
  type: "card",

  targeting: {
    type: 'SELF',
    required: false
  },

  cost: {
    energy: 1
  },

  effects: [
    { type: 'DRAW', target: 'SELF', value: 2 },
    { type: 'DISCARD', target: 'SELF', value: 1 } // ← Pauses for player
  ],

  goAgain: false,

  description: "Draw 2 cards, then discard 1 card"
}
```

#### Example 3: Drone Ability

**Before** (Current Format):
```javascript
// In droneData.js - abilities as objects with functions
{
  id: "scout_drone",
  name: "Scout Drone",
  abilities: [
    {
      name: "Quick Scan",
      description: "Draw 1 card",
      energyCost: 1,

      // Ability logic in AbilityResolver (OLD)
      // Looked up by name, executed via switch statement
    }
  ]
}
```

**After** (New Format):
```javascript
// In droneData.js - abilities as full action definitions
{
  id: "scout_drone",
  name: "Scout Drone",
  abilities: [
    {
      id: "scout_quick_scan",
      name: "Quick Scan",
      type: "droneAbility",

      targeting: {
        type: 'SELF',
        required: false
      },

      cost: {
        energy: 1
      },

      effects: [
        { type: 'DRAW', target: 'SELF', value: 1 }
      ],

      goAgain: true, // ← Drone abilities often allow follow-up actions

      description: "Draw 1 card"
    }
  ]
}
```

#### Example 4: Ship Ability (Recalculate)

**Before** (Current Format):
```javascript
// In shipData.js - abilities as special objects
{
  sectionName: "Bridge",
  abilities: [
    {
      name: "Recalculate",
      description: "Draw 1 card, then discard 1 card",
      energyCost: 1,

      // Logic in RecalculateAbilityProcessor.js
      // Special two-step flow: recalculateAbility + recalculateComplete
    }
  ]
}
```

**After** (New Format):
```javascript
// In shipData.js - abilities as full action definitions
{
  sectionName: "Bridge",
  abilities: [
    {
      id: "ship_recalculate",
      name: "Recalculate",
      type: "shipAbility",

      targeting: {
        type: 'SELF',
        required: false
      },

      cost: {
        energy: 1
      },

      effects: [
        { type: 'DRAW', target: 'SELF', value: 1 },
        { type: 'DISCARD', target: 'SELF', value: 1 } // ← Pauses for player
      ],

      goAgain: false, // ← Ship abilities always end turn

      description: "Draw 1 card, then discard 1 card"
    }
  ]
}
```

#### Example 5: Multi-Target Card

**Before** (Current Format):
```javascript
{
  id: 12,
  name: "Inspiring Command",
  type: "action",
  cost: { energy: 3 },
  description: "Heal target drone 3 HP. All friendly drones gain +1 attack",

  // Multi-target logic embedded in effect function
  effect: (playerStates, targetDrone, playerId) => {
    // Heal primary target
    targetDrone.currentHp += 3;

    // Buff all friendly drones
    for (const lane in playerStates[playerId].dronesOnBoard) {
      for (const drone of playerStates[playerId].dronesOnBoard[lane]) {
        drone.attack += 1; // Temporary buff
      }
    }

    return { newPlayerStates, animationEvents: [...] };
  }
}
```

**After** (New Format):
```javascript
{
  id: 12,
  name: "Inspiring Command",
  type: "card",

  targeting: {
    type: 'SINGLE_FRIENDLY_DRONE',
    required: true
  },

  cost: {
    energy: 3
  },

  effects: [
    {
      type: 'HEAL',
      target: 'PRIMARY', // ← Selected drone
      value: 3
    },
    {
      type: 'BUFF',
      target: 'ALL_FRIENDLY', // ← Auto-resolve all friendly drones
      stat: 'attack',
      value: 1,
      duration: 'endOfTurn'
    }
  ],

  goAgain: false,

  description: "Heal target drone 3 HP. All friendly drones gain +1 attack until end of turn"
}
```

#### Example 6: Conditional Effect

**Before** (Current Format):
```javascript
{
  id: 15,
  name: "Precision Strike",
  type: "action",
  cost: { energy: 2 },
  description: "Deal 2 damage. Deal 2 bonus damage if target is marked",

  effect: (playerStates, targetDrone, playerId) => {
    let damage = 2;

    // Conditional bonus damage
    if (targetDrone.isMarked) {
      damage += 2;
    }

    // Apply damage...
    return { newPlayerStates, animationEvents: [...] };
  }
}
```

**After** (New Format):
```javascript
{
  id: 15,
  name: "Precision Strike",
  type: "card",

  targeting: {
    type: 'SINGLE_ENEMY_DRONE',
    required: true
  },

  cost: {
    energy: 2
  },

  effects: [
    {
      type: 'DAMAGE',
      target: 'PRIMARY',
      value: 2
    },
    {
      type: 'DAMAGE',
      target: 'PRIMARY',
      value: 2,
      condition: 'targetIsMarked' // ← Processor checks condition
    }
  ],

  goAgain: false,

  description: "Deal 2 damage. Deal 2 bonus damage if target is marked"
}
```

### Data File Migration Checklist

**Files to Migrate**:
1. `src/data/actionCardData.js` - ~30 action cards
2. `src/data/droneData.js` - ~20 drones with abilities
3. `src/data/shipData.js` - 4 ship abilities
4. `src/data/ordnanceData.js` - ~15 ordnance cards
5. Future: `attackData.js` if attack modifiers added

**Migration Process**:
1. For each action, identify targeting type
2. Extract costs into `cost` object
3. Break down effect logic into atomic effect array
4. Set `goAgain` property
5. Remove effect function
6. Test action through ActionOrchestrator

---

## Code Examples

### Example 1: Playing a Simple Card

**User Flow**:
1. Player clicks "Missile Strike" in hand
2. UI enters targeting mode (crosshair on enemy drones)
3. Player clicks enemy drone
4. Confirmation modal appears
5. Player confirms
6. Card played, damage dealt, turn ends

**Code Flow**:
```javascript
// 1. In App.jsx - handleCardClick
const handleCardClick = (card) => {
  const action = card; // Card is now an action definition

  // Phase 1: Targeting
  if (action.targeting.required) {
    setTargetingMode({
      action: action,
      targetingType: action.targeting.type
    });
  } else {
    // No targeting needed, go straight to confirmation
    setConfirmationModal({ action, target: null });
  }
};

// 2. In App.jsx - handleTargetSelection
const handleTargetSelection = (target) => {
  const { action, targetingType } = targetingMode;

  // Validate target
  const validation = TargetingRouter.validate(targetingType, target, context);

  if (!validation.valid) {
    showError(validation.error);
    return;
  }

  // Show confirmation
  setTargetingMode(null);
  setConfirmationModal({ action, target });
};

// 3. In ConfirmationModal.jsx - handleConfirm
const handleConfirm = async () => {
  const { action, target } = confirmationModal;

  // Execute via ActionProcessor (which delegates to ActionOrchestrator)
  const result = await processActionWithGuestRouting('playAction', {
    action: action,
    target: target,
    playerId: currentPlayerId
  });

  // Handle result
  if (result.mandatoryAction) {
    setMandatoryAction(result.mandatoryAction);
  }

  if (result.shouldEndTurn) {
    // GameFlowManager handles turn transition
  }

  setConfirmationModal(null);
};

// 4. In ActionProcessor.js - processPlayAction
async processPlayAction(payload) {
  const { action, target, playerId } = payload;

  // Delegate to ActionOrchestrator
  const result = await this.actionOrchestrator.executeAction(action, {
    target: target,
    playerId: playerId,
    playerStates: this.getPlayerStates(),
    placedSections: this.getPlacedSections(),
    gameMode: this.gameMode,
    localPlayerId: this.localPlayerId
  });

  // Update state
  if (result.newPlayerStates) {
    this.gameStateManager.updatePlayerState('player1', result.newPlayerStates.player1);
    this.gameStateManager.updatePlayerState('player2', result.newPlayerStates.player2);
  }

  // Queue animations (UNCHANGED from current system)
  if (result.animationEvents && result.animationEvents.length > 0) {
    this.phaseAnimationQueue.queueAnimations(
      result.animationEvents,
      this.gameStateManager.getState().turnPhase
    );
  }

  return result;
}

// 5. In ActionOrchestrator.js - executeAction
async executeAction(action, context) {
  // Phase 3: Pay Costs
  const costResult = this.payCosts(action.cost, context.playerStates, context.playerId);
  if (!costResult.success) {
    return { success: false, error: costResult.error };
  }

  let currentState = costResult.newPlayerStates;

  // Phase 4: Execute Effect Sequence
  const sequenceResult = await this.effectSequencer.executeSequence(
    action.effects,
    { ...context, playerStates: currentState, primaryTarget: context.target }
  );

  if (sequenceResult.paused) {
    return {
      newPlayerStates: sequenceResult.newPlayerStates,
      animationEvents: sequenceResult.animationEvents,
      mandatoryAction: sequenceResult.mandatoryAction,
      shouldEndTurn: false
    };
  }

  currentState = sequenceResult.newPlayerStates;

  // Phase 5: Determine Turn Ending
  return {
    newPlayerStates: currentState,
    animationEvents: sequenceResult.animationEvents,
    shouldEndTurn: !action.goAgain
  };
}

// 6. In EffectSequencer.js - executeSequence
async executeSequence(effects, context) {
  const allAnimations = [];
  let currentState = context.playerStates;

  for (const effect of effects) {
    // Route to processor
    const processor = EffectRouter.getProcessor(effect.type);

    // Resolve target
    const resolvedTarget = this.resolveTarget(effect.target, context);

    // Execute effect
    const result = processor.process(effect, {
      ...context,
      playerStates: currentState,
      target: resolvedTarget
    });

    // Handle player selection
    if (result.requiresPlayerSelection) {
      return {
        newPlayerStates: currentState,
        animationEvents: allAnimations,
        mandatoryAction: result.mandatoryAction,
        paused: true
      };
    }

    // Update state and collect animations
    if (result.success) {
      currentState = result.newPlayerStates;
      allAnimations.push(...(result.animationEvents || []));
    }
  }

  return {
    newPlayerStates: currentState,
    animationEvents: allAnimations,
    paused: false
  };
}

// 7. In DamageEffectProcessor.js - process (UNCHANGED)
process(effect, context) {
  const { target, playerStates, playerId } = context;
  const damage = effect.value;

  // Apply damage logic...
  const newStates = JSON.parse(JSON.stringify(playerStates));
  targetDrone.currentHp -= damage;

  return {
    success: true,
    newPlayerStates: newStates,
    animationEvents: [
      {
        type: 'DAMAGE_FLASH',
        targetId: targetDrone.id,
        laneId: laneName,
        damage: damage
      }
    ]
  };
}
```

### Example 2: Ship Ability (Recalculate) with Pause

**User Flow**:
1. Player clicks "Recalculate" on Bridge section
2. Confirmation modal appears
3. Player confirms
4. Energy deducted, card drawn
5. Discard modal appears (mandatoryAction)
6. Player selects card, confirms discard
7. Turn ends

**Code Flow**:
```javascript
// 1. In App.jsx - handleShipAbilityClick
const handleShipAbilityClick = (ability, sectionName) => {
  const action = ability; // Ship ability is now an action definition

  // Recalculate has SELF targeting, go straight to confirmation
  setConfirmationModal({ action, target: null, sectionName });
};

// 2. In ConfirmationModal.jsx - handleConfirm
const handleConfirm = async () => {
  const { action } = confirmationModal;

  // Execute via ActionOrchestrator
  const result = await processActionWithGuestRouting('playAction', {
    action: action,
    target: null, // SELF targeting
    playerId: currentPlayerId
  });

  // Result includes mandatoryAction for discard
  if (result.mandatoryAction) {
    setMandatoryAction(result.mandatoryAction);
    setFooterView('hand'); // Show hand for discard selection
    setIsFooterOpen(true);
  }

  setConfirmationModal(null);
};

// 3. In ActionOrchestrator.js - executeAction
async executeAction(action, context) {
  // Phase 3: Pay Costs
  const costResult = this.payCosts(action.cost, context.playerStates, context.playerId);
  currentState = costResult.newPlayerStates; // Energy deducted

  // Phase 4: Execute Effect Sequence
  const sequenceResult = await this.effectSequencer.executeSequence(
    action.effects, // [{ type: 'DRAW', ... }, { type: 'DISCARD', ... }]
    { ...context, playerStates: currentState }
  );

  // Sequence paused at DISCARD effect
  return {
    newPlayerStates: sequenceResult.newPlayerStates, // Includes drawn card
    animationEvents: sequenceResult.animationEvents, // DRAW animation
    mandatoryAction: sequenceResult.mandatoryAction, // Discard selection
    shouldEndTurn: false, // Not yet
    sequenceState: sequenceResult.sequenceState // For resumption
  };
}

// 4. In EffectSequencer.js - executeSequence
async executeSequence(effects, context) {
  // Effect 1: DRAW
  const drawProcessor = EffectRouter.getProcessor('DRAW');
  const drawResult = drawProcessor.process(effects[0], context);
  // Success, card added to hand, DRAW animation emitted

  currentState = drawResult.newPlayerStates;
  allAnimations.push(...drawResult.animationEvents);

  // Effect 2: DISCARD
  const discardProcessor = EffectRouter.getProcessor('DISCARD');
  const discardResult = discardProcessor.process(effects[1], {
    ...context,
    playerStates: currentState
  });

  // Returns requiresPlayerSelection: true (for human player)
  return {
    newPlayerStates: currentState,
    animationEvents: allAnimations,
    mandatoryAction: discardResult.mandatoryAction,
    paused: true,
    sequenceState: {
      effects: effects,
      currentIndex: 1, // Paused at index 1
      context: context
    }
  };
}

// 5. In DiscardEffectProcessor.js - process (NEW)
process(effect, context) {
  const { playerId, playerStates, gameMode, localPlayerId } = context;
  const discardCount = effect.value;

  // Check if AI player
  const isAI = gameMode === 'local' && playerId === 'player2';

  if (isAI) {
    // AI auto-selects worst cards
    const worstCards = this.selectWorstCards(playerStates[playerId].hand, discardCount);

    const newStates = JSON.parse(JSON.stringify(playerStates));
    newStates[playerId].hand = newStates[playerId].hand.filter(
      c => !worstCards.includes(c)
    );
    newStates[playerId].discardPile.push(...worstCards);

    return {
      success: true,
      newPlayerStates: newStates,
      animationEvents: worstCards.map(c => ({
        type: 'DISCARD_CARD',
        cardId: c.instanceId
      }))
    };
  } else {
    // Human player needs selection
    return {
      success: false, // Not failed, just paused
      requiresPlayerSelection: true,
      mandatoryAction: {
        type: 'discard',
        player: playerId,
        count: discardCount,
        fromAbility: true
      }
    };
  }
}

// 6. In App.jsx - handleConfirmMandatoryDiscard
const handleConfirmMandatoryDiscard = async () => {
  const { selectedCards } = discardState;

  // Resume sequence with discard result
  const result = await processActionWithGuestRouting('resumeAction', {
    sequenceState: currentSequenceState,
    selectionResult: {
      type: 'discard',
      cards: selectedCards
    },
    playerId: currentPlayerId
  });

  // Sequence completed, turn ends
  if (result.shouldEndTurn) {
    // GameFlowManager handles turn transition
  }

  setMandatoryAction(null);
};

// 7. In EffectSequencer.js - resumeSequence (NEW)
async resumeSequence(sequenceState, selectionResult, context) {
  const { effects, currentIndex } = sequenceState;
  const effect = effects[currentIndex]; // DISCARD effect

  // Apply selection result
  const newStates = JSON.parse(JSON.stringify(context.playerStates));
  const playerId = context.playerId;

  // Remove selected cards from hand
  newStates[playerId].hand = newStates[playerId].hand.filter(
    c => !selectionResult.cards.includes(c)
  );
  newStates[playerId].discardPile.push(...selectionResult.cards);

  // Create animations
  const animations = selectionResult.cards.map(c => ({
    type: 'DISCARD_CARD',
    cardId: c.instanceId
  }));

  // No more effects to execute (DISCARD was last)
  return {
    newPlayerStates: newStates,
    animationEvents: animations,
    paused: false
  };
}
```

### Example 3: Shield Reallocation (Special Targeting)

**User Flow**:
1. Player clicks "Reallocate Shields" on Power Cell section
2. UI enters removal mode
3. Player removes 2 shields from different sections
4. Player clicks "Continue"
5. UI enters addition mode
6. Player adds 2 shields to different sections
7. Player clicks "Confirm"
8. Confirmation modal appears
9. Player confirms
10. Energy deducted, turn ends

**Code Flow**:
```javascript
// 1. In App.jsx - handleShipAbilityClick
const handleShipAbilityClick = (ability, sectionName) => {
  if (ability.targeting.customFlow === 'shieldReallocation') {
    // Enter custom reallocation mode
    setShieldReallocationMode({
      phase: 'remove',
      removedShields: [],
      originalShipSections: JSON.parse(JSON.stringify(currentPlayer.shipSections)),
      ability: ability,
      sectionName: sectionName
    });
  }
};

// 2. In App.jsx - handleRemoveShield
const handleRemoveShield = async (sectionName) => {
  // Validate removal
  const validation = ShieldManager.validateShieldRemoval(
    currentPlayer,
    sectionName,
    placedSections
  );

  if (!validation.valid) {
    showError(validation.error);
    return;
  }

  // Apply removal to local state
  setShieldReallocationMode(prev => ({
    ...prev,
    removedShields: [...prev.removedShields, sectionName]
  }));

  // Update ship sections locally (optimistic update)
  currentPlayer.shipSections[sectionName].allocatedShields -= 1;
};

// 3. In App.jsx - handleContinueReallocation
const handleContinueReallocation = () => {
  setShieldReallocationMode(prev => ({
    ...prev,
    phase: 'add'
  }));
};

// 4. In App.jsx - handleAddShield
const handleAddShield = async (sectionName) => {
  // Validate addition
  const validation = ShieldManager.validateShieldAddition(
    currentPlayer,
    sectionName,
    placedSections
  );

  if (!validation.valid) {
    showError(validation.error);
    return;
  }

  // Apply addition to local state
  currentPlayer.shipSections[sectionName].allocatedShields += 1;

  // Remove from removedShields array
  setShieldReallocationMode(prev => ({
    ...prev,
    removedShields: prev.removedShields.slice(1)
  }));
};

// 5. In App.jsx - handleConfirmReallocation
const handleConfirmReallocation = () => {
  const { ability } = shieldReallocationMode;

  // All shields have been reallocated, show confirmation modal
  setConfirmationModal({
    action: ability,
    target: null, // No target needed, changes already applied
    customData: {
      newShipSections: currentPlayer.shipSections
    }
  });

  setShieldReallocationMode(null);
};

// 6. In ConfirmationModal.jsx - handleConfirm
const handleConfirm = async () => {
  const { action, customData } = confirmationModal;

  // Execute action (just pays energy cost, no effects)
  const result = await processActionWithGuestRouting('playAction', {
    action: action,
    target: null,
    playerId: currentPlayerId,
    customData: customData // Pass new ship sections
  });

  // Turn ends
  setConfirmationModal(null);
};

// 7. In ActionOrchestrator.js - executeAction
async executeAction(action, context) {
  // Special handling for shield reallocation
  if (action.targeting.customFlow === 'shieldReallocation') {
    // Phase 3: Pay Costs
    const costResult = this.payCosts(action.cost, context.playerStates, context.playerId);
    if (!costResult.success) {
      return { success: false, error: costResult.error };
    }

    // Ship sections already updated during targeting phase
    // Just validate and return
    return {
      newPlayerStates: costResult.newPlayerStates, // Energy deducted
      animationEvents: [], // No animations for shield reallocation
      shouldEndTurn: !action.goAgain // true for ship abilities
    };
  }

  // ... normal action flow ...
}
```

---

## ActionProcessor Role Post-Refactor

### Current Role (3,818 lines)

ActionProcessor currently handles **everything**:
- Action routing and execution
- Effect processing
- Cost payment
- Turn ending logic
- Multiplayer queue serialization
- Network synchronization
- Animation batching
- Commitment system
- Pass/AI coordination
- State broadcasting
- Guest message queue

**Problems**:
- Massive file (hard to maintain)
- Mixed responsibilities (action logic + networking)
- Duplication with CardPlayManager and AbilityResolver
- Can't unit test action logic without mocking entire multiplayer system

### Post-Refactor Role (~800 lines)

ActionProcessor becomes **"Multiplayer Coordinator & Queue Manager"**:

**Keep** (Multiplayer-Specific):
- Queue serialization: Ensure actions execute in order
- Network synchronization: Broadcast actions to guest
- Animation batching: Collect animations by phase
- Commitment system: Handle simultaneous phase completion
- Pass/AI coordination: Trigger AI after human pass
- State broadcasting: Sync state with guest
- Guest message queue: Process queued actions from guest

**Delegate** (Action Execution):
- Action execution → ActionOrchestrator
- Effect processing → EffectSequencer
- Targeting validation → TargetingRouter
- Cost payment → ActionOrchestrator
- Turn ending → GameFlowManager (via ActionOrchestrator)

### Refactored ActionProcessor Structure

```javascript
// ActionProcessor.js (post-refactor: ~800 lines)

class ActionProcessor {
  constructor(gameStateManager, gameFlowManager, phaseAnimationQueue, gameMode) {
    this.gameStateManager = gameStateManager;
    this.gameFlowManager = gameFlowManager;
    this.phaseAnimationQueue = phaseAnimationQueue;
    this.gameMode = gameMode;

    // NEW: Delegate to ActionOrchestrator
    this.actionOrchestrator = new ActionOrchestrator(gameStateManager);

    // Multiplayer components (UNCHANGED)
    this.actionQueue = [];
    this.isProcessing = false;
    this.guestMessageQueue = new GuestMessageQueueService();
  }

  // ============================================================
  // MULTIPLAYER COORDINATION (KEEP)
  // ============================================================

  async processAction(actionType, payload) {
    // Queue serialization
    this.actionQueue.push({ actionType, payload, timestamp: Date.now() });

    if (this.isProcessing) {
      return; // Wait for current action to complete
    }

    this.isProcessing = true;

    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift();

      // Execute action
      const result = await this.executeAction(action.actionType, action.payload);

      // Broadcast to guest (if host)
      if (this.gameMode === 'host' && this.shouldBroadcast(action.actionType)) {
        this.broadcastToGuest(action);
      }

      // Batch animations
      if (result.animationEvents && result.animationEvents.length > 0) {
        this.phaseAnimationQueue.queueAnimations(
          result.animationEvents,
          this.gameStateManager.getState().turnPhase
        );
      }
    }

    this.isProcessing = false;
  }

  async executeAction(actionType, payload) {
    // Route to appropriate handler
    switch (actionType) {
      case 'playCard':
      case 'useDroneAbility':
      case 'useShipAbility':
        return this.executePlayerAction(actionType, payload);

      case 'resumeAction':
        return this.resumePlayerAction(payload);

      case 'commitShields':
        return this.handleCommitment(payload);

      // ... other multiplayer-specific actions ...

      default:
        console.warn('Unknown action type:', actionType);
        return { success: false };
    }
  }

  async executePlayerAction(actionType, payload) {
    const { action, target, playerId } = payload;

    // Delegate to ActionOrchestrator
    const result = await this.actionOrchestrator.executeAction(action, {
      target: target,
      playerId: playerId,
      playerStates: this.getPlayerStates(),
      placedSections: this.getPlacedSections(),
      gameMode: this.gameMode,
      localPlayerId: this.localPlayerId
    });

    // Update state
    if (result.newPlayerStates) {
      this.gameStateManager.updatePlayerState('player1', result.newPlayerStates.player1);
      this.gameStateManager.updatePlayerState('player2', result.newPlayerStates.player2);
    }

    // Handle turn ending
    if (result.shouldEndTurn) {
      await this.gameFlowManager.endTurn();
    }

    return result;
  }

  async resumePlayerAction(payload) {
    const { sequenceState, selectionResult, playerId } = payload;

    // Delegate to ActionOrchestrator for resumption
    const result = await this.actionOrchestrator.resumeAction(sequenceState, selectionResult, {
      playerId: playerId,
      playerStates: this.getPlayerStates(),
      gameMode: this.gameMode,
      localPlayerId: this.localPlayerId
    });

    // Update state and handle turn ending
    // ... same as executePlayerAction ...

    return result;
  }

  // ============================================================
  // COMMITMENT SYSTEM (KEEP - Multiplayer-specific)
  // ============================================================

  async handleCommitment(payload) {
    // Shield allocation, deployment commitments
    // Both players must commit before proceeding
    // ... existing logic unchanged ...
  }

  // ============================================================
  // NETWORK SYNCHRONIZATION (KEEP)
  // ============================================================

  broadcastToGuest(action) {
    // Send action to guest via network
    // ... existing logic unchanged ...
  }

  handleGuestAction(action) {
    // Receive action from guest, add to queue
    this.guestMessageQueue.enqueue(action);
  }

  // ============================================================
  // AI COORDINATION (KEEP)
  // ============================================================

  async triggerAITurn() {
    // Existing AI turn logic
    // ... unchanged ...
  }

  // ============================================================
  // HELPERS (KEEP)
  // ============================================================

  getPlayerStates() {
    return {
      player1: this.gameStateManager.getPlayerState('player1'),
      player2: this.gameStateManager.getPlayerState('player2')
    };
  }

  shouldBroadcast(actionType) {
    // Determine if action should be sent to guest
    return this.playerActionTypes.includes(actionType);
  }
}
```

**Size Reduction**:
- Before: 3,818 lines (action routing + effects + networking)
- After: ~800 lines (networking + coordination only)
- Reduction: ~79% smaller

**Benefits**:
1. **Focused Responsibility**: Only handles multiplayer coordination
2. **Easier Testing**: Action logic testable independently
3. **Better Maintainability**: Smaller, more focused file
4. **Clearer Architecture**: Separation of concerns
5. **Reusable Action System**: ActionOrchestrator can be used in other contexts

---

## Summary

This modular action system achieves:

1. **Full Unification**: All actions (cards, drone abilities, ship abilities) use identical flow
2. **Data-Driven**: Actions defined in data files, not code
3. **Composable Effects**: 21 atomic effects can be sequenced in any order
4. **Animation Preservation**: Zero changes to animation system
5. **Multiplayer Integrity**: ActionProcessor focused on coordination
6. **Pausable Sequences**: Player selection handled gracefully
7. **Testable Architecture**: Each component independently testable

**Migration Path**: See `Design/MODULAR_ACTION_ROADMAP.md` for detailed implementation plan.
