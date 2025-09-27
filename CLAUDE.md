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

### **Data Computation Architecture**
- **GameDataService**: Centralized computation layer for all dynamic game data
  - **Purpose**: Single source for calculateEffectiveStats and derived data across entire application
  - **Problem Solved**: Eliminates 52 scattered calculateEffectiveStats calls across 6 files
  - **Consumers**: App.jsx, aiLogic.js, modals, UI components, state managers
  - **Benefits**: Consistent calculations, caching opportunities, server-ready abstraction
  - **Data Flow**: GameStateManager → GameDataService → [All computed data consumers]
  - **Core Method**: `getEffectiveStats(drone, lane)` replaces direct gameEngine calls
- **Architecture Pattern**: Computation layer between raw state and application consumers
- **Server Readiness**: Enables easy migration of calculations to server-side validation

---

## 🏗️ **SYSTEM COMPONENT ARCHITECTURE**

### **State Management Layer**

**GameStateManager**
- Single source of truth for all game state
- Player-namespaced state organization
- Event emission for state changes
- Pure data store with no game logic

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

---

*This document focuses on architectural design decisions and component relationships. For implementation status and current work, see WORKING_PLAN.txt. For future development plans, see ROADMAP.md.*