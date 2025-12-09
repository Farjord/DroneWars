# Phase Management Documentation Roadmap

**Last Updated:** 2025-11-19
**Status:** Complete (Phase Manager Integrated)

---

## Purpose

This documentation project aims to provide a comprehensive technical understanding of the Drone Wars game's phase management system from a developer's perspective.

### What We're Achieving

This documentation will explain:

1. **Phase Flow Architecture** - How the game transitions between different phases from pre-game setup through multiple rounds of gameplay
2. **State Management** - What gameState attributes control phase progression and how they're updated
3. **Player Readiness System** - How the game determines when players are ready to proceed (passing, committing, confirming)
4. **Network Synchronization** - How state changes propagate between Host and Guest in multiplayer games
5. **AI Integration** - How the AI system interacts with the phase management system
6. **Event Listeners** - What useEffect hooks and methods monitor phase changes and trigger responses

### Why This Matters

Understanding the phase flow system is critical for:

- **Debugging** - Identifying where phase transitions break or get stuck
- **Feature Development** - Adding new phases, modifying existing phase behavior, or implementing new player interactions
- **Network Issues** - Diagnosing desynchronization between Host and Guest
- **AI Behavior** - Understanding when and how the AI makes decisions
- **Refactoring** - Safely restructuring the phase management code with confidence

---

## Documentation Structure

### Master Index
- **PHASE_FLOW_INDEX.md** - Complete system overview, architecture diagrams, state attribute reference, and links to all phase documents

### Individual Phase Documents (13 files)
Each phase gets its own detailed document covering:
- User interactions and UI components
- State management and attributes
- State listeners and hooks
- Flow scenarios (Host first, Guest first, simultaneous)
- AI behavior
- Network synchronization
- Flow diagrams
- Code references

---

## Phase Overview

The game is managed by **GameFlowManager.js** with **PhaseManager** as single authority for transitions. The current system contains 10 real phases:

### Pre-Game Phases (3)
1. **deckSelection** - Players select their 40-card deck + 10 drones
2. **droneSelection** - Players choose 5 drones from their 10
3. **placement** - Players arrange their 3 ship sections

### Round Phases (7)
4. **roundInitialization** - Atomic round start (combines game init, first player determination, energy reset, and draw)
5. **mandatoryDiscard** - Forces discard if hand exceeds limit
6. **optionalDiscard** - Allows optional discards + draws to hand limit
7. **allocateShields** - Distribute shields across ship sections (Round 2+)
8. **mandatoryDroneRemoval** - Remove excess drones if over CPU limit
9. **deployment** - Sequential phase where players deploy drones
10. **action** - Sequential phase where players play cards, attack, activate abilities

### Pseudo-Phases (Announcement-Only)
These queue announcements without modifying game state:
- **deploymentComplete** - Announced when deployment → action transition occurs
- **actionComplete** - Announced when action phase ends and round transitions
- **roundAnnouncement** - Announced when new round starts

**Important:** Pseudo-phases use `guestAnnouncementOnly: true` flag and are not included in phase transition validation.

### Phase Classifications
- **Simultaneous Phases** - Both players act independently, then proceed when both commit
- **Sequential Phases** - Players take turns, passing when they're done
- **Automatic Phases** - System-driven, no player input required (roundInitialization)
- **Pseudo-Phases** - Announcement-only, no state modification

---

## Progress Tracker

### Completed Documentation

- [x] ROADMAP.md (this document)
- [x] PHASE_FLOW_INDEX.md (updated with pseudo-phases table)
- [x] PHASE_MANAGER_DESIGN_PRINCIPLES.md
- [x] PHASE_MANAGER_ROADMAP.md
- [x] PHASE_MANAGER_TESTING_CHECKLIST.md

#### Phase Documents
- [x] PHASE_01_DECKSELECTION.md
- [x] PHASE_02_DRONESELECTION.md
- [x] PHASE_03_PLACEMENT.md
- [x] PHASE_04_ROUNDINITIALIZATION.md (replaces 4 automatic phases)
- [x] PHASE_07_MANDATORYDISCARD.md
- [x] PHASE_08_OPTIONALDISCARD.md
- [x] PHASE_10_ALLOCATESHIELDS.md
- [x] PHASE_11_MANDATORYDRONEREMOVAL.md
- [x] PHASE_12_DEPLOYMENT.md (updated with pseudo-phase notes)
- [x] PHASE_13_ACTION.md (updated with pseudo-phase notes)

#### Removed Phase Documents (Consolidated into PHASE_04_ROUNDINITIALIZATION.md)
- ~~PHASE_04_GAMEINITIALIZING.md~~
- ~~PHASE_05_DETERMINEFIRSTPLAYER.md~~
- ~~PHASE_06_ENERGYRESET.md~~
- ~~PHASE_09_DRAW.md~~

---

## ✅ Phase Manager Architecture

**Status:** Complete
**Last Updated:** 2025-11-19

### Overview

The phase management system uses a **Phase Manager** as the single authoritative source for all phase transitions. This architecture solves critical guest/host desynchronization issues in multiplayer games.

### Implementation Summary

1. **PhaseManager Class** - Single entity controlling all phase transitions
2. **Flattened Automatic Phases** - 4 automatic phases (gameInitializing, determineFirstPlayer, energyReset, draw) consolidated into roundInitialization
3. **Pseudo-Phases** - Announcement-only phases (deploymentComplete, actionComplete, roundAnnouncement) that queue UI announcements without modifying state
4. **Guest Reactive Pattern** - Guest waits for Host broadcasts and infers pseudo-phases from state transitions
5. **Simplified Synchronization** - Clear authority model eliminates race conditions

### Architecture Changes

**Completed:**
- Phases 4, 5, 6, 9 removed (automatic phases)
- New Phase 4 is `roundInitialization` (replaces the 4 automatic phases)
- Phase numbering adjusted
- All phase documents reference Phase Manager
- Architecture reflects single authority design

### Related Documents

📘 **[PHASE_MANAGER_DESIGN_PRINCIPLES.md](../../PHASE_MANAGER_DESIGN_PRINCIPLES.md)** - Design philosophy and rationale

📋 **[PHASE_MANAGER_ROADMAP.md](../../PHASE_MANAGER_ROADMAP.md)** - Implementation plan and task breakdown

### Implementation Status

- [x] Design principles documented
- [x] Implementation roadmap created
- [x] PhaseManager class implementation
- [x] Automatic phase flattening (roundInitialization)
- [x] Pseudo-phase system (deploymentComplete, actionComplete, roundAnnouncement)
- [x] GameFlowManager integration
- [x] ActionProcessor integration with guestAnnouncementOnly flag
- [x] Guest optimistic logic removal
- [x] Guest announcement system (timing coordination, pseudo-phase inference, opponent pass detection with firstPasser check)
- [x] Testing and validation
- [x] Documentation updates (all Phase Management docs current)

### For Developers

This documentation reflects the **current production implementation** with Phase Manager fully integrated. The system uses:
- Single authority pattern for phase transitions
- Host-only broadcasts to guest
- Guest reactive pattern with pseudo-phase inference
- Pseudo-phases (deploymentComplete, actionComplete, roundAnnouncement) for announcements without state changes
- Animation timing coordination to prevent race conditions
- firstPasser tracking for accurate opponent pass detection

---

## Key System Components

### Core Files
- **GameFlowManager.js** - Central phase orchestration and transition logic
- **GameStateManager.js** - State structure and update methods
- **ActionProcessor.js** - Processes player actions, commitments, and passes
- **AIPhaseProcessor.js** - AI decision-making for each phase
- **App.jsx** - Main useEffect hooks and UI state management

### State Management Concepts

**Phase Tracking:**
- `gameState.turnPhase` - Current active phase
- `gameState.gameStage` - `'preGame'`, `'roundLoop'`, or `'gameOver'`
- `gameState.roundNumber` - Current round

**Player Readiness:**
- `passInfo` - Tracks who passed in sequential phases
- `commitments` - Tracks completion of simultaneous phases
- `currentPlayer` - Whose turn it is in sequential phases

**Network Modes:**
- `gameMode: 'local'` - Single player vs AI
- `gameMode: 'host'` - Multiplayer host
- `gameMode: 'guest'` - Multiplayer guest

---

## Research Methodology

This documentation was created through:

1. **Source Code Analysis** - Direct examination of .js and .jsx files only (no .md files to ensure accuracy)
2. **Flow Tracing** - Following code execution paths from user interactions through state updates
3. **Network Pattern Analysis** - Identifying broadcast points and optimistic execution flows
4. **AI Integration Study** - Understanding when and how AI makes decisions per phase

---

## Future Enhancements

Potential additions to this documentation:

- Visual flowcharts and diagrams (if tooling supports it)
- Troubleshooting guides for common phase-related issues
- Examples of adding new phases or modifying existing ones
- Performance considerations for phase transitions
- Testing strategies for phase management

---

## Notes for Developers

- This documentation focuses on the **current implementation** as of 2025-11-13
- Code references use **method/function names** rather than line numbers (more maintainable)
- When making changes to phase management, **update the relevant phase document**
- If gameState attributes change, update **PHASE_FLOW_INDEX.md**

---

## Quick Start

For a high-level overview of the system, start with:
1. **PHASE_FLOW_INDEX.md** - System architecture and state attributes
2. Pick a phase you're working on from the list above
3. Review the specific phase document for detailed flow information

For debugging specific issues:
1. Identify which phase is problematic
2. Review that phase's document to understand:
   - What triggers the phase to start/end
   - What state attributes are involved
   - How Host/Guest synchronization works
3. Cross-reference with the actual source code using the provided method names
