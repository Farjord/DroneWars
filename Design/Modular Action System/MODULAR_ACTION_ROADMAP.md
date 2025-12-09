# Modular Action System - Implementation Roadmap

## Executive Summary

This roadmap details the implementation plan for migrating to a fully modular action system. The migration follows an **effect-first approach** over **5 phases spanning 8 weeks**.

**Strategy**: Big bang refactor, no backward compatibility
**Approach**: Build foundation → Add processors → Unify flow → Migrate data → Test & polish
**Timeline**: 8 weeks (40 development days)
**Risk Level**: Medium-High (large architectural change)

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Effect Sequencing Foundation](#phase-1-effect-sequencing-foundation)
3. [Phase 2: Missing Effect Processors](#phase-2-missing-effect-processors)
4. [Phase 3: Unified Action Flow](#phase-3-unified-action-flow)
5. [Phase 4: Data Migration](#phase-4-data-migration)
6. [Phase 5: UI & Testing](#phase-5-ui--testing)
7. [File-by-File Checklist](#file-by-file-checklist)
8. [Testing Strategy](#testing-strategy)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Criteria](#success-criteria)

---

## Overview

### Migration Approach: Effect-First

We build the foundational effect sequencing system **first**, then migrate actions to use it progressively. This allows testing at each step without breaking existing functionality.

```
Week 1-2: Foundation
  ↓
Week 3-4: Processors & Unification
  ↓
Week 5-6: Data Migration
  ↓
Week 7-8: Testing & Polish
```

### Phase Summary

| Phase | Duration | Focus | Deliverables |
|-------|----------|-------|--------------|
| **Phase 1** | 1 week | Effect Sequencing Foundation | EffectSequencer, sequence support in EffectRouter |
| **Phase 2** | 1 week | Missing Effect Processors | DISCARD, RECALL_DRONE processors, AI auto-selection |
| **Phase 3** | 2 weeks | Unified Action Flow | ActionOrchestrator, refactor ActionProcessor |
| **Phase 4** | 2 weeks | Data Migration | Convert all cards, abilities to new format |
| **Phase 5** | 2 weeks | UI & Testing | Update modals, integration tests, regression tests |

### Dependencies Between Phases

```
Phase 1 (EffectSequencer)
    ↓ Required by
Phase 2 (Effect Processors) + Phase 3 (ActionOrchestrator)
    ↓ Required by
Phase 4 (Data Migration)
    ↓ Required by
Phase 5 (UI & Testing)
```

**Critical Path**: Phases must be completed sequentially. No parallel phase work possible.

---

## Phase 1: Effect Sequencing Foundation

**Duration**: 1 week (5 days)
**Goal**: Create core sequencing infrastructure without breaking existing system
**Risk Level**: Low (isolated changes)

### Tasks

#### Day 1-2: Create EffectSequencer Class

**File**: `src/logic/effects/EffectSequencer.js` (NEW)

**Requirements**:
- Accept array of effects
- Execute effects sequentially
- Collect animationEvents from all effects
- Pause when effect requires player selection
- Resume from paused state
- Handle effect failures (skip and continue)
- Maintain state propagation between effects

**Interface**:
```javascript
class EffectSequencer {
  constructor() {
    this.effectRouter = EffectRouter.getInstance();
  }

  /**
   * Execute effects sequentially
   * @returns { newPlayerStates, animationEvents, paused, mandatoryAction?, sequenceState? }
   */
  async executeSequence(effects, context) {
    // Implementation
  }

  /**
   * Resume paused sequence after player selection
   * @returns { newPlayerStates, animationEvents, paused }
   */
  async resumeSequence(sequenceState, selectionResult, context) {
    // Implementation
  }

  /**
   * Resolve target based on target type
   * @returns resolved target object
   */
  resolveTarget(targetType, context) {
    // 'PRIMARY' → context.primaryTarget
    // 'SELF' → context.playerId
    // 'OPPONENT' → opposite of context.playerId
    // 'ALL_FRIENDLY' → all friendly drones
    // etc.
  }
}

export default EffectSequencer;
```

**Implementation Notes**:
- Use `for...of` loop for sequential execution (NOT Promise.all)
- Deep clone state between effects to prevent mutations
- Store resumption state including: effects array, current index, partial state
- Route effects via EffectRouter.getProcessor()

**Testing**:
- Unit test: Simple 2-effect sequence [DAMAGE, DRAW]
- Unit test: Pausing sequence [DRAW, DISCARD] for human player
- Unit test: AI execution without pause [DRAW, DISCARD] for AI player
- Unit test: Failed effect in middle of sequence
- Unit test: Animation collection from multiple effects

#### Day 3: Add Sequence Support to EffectRouter

**File**: `src/logic/EffectRouter.js` (MODIFY)

**Changes**:
1. Add method to check if processor exists
2. Add error handling for missing processors
3. Add logging for effect routing
4. Document all 18 existing effect types

**New Methods**:
```javascript
class EffectRouter {
  /**
   * Check if processor exists for effect type
   */
  hasProcessor(effectType) {
    return this.processors.has(effectType);
  }

  /**
   * Get processor with error handling
   */
  getProcessor(effectType) {
    if (!this.hasProcessor(effectType)) {
      throw new Error(`No processor found for effect type: ${effectType}`);
    }
    return this.processors.get(effectType);
  }

  /**
   * Get all registered effect types
   */
  getRegisteredTypes() {
    return Array.from(this.processors.keys());
  }
}
```

**Testing**:
- Unit test: hasProcessor() returns true for existing types
- Unit test: getProcessor() throws error for invalid type
- Integration test: EffectSequencer can route all 18 existing effects

#### Day 4-5: Target Resolution System

**File**: `src/logic/effects/EffectSequencer.js` (UPDATE)

**Requirements**:
- Resolve 'PRIMARY' to selected target from Phase 1
- Resolve 'SELF' to acting player
- Resolve 'OPPONENT' to other player
- Resolve 'ALL_FRIENDLY' to all friendly drones
- Resolve 'ALL_ENEMY' to all enemy drones
- Resolve 'ADJACENT_TO_PRIMARY' to adjacent drones
- Handle invalid target types

**Implementation**:
```javascript
resolveTarget(targetType, context) {
  const { primaryTarget, playerId, playerStates } = context;

  switch (targetType) {
    case 'PRIMARY':
      return primaryTarget; // From Phase 1 targeting

    case 'SELF':
      return { type: 'PLAYER', playerId: playerId };

    case 'OPPONENT':
      const opponentId = playerId === 'player1' ? 'player2' : 'player1';
      return { type: 'PLAYER', playerId: opponentId };

    case 'ALL_FRIENDLY':
      return this.resolveAllFriendlyDrones(playerId, playerStates);

    case 'ALL_ENEMY':
      const enemyId = playerId === 'player1' ? 'player2' : 'player1';
      return this.resolveAllEnemyDrones(enemyId, playerStates);

    case 'ADJACENT_TO_PRIMARY':
      return this.resolveAdjacentDrones(primaryTarget, context);

    default:
      throw new Error(`Unknown target type: ${targetType}`);
  }
}

resolveAllFriendlyDrones(playerId, playerStates) {
  const drones = [];
  const playerState = playerStates[playerId];

  for (const lane in playerState.dronesOnBoard) {
    drones.push(...playerState.dronesOnBoard[lane]);
  }

  return { type: 'MULTIPLE_DRONES', drones: drones };
}

resolveAdjacentDrones(primaryTarget, context) {
  // Find drones in adjacent lanes to primary target
  // Return array of drones
}
```

**Testing**:
- Unit test: Resolve PRIMARY target
- Unit test: Resolve SELF to player
- Unit test: Resolve ALL_FRIENDLY to all drones
- Unit test: Resolve ADJACENT_TO_PRIMARY
- Unit test: Error on invalid target type

### Phase 1 Deliverables

- [ ] `src/logic/effects/EffectSequencer.js` created and tested
- [ ] `src/logic/EffectRouter.js` updated with error handling
- [ ] Target resolution system implemented
- [ ] Unit tests passing (15+ tests)
- [ ] Integration test: EffectSequencer + EffectRouter working together

### Phase 1 Success Criteria

✅ EffectSequencer can execute simple effect sequences
✅ Pausing and resuming works for player selection effects
✅ Target resolution works for all target types
✅ Animation collection works correctly
✅ No changes to existing action system (isolated development)

---

## Phase 2: Missing Effect Processors

**Duration**: 1 week (5 days)
**Goal**: Implement missing effect processors required for data migration
**Risk Level**: Low (following existing patterns)

### Tasks

#### Day 1-3: DISCARD Effect Processor

**File**: `src/logic/effects/cards/DiscardEffectProcessor.js` (NEW)

**Requirements**:
- Human player: Return mandatoryAction for card selection
- AI player: Auto-select worst cards based on energy cost
- Validate hand size (can't discard more than in hand)
- Remove cards from hand, add to discard pile
- Emit DISCARD_CARD animation for each card

**Interface**:
```javascript
class DiscardEffectProcessor {
  /**
   * Process discard effect
   *
   * For human players:
   *   - Returns { requiresPlayerSelection: true, mandatoryAction: {...} }
   *
   * For AI players:
   *   - Auto-selects worst cards
   *   - Returns { success: true, newPlayerStates, animationEvents }
   *
   * @param {Object} effect - { type: 'DISCARD', target: 'SELF', value: 1 }
   * @param {Object} context - Execution context
   * @returns {Object} Result with player selection or completed discard
   */
  process(effect, context) {
    const { playerId, playerStates, gameMode, localPlayerId } = context;
    const discardCount = effect.value;

    // Validate hand size
    const playerState = playerStates[playerId];
    if (playerState.hand.length < discardCount) {
      debugLog('EFFECT', `Cannot discard ${discardCount} cards, only ${playerState.hand.length} in hand`);
      return {
        success: false,
        error: `Insufficient cards in hand (need ${discardCount}, have ${playerState.hand.length})`
      };
    }

    // Check if AI player
    const isAI = gameMode === 'local' && playerId === 'player2';

    if (isAI) {
      return this.processAIDiscard(discardCount, playerStates, playerId);
    } else {
      return this.processHumanDiscard(discardCount, playerId, effect);
    }
  }

  processAIDiscard(discardCount, playerStates, playerId) {
    const worstCards = this.selectWorstCards(
      playerStates[playerId].hand,
      discardCount
    );

    const newStates = JSON.parse(JSON.stringify(playerStates));
    newStates[playerId].hand = newStates[playerId].hand.filter(
      c => !worstCards.find(wc => wc.instanceId === c.instanceId)
    );
    newStates[playerId].discardPile.push(...worstCards);

    return {
      success: true,
      newPlayerStates: newStates,
      animationEvents: worstCards.map(c => ({
        type: 'DISCARD_CARD',
        cardId: c.instanceId,
        playerId: playerId
      }))
    };
  }

  processHumanDiscard(discardCount, playerId, effect) {
    return {
      success: false, // Not failed, just paused
      requiresPlayerSelection: true,
      mandatoryAction: {
        type: 'discard',
        player: playerId,
        count: discardCount,
        fromEffect: true,
        effect: effect
      }
    };
  }

  selectWorstCards(hand, count) {
    // Sort by energy cost (ascending), then by name
    const sorted = [...hand].sort((a, b) => {
      if (a.cost.energy !== b.cost.energy) {
        return a.cost.energy - b.cost.energy;
      }
      return a.name.localeCompare(b.name);
    });

    return sorted.slice(0, count);
  }
}

export default new DiscardEffectProcessor();
```

**Testing**:
- Unit test: Human player gets mandatoryAction
- Unit test: AI player auto-discards worst card
- Unit test: AI selection logic (lowest energy first)
- Unit test: Validation of hand size
- Unit test: Animation events emitted
- Integration test: DISCARD in effect sequence

#### Day 4-5: RECALL_DRONE Effect Processor

**File**: `src/logic/effects/drones/RecallDroneEffectProcessor.js` (NEW)

**Requirements**:
- Remove drone from board (any lane)
- Add drone back to hand
- Trigger onRecalled effects (card draw, energy gain)
- Emit TELEPORT_OUT animation
- Validate drone exists on board

**Interface**:
```javascript
class RecallDroneEffectProcessor {
  /**
   * Process recall drone effect
   *
   * @param {Object} effect - { type: 'RECALL_DRONE', target: 'PRIMARY' }
   * @param {Object} context - Execution context with target drone
   * @returns {Object} Result with updated state and animation
   */
  process(effect, context) {
    const { target, playerStates, playerId } = context;

    // Validate target is a drone
    if (!target || !target.id) {
      return {
        success: false,
        error: 'RECALL_DRONE requires valid drone target'
      };
    }

    const newStates = JSON.parse(JSON.stringify(playerStates));
    const playerState = newStates[playerId];

    // Find and remove drone from board
    let droneFound = false;
    let droneToRecall = null;
    let fromLane = null;

    for (const lane in playerState.dronesOnBoard) {
      const droneIndex = playerState.dronesOnBoard[lane].findIndex(
        d => d.id === target.id
      );

      if (droneIndex !== -1) {
        droneToRecall = playerState.dronesOnBoard[lane][droneIndex];
        playerState.dronesOnBoard[lane].splice(droneIndex, 1);
        droneFound = true;
        fromLane = lane;
        break;
      }
    }

    if (!droneFound) {
      return {
        success: false,
        error: `Drone ${target.id} not found on board`
      };
    }

    // Add back to hand
    playerState.hand.push(droneToRecall);

    // Trigger onRecalled effects
    const recallEffects = this.triggerOnRecalled(playerState, droneToRecall);

    // Merge recall effects
    Object.assign(playerState, recallEffects);

    debugLog('EFFECT', `Recalled ${droneToRecall.name} from ${fromLane} to hand`);

    return {
      success: true,
      newPlayerStates: newStates,
      animationEvents: [
        {
          type: 'TELEPORT_OUT',
          targetId: droneToRecall.id,
          laneId: fromLane
        }
      ]
    };
  }

  triggerOnRecalled(playerState, drone) {
    const effects = {};

    // Check drone traits
    if (drone.traits?.includes('onRecalled_draw1')) {
      // Draw card logic (simplified - would use DrawEffectProcessor)
      effects.drewCard = true;
    }

    if (drone.traits?.includes('onRecalled_energy1')) {
      playerState.energy += 1;
      effects.gainedEnergy = true;
    }

    return effects;
  }
}

export default new RecallDroneEffectProcessor();
```

**Note**: Extract from RecallAbilityProcessor.js (currently ~120 lines, most is this logic)

**Testing**:
- Unit test: Recall drone from lane to hand
- Unit test: Drone not found error
- Unit test: onRecalled effects triggered
- Unit test: TELEPORT_OUT animation emitted
- Integration test: RECALL_DRONE in effect sequence

#### Day 5: Register New Processors

**File**: `src/logic/EffectRouter.js` (MODIFY)

**Changes**:
```javascript
// Add imports
import DiscardEffectProcessor from './effects/cards/DiscardEffectProcessor.js';
import RecallDroneEffectProcessor from './effects/drones/RecallDroneEffectProcessor.js';

// In constructor
this.processors.set('DISCARD', DiscardEffectProcessor);
this.processors.set('RECALL_DRONE', RecallDroneEffectProcessor);
```

**Testing**:
- Integration test: EffectRouter routes DISCARD correctly
- Integration test: EffectRouter routes RECALL_DRONE correctly

### Phase 2 Deliverables

- [ ] `src/logic/effects/cards/DiscardEffectProcessor.js` created and tested
- [ ] `src/logic/effects/drones/RecallDroneEffectProcessor.js` created and tested
- [ ] EffectRouter updated to register new processors
- [ ] Unit tests passing (10+ tests)
- [ ] Integration tests passing (4+ tests)

### Phase 2 Success Criteria

✅ DISCARD effect works for human and AI players
✅ RECALL_DRONE effect works with animations
✅ Both processors registered in EffectRouter
✅ Effect sequences can include new processors
✅ All tests passing

---

## Phase 3: Unified Action Flow

**Duration**: 2 weeks (10 days)
**Goal**: Create ActionOrchestrator and refactor ActionProcessor
**Risk Level**: Medium-High (core system changes)

### Tasks

#### Day 1-3: Create ActionOrchestrator

**File**: `src/logic/actions/ActionOrchestrator.js` (NEW)

**Requirements**:
- Single entry point for all action execution
- Handle 5-phase flow: Targeting → Confirmation → Costs → Effects → Turn End
- Delegate to EffectSequencer for effect execution
- Return shouldEndTurn based on action.goAgain
- Handle pausing and resumption

**Interface**:
```javascript
class ActionOrchestrator {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
    this.effectSequencer = new EffectSequencer();
  }

  /**
   * Execute any action (card, drone ability, ship ability)
   *
   * @param {Object} action - Action definition from data files
   * @param {Object} context - Execution context
   * @returns {Object} { newPlayerStates, shouldEndTurn, animationEvents, mandatoryAction? }
   */
  async executeAction(action, context) {
    debugLog('ACTION', `Executing action: ${action.name}`);

    // Phase 1 & 2: Targeting and Confirmation already done by UI

    // Phase 3: Pay Costs
    const costResult = this.payCosts(action.cost, context.playerStates, context.playerId);

    if (!costResult.success) {
      return {
        success: false,
        error: costResult.error,
        newPlayerStates: context.playerStates // No changes
      };
    }

    let currentState = costResult.newPlayerStates;

    // Phase 4: Execute Effect Sequence
    const sequenceResult = await this.effectSequencer.executeSequence(
      action.effects,
      {
        ...context,
        playerStates: currentState,
        primaryTarget: context.target
      }
    );

    // If paused for player selection
    if (sequenceResult.paused) {
      return {
        newPlayerStates: sequenceResult.newPlayerStates,
        animationEvents: sequenceResult.animationEvents,
        mandatoryAction: sequenceResult.mandatoryAction,
        shouldEndTurn: false, // Don't end turn until resumed
        sequenceState: sequenceResult.sequenceState
      };
    }

    currentState = sequenceResult.newPlayerStates;

    // Phase 5: Determine Turn Ending
    const shouldEndTurn = !action.goAgain;

    debugLog('ACTION', `Action complete. Turn ending: ${shouldEndTurn}`);

    return {
      newPlayerStates: currentState,
      animationEvents: sequenceResult.animationEvents,
      shouldEndTurn: shouldEndTurn
    };
  }

  /**
   * Resume paused action after player selection
   */
  async resumeAction(sequenceState, selectionResult, context) {
    debugLog('ACTION', `Resuming action after player selection`);

    // Resume effect sequence
    const resumeResult = await this.effectSequencer.resumeSequence(
      sequenceState,
      selectionResult,
      context
    );

    // Determine if more pauses needed
    if (resumeResult.paused) {
      return {
        newPlayerStates: resumeResult.newPlayerStates,
        animationEvents: resumeResult.animationEvents,
        mandatoryAction: resumeResult.mandatoryAction,
        shouldEndTurn: false,
        sequenceState: resumeResult.sequenceState
      };
    }

    // All effects completed, determine turn ending
    const shouldEndTurn = !sequenceState.action.goAgain;

    return {
      newPlayerStates: resumeResult.newPlayerStates,
      animationEvents: resumeResult.animationEvents,
      shouldEndTurn: shouldEndTurn
    };
  }

  /**
   * Pay action costs (energy, shields, etc.)
   */
  payCosts(cost, playerStates, playerId) {
    if (!cost) {
      return { success: true, newPlayerStates: playerStates };
    }

    const newStates = JSON.parse(JSON.stringify(playerStates));
    const player = newStates[playerId];

    // Validate energy
    if (cost.energy && player.energy < cost.energy) {
      return {
        success: false,
        error: `Insufficient energy (need ${cost.energy}, have ${player.energy})`
      };
    }

    // Deduct energy
    if (cost.energy) {
      player.energy -= cost.energy;
      debugLog('ACTION', `Deducted ${cost.energy} energy (${player.energy + cost.energy} → ${player.energy})`);
    }

    // Handle other costs (shields, sacrifice, etc.)
    if (cost.shields) {
      // Shield deduction logic
    }

    if (cost.sacrifice) {
      // Sacrifice logic
    }

    return { success: true, newPlayerStates: newStates };
  }
}

export default ActionOrchestrator;
```

**Testing**:
- Unit test: Execute simple 1-effect action
- Unit test: Execute multi-effect action
- Unit test: Pay energy cost
- Unit test: Insufficient energy returns error
- Unit test: Action with goAgain doesn't end turn
- Unit test: Paused action returns mandatoryAction
- Unit test: Resume action after player selection
- Integration test: Full action flow end-to-end

#### Day 4-7: Refactor ActionProcessor

**File**: `src/managers/ActionProcessor.js` (MAJOR REFACTOR)

**Goal**: Reduce from 3,818 lines to ~800 lines by removing action execution logic

**Steps**:

1. **Add ActionOrchestrator**:
```javascript
import ActionOrchestrator from '../logic/actions/ActionOrchestrator.js';

constructor(gameStateManager, gameFlowManager, phaseAnimationQueue, gameMode) {
  // ... existing ...

  // NEW: Delegate action execution
  this.actionOrchestrator = new ActionOrchestrator(gameStateManager);
}
```

2. **Replace Card Play Logic**:
```javascript
// OLD: processPlayCard() - ~200 lines of card logic
async processPlayCard(payload) {
  const { cardInstanceId, target, playerId } = payload;

  // Get card from hand
  const playerState = this.gameStateManager.getPlayerState(playerId);
  const card = playerState.hand.find(c => c.instanceId === cardInstanceId);

  // Execute via ActionOrchestrator
  const result = await this.actionOrchestrator.executeAction(card, {
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

  // Queue animations
  if (result.animationEvents && result.animationEvents.length > 0) {
    this.phaseAnimationQueue.queueAnimations(
      result.animationEvents,
      this.gameStateManager.getState().turnPhase
    );
  }

  // Handle turn ending
  if (result.shouldEndTurn) {
    await this.gameFlowManager.endTurn();
  }

  return result;
}
```

3. **Replace Drone Ability Logic**:
```javascript
// OLD: processDroneAbility() - ~150 lines
async processDroneAbility(payload) {
  const { droneId, abilityName, target, playerId } = payload;

  // Get drone and ability
  const ability = this.findDroneAbility(droneId, abilityName, playerId);

  // Execute via ActionOrchestrator
  const result = await this.actionOrchestrator.executeAction(ability, {
    target: target,
    playerId: playerId,
    playerStates: this.getPlayerStates(),
    gameMode: this.gameMode,
    localPlayerId: this.localPlayerId
  });

  // ... same state update, animations, turn ending ...

  return result;
}
```

4. **Replace Ship Ability Logic**:
```javascript
// OLD: 6 separate methods for ship abilities - ~400 lines total
// NEW: Single method delegating to ActionOrchestrator

async processShipAbility(payload) {
  const { abilityName, sectionName, target, playerId } = payload;

  // Get ability definition
  const ability = this.findShipAbility(sectionName, abilityName);

  // Execute via ActionOrchestrator
  const result = await this.actionOrchestrator.executeAction(ability, {
    target: target,
    playerId: playerId,
    playerStates: this.getPlayerStates(),
    placedSections: this.getPlacedSections(),
    gameMode: this.gameMode,
    localPlayerId: this.localPlayerId
  });

  // ... same state update, animations, turn ending ...

  return result;
}
```

5. **Add Resume Action Method**:
```javascript
async processResumeAction(payload) {
  const { sequenceState, selectionResult, playerId } = payload;

  // Resume via ActionOrchestrator
  const result = await this.actionOrchestrator.resumeAction(
    sequenceState,
    selectionResult,
    {
      playerId: playerId,
      playerStates: this.getPlayerStates(),
      gameMode: this.gameMode,
      localPlayerId: this.localPlayerId
    }
  );

  // ... same state update, animations, turn ending ...

  return result;
}
```

6. **Remove Old Methods**:
- Remove: `processRecallAbility()` - delegated to ActionOrchestrator
- Remove: `processTargetLockAbility()` - delegated to ActionOrchestrator
- Remove: `processRecalculateAbility()` - delegated to ActionOrchestrator
- Remove: `processRecalculateComplete()` - replaced by resumeAction()
- Remove: `processReallocateShieldsAbility()` - delegated to ActionOrchestrator
- Remove: `processReallocateShieldsComplete()` - replaced by resumeAction()
- Remove: All effect-specific logic (moved to effect processors)

7. **Update Action Routing**:
```javascript
async executeAction(actionType, payload) {
  switch (actionType) {
    case 'playCard':
      return this.processPlayCard(payload);

    case 'useDroneAbility':
      return this.processDroneAbility(payload);

    case 'useShipAbility':
      return this.processShipAbility(payload);

    case 'resumeAction':
      return this.processResumeAction(payload);

    // Keep multiplayer-specific actions
    case 'commitShields':
      return this.handleCommitment(payload);

    case 'pass':
      return this.handlePass(payload);

    // ... other multiplayer actions ...

    default:
      console.warn('Unknown action type:', actionType);
      return { success: false };
  }
}
```

**Expected Line Reduction**:
- Card play logic: -200 lines
- Drone ability logic: -150 lines
- Ship ability logic: -400 lines
- Effect processors: -800 lines (moved to individual processors)
- Duplicate code: -500 lines
- **Total reduction**: ~2,050 lines (3,818 → ~1,768)
- Further cleanup: ~968 lines → **Target: ~800 lines**

**Testing**:
- Integration test: Play card via new flow
- Integration test: Use drone ability via new flow
- Integration test: Use ship ability via new flow
- Integration test: Resume action after discard
- Regression test: All existing actions still work

#### Day 8-10: Update Action Type Constants

**Files to Update**:
- `src/managers/ActionProcessor.js` - playerActionTypes array
- Action type constants across codebase

**Changes**:
```javascript
// OLD: Separate action types for each ship ability
playerActionTypes = [
  'playCard',
  'useDroneAbility',
  'recallAbility',
  'targetLockAbility',
  'recalculateAbility',
  'recalculateComplete',
  'reallocateShieldsAbility',
  'reallocateShieldsComplete'
];

// NEW: Unified action types
playerActionTypes = [
  'playCard',
  'useDroneAbility',
  'useShipAbility',
  'resumeAction'
];
```

**Update Call Sites**:
1. App.jsx - Update all action routing
2. ShipAbilityConfirmationModal.jsx - Use 'useShipAbility' instead of specific types
3. GameFlowManager.js - Update phase filters

**Testing**:
- Integration test: All action types route correctly
- Regression test: Multiplayer sync still works

### Phase 3 Deliverables

- [ ] `src/logic/actions/ActionOrchestrator.js` created and tested
- [ ] `src/managers/ActionProcessor.js` refactored to ~800 lines
- [ ] Action type constants unified
- [ ] All action routing updated
- [ ] Unit tests passing (15+ tests)
- [ ] Integration tests passing (10+ tests)
- [ ] Regression tests passing

### Phase 3 Success Criteria

✅ ActionOrchestrator executes all action types
✅ ActionProcessor reduced to ~800 lines
✅ All existing actions work through new flow
✅ Multiplayer sync still functional
✅ Animation system unchanged
✅ All tests passing

---

## Phase 4: Data Migration

**Duration**: 2 weeks (10 days)
**Goal**: Convert all action data to new format
**Risk Level**: Medium (large data changes, requires careful testing)

### Task Breakdown

#### Day 1-2: Migrate Action Cards

**File**: `src/data/actionCardData.js` (MAJOR REFACTOR)

**Scope**: ~30 action cards

**Process**:
1. For each card, identify targeting type
2. Extract effect function logic into effect array
3. Set goAgain property
4. Remove effect function
5. Test card individually

**Example Migration** (see MODULAR_ACTION_SYSTEM.md for more examples):
```javascript
// OLD
{
  id: 1,
  name: "Missile Strike",
  type: "action",
  cost: { energy: 2 },
  description: "Deal 3 damage to target enemy drone",
  effect: (playerStates, droneToTarget, playerId) => {
    // ... 50 lines of logic ...
  },
  goAgain: false
}

// NEW
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
  description: "Deal 3 damage to target enemy drone"
}
```

**Cards by Complexity**:
- Simple (10 cards): 1 effect, direct damage/heal/draw
- Medium (15 cards): 2-3 effects, conditions
- Complex (5 cards): Multi-target, conditional effects

**Testing per Card**:
1. Unit test: Card data validates
2. Integration test: Play card through ActionOrchestrator
3. Visual test: Animations work correctly
4. Multiplayer test: Card syncs to guest

**Estimated Time**: 15 cards per day

#### Day 3-4: Migrate Ordnance Cards

**File**: `src/data/ordnanceData.js` (MAJOR REFACTOR)

**Scope**: ~15 ordnance cards

**Process**: Same as action cards

**Note**: Ordnance may have different cost structure (uses during combat phase)

**Testing**: Same as action cards

**Estimated Time**: 8 cards per day

#### Day 5-6: Migrate Drone Abilities

**File**: `src/data/droneData.js` (MODIFY)

**Scope**: ~20 drones with abilities (~40 abilities total)

**Process**:
1. For each drone, convert abilities array
2. Each ability becomes full action definition
3. Test ability execution

**Example Migration**:
```javascript
// OLD
{
  id: "scout_drone",
  name: "Scout Drone",
  abilities: [
    {
      name: "Quick Scan",
      description: "Draw 1 card",
      energyCost: 1
      // Logic in AbilityResolver.js
    }
  ]
}

// NEW
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
      goAgain: true, // Drone abilities often allow follow-up
      description: "Draw 1 card"
    }
  ]
}
```

**Testing per Drone**:
1. Integration test: Use ability via ActionOrchestrator
2. Visual test: Ability UI displays correctly
3. Multiplayer test: Ability syncs to guest

**Estimated Time**: 10 drones per day

#### Day 7-8: Migrate Ship Abilities

**File**: `src/data/shipData.js` (MODIFY)

**Scope**: 4 ship abilities (Recall, Target Lock, Recalculate, Reallocate Shields)

**Process**:
1. Convert each ability to full action definition
2. Remove references to old processors
3. Test each ability flow

**Example Migration** (Recalculate):
```javascript
// OLD
{
  sectionName: "Bridge",
  abilities: [
    {
      name: "Recalculate",
      description: "Draw 1 card, then discard 1 card",
      energyCost: 1
      // Logic in RecalculateAbilityProcessor.js
    }
  ]
}

// NEW
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
        { type: 'DISCARD', target: 'SELF', value: 1 }
      ],
      goAgain: false,
      description: "Draw 1 card, then discard 1 card"
    }
  ]
}
```

**Special Handling**:
- Reallocate Shields: Keep custom targeting flow, but convert to action format

**Testing per Ability**:
1. Integration test: Full ability flow
2. Visual test: Modals display correctly
3. Multiplayer test: Ability syncs to guest
4. Regression test: Compare to old flow

**Estimated Time**: 2 abilities per day

#### Day 9: Remove Old Processors

**Files to Delete**:
- `src/logic/abilities/ship/RecallAbilityProcessor.js` (logic moved to RECALL_DRONE effect)
- `src/logic/abilities/ship/TargetLockAbilityProcessor.js` (logic moved to MARK_DRONE effect)
- `src/logic/abilities/ship/RecalculateAbilityProcessor.js` (logic moved to DRAW + DISCARD effects)
- `src/logic/abilities/ship/ReallocateShieldsAbilityProcessor.js` (keep for now - special case)

**Files to Update**:
- `src/managers/ActionProcessor.js` - Remove imports for deleted processors
- `src/logic/abilities/AbilityResolver.js` - May be able to delete entirely

**Testing**:
- Regression test: All ship abilities work without old processors
- Build test: No import errors

#### Day 10: Data Validation & Testing

**Tasks**:
1. Write data validation script
2. Validate all action data conforms to new schema
3. Run full test suite
4. Fix any data issues

**Validation Script**:
```javascript
// scripts/validateActionData.js
function validateAction(action) {
  const errors = [];

  // Check required fields
  if (!action.id) errors.push('Missing id');
  if (!action.name) errors.push('Missing name');
  if (!action.type) errors.push('Missing type');
  if (!action.targeting) errors.push('Missing targeting');
  if (!action.effects) errors.push('Missing effects');
  if (action.goAgain === undefined) errors.push('Missing goAgain');

  // Validate targeting
  const validTargetTypes = ['SINGLE_ENEMY_DRONE', 'SELF', ...];
  if (!validTargetTypes.includes(action.targeting.type)) {
    errors.push(`Invalid targeting type: ${action.targeting.type}`);
  }

  // Validate effects
  if (!Array.isArray(action.effects)) {
    errors.push('Effects must be an array');
  }

  for (const effect of action.effects) {
    if (!effect.type) errors.push('Effect missing type');
    if (!effect.target) errors.push('Effect missing target');
  }

  return errors;
}

// Run on all action data files
const allActions = [
  ...actionCardData,
  ...ordnanceData,
  ...droneData.flatMap(d => d.abilities),
  ...shipData.flatMap(s => s.abilities)
];

for (const action of allActions) {
  const errors = validateAction(action);
  if (errors.length > 0) {
    console.error(`❌ ${action.name}:`, errors);
  }
}
```

**Testing**:
- Run validation script: 0 errors
- Unit tests: All passing
- Integration tests: All passing
- Regression tests: All passing
- Multiplayer tests: All passing

### Phase 4 Deliverables

- [ ] `src/data/actionCardData.js` migrated (~30 cards)
- [ ] `src/data/ordnanceData.js` migrated (~15 cards)
- [ ] `src/data/droneData.js` migrated (~40 abilities)
- [ ] `src/data/shipData.js` migrated (4 abilities)
- [ ] Old ship ability processors deleted
- [ ] Data validation script created
- [ ] All tests passing

### Phase 4 Success Criteria

✅ All action data in new format
✅ Data validation script passes
✅ All cards playable through new system
✅ All abilities usable through new system
✅ No old processors remaining
✅ All tests passing

---

## Phase 5: UI & Testing

**Duration**: 2 weeks (10 days)
**Goal**: Update UI components and complete comprehensive testing
**Risk Level**: Low (polish and validation)

### Tasks

#### Day 1-3: Update Confirmation Modals

**Files to Update**:
- `src/components/modals/CardConfirmationModal.jsx`
- `src/components/modals/ShipAbilityConfirmationModal.jsx`
- `src/components/modals/DroneAbilityModal.jsx` (if exists)

**Changes**:
1. Use unified action data format
2. Display effects array in readable format
3. Update cost display
4. Update targeting display

**Example - CardConfirmationModal.jsx**:
```javascript
const CardConfirmationModal = ({ action, target, onConfirm, onCancel }) => {
  // Display effects
  const renderEffects = () => {
    return action.effects.map((effect, index) => (
      <div key={index} className="effect-item">
        {formatEffect(effect)}
      </div>
    ));
  };

  const formatEffect = (effect) => {
    switch (effect.type) {
      case 'DAMAGE':
        return `Deal ${effect.value} damage to ${effect.target}`;
      case 'HEAL':
        return `Heal ${effect.value} HP to ${effect.target}`;
      case 'DRAW':
        return `Draw ${effect.value} card${effect.value > 1 ? 's' : ''}`;
      case 'DISCARD':
        return `Discard ${effect.value} card${effect.value > 1 ? 's' : ''}`;
      // ... other effects ...
      default:
        return effect.type;
    }
  };

  return (
    <Modal>
      <CardArt card={action} />
      <h2>{action.name}</h2>
      <p>{action.description}</p>

      <div className="effects-section">
        <h3>Effects:</h3>
        {renderEffects()}
      </div>

      <div className="cost-section">
        <h3>Cost:</h3>
        {action.cost.energy && <span>Energy: {action.cost.energy}</span>}
        {action.cost.shields && <span>Shields: {action.cost.shields}</span>}
      </div>

      {target && (
        <div className="target-section">
          <h3>Target:</h3>
          <span>{target.name || target.id}</span>
        </div>
      )}

      <Button onClick={onConfirm}>Confirm</Button>
      <Button onClick={onCancel}>Cancel</Button>
    </Modal>
  );
};
```

**Testing**:
- Visual test: Modal displays correctly for each action type
- Interaction test: Confirm/cancel buttons work
- Edge cases: Very long effect lists, no costs, no targets

#### Day 4-5: Update Mandatory Action Modals

**Files to Update**:
- `src/components/modals/MandatoryDiscardModal.jsx`
- Any other mandatory action modals

**Changes**:
1. Handle mandatoryAction from EffectSequencer
2. Display effect context (e.g., "Discard 1 card from Recalculate ability")
3. Update resume action routing

**Example - MandatoryDiscardModal.jsx**:
```javascript
const MandatoryDiscardModal = ({ mandatoryAction, onComplete }) => {
  const [selectedCards, setSelectedCards] = useState([]);

  const handleConfirm = async () => {
    // Resume action via new flow
    await processActionWithGuestRouting('resumeAction', {
      sequenceState: mandatoryAction.sequenceState,
      selectionResult: {
        type: 'discard',
        cards: selectedCards
      },
      playerId: mandatoryAction.player
    });

    onComplete();
  };

  return (
    <Modal>
      <h2>Discard Required</h2>
      <p>
        Select {mandatoryAction.count} card{mandatoryAction.count > 1 ? 's' : ''} to discard
        {mandatoryAction.fromEffect && ` (from ${mandatoryAction.effect.type})`}
      </p>

      <CardSelector
        cards={hand}
        selectedCards={selectedCards}
        onSelect={setSelectedCards}
        maxSelection={mandatoryAction.count}
      />

      <Button
        onClick={handleConfirm}
        disabled={selectedCards.length !== mandatoryAction.count}
      >
        Confirm Discard
      </Button>
    </Modal>
  );
};
```

**Testing**:
- Visual test: Modal displays correctly
- Interaction test: Card selection works
- Integration test: Resume action works

#### Day 6-7: Integration Testing

**Test Categories**:

1. **Action Type Tests** (30 tests):
   - Play each action card through full flow
   - Use each drone ability through full flow
   - Use each ship ability through full flow

2. **Flow Tests** (10 tests):
   - Simple 1-effect action
   - Multi-effect action
   - Pausing action (discard)
   - Resuming action
   - Failed action (insufficient energy)
   - Multi-target action
   - Conditional effect action

3. **Multiplayer Tests** (10 tests):
   - Host plays card, guest receives
   - Guest plays card, host receives
   - Paused action syncs correctly
   - Animations sync correctly

4. **AI Tests** (5 tests):
   - AI plays card
   - AI uses drone ability
   - AI auto-discards correctly
   - AI handles conditional effects

**Test Script**:
```javascript
// tests/integration/actionOrchestrator.test.js

describe('ActionOrchestrator Integration', () => {
  test('Play simple damage card', async () => {
    const action = actionCardData.find(c => c.name === 'Missile Strike');
    const target = enemyDrone;

    const result = await actionOrchestrator.executeAction(action, {
      target: target,
      playerId: 'player1',
      playerStates: initialState,
      gameMode: 'local'
    });

    expect(result.success).toBe(true);
    expect(result.shouldEndTurn).toBe(true);
    expect(result.animationEvents).toHaveLength(1);
    expect(target.currentHp).toBe(target.maxHp - 3);
  });

  test('Play card with pause (draw + discard)', async () => {
    const action = actionCardData.find(c => c.name === 'Tactical Analysis');

    const result = await actionOrchestrator.executeAction(action, {
      playerId: 'player1',
      playerStates: initialState,
      gameMode: 'local'
    });

    expect(result.mandatoryAction).toBeDefined();
    expect(result.mandatoryAction.type).toBe('discard');
    expect(result.shouldEndTurn).toBe(false);

    // Resume
    const resumeResult = await actionOrchestrator.resumeAction(
      result.sequenceState,
      { type: 'discard', cards: [selectedCard] },
      { playerId: 'player1', playerStates: result.newPlayerStates }
    );

    expect(resumeResult.shouldEndTurn).toBe(true);
  });

  // ... 50+ more tests ...
});
```

#### Day 8-9: Regression Testing

**Areas to Test**:

1. **Animation System** (High Priority):
   - All animation types still play correctly
   - Animation sequencing unchanged
   - No animation regressions

2. **Multiplayer Sync**:
   - Actions sync to guest correctly
   - Guest actions received by host
   - State consistency maintained

3. **Game Flow**:
   - Turn progression works
   - Phase transitions work
   - End game conditions work

4. **Existing Features**:
   - Deployment phase
   - Combat phase
   - Shield allocation
   - Pass mechanism

**Regression Test Script**:
```javascript
// tests/regression/animations.test.js

describe('Animation Regression Tests', () => {
  test('Damage animation plays correctly', async () => {
    // Play damage card
    // Verify DAMAGE_FLASH animation emitted
    // Verify animation plays on canvas
  });

  test('Multiple animations sequence correctly', async () => {
    // Play card with multiple effects
    // Verify animations emitted in order
    // Verify animations play sequentially
  });

  // ... 20+ animation tests ...
});

// tests/regression/multiplayer.test.js

describe('Multiplayer Regression Tests', () => {
  test('Host action syncs to guest', async () => {
    // Host plays card
    // Verify guest receives action
    // Verify guest state matches host
  });

  // ... 15+ multiplayer tests ...
});
```

**Test Coverage Goal**: 90%+ for new code

#### Day 10: Performance Testing & Optimization

**Metrics to Measure**:
1. Action execution time
2. Effect sequencing overhead
3. Memory usage
4. Animation frame rate

**Optimization Targets**:
- Action execution: < 50ms (excluding animations)
- Effect sequencing: < 10ms per effect
- Memory: No leaks during extended play
- Frame rate: 60fps during animations

**Performance Tests**:
```javascript
// tests/performance/actionOrchestrator.perf.js

describe('ActionOrchestrator Performance', () => {
  test('Execute 100 actions in < 5 seconds', async () => {
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await actionOrchestrator.executeAction(simpleAction, context);
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });

  test('No memory leaks over 1000 actions', async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 1000; i++) {
      await actionOrchestrator.executeAction(simpleAction, context);
    }

    global.gc(); // Force garbage collection
    const finalMemory = process.memoryUsage().heapUsed;

    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
    expect(memoryIncrease).toBeLessThan(10); // < 10MB increase
  });
});
```

**Optimization Strategies**:
- Object pooling for frequent allocations
- Memoize effect processor lookups
- Optimize deep cloning (use structured clone if available)
- Batch state updates

### Phase 5 Deliverables

- [ ] Confirmation modals updated
- [ ] Mandatory action modals updated
- [ ] 55+ integration tests passing
- [ ] 35+ regression tests passing
- [ ] Performance tests passing
- [ ] Test coverage > 90%
- [ ] No animation regressions
- [ ] No multiplayer regressions

### Phase 5 Success Criteria

✅ All UI updated to new format
✅ All integration tests passing
✅ All regression tests passing
✅ Performance targets met
✅ Test coverage > 90%
✅ Zero regressions in animations or multiplayer
✅ Production-ready

---

## File-by-File Checklist

### New Files (3)

- [ ] `src/logic/effects/EffectSequencer.js` - Phase 1
- [ ] `src/logic/actions/ActionOrchestrator.js` - Phase 3
- [ ] `src/logic/effects/cards/DiscardEffectProcessor.js` - Phase 2
- [ ] `src/logic/effects/drones/RecallDroneEffectProcessor.js` - Phase 2

### Modified Files (23)

#### Core Logic (8 files)
- [ ] `src/logic/EffectRouter.js` - Phase 1, 2
- [ ] `src/managers/ActionProcessor.js` - Phase 3 (MAJOR: 3,818 → ~800 lines)
- [ ] `src/logic/abilities/AbilityResolver.js` - Phase 3 (possibly delete)
- [ ] `src/logic/cards/CardPlayManager.js` - Phase 3 (possibly delete)
- [ ] `src/logic/combat/AttackProcessor.js` - Phase 4 (minor updates)
- [ ] `src/managers/GameFlowManager.js` - Phase 3 (update phase filters)
- [ ] `src/managers/GameStateManager.js` - Phase 3 (minor updates)
- [ ] `src/managers/PhaseAnimationQueue.js` - None (UNCHANGED)

#### Data Files (4 files)
- [ ] `src/data/actionCardData.js` - Phase 4 (MAJOR: ~30 cards)
- [ ] `src/data/ordnanceData.js` - Phase 4 (MAJOR: ~15 cards)
- [ ] `src/data/droneData.js` - Phase 4 (MAJOR: ~40 abilities)
- [ ] `src/data/shipData.js` - Phase 4 (MAJOR: 4 abilities)

#### UI Components (6 files)
- [ ] `src/App.jsx` - Phase 3, 5 (update action routing)
- [ ] `src/components/modals/CardConfirmationModal.jsx` - Phase 5
- [ ] `src/components/modals/ShipAbilityConfirmationModal.jsx` - Phase 5
- [ ] `src/components/modals/MandatoryDiscardModal.jsx` - Phase 5
- [ ] `src/components/ui/GameFooter.jsx` - Phase 5 (minor updates)
- [ ] `src/components/ui/GameBattlefield.jsx` - Phase 5 (minor updates)

#### Animation (5 files)
- [ ] `src/hooks/useAnimationSetup.js` - None (UNCHANGED)
- [ ] `src/managers/AnimationManager.js` - None (UNCHANGED)
- [ ] `src/utils/animationHelpers.js` - None (UNCHANGED)
- [ ] `src/components/animations/DroneAnimations.jsx` - None (UNCHANGED)
- [ ] `src/components/animations/ShipAnimations.jsx` - None (UNCHANGED)

### Deleted Files (4)

- [ ] `src/logic/abilities/ship/RecallAbilityProcessor.js` - Phase 4
- [ ] `src/logic/abilities/ship/TargetLockAbilityProcessor.js` - Phase 4
- [ ] `src/logic/abilities/ship/RecalculateAbilityProcessor.js` - Phase 4
- [ ] `src/logic/effects/cards/DrawThenDiscardProcessor.js` - Phase 4 (composite effect)

### Total: 30 files (3 new, 23 modified, 4 deleted)

---

## Testing Strategy

### Test Types

#### 1. Unit Tests (50+ tests)

**Target**: Individual functions and classes

**Coverage**:
- EffectSequencer.executeSequence()
- EffectSequencer.resumeSequence()
- EffectSequencer.resolveTarget()
- ActionOrchestrator.executeAction()
- ActionOrchestrator.payCosts()
- DiscardEffectProcessor.process()
- RecallDroneEffectProcessor.process()
- All existing effect processors (verify unchanged)

**Tools**: Jest, React Testing Library

**Example**:
```javascript
describe('EffectSequencer', () => {
  test('executes simple sequence', () => {
    const effects = [
      { type: 'DAMAGE', target: 'PRIMARY', value: 3 }
    ];

    const result = sequencer.executeSequence(effects, context);

    expect(result.success).toBe(true);
    expect(result.paused).toBe(false);
    expect(result.animationEvents).toHaveLength(1);
  });
});
```

#### 2. Integration Tests (40+ tests)

**Target**: Multi-component flows

**Coverage**:
- Full action execution (ActionOrchestrator → EffectSequencer → Processors)
- Paused action flow (execution → pause → resume)
- Multiplayer sync (host → guest → state consistency)
- UI flow (click → targeting → confirmation → execution)

**Tools**: Jest, React Testing Library, MSW (Mock Service Worker for network)

**Example**:
```javascript
describe('Action Execution Flow', () => {
  test('plays card with pause and resume', async () => {
    // Setup
    const card = actionCardData.find(c => c.name === 'Tactical Analysis');

    // Execute
    const result = await actionProcessor.processAction('playCard', {
      cardInstanceId: card.instanceId,
      playerId: 'player1'
    });

    // Verify pause
    expect(result.mandatoryAction).toBeDefined();
    expect(result.mandatoryAction.type).toBe('discard');

    // Resume
    const resumeResult = await actionProcessor.processAction('resumeAction', {
      sequenceState: result.sequenceState,
      selectionResult: { type: 'discard', cards: [selectedCard] }
    });

    // Verify completion
    expect(resumeResult.shouldEndTurn).toBe(true);
  });
});
```

#### 3. Regression Tests (30+ tests)

**Target**: Ensure no existing functionality broken

**Coverage**:
- All animation types
- Multiplayer synchronization
- Game flow (turns, phases, end game)
- Deployment, combat, shield allocation

**Tools**: Jest, Playwright (for E2E)

**Example**:
```javascript
describe('Animation Regression', () => {
  test('damage animation still plays correctly', async () => {
    const card = actionCardData.find(c => c.name === 'Missile Strike');

    const result = await actionOrchestrator.executeAction(card, context);

    expect(result.animationEvents).toContainEqual(
      expect.objectContaining({
        type: 'DAMAGE_FLASH',
        targetId: expect.any(String),
        damage: 3
      })
    );

    // Verify animation plays (visual check)
    const animationPlayed = await waitForAnimation('DAMAGE_FLASH');
    expect(animationPlayed).toBe(true);
  });
});
```

#### 4. Performance Tests (5+ tests)

**Target**: Ensure no performance regressions

**Coverage**:
- Action execution time
- Effect sequencing overhead
- Memory usage
- Animation frame rate

**Tools**: Jest, Chrome DevTools

**Example**: See Phase 5 Day 10 for examples

#### 5. Visual Tests (10+ tests)

**Target**: UI appearance and interactions

**Coverage**:
- Confirmation modals display correctly
- Mandatory action modals display correctly
- Targeting modes work correctly
- Animations render correctly

**Tools**: Playwright, Percy (visual regression)

**Example**:
```javascript
describe('Confirmation Modal Visual', () => {
  test('displays card correctly', async () => {
    await page.goto('http://localhost:3000');

    // Play card to trigger modal
    await page.click('[data-card-id="1"]');
    await page.click('[data-enemy-drone="drone_1"]');

    // Take screenshot
    await expect(page).toHaveScreenshot('card-confirmation-modal.png');
  });
});
```

### Test Phases

| Phase | Unit | Integration | Regression | Performance | Visual | Total |
|-------|------|-------------|------------|-------------|--------|-------|
| **Phase 1** | 15 | 3 | 0 | 0 | 0 | 18 |
| **Phase 2** | 10 | 4 | 0 | 0 | 0 | 14 |
| **Phase 3** | 15 | 10 | 5 | 0 | 0 | 30 |
| **Phase 4** | 5 | 10 | 10 | 0 | 0 | 25 |
| **Phase 5** | 5 | 13 | 15 | 5 | 10 | 48 |
| **Total** | 50 | 40 | 30 | 5 | 10 | **135** |

### Test Coverage Goals

- **Overall**: 90%+
- **New Code**: 95%+
- **Critical Paths**: 100%

**Critical Paths**:
- Action execution flow
- Effect sequencing
- Pausing and resuming
- Multiplayer sync
- Animation emission

---

## Risk Mitigation

### High Risk Areas

#### 1. Multiplayer Synchronization

**Risk**: State desync between host and guest after refactor
**Probability**: Medium
**Impact**: High (game-breaking)

**Mitigation**:
- Extensive multiplayer testing (10+ tests)
- State consistency checks after every action
- Rollback mechanism if sync fails
- Test with real network conditions (latency, packet loss)

**Contingency**:
- Feature flag to revert to old system
- State reconciliation algorithm
- Manual resync button for players

#### 2. Animation Regressions

**Risk**: Animations broken or don't play after refactor
**Probability**: Low
**Impact**: High (poor UX)

**Mitigation**:
- Animation system explicitly unchanged
- Regression tests for all animation types (30+ tests)
- Visual tests with screenshots
- Manual QA for all animations

**Contingency**:
- Animation event logging for debugging
- Fallback to simple text-based feedback
- Hot-fix pipeline for animation bugs

#### 3. Data Migration Errors

**Risk**: Cards/abilities broken after data migration
**Probability**: Medium
**Impact**: High (game-breaking)

**Mitigation**:
- Data validation script (catches 90% of errors)
- Test each migrated action individually
- Gradual migration (cards → ordnance → abilities)
- Rollback points after each data file

**Contingency**:
- Keep old data files as .backup
- Quick revert script
- Hotfix individual actions without full rollback

#### 4. Performance Degradation

**Risk**: Action execution slower after refactor
**Probability**: Low
**Impact**: Medium (poor UX)

**Mitigation**:
- Performance tests at each phase
- Profiling during development
- Optimize hot paths (effect sequencing, state cloning)
- Monitor frame rate during animations

**Contingency**:
- Performance profiling tools
- Object pooling for frequent allocations
- Memoization for expensive operations
- Web Workers for background processing (if needed)

### Medium Risk Areas

#### 5. UI Regressions

**Risk**: Modals or UI components broken
**Probability**: Low
**Impact**: Medium

**Mitigation**: Visual tests, manual QA

#### 6. AI Behavior Changes

**Risk**: AI plays differently after refactor
**Probability**: Low
**Impact**: Low

**Mitigation**: AI-specific tests, compare AI behavior before/after

#### 7. Edge Cases

**Risk**: Rare scenarios not handled correctly
**Probability**: Medium
**Impact**: Low

**Mitigation**: Edge case tests (empty hand, no energy, etc.)

### Risk Dashboard

| Risk | Probability | Impact | Priority | Mitigation Status |
|------|------------|---------|----------|-------------------|
| Multiplayer Sync | Medium | High | **CRITICAL** | 80% mitigated |
| Animation Regression | Low | High | **HIGH** | 95% mitigated |
| Data Migration | Medium | High | **HIGH** | 85% mitigated |
| Performance | Low | Medium | **MEDIUM** | 70% mitigated |
| UI Regression | Low | Medium | **MEDIUM** | 60% mitigated |
| AI Behavior | Low | Low | **LOW** | 50% mitigated |

---

## Success Criteria

### Phase Completion Criteria

**Phase 1**:
- [ ] EffectSequencer executes sequences correctly
- [ ] Pausing and resuming works
- [ ] Target resolution works
- [ ] 15+ unit tests passing
- [ ] No impact on existing system

**Phase 2**:
- [ ] DISCARD effect works for human and AI
- [ ] RECALL_DRONE effect works with animations
- [ ] Both processors registered in EffectRouter
- [ ] 10+ unit tests passing
- [ ] 4+ integration tests passing

**Phase 3**:
- [ ] ActionOrchestrator executes all action types
- [ ] ActionProcessor reduced to ~800 lines
- [ ] All existing actions work through new flow
- [ ] Multiplayer sync functional
- [ ] 15+ unit tests, 10+ integration tests passing

**Phase 4**:
- [ ] All action data migrated to new format
- [ ] Data validation script passes with 0 errors
- [ ] All cards and abilities playable
- [ ] Old processors deleted
- [ ] 5+ unit tests, 10+ integration tests passing

**Phase 5**:
- [ ] All UI updated to new format
- [ ] 55+ integration tests passing
- [ ] 35+ regression tests passing
- [ ] Performance targets met
- [ ] Test coverage > 90%
- [ ] Zero regressions

### Overall Project Success Criteria

**Functional**:
- [ ] All actions (cards, drone abilities, ship abilities) use unified flow
- [ ] All actions defined in data files with effect arrays
- [ ] Effect sequencing works correctly
- [ ] Pausing and resuming works for player selection
- [ ] Turn ending based on goAgain property

**Technical**:
- [ ] ActionProcessor reduced to ~800 lines
- [ ] EffectSequencer handles all effect sequences
- [ ] ActionOrchestrator is single entry point for actions
- [ ] Animation system unchanged
- [ ] Multiplayer sync unchanged

**Quality**:
- [ ] 135+ tests passing (50 unit, 40 integration, 30 regression, 5 performance, 10 visual)
- [ ] Test coverage > 90%
- [ ] Zero animation regressions
- [ ] Zero multiplayer regressions
- [ ] Performance targets met

**Documentation**:
- [ ] MODULAR_ACTION_SYSTEM.md complete
- [ ] MODULAR_ACTION_ROADMAP.md complete (this document)
- [ ] Code comments updated
- [ ] Migration guide for future actions

### Launch Checklist

**Pre-Launch**:
- [ ] All phases completed
- [ ] All success criteria met
- [ ] Full regression test suite passing
- [ ] Performance benchmarks met
- [ ] Code review completed
- [ ] Documentation complete

**Launch**:
- [ ] Deploy to staging environment
- [ ] Smoke test all actions
- [ ] Multiplayer stress test
- [ ] Performance monitoring active
- [ ] Rollback plan ready

**Post-Launch**:
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Address critical bugs within 24h
- [ ] Post-mortem meeting

---

## Timeline Summary

```
Week 1: Phase 1 (Foundation)
  Day 1-2: Create EffectSequencer
  Day 3: Update EffectRouter
  Day 4-5: Target resolution system

Week 2: Phase 2 (Processors)
  Day 1-3: DISCARD processor
  Day 4-5: RECALL_DRONE processor

Week 3-4: Phase 3 (Unification)
  Week 3 Day 1-3: Create ActionOrchestrator
  Week 3 Day 4-5 + Week 4 Day 1-2: Refactor ActionProcessor
  Week 4 Day 3-5: Update action types, routing

Week 5-6: Phase 4 (Data Migration)
  Week 5 Day 1-2: Migrate action cards
  Week 5 Day 3-4: Migrate ordnance cards
  Week 5 Day 5 + Week 6 Day 1: Migrate drone abilities
  Week 6 Day 2-3: Migrate ship abilities
  Week 6 Day 4: Remove old processors
  Week 6 Day 5: Data validation

Week 7-8: Phase 5 (UI & Testing)
  Week 7 Day 1-3: Update modals
  Week 7 Day 4-5: Mandatory action modals
  Week 8 Day 1-2: Integration testing
  Week 8 Day 3-4: Regression testing
  Week 8 Day 5: Performance testing
```

**Total Duration**: 8 weeks (40 development days)
**Estimated Effort**: ~320 development hours (8 hours/day)

---

## Conclusion

This roadmap provides a comprehensive plan for migrating to a fully modular action system. The **effect-first approach** ensures we build a solid foundation before migrating existing functionality, minimizing risk and enabling incremental testing.

**Key Takeaways**:
1. **5 Phases**: Foundation → Processors → Unification → Migration → Testing
2. **8 Weeks**: Realistic timeline with buffer for testing
3. **135+ Tests**: Comprehensive test coverage at each phase
4. **Risk Mitigation**: Extensive testing, rollback points, contingency plans
5. **Success Criteria**: Clear metrics for each phase and overall project

**Next Steps**:
1. Review and approve this roadmap
2. Set up development environment and testing infrastructure
3. Begin Phase 1: Effect Sequencing Foundation

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Status**: Ready for Implementation
