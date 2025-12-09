# Quick Deploy - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        HANGAR SCREEN                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Ship Slots (0-5)                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [Quick Deployments] ← NEW BUTTON                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  QUICK DEPLOY MANAGER (Modal/Screen)            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Saved Quick Deployments (max 5)                            │ │
│  │  [Aggressive Rush] [Defensive Setup] [+ New]               │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Editor View (when creating/editing)                        │ │
│  │  ┌─────────┬─────────┬─────────┐                           │ │
│  │  │ Lane 0  │ Lane 1  │ Lane 2  │                           │ │
│  │  │ (Left)  │ (Mid)   │ (Right) │                           │ │
│  │  │ [Scout] │ [Heavy] │         │                           │ │
│  │  │         │ [Std]   │         │                           │ │
│  │  └─────────┴─────────┴─────────┘                           │ │
│  │  Budget: 6 points                                          │ │
│  │  Valid for: Starter Deck, Custom Deck 2                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Game Start Flow (with Quick Deploy)

```
ENCOUNTER SCREEN (TacticalMapScreen - before combat)
           │
           ▼
┌──────────────────────────────────────┐
│ QuickDeployValidator.getValidFor()   │
│ - Validates all quick deployments    │
│ - Against current deck's resources   │
└──────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Encounter Screen shows options:      │
│ - "Standard Deployment"              │
│ - "Aggressive Rush" (if valid)       │
│ - "Defensive Setup" (if valid)       │
│ Player selects and confirms          │
└──────────────────────────────────────┘
           │
           ▼
LOADING SCREEN (Extraction loading screen)
           │
           ▼
┌──────────────────────────────────────┐
│ SinglePlayerCombatInitializer        │
│ - Set quickDeployMode: true          │
│ - Set quickDeployData: placements    │
│ - Run processRoundInitialization()   │
│ - Execute player drone placements    │
│ - Execute AI reactive deployments    │
└──────────────────────────────────────┘
           │
           ▼
GAME LOADS - BOARD FULLY POPULATED
           │
           ▼
┌──────────────────────────────────────┐
│ GameFlowManager                      │
│ - Skip deployment phase entirely     │
│ - Start at Round 1 → Action Phase    │
│ - First player determined normally   │
└──────────────────────────────────────┘
```

---

## Initialization Flow Detail

### Current Extraction Mode Initialization
```
SinglePlayerCombatInitializer.initiateCombat()
    │
    ├─ Build player1 state (deck, drones, sections)
    ├─ Build player2 state (AI)
    ├─ Set all resources to 0
    ├─ Create game state with turnPhase='roundInitialization'
    │
    └─> GameFlowManager.processRoundInitialization()
        │
        ├─ Increment roundNumber to 1
        ├─ Determine first player
        ├─ Calculate effective ship stats from placed sections
        ├─ SET ENERGY = energyPerTurn stat
        ├─ SET DEPLOYMENT BUDGET = initialDeployment stat
        ├─ Call performAutomaticDraw() - draw cards to hand
        │
        └─> Return next phase = 'deployment'

    └─> transitionToPhase('deployment')

[GAME BOARD LOADS - DEPLOYMENT PHASE]
```

### Quick Deploy Initialization (Modified Flow)
```
SinglePlayerCombatInitializer.initiateCombat(quickDeployData)
    │
    ├─ Build player1 state (deck, drones, sections)
    ├─ Build player2 state (AI)
    ├─ Set all resources to 0
    ├─ Set quickDeployMode: true
    ├─ Create game state with turnPhase='roundInitialization'
    │
    └─> GameFlowManager.processRoundInitialization()
        │
        ├─ Increment roundNumber to 1
        ├─ Determine first player
        ├─ Calculate effective ship stats
        ├─ SET ENERGY = energyPerTurn stat
        ├─ SET DEPLOYMENT BUDGET = initialDeployment stat
        ├─ Call performAutomaticDraw() - draw cards to hand
        │
        └─> [QUICK DEPLOY INJECTION POINT]
            │
            ├─ executeQuickDeploy(quickDeployData.placements)
            │   ├─ For each placement:
            │   │   └─ DeploymentProcessor.executeDeployment()
            │   │       ├─ Deduct costs (budget first, then energy)
            │   │       └─ Add drone to dronesOnBoard
            │   └─ All player drones now on board
            │
            ├─ executeQuickDeployAI()
            │   ├─ AI sees player's placed drones
            │   ├─ Loop: handleOpponentTurn() until AI passes
            │   │   └─ Each call deploys optimal drone
            │   └─ All AI drones now on board
            │
            └─> Return next phase = 'action' (skip 'deployment')

    └─> transitionToPhase('action')

[GAME BOARD LOADS - ACTION PHASE - ALL DRONES ON BOARD]
```

---

## Key Integration Points

### 1. SinglePlayerCombatInitializer
**File:** `src/logic/singlePlayer/SinglePlayerCombatInitializer.js`

**Modifications:**
- Accept `quickDeployData` parameter in `initiateCombat()`
- Set `quickDeployMode: true` in game state if quick deploy selected
- After `processRoundInitialization()`, call new `executeQuickDeploy()` method

**New Method:**
```javascript
async executeQuickDeploy(placements, gameState) {
  for (const placement of placements) {
    // Find drone in activeDronePool
    const drone = gameState.player1.activeDronePool
      .find(d => d.name === placement.droneName);

    // Execute deployment (silent - no animations)
    await DeploymentProcessor.executeDeployment({
      drone,
      lane: `lane${placement.lane + 1}`, // Convert 0,1,2 to lane1,lane2,lane3
      playerId: 'player1',
      silent: true  // New flag to skip animations
    });
  }
}
```

### 2. DeploymentProcessor
**File:** `src/logic/deployment/DeploymentProcessor.js`

**Modifications:**
- Add `silent` flag to `executeDeployment()` options
- When `silent: true`, skip animation queuing
- Cost deduction logic remains unchanged

### 3. AIPhaseProcessor
**File:** `src/managers/AIPhaseProcessor.js`

**New Method:**
```javascript
async executeQuickDeployAI(gameState) {
  let aiDecision;

  // Loop until AI passes
  do {
    aiDecision = aiBrain.handleOpponentTurn({
      player1: gameState.player1,
      player2: gameState.player2,
      turn: 1,
      placedSections: gameState.placedSections,
      opponentPlacedSections: gameState.opponentPlacedSections,
      getShipStatus: gameEngine.getShipStatus,
      gameStateManager: this.gameStateManager
    });

    if (aiDecision.type === 'deploy') {
      await DeploymentProcessor.executeDeployment({
        drone: aiDecision.payload.droneToDeploy,
        lane: aiDecision.payload.targetLane,
        playerId: 'player2',
        silent: true
      });
    }
  } while (aiDecision.type !== 'pass');
}
```

### 4. GameFlowManager
**File:** `src/managers/GameFlowManager.js`

**Modifications:**
- In `isPhaseRequired()`, check for `quickDeployMode`
- If `quickDeployMode && phase === 'deployment'`, return `false`

```javascript
isPhaseRequired(phase, gameState) {
  // ... existing logic ...

  case 'deployment':
    // Skip deployment if quick deploy already executed
    if (gameState.quickDeployMode) {
      return false;
    }
    return true;
}
```

---

## Validation Service

### QuickDeployValidator
**New File:** `src/logic/quickDeploy/QuickDeployValidator.js`

```javascript
class QuickDeployValidator {

  /**
   * Validate a quick deployment against a specific deck
   */
  validateAgainstDeck(quickDeploy, deck, shipSections) {
    const reasons = [];

    // 1. Roster match
    const deckDrones = deck.drones.map(d => d.name).sort();
    const qDrones = quickDeploy.droneRoster.slice().sort();
    if (!arraysEqual(deckDrones, qDrones)) {
      reasons.push({
        type: 'roster_mismatch',
        message: 'Drone roster does not match deck',
        details: { expected: deckDrones, actual: qDrones }
      });
    }

    // 2. Budget check
    const totalCost = this.calculateTotalCost(quickDeploy.placements);
    const stats = calculateEffectiveShipStats(deck, shipSections);
    const availableBudget = stats.totals.initialDeployment + stats.totals.energyPerTurn;
    if (totalCost > availableBudget) {
      reasons.push({
        type: 'budget_exceeded',
        message: `Cost ${totalCost} exceeds budget ${availableBudget}`,
        details: { totalCost, availableBudget }
      });
    }

    // 3. CPU limit
    if (quickDeploy.placements.length > stats.totals.cpuControlValue) {
      reasons.push({
        type: 'cpu_exceeded',
        message: 'Too many drones for CPU limit',
        details: {
          placed: quickDeploy.placements.length,
          limit: stats.totals.cpuControlValue
        }
      });
    }

    // 4. Per-drone limits (maxPerLane)
    // ... additional validation ...

    return {
      valid: reasons.length === 0,
      reasons
    };
  }

  /**
   * Get all valid quick deployments for a deck
   */
  getValidDeploymentsForDeck(allDeployments, deck, shipSections) {
    return allDeployments
      .map(qd => ({
        ...qd,
        validation: this.validateAgainstDeck(qd, deck, shipSections)
      }))
      .filter(qd => qd.validation.valid);
  }

  /**
   * Calculate total deployment cost
   */
  calculateTotalCost(placements) {
    return placements.reduce((sum, p) => {
      const droneData = getDroneByName(p.droneName);
      return sum + (droneData?.class || 0);
    }, 0);
  }
}
```

---

## CRUD Service

### QuickDeployService
**New File:** `src/logic/quickDeploy/QuickDeployService.js`

```javascript
class QuickDeployService {

  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
  }

  getAll() {
    return this.gameStateManager.getState().quickDeployments || [];
  }

  create(name, droneRoster, placements) {
    const existing = this.getAll();
    if (existing.length >= 5) {
      throw new Error('Maximum 5 quick deployments allowed');
    }

    const newDeployment = {
      id: `qd_${Date.now()}`,
      name,
      createdAt: Date.now(),
      droneRoster,
      placements
    };

    this.gameStateManager.setState({
      quickDeployments: [...existing, newDeployment]
    });

    return newDeployment;
  }

  update(id, changes) {
    const existing = this.getAll();
    const index = existing.findIndex(qd => qd.id === id);
    if (index === -1) throw new Error('Quick deployment not found');

    const updated = { ...existing[index], ...changes };
    const newList = [...existing];
    newList[index] = updated;

    this.gameStateManager.setState({ quickDeployments: newList });
    return updated;
  }

  delete(id) {
    const existing = this.getAll();
    this.gameStateManager.setState({
      quickDeployments: existing.filter(qd => qd.id !== id)
    });
  }
}
```

---

## Critical Files Reference

| Purpose | File Path |
|---------|-----------|
| Save Schema | `src/data/saveGameSchema.js` |
| Starter Drones | `src/data/playerDeckData.js` |
| All Drones | `src/data/droneData.js` |
| Blueprint List | `playerProfile.unlockedBlueprints` |
| Stats Calculator | `src/logic/statsCalculator.js` |
| Combat Initializer | `src/logic/singlePlayer/SinglePlayerCombatInitializer.js` |
| Game Flow | `src/managers/GameFlowManager.js` |
| AI Deployment | `src/logic/aiLogic.js` |
| AI Processor | `src/managers/AIPhaseProcessor.js` |
| Deployment Processor | `src/logic/deployment/DeploymentProcessor.js` |
| Hangar/Deck UI | `src/components/screens/ExtractionDeckBuilder.jsx` |

---

## State Changes

### New Game State Fields

```javascript
// Added to game state
{
  quickDeployMode: boolean,    // True if quick deploy was used
  quickDeployData: {           // The selected quick deployment
    id: string,
    placements: [{ droneName, lane }]
  } | null
}
```

### Save Game Schema Addition

```javascript
// Added to save game root
{
  quickDeployments: [QuickDeployment]
}
```
