# AI Logic Refactoring Recommendations

## Current Problems

### 1. Monolithic Structure
`aiLogic.js` is **1,895 lines** containing:
- Helper functions (jammer detection, lane scoring, impact calculation)
- Deployment logic
- Action phase logic with 15+ card effect handlers
- Post-scoring adjustment passes
- Interception decision system

**Impact:** Difficult to navigate, understand, test, and modify individual behaviors.

### 2. Mixed Concerns
The same file handles:
- Tactical calculations (lane scoring, threat assessment)
- Card effect evaluation (15+ different effect types)
- Combat decisions (attacks, moves)
- Meta-decisions (interception, opportunity cost)

### 3. Implicit Dependencies
Helper functions are defined at the top but their relationships aren't clear. Understanding `handleOpponentAction` requires understanding 10+ helper functions scattered throughout.

### 4. Difficult Testing
Testing individual AI behaviors (e.g., "how does AI evaluate HEAL_SHIELDS cards?") requires loading the entire system.

### 5. Hard-Coded Magic Numbers
Scoring weights and thresholds are scattered throughout:
```javascript
const attackValue = ((stats.attack || 0) + (stats.potentialShipDamage || 0)) * 4;  // Why 4?
if (currentLaneScore < -15)  // Why -15?
score += 100;  // What does this represent?
```

---

## Proposed Structure

```
src/logic/ai/
├── index.js                    # Main export (aiBrain facade)
├── constants/
│   └── aiConstants.js          # All magic numbers and thresholds
├── scoring/
│   ├── laneScoring.js          # calculateLaneScore, lane-related helpers
│   ├── droneImpact.js          # calculateDroneImpact
│   └── interceptionAnalysis.js # analyzeInterceptionInLane, calculateThreatsKeptInCheck
├── helpers/
│   ├── jammerHelpers.js        # Jammer detection and analysis
│   ├── droneHelpers.js         # countDroneTypeInLane, drone queries
│   └── keywordHelpers.js       # hasDefenderKeyword, keyword detection
├── decisions/
│   ├── deploymentDecision.js   # handleOpponentTurn
│   ├── actionDecision.js       # handleOpponentAction (orchestration)
│   └── interceptionDecision.js # makeInterceptionDecision
├── cardEvaluators/
│   ├── index.js                # Card evaluator registry
│   ├── damageCards.js          # DESTROY, DAMAGE evaluation
│   ├── utilityCards.js         # DRAW, GAIN_ENERGY, SEARCH_AND_DRAW
│   ├── droneCards.js           # READY_DRONE, CREATE_TOKENS
│   ├── healCards.js            # HEAL_SHIELDS, HEAL_HULL
│   ├── statCards.js            # MODIFY_STAT
│   └── movementCards.js        # SINGLE_MOVE
├── attackEvaluators/
│   ├── droneAttack.js          # Drone-on-drone attack scoring
│   └── shipAttack.js           # Drone-on-ship attack scoring
├── moveEvaluator.js            # Move action scoring
└── adjustmentPasses/
    ├── jammerAdjustment.js     # Jammer blocking pass
    └── interceptionAdjustment.js # Interception risk/reward pass
```

---

## Detailed Refactoring Plan

### Step 1: Extract Constants
**File:** `src/logic/ai/constants/aiConstants.js`

```javascript
// Scoring Weights
export const SCORING_WEIGHTS = {
  ATTACK_MULTIPLIER: 4,
  CLASS_MULTIPLIER: 2,
  DURABILITY_MULTIPLIER: 0.5,
  SPEED_ADVANTAGE_MULTIPLIER: 8,
  COST_PENALTY_MULTIPLIER: 4,
  DAMAGE_VALUE_MULTIPLIER: 8,
};

// Lane Score Thresholds
export const LANE_THRESHOLDS = {
  LOSING_BADLY: -15,
  WINNING_STRONGLY: 15,
  DOMINANCE: 20,
};

// Decision Thresholds
export const DECISION_THRESHOLDS = {
  MIN_DEPLOY_SCORE: 5,
  MIN_ACTION_SCORE: 0,
  ACTION_POOL_RANGE: 20,
};

// Bonuses and Penalties
export const BONUSES = {
  FAST_DRONE_DEFENSIVE: 15,
  GUARDIAN_DEFENSIVE: 20,
  HIGH_ATTACK_OFFENSIVE: 15,
  ANTI_SHIP_OFFENSIVE: 20,
  CHEAP_DRONE_BALANCED: 10,
  FAVORABLE_TRADE: 20,
  READY_TARGET: 10,
  DEFENSIVE_MOVE: 25,
  OFFENSIVE_MOVE: 20,
  UNCHECKED_THREAT: 100,
  LETHAL_BASE: 50,
};

export const PENALTIES = {
  OVERKILL: -150,
  GUARDIAN_ATTACK_RISK: -200,
  INTERCEPTION_RISK: -80,
  ANTI_SHIP_ATTACKING_DRONE: -40,
  MOVE_COST: 10,
};

// Ship Section Bonuses
export const SHIP_SECTION_BONUSES = {
  DAMAGED: 15,
  CRITICAL: 30,
  NO_SHIELDS: 40,
  SHIELD_BREAK: 35,
  HIGH_ATTACK: 10,
};

// Interception Thresholds
export const INTERCEPTION = {
  EXCELLENT_TRADE_RATIO: 0.3,
  GOOD_TRADE_RATIO: 0.7,
  PROTECTION_MULTIPLIER: 1.5,
  EXCELLENT_SACRIFICE_RATIO: 2.0,
  GOOD_SACRIFICE_RATIO: 1.3,
  DEFENDER_BONUS: 20,
};
```

### Step 2: Extract Scoring Modules

**File:** `src/logic/ai/scoring/laneScoring.js`

```javascript
import { SCORING_WEIGHTS, LANE_THRESHOLDS } from '../constants/aiConstants.js';

/**
 * Calculate combat power for a set of drones in a lane
 */
export const calculateDronePower = (drones, laneId, gameDataService) => {
  return drones.reduce((sum, drone) => {
    const stats = gameDataService.getEffectiveStats(drone, laneId);
    const attackValue = ((stats.attack || 0) + (stats.potentialShipDamage || 0)) * SCORING_WEIGHTS.ATTACK_MULTIPLIER;
    const classValue = (drone.class || 0) * SCORING_WEIGHTS.CLASS_MULTIPLIER;
    const durabilityValue = ((drone.hull || 0) + (drone.currentShields || 0)) * SCORING_WEIGHTS.DURABILITY_MULTIPLIER;
    return sum + attackValue + classValue + durabilityValue;
  }, 0);
};

/**
 * Calculate the AI's advantage/disadvantage in a lane
 */
export const calculateLaneScore = (laneId, player2State, player1State, allSections, getShipStatus, gameDataService) => {
  // ... implementation using extracted constants
};

/**
 * Analyze lane state for strategic decisions
 */
export const analyzeLaneState = (laneScore) => ({
  isLosingBadly: laneScore < LANE_THRESHOLDS.LOSING_BADLY,
  isWinningStrongly: laneScore > LANE_THRESHOLDS.WINNING_STRONGLY,
  isDominant: laneScore > LANE_THRESHOLDS.DOMINANCE,
  isBalanced: laneScore >= LANE_THRESHOLDS.LOSING_BADLY && laneScore <= LANE_THRESHOLDS.WINNING_STRONGLY,
});
```

### Step 3: Extract Card Evaluators

**File:** `src/logic/ai/cardEvaluators/damageCards.js`

```javascript
import { SCORING_WEIGHTS, BONUSES } from '../constants/aiConstants.js';

/**
 * Evaluate DESTROY effect cards
 */
export const evaluateDestroyCard = (card, target, context) => {
  const { player1, player2, getLaneOfDrone, gameDataService } = context;
  const logic = [];
  let score = 0;

  switch (card.effect.scope) {
    case 'SINGLE':
      score = evaluateSingleDestroy(card, target, logic);
      break;
    case 'FILTERED':
      score = evaluateFilteredDestroy(card, target, player1, gameDataService, logic);
      break;
    case 'LANE':
      score = evaluateLaneDestroy(card, target, player1, player2, logic);
      break;
  }

  return { score, logic };
};

const evaluateSingleDestroy = (card, target, logic) => {
  const resourceValue = (target.hull || 0) + (target.currentShields || 0);
  const targetValue = resourceValue * SCORING_WEIGHTS.DAMAGE_VALUE_MULTIPLIER;
  const costPenalty = card.cost * SCORING_WEIGHTS.COST_PENALTY_MULTIPLIER;

  logic.push(`Target Value: +${targetValue}`);
  logic.push(`Cost: -${costPenalty}`);

  return targetValue - costPenalty;
};

// ... more specialized destroy evaluators
```

**File:** `src/logic/ai/cardEvaluators/index.js`

```javascript
import { evaluateDestroyCard, evaluateDamageCard } from './damageCards.js';
import { evaluateDrawCard, evaluateGainEnergyCard, evaluateSearchAndDrawCard } from './utilityCards.js';
import { evaluateReadyDroneCard, evaluateCreateTokensCard } from './droneCards.js';
import { evaluateHealShieldsCard, evaluateHealHullCard } from './healCards.js';
import { evaluateModifyStatCard } from './statCards.js';
import { evaluateSingleMoveCard } from './movementCards.js';

/**
 * Card evaluator registry - maps effect types to evaluation functions
 */
export const cardEvaluators = {
  DESTROY: evaluateDestroyCard,
  DAMAGE: evaluateDamageCard,
  DRAW: evaluateDrawCard,
  GAIN_ENERGY: evaluateGainEnergyCard,
  SEARCH_AND_DRAW: evaluateSearchAndDrawCard,
  READY_DRONE: evaluateReadyDroneCard,
  CREATE_TOKENS: evaluateCreateTokensCard,
  HEAL_SHIELDS: evaluateHealShieldsCard,
  HEAL_HULL: evaluateHealHullCard,
  MODIFY_STAT: evaluateModifyStatCard,
  SINGLE_MOVE: evaluateSingleMoveCard,
  REPEATING_EFFECT: evaluateRepeatingEffectCard,
};

/**
 * Evaluate a card play action
 */
export const evaluateCardPlay = (card, target, context) => {
  const evaluator = cardEvaluators[card.effect.type];

  if (!evaluator) {
    console.warn(`No evaluator for card effect type: ${card.effect.type}`);
    return { score: 0, logic: ['Unknown effect type'] };
  }

  return evaluator(card, target, context);
};
```

### Step 4: Extract Adjustment Passes

**File:** `src/logic/ai/adjustmentPasses/jammerAdjustment.js`

```javascript
import { hasJammerInLane, hasJammerKeyword, getJammerDronesInLane } from '../helpers/jammerHelpers.js';

/**
 * Apply Jammer-based score adjustments
 * 1. Mark blocked card plays
 * 2. Boost Jammer removal attacks
 */
export const applyJammerAdjustments = (possibleActions, context) => {
  const { player1, player2, getLaneOfDrone, gameDataService } = context;

  // Step 1: Calculate blocked value per lane
  const blockedValueByLane = calculateBlockedValue(possibleActions, player1, getLaneOfDrone);

  // Step 2: Mark blocked plays
  markBlockedPlays(possibleActions, player1, getLaneOfDrone);

  // Step 3: Calculate affordable blocked value
  const affordableBlockedValue = calculateAffordableBlockedValue(player2, player1);

  // Step 4: Boost Jammer removal attacks
  boostJammerRemovalAttacks(possibleActions, blockedValueByLane, affordableBlockedValue, gameDataService);

  return possibleActions;
};

// ... helper functions for each step
```

### Step 5: Create Facade/Index

**File:** `src/logic/ai/index.js`

```javascript
import { handleDeploymentPhase } from './decisions/deploymentDecision.js';
import { handleActionPhase } from './decisions/actionDecision.js';
import { makeInterceptionDecision } from './decisions/interceptionDecision.js';

/**
 * AI Brain - Main export maintaining backward compatibility
 */
export const aiBrain = {
  handleOpponentTurn: handleDeploymentPhase,
  handleOpponentAction: handleActionPhase,
  makeInterceptionDecision,
};

// Re-export for direct access if needed
export { handleDeploymentPhase, handleActionPhase, makeInterceptionDecision };
```

---

## Migration Strategy

### Phase 1: Extract Constants (Low Risk)
1. Create `aiConstants.js` with all magic numbers
2. Replace inline numbers with constant references
3. Validate behavior unchanged via gameplay testing

### Phase 2: Extract Helpers (Low Risk)
1. Move helper functions to separate files
2. Update imports in `aiLogic.js`
3. No logic changes, just reorganization

### Phase 3: Extract Scoring (Medium Risk)
1. Extract `calculateLaneScore` and related functions
2. Add unit tests for lane scoring
3. Validate against known scenarios

### Phase 4: Extract Card Evaluators (Medium Risk)
1. Create evaluator registry pattern
2. Move one card type at a time
3. Add unit tests for each card type
4. Compare AI decisions before/after

### Phase 5: Extract Decision Logic (Higher Risk)
1. Move `handleOpponentTurn` to deployment module
2. Move `handleOpponentAction` to action module
3. Move `makeInterceptionDecision` to interception module
4. Extensive integration testing

---

## Benefits of Refactoring

### 1. Improved Maintainability
- Add new card types without touching core logic
- Modify scoring weights in one place
- Clear separation of concerns

### 2. Better Testability
```javascript
// Before: Need entire game state to test
// After: Can test individual evaluators
import { evaluateDestroyCard } from './cardEvaluators/damageCards.js';

test('DESTROY scores high-health targets higher', () => {
  const card = { effect: { type: 'DESTROY', scope: 'SINGLE' }, cost: 2 };
  const lowHealthTarget = { hull: 1, currentShields: 0 };
  const highHealthTarget = { hull: 5, currentShields: 2 };

  const lowScore = evaluateDestroyCard(card, lowHealthTarget, context);
  const highScore = evaluateDestroyCard(card, highHealthTarget, context);

  expect(highScore.score).toBeGreaterThan(lowScore.score);
});
```

### 3. Easier Debugging
- Log which evaluator produced which score
- Trace decisions through named modules
- Isolate problematic behaviors

### 4. Enable AI Variants
```javascript
// Different AI personalities could use different evaluator sets
const aggressiveEvaluators = {
  ...defaultEvaluators,
  DAMAGE: aggressiveDamageEvaluator,  // Weights damage higher
};

const defensiveEvaluators = {
  ...defaultEvaluators,
  HEAL_SHIELDS: defensiveHealEvaluator,  // Prioritizes healing
};
```

### 5. Performance Optimization
- Profile individual evaluators
- Cache expensive calculations per module
- Lazy-load rarely used evaluators

---

## Testing Recommendations

### Unit Tests
- Each card evaluator
- Lane scoring calculation
- Interception decision logic
- Helper functions

### Integration Tests
- Full deployment decision flow
- Full action decision flow
- Adjustment pass interactions

### Regression Tests
- Record AI decisions for standard scenarios
- Compare before/after refactoring
- Alert on significant behavior changes

---

## Estimated Effort

| Phase | Files Created | Lines Moved | Risk | Testing Effort |
|-------|---------------|-------------|------|----------------|
| 1. Constants | 1 | ~100 | Low | Smoke test |
| 2. Helpers | 3 | ~150 | Low | Unit tests |
| 3. Scoring | 3 | ~200 | Medium | Unit + integration |
| 4. Card Evaluators | 7 | ~600 | Medium | Unit + comparison |
| 5. Decisions | 3 | ~800 | Higher | Full integration |

**Total:** ~15 new files, ~1,850 lines reorganized (not new code, just moved and structured)

---

## Recommendation

Start with **Phase 1 (Constants)** and **Phase 2 (Helpers)** as they provide immediate benefits with minimal risk. These can be done incrementally without disrupting ongoing development.

**Phase 4 (Card Evaluators)** provides the most value for debugging AI card play decisions and should be prioritized if sub-optimal card plays are the main issue.
