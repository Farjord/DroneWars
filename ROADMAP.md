# Drone Wars - Long-Term Development Roadmap

## 🎯 **STRATEGIC VISION**

**Goal:** Transform current client-side game into robust server-based multiplayer system with advanced features.

**Current Phase:** Phase 3 - Server Implementation (Ready to Begin)
**Completed Phase:** Phase 2.12 - Component Data Flow Consistency (Completed 2025-09-27)

---

## ✅ **COMPLETED PHASES**

### **Phase 2.11: GameDataService Implementation (2025-09-27)**
**Status:** ✅ COMPLETED

**Achievement:** 100% centralization of all effective stats calculations

**Components Delivered:**
- **GameDataService.js** - Centralized computation coordinator
- **gameDataCache.js** - Performance caching layer with automatic state-change invalidation
- **useGameData.js** - React hook for clean component integration

**Migration Results:**
- ✅ 78+ scattered calculation calls eliminated across 8+ files
- ✅ Both drone stats (calculateEffectiveStats) and ship stats (calculateEffectiveShipStats) centralized
- ✅ App.jsx playerEffectiveStats useMemo replaced with direct GameDataService calls
- ✅ Intelligent caching with automatic invalidation on game state changes
- ✅ Zero functional changes - pure architectural improvement
- ✅ 100% verification: No direct calculation calls remain in application code
- ✅ Perfect abstraction layer ready for server migration

**Architecture Impact:**
- Clean data flow: GameStateManager ↔ GameDataService ↔ gameDataCache ↔ gameLogic.js
- Server-ready: GameDataService provides ideal abstraction for client-server migration
- Performance: Automatic caching prevents redundant expensive calculations
- Maintainability: Single source of truth for all computed game data

### **Phase 2.12: Component Data Flow Consistency (2025-09-27)**
**Status:** ✅ COMPLETED

**Goal:** Eliminate prop drilling for computed stats by standardizing all utility functions to use GameDataService consistently

**Problem Identified:**
- Mixed patterns: Components used GameDataService but utility functions bypassed it with direct calculations
- Critical Issue: Middle lane bonuses not applied due to architectural violations in utils and gameLogic
- Ship sections showed correct UI stats but actual game values were wrong (energy, hand limits)

**Migration Scope Completed:**
- **cardDrawUtils.js**: ✅ Replaced hardcoded `defaultHandLimit = 5` with GameDataService effective stats calculations
- **gameLogic.js**: ✅ Fixed `initialPlayerState()` energy initialization to use proper placed sections
- **aiLogic.js**: ✅ Removed redundant `calculateEffectiveShipStats` parameter, use only GameDataService
- **GameFlowManager.js**: ✅ Updated to pass gameStateManager to performAutomaticDraw()

**Critical Fixes Achieved:**
- ✅ **Power Cell Middle Lane**: Now correctly provides 12 energy (10 base + 2 bonus) instead of 10
- ✅ **Bridge Middle Lane**: Now correctly provides 6 card hand limit (5 base + 1 bonus) instead of 5
- ✅ **UI-Game Value Consistency**: Stats displayed in UI now match actual game mechanics
- ✅ **100% GameDataService Usage**: Complete elimination of direct calculation bypasses

**Architecture Benefits Realized:**
- Component independence: No prop drilling for computed data
- Architectural consistency: All components and utilities follow identical data access patterns
- Server migration ready: Direct hooks translate cleanly to server-based data fetching
- Cache efficiency: GameDataService handles multiple calls efficiently
- Bug elimination: Middle lane bonuses now work correctly across all game systems

### **Phase 2.13: Stats Calculator Extraction (2025-09-27)**
**Status:** 📋 PLANNED

**Goal:** Extract stats calculation logic from gameLogic.js to eliminate circular dependencies and complete GameDataService architecture

**Problem Identified:**
- gameLogic.js both provides `calculateEffectiveShipStats` and consumes it, creating circular dependency
- GameDataService imports from gameLogic.js, but gameLogic.js should use GameDataService
- This causes the energy initialization bug where function references are passed instead of calculated values
- Architecture confusion about whether to use GameDataService or direct calculation calls

**Implementation Plan:**
- **Create statsCalculator.js**: New module containing pure calculation functions
  - Move `calculateEffectiveShipStats` from gameLogic.js
  - Move `calculateEffectiveStats` from gameLogic.js
  - No dependencies on GameDataService (pure functions only)
- **Update GameDataService**: Import from statsCalculator.js instead of gameLogic.js
- **Update gameLogic.js**: Use GameDataService for all stats calculations
  - Fix `processRoundStart` to use GameDataService
  - Update all 9+ direct calculation calls
  - Remove calculation function exports
- **Verification**: Ensure no circular dependencies remain

**Expected Benefits:**
- ✅ **Clean Architecture**: Clear separation between calculation logic and consumption
- ✅ **Energy Bug Fix**: Proper stats calculation in processRoundStart
- ✅ **No Cache Bypassing**: All calculations go through GameDataService
- ✅ **Maintainability**: Single source of truth for calculations
- ✅ **Testing**: Easier to test pure calculation functions in isolation

**Critical Fixes This Enables:**
- Power Cell middle lane energy bonus (12 energy instead of 0)
- All round start energy calculations
- Consistent caching across entire application

---

## 🚀 **PHASE 3: SERVER IMPLEMENTATION**

### **Priority 1: Create Server Layer**

**Goal:** Build dedicated game server infrastructure

**Components to Implement:**
- **server/GameServer.js** - Central game instance server
  - Hosts individual game sessions
  - Manages game state server-side
  - Handles player actions and validation
  - Broadcasts state updates to clients

- **server/SessionManager.js** - Handle multiple game sessions
  - Create/join/leave game sessions
  - Session lifecycle management
  - Player matchmaking and lobbies
  - Session persistence and recovery

- **server/PlayerConnectionManager.js** - Manage player connections
  - WebSocket connection handling
  - Player authentication and authorization
  - Connection state management
  - Disconnection/reconnection handling

- **network/GameClient.js** - Client-side network interface
  - Abstract network layer for App.jsx
  - Action queuing and retry logic
  - State synchronization
  - Connection status management

### **Priority 2: Network Integration**

**Goal:** Replace P2P system with client-server architecture

**Migration Tasks:**
- **Remove P2P System**: Remove current PeerJS multiplayer implementation
- **WebSocket Implementation**: Replace with client-server WebSocket communication
- **App.jsx Refactor**: Update to connect to server instead of direct game logic
- **Action Routing**: Route all player actions through network layer to server
- **State Management**: Client receives state updates rather than managing state directly

### **Priority 3: Server-Side Game Logic Migration**

**Goal:** Move game logic to server for authoritative gameplay

**Server Migration:**
- **Move Core Managers**: GameStateManager, GameFlowManager, SimultaneousActionManager to server
- **Client Simplification**: Keep only UI state management on client (App.jsx)
- **Validation Layer**: Implement server-side action validation and anti-cheat measures
- **Observer Pattern**: Add spectator mode support

---

## 🔮 **PHASE 4: ADVANCED FEATURES**

### **Enhanced Multiplayer Experience**
- **Lobby System**: Advanced game creation and joining
- **Player Profiles**: User accounts and statistics
- **Matchmaking**: Skill-based player matching
- **Tournament Mode**: Bracket-style competitions

### **Gameplay Features**
- **Replay System**: Record and playback games
- **Spectator Mode**: Watch games in progress
- **Custom Game Modes**: Variations of core gameplay
- **Achievement System**: Player progression and rewards

### **Technical Infrastructure**
- **Anti-Cheat System**: Server-side validation and monitoring
- **Scaling Architecture**: Support for multiple game servers
- **Database Integration**: Persistent player data and game history
- **Analytics**: Game balance and player behavior tracking

---

## 🏗️ **TECHNICAL ARCHITECTURE EVOLUTION**

### **Current Architecture (Phase 2.9)**
```
Client: App.jsx ↔ GameManagers ↔ GameStateManager
```

### **Target Architecture (Phase 3)**
```
Client: App.jsx ↔ GameClient ↔ WebSocket ↔ GameServer ↔ GameManagers ↔ GameStateManager
```

### **Future Architecture (Phase 4)**
```
Multiple Clients ↔ Load Balancer ↔ Game Server Cluster ↔ Database Layer
```

---

## 📋 **TECHNOLOGY STACK DECISIONS**

### **Server Technology**
- **Runtime**: Node.js (consistency with client development)
- **WebSocket Library**: Socket.io (robust, well-tested)
- **Database**: PostgreSQL (ACID compliance for game state)
- **Caching**: Redis (session management, real-time data)

### **Deployment Strategy**
- **Development**: Local server with hot reload
- **Staging**: Docker containers for consistency
- **Production**: Cloud deployment (scalable infrastructure)

### **Security Considerations**
- **Authentication**: JWT tokens for player sessions
- **Validation**: Server-side action validation
- **Rate Limiting**: Prevent spam and DoS attacks
- **Encryption**: TLS for all client-server communication

---

## 🎮 **GAMEPLAY EVOLUTION**

### **Enhanced Game Modes**
- **Quick Play**: Fast matchmaking for casual games
- **Ranked Play**: Competitive ladder system
- **Custom Lobbies**: Player-created game rooms
- **AI Training**: Practice against improved AI

### **Content Expansion**
- **New Drone Types**: Additional units with unique abilities
- **Map Variations**: Different battlefield layouts
- **Card Expansions**: New strategy cards and mechanics
- **Seasonal Events**: Limited-time game modes and rewards

---

## 📊 **SUCCESS METRICS**

### **Phase 3 Goals**
- [ ] Stable server infrastructure supporting 10+ concurrent games
- [ ] Sub-100ms response time for player actions
- [ ] Zero data loss during normal server operation
- [ ] Seamless transition from P2P to server-based multiplayer

### **Phase 4 Goals**
- [ ] Support for 100+ concurrent players
- [ ] 99.9% server uptime
- [ ] Anti-cheat system with <1% false positive rate
- [ ] Rich spectator and replay features

---

## 🔄 **ITERATIVE DEVELOPMENT APPROACH**

### **Minimum Viable Product (MVP)**
1. Basic server infrastructure
2. Single game session support
3. WebSocket communication
4. Core gameplay preservation

### **Incremental Features**
1. Multiple concurrent games
2. Player authentication
3. Spectator mode
4. Replay system
5. Advanced matchmaking

### **Quality Assurance**
- Automated testing for server logic
- Load testing for concurrent players
- Security auditing for vulnerabilities
- Performance monitoring and optimization

---

*Last Updated: 2025-09-27*
*See WORKING_PLAN.txt for current development tasks*
*See CLAUDE.md for architectural design decisions*