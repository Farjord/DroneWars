# Drone Wars Game Architecture - Server-Based System

## 🎯 **CURRENT STATUS: PHASE 2.8 COMPLETE**

**Core Architecture Refactor + Screen Separation + AI Initialization: ✅ COMPLETED**

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
- ✅ **AppRouter.jsx** - Central routing component with proper manager initialization
- ✅ AI initialization fix - AIPhaseProcessor properly initialized for all game phases

## 🚨 **CRITICAL TODO: FIX PASS LOGIC ARCHITECTURE VIOLATION**

### **Current Problem:**
After a player passes, they're still being prompted for actions. Root cause is competing AI turn management systems that violate the server-based architecture.

### **Architecture Violations Identified:**
1. **App.jsx manages AI turn execution** (lines 1839-1886) - AI TURN EXECUTION useEffect determines when AI should act
2. **ActionProcessor calls aiBrain directly** - processAiTurn() bypasses AIPhaseProcessor and calls aiBrain.handleOpponentTurn() directly
3. **Competing turn management** - Both App.jsx and ActionProcessor try to manage AI timing
4. **Missing pass validation** - ActionProcessor doesn't check pass states before triggering actions

### **Detailed Implementation Tasks:**

#### **Task 1: Remove AI Turn Management from App.jsx** ⚠️ HIGH PRIORITY
- **File**: `src/App.jsx` lines 1839-1886
- **Action**: Delete entire AI TURN EXECUTION useEffect
- **Details**: Remove hasBlockingConditions logic, AI timing logic, executeAiTurn function
- **Reason**: App.jsx should be purely reactive to state changes, not drive AI logic
- **Expected Result**: App.jsx becomes pure UI layer as intended in server architecture

#### **Task 2: Expand AIPhaseProcessor for All Phases** ⚠️ HIGH PRIORITY
- **File**: `src/state/AIPhaseProcessor.js`
- **Missing Methods**:
  - `handleDeploymentTurn(gameState)` - AI decisions for deployment phase
  - `handleActionTurn(gameState)` - AI decisions for action phase
  - `shouldPass(gameState, phase)` - Logic to determine when AI should pass
- **Implementation**: Each method calls appropriate aiLogic.js functions, returns decision to ActionProcessor
- **Reason**: AIPhaseProcessor should be AI's complete equivalent to App.jsx for ALL phases

#### **Task 3: Fix ActionProcessor AI Delegation** ⚠️ HIGH PRIORITY
- **File**: `src/state/ActionProcessor.js` method `processAiTurn()`
- **Current Issue**: Directly calls `aiBrain.handleOpponentTurn()` and `aiBrain.handleOpponentAction()`
- **Required Change**: Replace with calls to AIPhaseProcessor methods
- **Implementation**:
  ```javascript
  // Instead of: aiDecision = aiBrain.handleOpponentTurn(...)
  // Use: aiDecision = await this.aiPhaseProcessor.handleDeploymentTurn(currentState)
  ```
- **Reason**: Maintain proper separation - ActionProcessor = neutral engine, AIPhaseProcessor = AI interface

#### **Task 4: Add Pass State Validation** ⚠️ HIGH PRIORITY
- **File**: `src/state/ActionProcessor.js`
- **Location**: Before any player action processing, before calling AIPhaseProcessor
- **Implementation**: Check `passInfo[playerId + 'Passed']` before allowing actions
- **Details**:
  - Validate human player hasn't passed before processing their actions
  - Validate AI hasn't passed before calling AIPhaseProcessor
  - Only allow phase transitions when both players have acted or passed
- **Reason**: Prevent actions after passing to fix the core reported issue

#### **Task 5: Implement Automatic Turn Management** ⚠️ MEDIUM PRIORITY
- **File**: `src/state/ActionProcessor.js`
- **Goal**: ActionProcessor automatically determines whose turn it is without App.jsx intervention
- **Implementation**:
  - Check currentPlayer state
  - Check pass status for current player
  - If human player's turn and not passed: wait for App.jsx action
  - If AI player's turn and not passed: call AIPhaseProcessor automatically
  - If both passed: trigger phase transition
- **Reason**: Single source of truth for turn management

### **Expected Outcome:**
- ✅ Pass logic works correctly - no more actions after passing
- ✅ Clean architecture: App.jsx (human UI) ↔ ActionProcessor (neutral engine) ↔ AIPhaseProcessor (AI interface)
- ✅ Single turn management system (ActionProcessor only)
- ✅ Proper delegation flow: ActionProcessor → AIPhaseProcessor → aiLogic.js → ActionProcessor

### **Testing Checklist:**
- [ ] Human player passes → no more action prompts
- [ ] AI passes → no more AI actions
- [ ] Both players pass → phase transitions correctly
- [ ] App.jsx has no AI turn management code
- [ ] AIPhaseProcessor handles all AI decisions
- [ ] ActionProcessor is the only turn manager

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
- **AI's equivalent to App.jsx for ALL game phases** (simultaneous AND sequential)
- Complete AI player interface - handles AI decisions across ALL phases
- Routes through same systems as human players via ActionProcessor/PhaseManager
- Calls logic/aiLogic.js for decision-making, then submits actions to ActionProcessor
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
- **Manager Initialization**: Properly initializes SimultaneousActionManager and AIPhaseProcessor
- **Cross-Phase Compatibility**: Ensures managers are available during all game phases

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

## 🤖 **AI ARCHITECTURE FLOW**

### **Proper AI Decision Flow (Intended Architecture):**

**For Human Player:**
- **App.jsx** → **ActionProcessor/PhaseManager** → **GameStateManager**
- App.jsx handles all player interactions across all phases
- App.jsx sends actions to ActionProcessor/PhaseManager for execution

**For AI Player:**
- **ActionProcessor** → **AIPhaseProcessor** → **logic/aiLogic.js** → **AIPhaseProcessor** → **ActionProcessor** → **GameStateManager**
- AIPhaseProcessor is AI's equivalent to App.jsx for ALL phases
- ActionProcessor delegates to AIPhaseProcessor when it's AI's turn
- AIPhaseProcessor calls aiLogic.js for decision-making
- AIPhaseProcessor submits actions back to ActionProcessor for execution

### **Key Principles:**
- **ActionProcessor** = Neutral game engine that both human and AI interact with
- **App.jsx** = Human player interface (UI layer)
- **AIPhaseProcessor** = AI player interface (decision layer)
- **logic/aiLogic.js** = AI business logic (called by AIPhaseProcessor)
- **GameStateManager** = Single source of truth (updated only by ActionProcessor)

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

## 📊 **CURRENT IMPLEMENTATION STATUS**

### **✅ What's Working:**
- **SimultaneousActionManager**: Handles droneSelection, deckSelection, placement phases correctly
- **Basic ActionProcessor Structure**: Handles action processing and validation
- **AIPhaseProcessor for Simultaneous Phases**: Works for droneSelection, deckSelection, placement
- **GameFlowManager**: Automatic phase progression and conditional phase logic
- **Screen Separation**: AppRouter and dedicated phase screens working correctly
- **Phase Transitions**: Most phase flows work correctly
- **Ship Placement Data**: Successfully preserved from placement to deployment phases

### **❌ What's Broken (Architecture Violations):**
- **Pass Logic**: Players still prompted for actions after passing
- **AI Turn Management**: App.jsx incorrectly manages AI timing (lines 1839-1886)
- **ActionProcessor AI Calls**: Directly calls aiBrain instead of delegating to AIPhaseProcessor
- **Competing Turn Systems**: Both App.jsx and ActionProcessor try to manage turns
- **Missing Pass Validation**: ActionProcessor doesn't check pass states before actions

### **⚠️ What's Missing:**
- **AIPhaseProcessor Deployment Methods**: No handleDeploymentTurn() method
- **AIPhaseProcessor Action Methods**: No handleActionTurn() method
- **Pass Decision Logic**: No shouldPass() logic in AIPhaseProcessor
- **Automatic Turn Management**: ActionProcessor doesn't automatically manage turns
- **Proper AI Delegation**: ActionProcessor → AIPhaseProcessor → aiLogic flow not implemented

### **🎯 Next Steps:**
Follow the detailed tasks in the "CRITICAL TODO" section above to fix pass logic and complete the server-ready architecture.

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
- **2025-09-26**: ✅ FIXED AI drone selection error - Moved AIPhaseProcessor initialization to AppRouter
- **2025-09-26**: Updated CLAUDE.md - Phase 2.8 Complete: Ready for Phase 3: Server Implementation
- **2025-09-26**: 🚨 IDENTIFIED Critical Pass Logic Architecture Violation - Added comprehensive TODO section for fixing AI turn management

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

### **Latest Achievements (Phase 2.8)**

#### **AppRouter Implementation**
- **Central Routing Component**: AppRouter.jsx now handles all screen transitions based on gameState.appState and gameState.turnPhase
- **Manager Initialization Centralization**: Moved SimultaneousActionManager and AIPhaseProcessor initialization from App.jsx to AppRouter.jsx
- **Cross-Phase Compatibility**: Ensures all managers are properly initialized during pre-game phases (droneSelection, deckSelection, placement)
- **Clean Architecture**: Separates routing logic from gameplay logic, preparing for server-based architecture

#### **AI Initialization Fix**
- **Root Cause**: AIPhaseProcessor was initialized in App.jsx, but App.jsx was never rendered during pre-game phases
- **Solution**: Moved AIPhaseProcessor.initialize() to AppRouter.jsx to ensure initialization happens during all game phases
- **Result**: Fixed "Not enough drones available for AI selection: 0" error in single-player mode
- **Benefits**: AI can now properly access fullDroneCollection during drone selection phase

#### **Architecture Improvements**
- **Phase-Aware Initialization**: Managers are now initialized at the correct lifecycle stage for all game phases
- **Reduced Duplication**: Eliminated duplicate initialization code between App.jsx and AppRouter.jsx
- **Server Readiness**: Manager initialization pattern is now ready for server-side deployment

### **Previous Fixes (Completed)**
- **Fixed Phase Transition Validation**: Updated GameStateManager validTransitions to include all new phase flows
- **Implemented Automatic Card Drawing**: Created cardDrawUtils.js with performAutomaticDraw() function
- **Fixed Phase Data Initialization**: Created utility pattern for drone selection, ship placement, and card drawing
- **Removed Obsolete PhaseManager**: Successfully split functionality into GameFlowManager + SimultaneousActionManager
- **Screen Extraction**: Successfully extracted all pre-game phases from monolithic App.jsx into dedicated screen components
- **Architecture Violation Fixes**: Eliminated improper GameStateManager updates from UI components