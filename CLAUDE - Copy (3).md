Drone Wars - Claude Code Development Guide
This guide is specifically designed for Claude Code development sessions. Follow these patterns and principles when working on the Drone Wars codebase.

Project Architecture
Core Principle: Strict Separation of Concerns
App.jsx: UI only, reads from GameStateManager
GameStateManager: Single source of truth for all game state
ActionProcessor: Handles SEQUENTIAL actions only (deployment/action phases)
gameLogic.js: Pure functions, ONLY file that updates game state
aiLogic.js: Decision making only, never executes actions
Data Flow Patterns for Claude Code
When implementing features, use these exact patterns:

Sequential Phases (Deployment/Action) - USE THIS:
javascript
// In React components
const { processAction } = useGameState();
await processAction('attack', { attackDetails });
Simultaneous Phases (Setup/Shield Allocation) - USE THIS:
javascript
// In React components
const { updatePlayerState, setState } = useGameState();
updatePlayerState('player1', { newShields: allocatedShields });
NEVER DO THIS (Common Mistakes):
javascript
// DON'T: Use ActionProcessor for simultaneous phases
await processAction('allocateShield', { ... }); // during setup

// DON'T: Direct updates during sequential phases  
gameStateManager.setState({ currentPlayer: 'player2' }); // during action phase
Multiplayer: Distributed P2P Architecture
Both players run identical game engines. Sequential phases sync via WebRTC actions. Simultaneous phases sync completion status only.

Phase Type Quick Reference for Claude Code
Simultaneous Phases (Direct GameStateManager Updates)
javascript
const SIMULTANEOUS_PHASES = [
  'preGame', 'droneSelection', 'deckSelection', 'deckBuilding',
  'placement', 'initialDraw', 'allocateShields', 'optionalDiscard'
];
Sequential Phases (Use ActionProcessor)
javascript
const SEQUENTIAL_PHASES = ['deployment', 'action'];
Complete Game Flow:
Setup: Drone Selection → Deck Selection → Ship Placement (all simultaneous)
↓
Gameplay Loop:
1. Hand Limit Enforcement (simultaneous - optionalDiscard phase)
2. Shield Allocation (simultaneous - allocateShields phase)  
3. Deployment Phase (sequential - players alternate until both pass)
4. Action Phase (sequential - players alternate until both pass)
5. Return to step 1 for next round
Implementation Helper:
javascript
// Use this pattern in your code
const isSequentialPhase = (phase) => ['deployment', 'action'].includes(phase);

if (isSequentialPhase(currentPhase)) {
  await processAction(actionType, payload);
} else {
  updateGameState(changes);
  if (isMultiplayer()) sendPhaseCompletion(phase);
}

// Special case: Shield allocation has dual contexts
const handleShieldAction = (actionType, payload) => {
  const phase = gameState.turnPhase;
  
  if (phase === 'allocateShields') {
    // Round start - simultaneous
    updatePlayerState(playerId, newShieldState);
  } else if (phase === 'action') {
    // Action phase reallocation - sequential  
    processAction('reallocateShields', payload);
  }
};
Key Files & Responsibilities
/src/App.jsx
Role: UI controller with phase-aware action routing
Rule: Route actions based on phase type and context
Pattern:
Simultaneous phases: Direct GameStateManager updates
Sequential phases: Use ActionProcessor
Shield actions: Context-aware routing (round start vs action phase)
/src/state/GameStateManager.js
Role: Centralized state management
Rule: Only source of truth, validates phase-appropriate updates
Pattern:
Handles all state updates
Validates update appropriateness by phase type
Event-driven updates
/src/state/ActionProcessor.js
Role: Sequential action serialization ONLY
Rule: ONLY processes deployment/action phase actions
Pattern: Queue-based processing prevents race conditions during turn-based gameplay
Note: Does NOT handle round start shield allocation or hand limit enforcement
/src/state/PhaseManager.js (NEW FILE)
Role: Phase type detection and action routing decisions
Rule: Central authority on phase types and routing logic
Pattern: Determines whether actions should go through ActionProcessor or direct updates
Methods: isSimultaneousPhase(), isSequentialPhase(), shouldUseActionProcessor()
/src/state/SimultaneousPhaseHandler.js (NEW FILE)
Role: Handles all simultaneous phase actions
Rule: Manages parallel player actions and completion tracking
Pattern:
Processes round start shield allocation
Handles hand limit enforcement
Manages setup phase actions
Tracks multiplayer completion status
/src/logic/gameLogic.js
Role: Game rules implementation
Rule: Pure functions only, no side effects
Pattern: Takes state, returns new state + effects
Note: Contains logic for both simultaneous and sequential actions
/src/logic/aiLogic.js
Role: AI decision making
Rule: NEVER executes actions
Pattern: Returns decision objects for appropriate handler (ActionProcessor or SimultaneousPhaseHandler)
/src/hooks/useGameState.js
Role: React bridge with phase-aware routing
Rule: Only way components access game state
Pattern: Provides phase detection methods and smart action routing
/src/utils/gameUtils.js
Role: Game utility functions and constants
Rule: Contains phase type constants and detection helpers
Pattern: SIMULTANEOUS_PHASES, SEQUENTIAL_PHASES, helper functions
/src/utils/phaseValidation.js (NEW FILE)
Role: Phase and action validation
Rule: Validates correct phase/action combinations
Pattern: Warns about incorrect routing, provides debugging info
Critical Development Rules for Claude Code
✅ ALWAYS DO:
javascript
// Check phase type first
const isSequential = ['deployment', 'action'].includes(turnPhase);

// Route accordingly
if (isSequential) {
  await processAction('attack', { attackDetails }); // Serialized
} else {
  updatePlayerState('player1', newState); // Direct update  
}
❌ NEVER DO:
javascript
// DON'T: Wrong routing for shield actions
processAction('allocateShield', {}); // during round start (allocateShields phase)
updatePlayerState('player1', {}); // during action phase reallocation

// DON'T: Wrong routing for hand limit enforcement  
processAction('discardCard', {}); // during round start (optionalDiscard phase)

// DON'T: Bypass GameStateManager
player.energy = 10; // Direct mutation

// DON'T: Mix AI execution with decision making
const decision = aiBrain.makeDecision();
executeDecision(decision); // Should return decision only
Implementation Patterns for Claude Code
Adding New Sequential Actions (Deployment/Action phases):
javascript
// 1. Add to ActionProcessor.js
case 'newAction':
  return await this.processNewAction(payload);

// 2. Add to gameLogic.js  
export const processNewAction = (actionData, gameState) => {
  // Pure function logic
  return { newGameState, effects };
};

// 3. Use in UI
await processAction('newAction', { data });
Adding New Simultaneous Actions (Setup/Round Start phases):
javascript
// 1. Add to gameLogic.js
export const processSimultaneousAction = (actionData, playerState) => {
  // Pure function logic  
  return { newPlayerState };
};

// 2. Use in UI - Direct GameStateManager updates
const result = gameEngine.processSimultaneousAction(data, playerState);
updatePlayerState('player1', result.newPlayerState);

// 3. Add multiplayer completion sync
if (isPhaseComplete()) {
  sendPhaseCompletion(currentPhase);
}
Shield Allocation Special Case:
javascript
// Shield allocation exists in TWO contexts:

// 1. Round start (simultaneous) - allocateShields phase
const handleRoundStartShields = (sectionName) => {
  const result = gameEngine.processShieldAllocation(playerState, sectionName);
  updatePlayerState(playerId, result.newPlayerState);
};

// 2. Action phase (sequential) - action phase abilities
const handleActionPhaseReallocation = (abilityData) => {
  await processAction('reallocateShields', abilityData);
};
AI Decision Implementation:
javascript
// AI returns decisions, never executes
export const aiBrain = {
  makeDeploymentDecision: (gameState) => {
    return { type: 'deploy', drone: selectedDrone, lane: 'lane1' };
  },
  // NOT: executeDeployment() - AI never executes
};

// ActionProcessor executes AI decisions  
const decision = aiBrain.makeDeploymentDecision(gameState);
await processAction('aiTurn', { decision });
Common Issues & Debugging for Claude Code
Shield Action Routing Issues:
javascript
// Problem: Shield action in wrong context
if (actionType.includes('shield') || actionType.includes('Shield')) {
  const phase = gameState.turnPhase;
  console.log(`Shield action ${actionType} in phase ${phase}`);
  
  if (phase === 'allocateShields') {
    console.log('→ Should use direct GameStateManager updates');
  } else if (phase === 'action') {
    console.log('→ Should use ActionProcessor for reallocation abilities');
  }
}
Hand Limit Enforcement Routing:
javascript
// Round start discard/draw should be simultaneous
if (phase === 'optionalDiscard') {
  // Both players act simultaneously - direct updates
  updatePlayerState(playerId, newHandState);
  if (bothPlayersComplete) transitionToShieldAllocation();
}
State Validation Errors:
javascript
// GameStateManager will warn about:
// 1. Using ActionProcessor for round start shield allocation
// 2. Using direct updates for action phase shield reallocation  
// 3. Using ActionProcessor for hand limit enforcement
// 4. Bypassing proper phase routing

// Fix by using correct phase + action routing:
const phase = gameState.turnPhase;
const actionType = 'allocateShield';

if (phase === 'allocateShields') {
  // Round start - simultaneous
  handleRoundStartShieldAllocation(sectionName);
} else if (phase === 'action') {
  // Action phase - sequential
  await processAction('reallocateShields', abilityData);
}
Multiplayer Sync Issues:
javascript
// Sequential phases: Actions auto-sync via ActionProcessor
await processAction('attack', payload); // ✅ Syncs automatically

// Simultaneous phases: Send completion status only
updatePlayerState('player1', newState);
if (isPhaseComplete) {
  sendPhaseCompletion('allocateShields'); // ✅ Sync completion only
}

// Round progression: Wait for both players between phases
const handleRoundStart = async () => {
  // 1. Hand limit (simultaneous)
  setTurnPhase('optionalDiscard');
  await waitForBothComplete('optionalDiscard');
  
  // 2. Shield allocation (simultaneous)
  setTurnPhase('allocateShields'); 
  await waitForBothComplete('allocateShields');
  
  // 3. Deployment (sequential)
  setTurnPhase('deployment');
};
Quick Reference for Claude Code Sessions
Before Making Changes:
Identify Phase Type: ['deployment', 'action'] = sequential, others = simultaneous
Identify Action Context: Shield actions have dual contexts (round start vs action phase)
Choose Routing: Sequential → processAction(), Simultaneous → direct updates
Check Architecture: UI → ActionProcessor → gameLogic.js → GameStateManager (sequential only)
Game Flow Reference:
Setup Phases (Simultaneous):
Drone Selection → Deck Selection → Ship Placement

Round Loop:
1. Hand Limit Enforcement (simultaneous - optionalDiscard)
2. Shield Allocation (simultaneous - allocateShields)
3. Deployment Phase (sequential - deployment)  
4. Action Phase (sequential - action)
5. Repeat from step 1
Key Files to Modify:
gameLogic.js: Pure functions for all game rules (ALWAYS modify this)
ActionProcessor.js: Add sequential action handlers only
App.jsx: Route actions based on phase type
GameStateManager.js: Rarely modify directly
Testing Your Changes:
javascript
// Test sequential actions
await processAction('yourNewAction', { data });

// Test simultaneous actions  
updatePlayerState('player1', newState);

// Verify no race conditions in sequential phases
console.log('Queue length:', getActionQueueLength());
Remember: Your architecture prevents race conditions in turn-based gameplay while allowing efficient parallel execution in setup phases. Always route actions through the appropriate system based on phase type.

