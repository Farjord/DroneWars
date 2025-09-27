# Drone Wars - System Architecture Documentation

## 🎯 **ARCHITECTURAL OVERVIEW**

**For current development tasks:** See `WORKING_PLAN.txt`
**For long-term roadmap:** See `ROADMAP.md`

This document provides timeless architectural design decisions and system component relationships for the Drone Wars game engine.

---

## 🔑 **CORE DESIGN DECISIONS**

### **Game Mode Detection Pattern**
- **Decision**: Use `gameMode !== 'local'` consistently across all components
- **Storage**: GameStateManager stores `gameMode` with values:
  - `'local'` = single-player (human is player1, AI is player2)
  - `'host'` = multiplayer host (this player is player1)
  - `'guest'` = multiplayer guest (this player is player2)
- **Rationale**: Single source of truth, clear semantics, no undefined fields
- **Critical**: Never use `multiplayer.enabled` - this field doesn't exist in the architecture

### **Phase Management Architecture**
- **Sequential Phases**: Turn-based gameplay (deployment, action)
  - Managed by `SequentialPhaseManager`
  - Automatic AI turn detection in single-player mode
  - Pass logic and phase transition coordination
  - Configurable AI response delay (default: 1.5 seconds)

- **Simultaneous Phases**: Commitment-based gameplay (selection, placement)
  - Managed by `SimultaneousActionManager`
  - Player commitment collection and validation
  - Instant AI auto-completion for single-player

- **Automatic Phases**: System-driven progression (draw, first player determination)
  - Handled directly by `GameFlowManager`
  - No player input required, automatic progression

### **AI Integration Architecture**
- **AIPhaseProcessor**: AI's equivalent to App.jsx
  - Complete AI player interface across all game phases
  - **Self-Routing Design**: Executes actions directly rather than returning decisions
  - **Dependencies**: ActionProcessor and GameStateManager injected during initialization
  - **Method Pattern**: `execute*Turn()` methods perform actions, don't return decisions

- **Decision Flow**: SequentialPhaseManager → AIPhaseProcessor → (aiLogic.js + ActionProcessor + GameStateManager)
- **Core Principle**: AI uses identical pathways as human players but manages its own execution flow

### **Data Computation Architecture** 🔄 REFACTORING PLANNED
- **Current State**: GameDataService wraps calculations but circular dependency exists with gameLogic.js
- **Discovered Issue**: gameLogic.js both provides AND consumes stats calculations, creating architectural confusion
- **Planned Refactor (Phase 2.13)**:
  - **Extract**: Move `calculateEffectiveStats` and `calculateEffectiveShipStats` to new `statsCalculator.js`
  - **Separate**: Pure calculation logic (statsCalculator) from caching layer (GameDataService)
  - **Eliminate**: Remove circular dependency between gameLogic.js and GameDataService
  - **Result**: Clean data flow: statsCalculator → GameDataService → all consumers

- **GameDataService** (After Refactor):
  - **Purpose**: Caching wrapper for stats calculations
  - **Data Flow**: statsCalculator.js → GameDataService → gameDataCache → consumers
  - **Core Methods**:
    - `getEffectiveStats(drone, lane)` - Drone combat calculations with lane-specific bonuses
    - `getEffectiveShipStats(playerState, placedSections)` - Ship resource calculations (energy, shields, CPU limits)
  - **Caching Layer**: gameDataCache with automatic state-change invalidation for optimal performance
  - **React Integration**: useGameData hook provides clean component access with automatic cache benefits

- **Architecture Benefits**:
  - **No Circular Dependencies**: Clean separation between calculation and consumption
  - **Consistency**: Single source of truth for all computed game data
  - **Performance**: Intelligent caching prevents redundant expensive calculations
  - **Maintainability**: Clear separation of concerns
  - **Server Readiness**: Complete abstraction layer ready for client-server migration

### **Component Data Flow Architecture** ✅ COMPLETED (2025-09-27)
- **Achievement**: 100% GameDataService usage across entire codebase
- **Problem Solved**: Fixed critical middle lane bonus calculation issues in utility functions
- **Architecture Violations Eliminated**:
  - **cardDrawUtils.js**: Replaced hardcoded hand limits with GameDataService calculations
  - **gameLogic.js**: Fixed energy initialization to use proper placed sections
  - **aiLogic.js**: Removed direct calculation bypasses, use only GameDataService
- **Critical Bug Fixes**:
  - **Power Cell Middle Lane**: Now correctly provides 12 energy (10 base + 2 bonus)
  - **Bridge Middle Lane**: Now correctly provides 6 card hand limit (5 base + 1 bonus)
  - **UI-Game Consistency**: Stats displayed in UI now match actual game mechanics
- **Benefits Realized**:
  - **Component Independence**: No prop drilling for computed data
  - **Architectural Consistency**: All components and utilities follow identical data access patterns
  - **Server Migration Ready**: Direct hooks translate cleanly to server-based data fetching
  - **Cache Efficiency**: GameDataService caching handles multiple calls efficiently
- **Verification**: 100% GameDataService usage - no direct calculation calls remain in codebase

---

---

## 🎮 **ROUND SEQUENCE FLOW ARCHITECTURE** ✅ ANALYZED (2025-09-27)

### **Phase Categories & Manager Responsibilities**

**AUTOMATIC_PHASES** (No player input, handled by GameFlowManager):
- `energyReset` - Resets energy and deployment budget at round start
- `draw` - Automatic card drawing to hand limits
- `determineFirstPlayer` - First player determination for the round

**SIMULTANEOUS_PHASES** (Both players commit, handled by SimultaneousActionManager):
- `mandatoryDiscard` - Discard excess cards (conditional)
- `allocateShields` - Shield placement (conditional)
- `mandatoryDroneRemoval` - Remove excess drones (conditional)

**SEQUENTIAL_PHASES** (Turn-based, handled by SequentialPhaseManager):
- `deployment` - Drone deployment phase
- `action` - Main combat phase

### **Round Flow Control**

**GameFlowManager Orchestration:**
```
ROUND_PHASES = ['energyReset', 'mandatoryDiscard', 'draw',
                'determineFirstPlayer', 'allocateShields',
                'mandatoryDroneRemoval', 'deployment', 'action']
```

**Phase Progression Logic:**
1. **GameFlowManager.transitionToPhase()** - Updates gameState.turnPhase
2. **Conditional Phase Skipping** - `isPhaseRequired()` checks game state
3. **Manager Delegation**:
   - Automatic → GameFlowManager processes directly
   - Simultaneous → Delegates to SimultaneousActionManager
   - Sequential → Delegates to SequentialPhaseManager

### **UI Rendering Flow**

**AppRouter Routing Decision:**
- Pre-game phases → Dedicated screens (DroneSelectionScreen, etc.)
- ALL round phases → App.jsx (default case)

**App.jsx Responsibilities:**
- **Pure UI Layer** - Renders based on gameState.turnPhase
- **Event-Driven** - Subscribes to multiple managers for UI cues
- **Reactive** - Never drives phase transitions, only responds

**Manager → UI Communication:**
- **GameStateManager** - Core state changes
- **GameFlowManager** - Phase transition events with modal data
- **SimultaneousActionManager** - Player completion status
- **SequentialPhaseManager** - Turn timing and pass events

---

## 🏗️ **SYSTEM COMPONENT ARCHITECTURE**

### **State Management Layer**

**GameStateManager**
- Single source of truth for all game state
- Player-namespaced state organization
- Event emission for state changes
- Pure data store with no game logic

#### **🚨 CRITICAL: Game State Structure Reference**

**MANDATORY READING**: This section defines the exact game state structure. All code MUST follow these patterns to prevent runtime errors.

**Complete State Structure:**
```javascript
gameState = {
  // Application Level
  appState: 'menu' | 'inGame' | 'gameOver',
  gameMode: 'local' | 'host' | 'guest',
  gameActive: boolean,
  turnPhase: string,

  // Player States (DIRECT PROPERTIES - NOT NESTED)
  player1: {
    name: string,
    energy: number,
    hand: Array,
    dronesOnBoard: { lane1: [], lane2: [], lane3: [] },
    shipSections: Object,
    // ... other player properties
  },
  player2: {
    // Same structure as player1
  },

  // Placed Sections (TOP-LEVEL PROPERTIES)
  placedSections: Array,           // Player1's placed sections
  opponentPlacedSections: Array,   // Player2's placed sections

  // Other Game State
  currentPlayer: string,
  passInfo: Object,
  // ... other properties
}
```

**✅ CORRECT Player State Access:**
```javascript
// In GameStateManager methods
getLocalPlayerState() {
  const localId = this.getLocalPlayerId(); // Returns 'player1' or 'player2'
  return this.state[localId];              // ✅ CORRECT
}

// In GameDataService and other files
const gameState = gameStateManager.getState();
const localPlayerId = gameStateManager.getLocalPlayerId();
const playerState = gameState[localPlayerId];     // ✅ CORRECT
```

**❌ INCORRECT Player State Access:**
```javascript
// NEVER DO THIS - gameState.players does not exist
const playerState = gameState.players[playerId];  // ❌ WRONG - Will cause "Cannot read properties of undefined"
```

**✅ CORRECT Placed Sections Access:**
```javascript
// Placed sections are stored at top level, not on player objects
const getPlacedSectionsForEngine = () => {
  return {
    player1: gameState.placedSections,           // ✅ CORRECT
    player2: gameState.opponentPlacedSections    // ✅ CORRECT
  };
};

// For conditional access
const sections = playerId === 'player1'
  ? gameState.placedSections
  : gameState.opponentPlacedSections;            // ✅ CORRECT
```

**❌ INCORRECT Placed Sections Access:**
```javascript
// NEVER DO THIS - placedSections are not stored on player objects
const sections = gameState.player1.placedSections;  // ❌ WRONG - Property doesn't exist
const sections = gameState.players[playerId].placedSections; // ❌ WRONG - Double error
```

**⚠️ COMMON MISTAKES TO AVOID:**
1. **Non-existent `players` object**: There is no `gameState.players` - player states are direct properties
2. **Placed sections on players**: `placedSections` are top-level properties, not on player objects
3. **Assuming nested structure**: The state is mostly flat, not deeply nested

**📋 REFERENCE CHECKLIST:**
- ✅ Use `gameState.player1` and `gameState.player2` directly
- ✅ Use `gameState[playerId]` for dynamic access where playerId is 'player1' or 'player2'
- ✅ Use `gameState.placedSections` and `gameState.opponentPlacedSections` for placement data
- ❌ Never use `gameState.players[...]`
- ❌ Never access `playerState.placedSections`

**ActionProcessor**
- Neutral engine for processing all player actions
- Action validation and execution
- Queue management for complex operations
- Mode-agnostic action handling

### **Phase Coordination Layer**

**GameFlowManager**
- Master game flow controller
- Phase transition logic and validation
- Automatic phase processing for system-driven phases
- Conditional phase execution based on game state

**SequentialPhaseManager**
- Turn-based phase coordination (deployment, action)
- AI turn scheduling and management
- Pass logic implementation
- Phase completion detection

**SimultaneousActionManager**
- Commitment-based phase coordination
- Player action collection and synchronization
- Validation of simultaneous submissions
- AI auto-completion for single-player mode

### **Data Computation Layer** ✅ IMPLEMENTED

**GameDataService**
- Centralized computation coordinator for all effective stats calculations
- Caching wrapper around original game engine functions
- GameStateManager integration for real-time data access
- React hook integration via useGameData

**gameDataCache**
- Performance optimization layer with Map-based storage
- Automatic cache invalidation on game state changes
- Hit/miss statistics tracking for performance monitoring
- Memory-efficient with deterministic key generation

### **AI Decision Layer**

**AIPhaseProcessor**
- AI's complete game interface
- Phase-specific decision making (`executeDeploymentTurn`, `executeActionTurn`)
- Pass decision logic (`executePass`)
- Integration with aiLogic.js for decision algorithms

### **User Interface Layer**

**AppRouter**
- Central routing based on game state
- Manager initialization and dependency injection
- Screen transition coordination
- Pre-game and active gameplay separation

**App.jsx**
- Active gameplay UI (deployment, action, combat phases)
- Player-contextual perspective management
- Local UI state management only
- Event-driven updates from state managers

**Phase Screens**
- Dedicated components for pre-game phases
- Self-contained state management
- Multiplayer coordination and waiting states

---

## 🔄 **DATA FLOW PATTERNS**

### **Human Player Action Flow**
```
App.jsx → ActionProcessor → GameStateManager → Event Emission → UI Updates
```

### **AI Player Action Flow**
```
SequentialPhaseManager → AIPhaseProcessor → ActionProcessor → GameStateManager → Event Emission → UI Updates
```

### **Data Computation Flow** ✅ IMPLEMENTED
```
Component → GameDataService → gameDataCache (check) → gameEngine.calculate* → Cache Store → Return Result
                            ↓
GameStateManager (state changes) → gameDataCache.invalidateAll() → Fresh calculations
```

### **Phase Transition Flow**
```
GameFlowManager → Phase Managers → ActionProcessor → GameStateManager → Event Emission → UI Updates
```

### **State Update Flow**
```
GameStateManager → Event Emission → All Subscribed Components → UI Re-render
```

---

## 🧩 **SEPARATION OF CONCERNS**

### **Pure Game Logic**
- **GameStateManager**: Data storage and event emission
- **ActionProcessor**: Action execution and validation
- **Phase Managers**: Coordination and flow control
- **Utility Functions**: Reusable game mechanics

### **AI Interface**
- **aiLogic.js**: AI decision algorithms and business logic
- **Clear separation**: AI interface (AIPhaseProcessor) vs AI implementation (aiLogic.js)

### **User Interface**
- **AppRouter**: Navigation and routing
- **App.jsx**: Active gameplay presentation
- **Phase Screens**: Pre-game phase presentation
- **Components**: Reusable UI elements

### **Mode Abstraction**
- All core components are mode-agnostic
- Single-player vs multiplayer handled through configuration
- AI integration transparent to core game logic
- Server-ready architecture with clean client/server boundaries

---

## 🔧 **ARCHITECTURAL PRINCIPLES**

### **Event-Driven Design**
- Components communicate through events, not direct coupling
- GameStateManager as central event hub
- Loose coupling enables easy testing and modification

### **Single Responsibility**
- Each manager handles one specific concern
- Clear boundaries between coordination, execution, and presentation
- Easy to reason about and maintain

### **Mode Agnostic Design**
- Core game logic independent of single-player vs multiplayer
- AI integration through same pathways as human players
- Server deployment ready with minimal changes

### **Dependency Injection**
- Managers receive dependencies during initialization
- Clear dependency relationships
- Easy to mock and test individual components

### **Circular Dependency Prevention**
- **Principle**: No module should both provide and consume the same service
- **Pattern**: Extract shared logic to dedicated modules
- **Example**: statsCalculator.js provides calculations, GameDataService wraps with caching, gameLogic.js consumes
- **Benefits**: Clear data flow, easier testing, prevents architectural confusion

---

## ⚠️ **KNOWN ARCHITECTURE VIOLATIONS** ✅ IDENTIFIED (2025-09-27)

### **App.jsx Direct State Updates (Architectural Debt)**

**Problem**: App.jsx contains direct state setter functions that bypass manager architecture:
```javascript
// VIOLATIONS in App.jsx:
setTurnPhase(result.phaseTransition.newPhase);      // Line 2139, 2309, 2356
setCurrentPlayer(result.phaseTransition.firstPlayer); // Line 2141, 2311, 2360
setFirstPlayerOfRound(firstPlayer);                 // Line 1912
updateGameState(payload);                           // Line 2369
```

**Why These Exist**:
- **Legacy Code**: Predates the manager-based architecture
- **Working But Wrong**: They function because they set the same values GameFlowManager would set
- **Redundant Updates**: GameFlowManager already handles phase transitions via `transitionToPhase()`

**Correct Architecture Pattern**:
```
App.jsx → Manager → GameStateManager → UI Updates
```

**NOT**:
```
App.jsx → GameStateManager (direct)
```

**Risk Assessment**:
- **Current Status**: Working (redundant updates with same values)
- **Future Risk**: Potential conflicts if App.jsx and managers disagree
- **Removal Safety**: Likely safe since GameFlowManager already handles these updates

**Recommended Action**:
1. **Test First**: Add logging to confirm redundancy
2. **Comment Out**: Test if functionality remains intact
3. **Remove**: Clean up direct state setters from useGameState()

### **Clean Architecture Principles**

**Business Logic Layer (No UI)**:
- SimultaneousActionManager
- ActionProcessor
- GameFlowManager
- SequentialPhaseManager

**UI Layer (Reactive Only)**:
- App.jsx
- AppRouter
- Dedicated phase screens

**Data Layer**:
- GameStateManager (single source of truth)
- GameDataService (computed data with caching)

**Event Flow Pattern**:
```
User Input → App.jsx → Manager → GameStateManager → State Change Event → App.jsx Re-render
```

---

*This document focuses on architectural design decisions and component relationships. For implementation status and current work, see WORKING_PLAN.txt. For future development plans, see ROADMAP.md.*