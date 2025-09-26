# Drone Wars Game Architecture - Server-Based System

## 🎯 **CURRENT STATUS: PHASE 2.7 COMPLETE**

**Core Architecture Refactor + Screen Separation: ✅ COMPLETED**

All major architectural components have been successfully implemented:
- ✅ GameFlowManager.js - Master game flow controller with automatic phase processing
- ✅ SimultaneousActionManager.js - Pure commitment coordinator for player interactions
- ✅ Automatic Phase System - Draw and first player determination happen automatically
- ✅ droneSelectionUtils.js - Standalone drone selection utilities
- ✅ shipPlacementUtils.js - Standalone ship placement utilities
- ✅ cardDrawUtils.js - Standalone automatic card drawing utilities
- ✅ firstPlayerUtils.js - Standalone first player determination utilities
- ✅ Pure component design achieved
- ✅ AI routing through same systems as human players
- ✅ All phase initialization/processing fixed
- ✅ Automatic card drawing and first player determination implemented
- ✅ Phase transition validation completed
- ✅ ActionProcessor bypass validation for automatic phases
- ✅ Screen separation architecture - AppRouter + dedicated phase screens
- ✅ App.jsx now only handles active gameplay (no pre-game phases)

## 🚀 **NEXT PHASE: SERVER IMPLEMENTATION**

**Goal:** Implement actual server-based multiplayer system as described in original vision.

### **Remaining Work for Full Server Architecture:**

**Priority 1: Create Server Layer**
- **server/GameServer.js** - Central game instance server
- **server/SessionManager.js** - Handle multiple game sessions
- **server/PlayerConnectionManager.js** - Manage player connections
- **network/GameClient.js** - Client-side network interface

**Priority 2: Network Integration**
- Remove current P2P (PeerJS) multiplayer system
- Replace with client-server WebSocket communication
- Update App.jsx to connect to server instead of direct game logic
- Route all actions through network layer to server

**Priority 3: Server-Side Game Logic**
- Move GameStateManager, GameFlowManager, SimultaneousActionManager to server
- Keep only UI state management on client (App.jsx)
- Implement server-side validation and anti-cheat measures
- Add spectator mode support

---

## 🏗️ **CURRENT ARCHITECTURE (READY FOR SERVER)**

### **Pure Components (Mode-Agnostic)**

**state/GameStateManager.js** ✅ **COMPLETE**
- Pure data store with player-namespaced state
- Emits change events when updated
- Ready for server-side deployment
- NO knowledge of single/multiplayer modes

**state/GameFlowManager.js** ✅ **COMPLETE**
- Master game flow controller with conditional phase logic
- Handles PreGame → Round Loop → Victory flow
- **Automatic Phase Processing**: Directly handles phases that require no player input (draw, determineFirstPlayer)
- **Mixed Phase Type Support**: Seamlessly transitions between Simultaneous, Automatic, and Sequential phases
- Event-driven phase transitions with modal integration
- Ready for server-side deployment

**state/SimultaneousActionManager.js** ✅ **COMPLETE**
- Pure commitment coordinator for simultaneous phases
- Handles player action collection and validation
- AI auto-completion for single-player
- Ready for server-side deployment

**state/AIPhaseProcessor.js** ✅ **COMPLETE**
- AI virtual player integration
- Routes through same systems as human players
- Ready for server-side deployment

**utils/droneSelectionUtils.js** ✅ **COMPLETE**
- Standalone utilities for drone selection initialization
- `initializeDroneSelection()` and `advanceDroneSelectionTrio()`
- Clean separation of concerns

**utils/shipPlacementUtils.js** ✅ **COMPLETE**
- Standalone utilities for ship placement initialization
- `initializeShipPlacement()` and placement validation
- Follows established utility pattern

**utils/cardDrawUtils.js** ✅ **COMPLETE**
- Standalone utilities for automatic card drawing
- `performAutomaticDraw()` with hand limit calculation
- Deck reshuffling and validation logic

**utils/firstPlayerUtils.js** ✅ **COMPLETE**
- Standalone utilities for first player determination
- `determineFirstPlayer()` with turn-based logic (random turn 1, first passer subsequent)
- `processFirstPlayerDetermination()` for state updates and modal data
- `getFirstPlayerReasonText()` for UI explanation text

### **Screen Separation Architecture** ✅ **NEW**

**AppRouter.jsx** ✅ **COMPLETE**
- Central routing based on `gameState.appState` and `gameState.turnPhase`
- Routes: menu → lobby → droneSelection → deckSelection → placement → App.jsx
- Clean separation between menu, lobby, pre-game phases, and active gameplay

**Dedicated Phase Screens:**
- **src/screens/MenuScreen.jsx** ✅ **COMPLETE** - Game mode selection
- **src/screens/LobbyScreen.jsx** ✅ **COMPLETE** - AI selection / multiplayer setup
- **src/components/screens/DroneSelectionScreen.jsx** ✅ **COMPLETE** - Drone selection with state management
- **src/components/screens/DeckSelectionScreen.jsx** ✅ **COMPLETE** - Standard vs custom deck choice
- **src/components/screens/ShipPlacementScreen.jsx** ✅ **COMPLETE** - Ship section placement

### **Client Interface Components**

**App.jsx** ✅ **GAMEPLAY ONLY**
- **NOW HANDLES ONLY ACTIVE GAMEPLAY** - No longer renders pre-game phases
- Player-contextual UI (perspective-aware)
- Uses proper getLocalPlayerState() / getOpponentPlayerState() patterns
- Local UI state management only
- Ready to be converted to network client

---

## 🎯 **SERVER IMPLEMENTATION PLAN**

### **Phase 3.1: Server Infrastructure**

**Create Core Server Components:**
```javascript
// server/GameServer.js - Central game instance
class GameServer {
  constructor() {
    this.gameStateManager = new GameStateManager();
    this.gameFlowManager = new GameFlowManager();
    this.simultaneousActionManager = new SimultaneousActionManager();
    this.aiPhaseProcessor = new AIPhaseProcessor();
  }

  handlePlayerAction(playerId, action) {
    // Route to appropriate manager
    // Broadcast state changes to clients
  }
}

// server/SessionManager.js - Multiple game sessions
class SessionManager {
  createGame(hostPlayerId) { /* */ }
  joinGame(gameId, playerId) { /* */ }
  endGame(gameId) { /* */ }
}

// network/GameClient.js - Client network interface
class GameClient {
  connect(serverId) { /* */ }
  sendAction(action) { /* */ }
  onStateUpdate(callback) { /* */ }
}
```

### **Phase 3.2: Network Protocol**

**Define Client-Server Messages:**
```javascript
// Client → Server
{
  type: 'PLAYER_ACTION',
  gameId: 'abc123',
  playerId: 'player1',
  action: {
    type: 'submitDroneSelection',
    data: { drones: [...] }
  }
}

// Server → Client
{
  type: 'GAME_STATE_UPDATE',
  gameId: 'abc123',
  updates: {
    turnPhase: 'deckSelection',
    player1: { /* updated player state */ }
  }
}
```

### **Phase 3.3: Client Refactor**

**Update App.jsx for Network:**
- Replace direct manager calls with network requests
- Keep local UI state management
- Add connection status handling
- Add reconnection logic

**Remove P2P System:**
- Remove PeerJS dependency
- Remove MultiplayerLobby P2P logic
- Replace with server lobby system

### **Phase 3.4: Advanced Features**

**Server-Side Features:**
- Game session persistence
- Spectator mode
- Replay system
- Anti-cheat validation
- Disconnection handling

---

## 🏆 **ACHIEVED ARCHITECTURE BENEFITS**

✅ **Pure Component Design** - All managers are mode-agnostic and server-ready
✅ **AI Integration** - AI uses same pathways as human players
✅ **Clean Separation** - Game flow vs. commitment coordination properly separated
✅ **Event-Driven** - Managers communicate via events, not direct coupling
✅ **Player Perspective** - UI maintains contextual view regardless of underlying mode
✅ **Conditional Phases** - GameFlowManager skips unnecessary phases automatically
✅ **Automatic Phase System** - No-input phases (draw, first player) happen automatically without player coordination
✅ **Mixed Phase Architecture** - Seamless transitions between Simultaneous, Automatic, and Sequential phase types
✅ **Utility Functions** - Clean, testable, reusable phase utilities (drone selection, ship placement, card drawing, first player determination)
✅ **ActionProcessor Integration** - Proper validation exemptions for automatic phases while maintaining security

---

## 🎮 **CURRENT GAME FLOW (WORKING)**

### **Pre-Game Flow (Simultaneous Phases):**
1. **droneSelection** → SimultaneousActionManager coordinates player commitments
2. **deckSelection** → SimultaneousActionManager coordinates player commitments
3. **placement** → SimultaneousActionManager coordinates player commitments

### **Round Loop Flow (Mixed Phase Types):**
4. **mandatoryDiscard** (Simultaneous) → Only if players exceed hand limit
5. **draw** (Automatic) → GameFlowManager handles automatically with cardDrawUtils
6. **determineFirstPlayer** (Automatic) → GameFlowManager handles automatically with firstPlayerUtils
7. **allocateShields** (Simultaneous) → Only if players have shields to allocate
8. **mandatoryDroneRemoval** (Simultaneous) → Only if players exceed drone limit
9. **deployment** (Sequential) → ActionProcessor handles turn-based play
10. **action** (Sequential) → ActionProcessor handles turn-based play

### **Phase Type Architecture:**
- **Simultaneous Phases**: Coordinated by SimultaneousActionManager (player commitments + AI auto-completion)
- **Automatic Phases**: Handled directly by GameFlowManager (no player input, just happens and progresses)
- **Sequential Phases**: Handled by ActionProcessor (turn-based with proper action validation)

### **Conditional Phase Logic:**
- GameFlowManager.isPhaseRequired() skips unnecessary phases automatically
- Phases only execute if game state requires them (e.g., skip mandatoryDiscard if no hand limit violations)

**The architecture now features a clean separation between player interaction phases and automatic system phases, ready for server deployment.**

---

## 📝 **UPDATE LOG**
- **2025-09-26**: ✅ COMPLETED Phase 2 - Pure component architecture refactor
- **2025-09-26**: ✅ COMPLETED GameFlowManager + SimultaneousActionManager split
- **2025-09-26**: ✅ COMPLETED Drone selection phase fix with utility functions
- **2025-09-26**: ✅ COMPLETED Ship placement phase fix with utility functions
- **2025-09-26**: ✅ COMPLETED Automatic card drawing with utility functions
- **2025-09-26**: ✅ COMPLETED Automatic first player determination with utility functions
- **2025-09-26**: ✅ COMPLETED Phase transition validation fixes
- **2025-09-26**: ✅ COMPLETED AI integration through manager systems
- **2025-09-26**: ✅ COMPLETED Automatic Phase System architecture
- **2025-09-26**: ✅ COMPLETED Screen separation architecture - AppRouter + dedicated phase screens
- **2025-09-26**: ✅ COMPLETED App.jsx refactor - Now handles only active gameplay
- **2025-09-26**: ✅ FIXED GameStateManager logging crash on game start (null player properties)
- **2025-09-26**: Updated CLAUDE.md - Phase 2.7 Complete: Ready for Phase 3: Server Implementation

## 🔧 **LATEST TECHNICAL ACHIEVEMENTS**

### **Screen Separation Architecture Implementation**
- **AppRouter Centralization**: All phase routing now handled by single AppRouter component
- **Dedicated Phase Screens**: Pre-game phases extracted from monolithic App.jsx into dedicated components
- **Pure Port Approach**: Preserved exact look and feel while extracting functionality
- **Self-Contained Components**: Each phase screen includes its own state management and event handling
- **Multiplayer Support**: All phase screens include waiting screens and phase completion tracking
- **Clean Screen Flow**: menu → lobby → droneSelection → deckSelection → placement → active gameplay
- **App.jsx Optimization**: Now only handles active gameplay phases (action, deployment, combat)

### **Critical Bug Fixes**
- **GameStateManager Logging Crash**: Fixed null pointer exception when accessing player properties during game initialization
- **Defensive Null Checks**: Added proper null checks in logPlayerStateChanges() method
- **Startup Stability**: Resolved "Cannot read properties of null" error on game start

### **Automatic Phase System Implementation**
- **Reclassified Phase Types**: Split phases into Simultaneous, Automatic, and Sequential categories
- **Automatic Draw Phase**: GameFlowManager handles card drawing automatically with cardDrawUtils.js
- **Automatic First Player Phase**: GameFlowManager handles first player determination automatically with firstPlayerUtils.js
- **ActionProcessor Bypass Validation**: Added automatic phases ['draw', 'determineFirstPlayer'] to validation exemptions
- **Clean Phase Flow**: draw → determineFirstPlayer → allocateShields → ... → deployment

### **Core Architecture Improvements**
- **GameFlowManager.processAutomaticPhase()**: Centralized automatic phase processing
- **Mixed Phase Type Support**: Seamless transitions between simultaneous, automatic, and sequential phases
- **Conditional Phase Logic**: Phases only execute when required based on game state
- **Event-Driven Modal Integration**: Automatic phases trigger UI modals through phase transition events
- **Utility Pattern Consistency**: All phase logic extracted to dedicated utility files

### **Previous Fixes (Completed)**
- **Fixed Phase Transition Validation**: Updated GameStateManager validTransitions to include all new phase flows
- **Implemented Automatic Card Drawing**: Created cardDrawUtils.js with performAutomaticDraw() function
- **Fixed Phase Data Initialization**: Created utility pattern for drone selection, ship placement, and card drawing
- **Removed Obsolete PhaseManager**: Successfully split functionality into GameFlowManager + SimultaneousActionManager