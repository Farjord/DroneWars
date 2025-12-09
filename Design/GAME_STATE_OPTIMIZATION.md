# Game State Optimization Analysis

## Overview

This document analyzes the current game state storage approach and outlines a potential optimization to reduce state size by ~5x.

## Current Approach: Full Object Copies

The game state currently stores **complete copies** of card and drone definitions for every instance in play.

### Cards in Hand/Deck (~800 bytes each)
```javascript
// Every card in player.hand[] and player.deck[] contains:
{
  id: 'CARD001',
  instanceId: 'card-1733292845123-0',
  baseCardId: 'CARD001',
  name: 'Laser Blast',
  maxInDeck: 4,
  rarity: 'Common',
  type: 'Ordnance',
  cost: 2,
  image: '/DroneWars/cards/LaserBlast.png',
  description: 'Deal 2 damage...',
  visualEffect: { type: 'LASER_BLAST' },
  targeting: { type: 'DRONE', affinity: 'ANY', location: 'ANY_LANE' },
  effect: { type: 'DAMAGE', value: 2, markedBonus: 1 }
}
```

### Drones on Board (~400 bytes each)
```javascript
// Every drone in dronesOnBoard[lane][] contains:
{
  // Base definition (duplicated)
  name: 'Scout Drone',
  class: 1,
  limit: 3,
  rarity: 'Common',
  attack: 1,
  hull: 1,
  shields: 1,
  speed: 6,
  image: '/DroneWars/img/Scout.png',
  abilities: [],
  upgradeSlots: 2,

  // Instance-specific state (actually needed)
  id: 'drone-123',
  currentShields: 1,
  hull: 1,  // Current hull (mutable)
  isExhausted: false,
  isMarked: false,
  statMods: []
}
```

### Current State Size
- 47 cards per player × 2 players × ~800 bytes = **~75 KB** for cards
- 10+ drones per player × 2 players × ~400 bytes = **~8 KB** for drones
- **Total: ~85-100 KB** per game state

---

## Problem Analysis

### Cards: Never Modified After Creation
- Cards are created in `StateInitializer.createCard()` with only `instanceId` added
- **No modifications** to cost, damage, or properties occur during play
- Full definitions are unnecessary bloat

### Drones: Instance State Mixed with Base Definition
- Drones ARE modified during play: `hull`, `currentShields`, `isExhausted`, `isMarked`, `statMods[]`
- But base definition (name, attack, speed, abilities, image) is **duplicated unnecessarily**

---

## Proposed Optimization: ID References + Instance State

### Optimized Card Storage (~50 bytes each)
```javascript
// Store only what's unique to the instance
{
  baseId: 'laser-blast',     // Lookup key for fullCardCollection
  instanceId: 'card-456'
}
```

### Optimized Drone Storage (~80 bytes each)
```javascript
// Store ID + instance-specific state only
{
  baseId: 'scout-drone',     // Lookup key for fullDroneCollection
  instanceId: 'drone-123',
  hull: 2,                   // Current hull (mutable)
  currentShields: 1,         // Current shields (mutable)
  isExhausted: false,
  isMarked: false,
  statMods: []
}
```

### Optimized State Size
- Cards: ~50 bytes × 94 = **~5 KB**
- Drones: ~80 bytes × 20 = **~2 KB**
- **Total: ~10-15 KB** (5-6x smaller)

---

## Refactoring Scope

### Summary

| Category | Files | Changes | Complexity |
|----------|-------|---------|------------|
| Core Logic | 23 | ~200-250 | 15 complex, 8 simple |
| UI Components | 18 | ~100-120 | Mostly simple |
| Debug/Utilities | 12 | ~60-80 | All simple |
| **Total** | **53 files** | **~360-450** | |

### Critical Files (Core Game Logic) - 23 Files

**Combat & Deployment:**
- `src/logic/combat/AttackProcessor.js` - 15+ accesses
- `src/logic/combat/InterceptionProcessor.js` - 8+ accesses
- `src/logic/deployment/DeploymentProcessor.js` - 12+ accesses
- `src/logic/cards/CardPlayManager.js` - 6+ accesses
- `src/logic/effects/damage/DamageEffectProcessor.js` - 10+ accesses

**Effect Processors:**
- `src/logic/effects/movement/MovementEffectProcessor.js` - 8+ accesses
- `src/logic/effects/stat_modification/ModifyStatEffectProcessor.js` - 5+ accesses
- `src/logic/effects/tokens/TokenCreationProcessor.js` - 4+ accesses
- `src/logic/effects/healing/HullHealProcessor.js` - 3+ accesses
- `src/logic/effects/healing/ShieldHealProcessor.js` - 3+ accesses
- `src/logic/effects/marking/MarkingEffectProcessor.js` - 3+ accesses

**State & Calculations:**
- `src/logic/statsCalculator.js` - 8+ accesses (foundational - refactor first)
- `src/logic/utils/droneStateUtils.js` - 4 accesses
- `src/logic/utils/gameEngineUtils.js` - 6+ accesses
- `src/logic/cards/HandLimitManager.js` - 4+ accesses

**AI Logic:**
- `src/logic/aiLogic.js` - 20+ accesses (most complex)
- `src/logic/ai/cardEvaluators/droneCards.js` - 10+ accesses
- `src/logic/ai/helpers/droneHelpers.js` - 6 accesses
- `src/logic/ai/moveEvaluator.js` - 8+ accesses
- `src/logic/ai/scoring/interceptionAnalysis.js` - 7+ accesses
- `src/logic/TargetingRouter.js` - 5+ accesses
- `src/logic/utils/abilityHelpers.js` - 6+ accesses
- `src/logic/utils/auraManager.js` - 8+ accesses

### Medium Priority (UI Components) - 18 Files

**Core UI:**
- `src/components/ui/DroneToken.jsx` - 12+ accesses
- `src/components/ui/ActionCard.jsx` - 8+ accesses
- `src/components/ui/DroneCard.jsx` - 10+ accesses
- `src/components/ui/DroneLanesDisplay.jsx` - 6+ accesses
- `src/components/ui/footer/HandView.jsx` - 7+ accesses

**Modals:**
- `src/components/modals/CardSelectionModal.jsx`
- `src/components/modals/OpponentDronesModal.jsx`
- `src/components/modals/CardDetailModal.jsx`
- `src/components/modals/CardViewerModal.jsx`
- `src/components/modals/DroneSelectionModal.jsx`
- `src/components/modals/DeckBuildingModal.jsx`
- `src/components/modals/DetailedDroneModal.jsx`
- `src/components/modals/MandatoryActionModal.jsx`

**Screens:**
- `src/components/screens/DroneSelectionScreen.jsx`
- `src/components/screens/QuickDeployEditorScreen.jsx`
- `src/components/quickDeploy/DronePicker.jsx`
- `src/components/ui/footer/DronesView.jsx`
- `src/hooks/useAnimationSetup.js`

### Low Priority (Debug/Utilities) - 12 Files

**AI Evaluators:**
- `src/logic/ai/cardEvaluators/damageCards.js`
- `src/logic/ai/cardEvaluators/healCards.js`
- `src/logic/ai/cardEvaluators/movementCards.js`
- `src/logic/ai/cardEvaluators/statCards.js`
- `src/logic/ai/cardEvaluators/upgradeCards.js`
- `src/logic/ai/cardEvaluators/utilityCards.js`
- `src/logic/ai/attackEvaluators/droneAttack.js`
- `src/logic/ai/attackEvaluators/shipAttack.js`

**Debug:**
- `src/components/modals/AIHandDebugModal.jsx`
- `src/components/modals/AICardPlayReportModal.jsx`
- `src/components/modals/GameDebugModal.jsx`
- `src/logic/detection/DetectionManager.js`

---

## Migration Strategy

### Phase 1: Foundation (Critical)
1. Create `DroneLookupService` utility for centralized lookups
2. Refactor `statsCalculator.js` (used by 8+ files)
3. Update `DeploymentProcessor.js`, `AttackProcessor.js`, `InterceptionProcessor.js`
4. **Thoroughly test combat and deployment**

### Phase 2: UI Components (Medium)
1. Create React hook: `useDroneTemplate(droneName)`
2. Update all drone/card display components
3. Can be done in parallel with Phase 1

### Phase 3: AI & Debug (Low)
1. Update AI evaluators and helpers
2. Update debug modals
3. Lowest risk

---

## Benefits

1. **~5x smaller state** (~85KB → ~15KB)
2. **Faster multiplayer sync** - less data transmitted per state update
3. **Lower memory usage** - especially with many drones on board
4. **Cleaner architecture** - separation of definition vs instance state
5. **Easier debugging** - state shows only what changed, not duplicated definitions

---

## Risks

1. **Core combat logic changes** - must thoroughly test attack resolution
2. **AI logic is heavily drone-dependent** - 8 evaluators need updates
3. **Performance of frequent lookups** - mitigated by caching in lookup service
4. **Regression bugs** - existing tests should catch most issues

---

## Decision

**Status:** Deferred for future consideration

The current approach works correctly. This optimization is recommended when:
- Multiplayer performance becomes an issue
- State size causes problems (save/load, sync delays)
- Major refactoring is already planned

---

## Code Pattern Examples

### Before (current)
```javascript
// Accessing drone data from state
const drone = player.dronesOnBoard[lane][0];
const attack = drone.attack;
const name = drone.name;
const image = drone.image;
```

### After (optimized)
```javascript
// Accessing drone data with lookup
const droneInstance = player.dronesOnBoard[lane][0];
const droneTemplate = DroneLookupService.getByName(droneInstance.baseId);
const attack = droneTemplate.attack;
const name = droneTemplate.name;
const image = droneTemplate.image;
// Instance state accessed directly
const currentHull = droneInstance.hull;
const isExhausted = droneInstance.isExhausted;
```
