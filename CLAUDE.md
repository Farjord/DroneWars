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

### **Data Computation Architecture** ✅ COMPLETED (2025-09-28)
- **Problem Solved**: Eliminated circular dependency between gameLogic.js and GameDataService
- **Refactor Completed**: Successfully extracted pure calculation functions to dedicated module
- **Implementation Actions**:
  - **Extracted**: Moved `calculateEffectiveStats`, `calculateEffectiveShipStats`, and `getShipStatus` to new `statsCalculator.js`
  - **Separated**: Pure calculation logic (statsCalculator) from caching layer (GameDataService)
  - **Eliminated**: Removed all circular dependencies - gameLogic.js imports from statsCalculator.js but not vice versa
  - **Result**: Clean data flow: statsCalculator → GameDataService → all consumers

- **GameDataService** (Current Implementation):
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

- **Verification (2025-09-28)**:
  - **statsCalculator.js**: Created with pure calculation functions, no external dependencies
  - **Circular Dependencies**: Verified eliminated - no imports between gameLogic.js and GameDataService
  - **Code Duplication**: Removed duplicate `getShipStatus` function from gameLogic.js
  - **Build Status**: ✅ Successful build with no errors
  - **Import Chain**: statsCalculator.js → GameDataService.js → all consumers (clean flow)

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

## 🎮 **ROUND SEQUENCE FLOW ARCHITECTURE** ✅ UPDATED (2025-09-28)

### **Phase Categories & Manager Responsibilities**

**AUTOMATIC_PHASES** (No player input, handled by GameFlowManager):
- `energyReset` - Resets energy and deployment budget at round start
- `draw` - Automatic card drawing to hand limits

**SIMULTANEOUS_PHASES** (Both players commit, handled by SimultaneousActionManager):
- `mandatoryDiscard` - Discard excess cards (conditional)
- `determineFirstPlayer` - First player determination with player acknowledgment
- `allocateShields` - Shield placement (conditional)
- `mandatoryDroneRemoval` - Remove excess drones (conditional)

**SEQUENTIAL_PHASES** (Turn-based, handled by SequentialPhaseManager):
- `deployment` - Drone deployment phase
- `action` - Main combat phase

### **Round Flow Control**

**GameFlowManager Orchestration:**
```
ROUND_PHASES = ['determineFirstPlayer', 'energyReset', 'mandatoryDiscard',
                'optionalDiscard', 'draw', 'allocateShields',
                'mandatoryDroneRemoval', 'deployment', 'action']
```

**Phase Progression Logic:**
1. **GameFlowManager.transitionToPhase()** - Updates gameState.turnPhase
2. **Conditional Phase Skipping** - `isPhaseRequired()` checks game state
3. **Manager Delegation**:
   - Automatic → GameFlowManager processes directly
   - Simultaneous → Delegates to SimultaneousActionManager
   - Sequential → Delegates to SequentialPhaseManager

**First Player Acknowledgment System** ✅ IMPLEMENTED (2025-09-28):
- `determineFirstPlayer` now requires player acknowledgment via Continue button
- `SimultaneousActionManager.acknowledgeFirstPlayer()` handles player confirmation
- Shows `WaitingForPlayerModal` when one player acknowledged but waiting for opponent
- AI auto-acknowledges in single-player mode for seamless progression
- Proper multiplayer synchronization ensures both players see first player before continuing

**Phase Order Correction** ✅ FIXED (2025-09-28):
- Moved `determineFirstPlayer` to START of round (before energyReset)
- Ensures turn order is established before resource management and card handling
- Matches GamePlayFlowAndUI.txt specification for logical game flow
- Added missing `determineFirstPlayer` to `SimultaneousActionManager.phaseCommitments`

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

## ✅ **ARCHITECTURE VIOLATIONS RESOLVED** (2025-09-27)

### **App.jsx Direct State Updates (Architectural Debt) - FIXED**

**Problem Solved**: App.jsx previously contained direct state setter functions that bypassed manager architecture:
```javascript
// VIOLATIONS REMOVED from App.jsx:
setTurnPhase(result.phaseTransition.newPhase);      // REMOVED
setCurrentPlayer(result.phaseTransition.firstPlayer); // REMOVED
setFirstPlayerOfRound(firstPlayer);                 // REMOVED
updateGameState(payload);                           // REMOVED
```

**Resolution Actions Completed**:
1. ✅ **Removed Direct State Setters**: All architectural violations eliminated from App.jsx
2. ✅ **Fixed Related Screens**: MenuScreen.jsx and LobbyScreen.jsx updated to use GameStateManager properly
3. ✅ **Verified Functionality**: Manager-based architecture handles all state transitions correctly
4. ✅ **Build Verification**: No runtime errors, application functions normally

**Correct Architecture Now Enforced**:
```
App.jsx → Manager → GameStateManager → UI Updates ✅
```

**Architecture Compliance**: App.jsx now properly follows event-driven pattern with no direct state manipulation

### **UI Component Architecture** ✅ REFACTORED (2025-09-27)

**Problem Solved**: App.jsx was a monolithic 4000+ line component handling all UI concerns
**Solution**: Systematic component extraction with proper separation of concerns

**Component Extraction Results**:
- **GameHeader.jsx** - Player resources, game controls, and phase display
- **GameBattlefield.jsx** - Ship sections and drone lanes wrapper
- **GameFooter.jsx** - Tabbed interface coordinator with modular sub-components
- **footer/HandView.jsx** - Hand cards, deck/discard piles, optional discard controls
- **footer/DronesView.jsx** - Drone pool display for deployment
- **footer/LogView.jsx** - Game log with CSV download functionality

**CSS Module Implementation**:
- **GameFooter.module.css** - Comprehensive styling using Tailwind @apply directive
- **Consistent Design System** - Semantic class names replace inline styles
- **Maintainable Styling** - Centralized styles with component-scoped CSS modules

**Architecture Benefits Achieved**:
- **Reduced Complexity**: App.jsx reduced from 4000+ to ~3700 lines with clear component boundaries
- **Better Maintainability**: Smaller, focused components easier to debug and modify
- **Improved Reusability**: Modular components can be reused across different contexts
- **Cleaner Prop Management**: Each component receives only the props it needs
- **Separation of Concerns**: UI layout (App.jsx) vs content rendering (sub-components)

**Build Verification**: ✅ All components compile successfully, no runtime errors

### **Clean Architecture Principles**

**Business Logic Layer (No UI)**:
- SimultaneousActionManager
- ActionProcessor
- GameFlowManager
- SequentialPhaseManager

**UI Layer (Reactive Only)**:
- App.jsx (main layout coordinator)
- AppRouter (navigation and routing)
- GameHeader, GameBattlefield, GameFooter (major UI sections)
- footer/* components (specialized UI sections)
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