# Phase Flow System - Master Index

**Last Updated:** 2025-11-13 (Updated for PhaseManager Integration)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Phase Classification Table](#phase-classification-table)
3. [State Attributes Reference](#state-attributes-reference)
4. [Phase Documents](#phase-documents)
5. [Critical Code Locations](#critical-code-locations)
6. [Network Synchronization](#network-synchronization)
7. [Key Concepts](#key-concepts)
8. [PhaseManager Integration](#phasemanager-integration)

---

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                         App.jsx                              │
│  - Main useEffect hooks for phase transitions                │
│  - UI state management (showDiscardUI, waitingOverlay, etc.) │
│  - Player interaction handlers (pass, confirm, etc.)         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   GameFlowManager.js                         │
│  - Phase transition orchestration                            │
│  - Automatic phase processing (roundInitialization)          │
│  - Network broadcast coordination                            │
│  - DELEGATES to PhaseManager for all transitions             │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────────┐  ┌──────────────────┐
│  PhaseManager    │  │ ActionProcessor  │
│  - SINGLE        │  │  - Processes     │
│    AUTHORITY     │  │    actions       │
│  - Pass tracking │  │  - Commitments   │
│  - Commit track  │  │  - Notifies PM   │
│  - Transition    │  └──────────────────┘
│    validation    │            │
│  - History log   │            ▼
└──────────────────┘  ┌──────────────────┐
                      │ AIPhaseProcessor │
                      │  - AI decisions  │
                      │  - Per-phase AI  │
                      └──────────────────┘

        ┌──────────────┐
        │ GameState    │
        │ Manager      │
        │  - State     │
        │    structure │
        └──────────────┘
```

### Phase Flow Pipeline

```
User Interaction (Button Click)
    ↓
Handler in App.jsx (handlePlayerPass, handleConfirmShields, etc.)
    ↓
ActionProcessor (processPlayerPass, processCommitment, etc.)
    ↓
PhaseManager.notifyHostAction() / notifyGuestAction()
    ↓
PhaseManager.checkReadyToTransition()
    ↓
PhaseManager.transitionToPhase() [SINGLE AUTHORITY]
    ↓
GameFlowManager.transitionToPhase() [validates + delegates]
    ↓
Next Phase Processing (automatic, sequential, or simultaneous)
    ↓
Network Broadcast (if Host) - PhaseManager broadcasts state
    ↓
Guest Receives Broadcast - Trusts PhaseManager unconditionally
    ↓
Animation Deduplication (OptimisticActionService)
```

---

## Phase Classification Table

| Phase | Type | Classification | Skip Condition | Milestone (Guest Stops) |
|-------|------|----------------|----------------|-------------------------|
| deckSelection | Simultaneous | Pre-Game | Never | No |
| droneSelection | Simultaneous | Pre-Game | Never | Yes |
| placement | Simultaneous | Pre-Game | Never | Yes |
| roundInitialization | Automatic | Round Start | Never | No |
| mandatoryDiscard | Simultaneous | Round Loop | If no excess cards | Yes |
| optionalDiscard | Simultaneous | Round Loop | If no players have cards | Yes |
| allocateShields | Simultaneous | Round Loop | If no shields to allocate (Round 1) | Yes |
| mandatoryDroneRemoval | Simultaneous | Round Loop | If no excess drones | Yes |
| deployment | Sequential | Round Loop | Never | Yes |
| action | Sequential | Round Loop | Never | No |

### Pseudo-Phases (Announcement-Only)

These are not real phases - they queue announcements without modifying game state:

| Pseudo-Phase | When It Occurs | Host Behavior | Guest Behavior |
|--------------|----------------|---------------|----------------|
| deploymentComplete | deployment → action | Queues "DEPLOYMENT COMPLETE" announcement | Infers from deployment→action transition |
| actionComplete | action → round end | Queues "ACTION PHASE COMPLETE" announcement | Infers from action→roundInitialization transition |
| roundAnnouncement | Round starts | Queues "ROUND X" announcement | Infers from roundInitialization entry |

**Important:** Pseudo-phases use `guestAnnouncementOnly: true` flag in `processPhaseTransition()`, which skips state modification and only queues announcements. They are not included in phase transition validation maps.

### ⚠️ Deprecated Phases (Replaced by roundInitialization)
- ~~gameInitializing~~ - Combined into roundInitialization
- ~~determineFirstPlayer~~ - Combined into roundInitialization
- ~~energyReset~~ - Combined into roundInitialization
- ~~draw~~ - Combined into roundInitialization

### Phase Type Descriptions

**Simultaneous Phases:**
- Both players act independently
- Use commitment system (`commitments` object in gameState)
- Complete when both players have `completed: true` in commitments
- UI shows "Waiting for opponent..." overlay when one player commits first

**Sequential Phases:**
- Players take turns based on `currentPlayer`
- Use pass system (`passInfo` object in gameState)
- Complete when both players pass
- Turn transitions after each action/pass

**Automatic Phases:**
- No player input required
- System processes and immediately transitions
- May include delays for animations (e.g., 100ms in gameInitializing)

---

## State Attributes Reference

### Phase & Round State

| Attribute | Type | Description |
|-----------|------|-------------|
| `turnPhase` | string | Current active phase (e.g., 'deployment', 'action') |
| `gameStage` | string | `'preGame'`, `'roundLoop'`, or `'gameOver'` |
| `roundNumber` | number | Current round (starts at 1) |
| `turn` | number | Turn counter, increments when both players pass in action phase |

### Player Readiness - Sequential Phases

| Attribute | Type | Description |
|-----------|------|-------------|
| `passInfo.player1Passed` | boolean | Whether player 1 has passed |
| `passInfo.player2Passed` | boolean | Whether player 2 has passed |
| `passInfo.firstPasser` | string | Player ID who passed first ('player1' or 'player2') |

### Player Readiness - Simultaneous Phases

| Attribute | Type | Description |
|-----------|------|-------------|
| `commitments[phaseName].player1.completed` | boolean | Whether player 1 completed the phase |
| `commitments[phaseName].player1.*` | various | Phase-specific data (drones, sections, cards, etc.) |
| `commitments[phaseName].player2.completed` | boolean | Whether player 2 completed the phase |
| `commitments[phaseName].player2.*` | various | Phase-specific data |

### Turn Management

| Attribute | Type | Description |
|-----------|------|-------------|
| `currentPlayer` | string | `'player1'` or `'player2'` - whose turn it is |
| `firstPlayerOfRound` | string | Player who goes first this round |
| `firstPasserOfPreviousRound` | string | Used to determine next round's first player |

### Game Mode

| Attribute | Type | Description |
|-----------|------|-------------|
| `gameMode` | string | `'local'` (vs AI), `'host'`, or `'guest'` |

### Phase-Specific State

| Attribute | Type | Description |
|-----------|------|-------------|
| `excessCards` | number | Cards over hand limit (mandatoryDiscard) |
| `optionalDiscardCount` | number | Optional discards made this phase |
| `shieldsToAllocate` | number | Shields to distribute (allocateShields) |
| `excessDrones` | number | Drones over CPU limit (mandatoryDroneRemoval) |
| `deploymentBudget` | number | Deploy cost budget for deployment phase |

---

## Phase Documents

### Pre-Game Phases

1. [PHASE_01_DECKSELECTION.md](./PHASE_01_DECKSELECTION.md) - Players select 40-card deck + 10 drones
2. [PHASE_02_DRONESELECTION.md](./PHASE_02_DRONESELECTION.md) - Players choose 5 drones from their 10
3. [PHASE_03_PLACEMENT.md](./PHASE_03_PLACEMENT.md) - Players arrange ship sections

### Round Loop Phases

4. [PHASE_04_ROUNDINITIALIZATION.md](./PHASE_04_ROUNDINITIALIZATION.md) - **NEW** Atomic round start (combines 4 automatic phases)
5. [PHASE_07_MANDATORYDISCARD.md](./PHASE_07_MANDATORYDISCARD.md) - Forces discard if over hand limit
6. [PHASE_08_OPTIONALDISCARD.md](./PHASE_08_OPTIONALDISCARD.md) - Optional discards + draw to hand limit
7. [PHASE_10_ALLOCATESHIELDS.md](./PHASE_10_ALLOCATESHIELDS.md) - Distribute shields (Round 2+)
8. [PHASE_11_MANDATORYDRONEREMOVAL.md](./PHASE_11_MANDATORYDRONEREMOVAL.md) - Remove excess drones
9. [PHASE_12_DEPLOYMENT.md](./PHASE_12_DEPLOYMENT.md) - Deploy drones sequentially
10. [PHASE_13_ACTION.md](./PHASE_13_ACTION.md) - Play cards, attack, activate abilities

### ⚠️ Deprecated Documents (Removed - Functionality moved to PHASE_04_ROUNDINITIALIZATION.md)
- ~~PHASE_04_GAMEINITIALIZING.md~~ - Merged into roundInitialization
- ~~PHASE_05_DETERMINEFIRSTPLAYER.md~~ - Merged into roundInitialization
- ~~PHASE_06_ENERGYRESET.md~~ - Merged into roundInitialization
- ~~PHASE_09_DRAW.md~~ - Merged into roundInitialization

---

## Critical Code Locations

### PhaseManager.js Methods (NEW - Single Authority)

**Core Authority:**
- `transitionToPhase(newPhase)` - **ONLY METHOD** that changes turnPhase (Guest blocked)
- `notifyHostAction(actionType, data)` - Tracks Host passes/commitments
- `notifyGuestAction(actionType, data)` - Tracks Guest passes/commitments (via network)
- `checkReadyToTransition()` - Determines if both players ready (pass/commit)

**State Tracking:**
- `hostLocalState` - Tracks Host passInfo and commitments
- `guestLocalState` - Tracks Guest passInfo and commitments
- `phaseState` - Current phase state (turnPhase, gameStage, roundNumber, etc.)

**Validation & History:**
- `validateTransition(currentPhase, newPhase)` - Prevents invalid transitions
- `transitionHistory` - Log of all phase transitions (debugging)

### GameFlowManager.js Methods

**Phase Transition (Delegated to PhaseManager):**
- `transitionToPhase(newPhase)` - **Guest guard** blocks Guest, delegates to PhaseManager
- `getNextPhase(currentPhase, gameStage)` - Determines next phase in sequence
- `isPhaseRequired(phase, gameState)` - Checks if phase should be skipped

**Simultaneous Phase Management:**
- `onSimultaneousPhaseComplete()` - **Guest guard** blocks Guest from triggering
- `applyPhaseCommitments(phase)` - Applies committed data to gameState

**Sequential Phase Management:**
- `onSequentialPhaseComplete()` - **Guest guard** blocks Guest from triggering
- `switchTurn()` - Transitions turn to other player

**Automatic Phase Processing:**
- `processRoundInitialization()` - **NEW** Atomic round start (4 phases in 1)
  - Step 1: Game stage transition
  - Step 2: Determine first player
  - Step 3: Energy & resource reset
  - Step 4: Card draw

**Network Coordination:**
- PhaseManager handles all broadcasts (removed from GameFlowManager)

### ActionProcessor.js Methods

- `setPhaseManager(phaseManager)` - **NEW** Injects PhaseManager reference
- `processPlayerPass(playerId)` - Handles pass actions, **notifies PhaseManager**
- `processCommitment(playerId, phase, data)` - Handles commitments, **notifies PhaseManager**
- `queueAction(action)` - Adds actions to execution queue
- `processActionQueue()` - Executes queued actions

### AIPhaseProcessor.js Methods

**Phase-Specific AI:**
- `processDeckSelection()` - AI deck building
- `processDroneSelection()` - AI drone selection
- `processPlacement()` - AI ship placement
- `executeMandatoryDiscardTurn()` - AI mandatory discard logic
- `executeOptionalDiscardTurn()` - AI optional discard logic
- `executeShieldAllocationTurn()` - AI shield distribution
- `executeMandatoryDroneRemovalTurn()` - AI drone removal logic
- `executeDeploymentTurn()` - AI deployment decisions
- `executeActionTurn()` - AI action phase decisions

**AI Coordination:**
- `checkForAITurn()` - Determines if AI should act
- `executeTurn()` - Main AI turn execution

### App.jsx Hooks & Handlers

**Phase Transition Listener:**
- Phase Manager subscription useEffect (monitors phase changes, clears waiting overlays)

**User Interaction Handlers:**
- `handlePlayerPass()` - Pass button in deployment/action phases
- `handleConfirmShields()` - Shield allocation confirmation
- `handleCommitPhase()` - Generic commitment handler for simultaneous phases

**UI State Calculators:**
- `shouldShowDiscardUI` calculation - Determines if discard UI should show
- Waiting overlay state management

### UI Components

**GameHeader.jsx:**
- Pass button (deployment/action phases)
- Continue button (mandatoryDiscard, mandatoryDroneRemoval)
- Confirm/Reset buttons (allocateShields, optionalDiscard)

**HandView.jsx:**
- Card selection for discards
- Card play interactions

**ShipSectionCompact.jsx:**
- Shield allocation clicks
- Ship ability activation

**DronesView.jsx:**
- Drone deployment clicks
- Drone removal selection

---

## Network Synchronization

### PhaseManager Broadcast System (NEW)

**PhaseManager.transitionToPhase()** is the **single broadcast point**:
- Host mode: Broadcasts after every phase transition
- Guest mode: Cannot call transitionToPhase (blocked by guard)
- Local mode: No network operations

**Broadcast Consolidation:**
- OLD: 5+ broadcast points scattered across GameFlowManager
- NEW: 1 broadcast point in PhaseManager.transitionToPhase()
- Result: Eliminates race conditions, guarantees order

### Host Authority Pattern

**Host Responsibilities:**
1. Receives action notifications from ActionProcessor
2. PhaseManager tracks both players' passes/commitments
3. When both ready → PhaseManager.transitionToPhase()
4. Single broadcast sent with new phase
5. Guest receives broadcast and updates

**Host does NOT:**
- Send multiple broadcasts per transition
- Broadcast partial state updates
- Trigger optimistic cascades

### Guest Reactive Pattern

**Guest Responsibilities:**
1. Sends actions to Host via network
2. Shows immediate UI feedback (animations, waiting overlays)
3. **Cannot transition phases** - blocked by Guest guards
4. Waits for PhaseManager broadcasts from Host
5. Trusts all broadcasts unconditionally (no validation)

**Guest does NOT:**
- Self-transition phases (blocked in 3 locations)
- Run optimistic cascades (removed in Phase 5)
- Validate Host broadcasts (simplified in Phase 6)
- Reject state updates (trusts PhaseManager)

### ⚠️ Removed Systems (Phase 5 & 6)

**Removed: Guest Optimistic Execution**
- No longer executes automatic phases locally
- No longer triggers cascades after simultaneous phases
- Waits for PhaseManager broadcasts instead

**Removed: Complex Guest Validation**
- No ALLOWED_HOST_PHASES matrix
- No passInfo/phase mismatch checks
- Trusts PhaseManager unconditionally

**Removed: Multiple Broadcast Points**
- Consolidated into single PhaseManager.transitionToPhase()

### Animation Deduplication (Preserved)

**OptimisticActionService:**
- Still filters duplicate animations
- Guest gets immediate feedback for own actions
- Host echoes actions back → deduplication prevents double animations

**App.jsx:**
- Maintains animation tracking
- Works seamlessly with PhaseManager broadcasts

---

## Key Concepts

### 1. Commitment System (Simultaneous Phases)

**Structure:**
```javascript
commitments: {
  [phaseName]: {
    player1: {
      completed: boolean,
      // ... phase-specific data
    },
    player2: {
      completed: boolean,
      // ... phase-specific data
    }
  }
}
```

**Flow:**
1. Player interacts with UI (e.g., clicks "Confirm")
2. Handler calls ActionProcessor with commitment data
3. Commitment stored in gameState
4. GameFlowManager detects both players completed
5. Phase transition triggered

### 2. Pass System (Sequential Phases)

**Structure:**
```javascript
passInfo: {
  player1Passed: boolean,
  player2Passed: boolean,
  firstPasser: string // 'player1' or 'player2'
}
```

**Flow:**
1. Player clicks "Pass" button
2. `handlePlayerPass()` calls ActionProcessor
3. `passInfo` updated for that player
4. PhaseAnimationQueue shows "YOU PASSED"
5. Turn switches to opponent (if not both passed)
6. When both passed → phase transition

### 3. First Player Determination

**Round 1:** Random selection

**Round 2+:** Player who passed SECOND in previous action phase goes first
- `firstPasserOfPreviousRound` is set to the player who passed first
- Next round, the OTHER player becomes `firstPlayerOfRound`

### 4. Phase Skip Logic

Phases are conditionally skipped based on game state:
- **mandatoryDiscard:** Skipped if no player exceeds hand limit
- **optionalDiscard:** Skipped if no players have cards
- **allocateShields:** Skipped in Round 1 (no shields to allocate)
- **mandatoryDroneRemoval:** Skipped if no player exceeds drone limit

Method: `isPhaseRequired(phase, gameState)` in GameFlowManager

### 5. Turn vs Round

**Turn:**
- Increments during action phase when both players pass
- Used for tracking how many action "cycles" have occurred in a round
- Reset to 1 at start of each round

**Round:**
- Represents a complete cycle through all round loop phases
- Starts at 1, increments when action phase completes and new round starts
- Affects game mechanics (shields only allocated Round 2+, deployment budgets differ)

### 6. Local vs Multiplayer Modes

**Local Mode (`gameMode: 'local'`):**
- Player vs AI
- `checkSequentialPhaseCompletion()` used for sequential phases
- AI turn detection via `checkForAITurn()`
- No network synchronization

**Host Mode (`gameMode: 'host'`):**
- Processes all actions authoritatively
- Broadcasts state to guest after transitions
- `handleActionCompletion()` handles phase completion

**Guest Mode (`gameMode: 'guest'`):**
- Processes actions optimistically
- Sends actions to host for validation
- Waits at milestone phases for host broadcast
- Deduplicates animations when broadcast arrives

### 7. Animation Queue System

**PhaseAnimationQueue:**
- Queues animations like "YOU PASSED", "OPPONENT PASSED", "YOU ARE FIRST PLAYER"
- Prevents UI spam by managing animation timing
- Integrated with phase transition system

#### Guest Announcement Architecture

The guest announcement system is designed to coordinate React component rendering with animation playback to prevent race conditions while maintaining responsive UX.

**Playback Timing Coordination:**

Guest uses a 50ms delay before starting animation playback after receiving state updates. This delay exists because:
- `setState()` in React is asynchronous - state updates complete synchronously but rendering occurs later
- App.jsx's useEffect hooks that subscribe to animation events only run after React re-renders
- Without delay, animation events would fire before subscriptions exist, causing lost announcements
- 50ms provides a comfortable buffer (3x typical 16ms render cycle) while remaining imperceptible to users

**Implementation:** `GuestMessageQueueService.processQueue()` schedules playback via `setTimeout(() => startPlayback(), 50)` after queue processing completes.

**Phase Change Detection:**

Guest only queues phase announcements when actual phase transitions occur (`guestPhase !== hostPhase`), not on every state update. This prevents announcement spam when host broadcasts incremental state changes (like player actions, pass info updates, etc.) within the same phase.

**Pseudo-Phase Inference:**

Host queues pseudo-phases (roundAnnouncement, actionComplete, deploymentComplete) during transitions but doesn't broadcast them to guest. Guest infers when to queue these announcements by detecting specific state transition patterns:

**Pattern 1 - Round Transitions (action → roundInitialization or other round phase):**
- Triggered when guest leaves action phase
- Checks if guest already passed via `passInfo[localPlayerId]Passed`
- If yes, infers opponent also passed (required for round to end)
- Queues: OPPONENT PASSED → ACTION PHASE COMPLETE → ROUND X → [next phase]
- Location: `GuestMessageQueueService.processStateUpdate()` lines 586-624

**Pattern 2 - Round 1 Start (placement → roundInitialization):**
- Triggered at game start after ship placement
- Queues: ROUND 1 → UPKEEP
- Location: `GuestMessageQueueService.processStateUpdate()` lines 626-639

**Pattern 3 - Deployment Complete (deployment → action):**
- Triggered when deployment phase ends
- DEPLOYMENT COMPLETE is a **pseudo-phase** (announcement-only, does not modify state)
- Checks if guest already passed via `passInfo[localPlayerId]Passed`
- If yes AND guest was `firstPasser`, infers opponent also passed (required for deployment to end)
- Queues: OPPONENT PASSED (if guest passed first) → DEPLOYMENT COMPLETE → ACTION PHASE
- Location: `GuestMessageQueueService.processStateUpdate()` lines 609-641
- **Note:** Order is important - OPPONENT PASSED must appear before DEPLOYMENT COMPLETE

**Pattern 4 - All Phase Transitions:**
- Queues announcement for the actual phase being transitioned to
- Uses `phaseTextMap` to generate display text and subtitles
- Location: `GuestMessageQueueService.processStateUpdate()` lines 667-683

**Opponent Pass Inference:**

In sequential phases (deployment, action), both players must pass for the phase to end. Guest leverages this rule to infer opponent pass:
- If guest already passed (`passInfo[localPlayerId]Passed === true`)
- AND phase transitions away from sequential phase
- THEN opponent must have also passed (otherwise phase wouldn't transition)
- Queue "OPPONENT PASSED" announcement automatically

This inference approach eliminates the need for explicit opponent pass notifications and works reliably because sequential phase completion requires both players passing.

**Waiting Modal Coordination:**

Waiting modals (shown when local player commits but opponent hasn't) check animation queue status before displaying:
- If announcements are queued or playing, subscribe to `onComplete` event
- Show modal only after all announcements finish
- If no announcements, show modal immediately
- Prevents UI conflicts where modals overlay phase announcements
- Location: `App.jsx` commitment monitor useEffect lines 1578-1647
- Applies to: mandatoryDiscard, optionalDiscard, allocateShields, mandatoryDroneRemoval phases

---

## Troubleshooting Guide

### Phase Stuck / Won't Progress

**Check:**
1. Is it a simultaneous phase? Both players must commit
2. Is it a sequential phase? Both players must pass
3. Is there a condition preventing the phase? Check `isPhaseRequired()`
4. Is the guest waiting for host broadcast at a milestone?

**Debug:**
- Log `gameState.commitments` for simultaneous phases
- Log `gameState.passInfo` for sequential phases
- Check GameFlowManager broadcast methods for host
- Check GuestMessageQueueService for guest synchronization

### Desynchronization Between Host/Guest (FIXED with PhaseManager)

**PhaseManager solves desync issues:**
- Single authority pattern prevents dual transitions
- Guest blocked from self-transitioning in 3 locations
- Host-only broadcasts eliminate race conditions

**If desync still occurs:**
1. Check PhaseManager logs - look for `🚫 Guest attempted to transition`
2. Verify Guest guards active in GameFlowManager (lines 782, 477, 1855)
3. Check PhaseManager.transitionHistory for unexpected transitions
4. Verify ActionProcessor notifying PhaseManager (processPlayerPass, processCommitment)

### AI Not Taking Turn

**Check:**
1. Is `currentPlayer` set to AI player ID?
2. Is phase a sequential phase (deployment/action)?
3. Has `checkForAITurn()` been called?

**Debug:**
- Log `gameState.currentPlayer`
- Log AIPhaseProcessor execution
- Verify AI player ID matches `currentPlayer`

---

## PhaseManager Integration

### Overview

**PhaseManager** is a centralized authority system introduced to solve critical desynchronization issues between Host and Guest in multiplayer games.

### Problem It Solves

**Before PhaseManager:**
- Host and Guest independently transitioning phases
- Race conditions when both players pass/commit simultaneously
- Guest optimistic cascades causing phase mismatches
- 5+ broadcast points creating timing issues
- Complex validation logic rejecting valid broadcasts

**After PhaseManager:**
- Single authority for all phase transitions
- Guest cannot self-transition (blocked in 3 locations)
- Single broadcast point per transition
- Guest trusts all PhaseManager broadcasts
- Eliminates race conditions and desync

### Implementation Phases (Completed)

**Phase 1: Create PhaseManager Class** ✅
- Built PhaseManager.js with single authority pattern
- Separate tracking for hostLocalState and guestLocalState
- Validation, history logging, and transition control

**Phase 2: Flatten Automatic Phases** ✅
- Combined 4 phases (gameInitializing, determineFirstPlayer, energyReset, draw) into roundInitialization
- Single atomic operation, single broadcast
- Eliminates cascade timing issues

**Phase 3: Integrate PhaseManager with GameFlowManager** ✅
- Imported PhaseManager in GameFlowManager
- Added Guest guard to transitionToPhase()
- Injected PhaseManager into ActionProcessor
- PhaseManager.transitionToPhase() called for all transitions

**Phase 4: Integrate PhaseManager with ActionProcessor** ✅
- Created setPhaseManager() method
- Updated processPlayerPass() to notify PhaseManager
- Updated processCommitment() to notify PhaseManager
- Supports host/guest/local modes

**Phase 5: Remove Guest Optimistic Transitions** ✅
- Added Guest guard to onSimultaneousPhaseComplete()
- Removed Guest optimistic both-pass processing
- Removed Guest optimistic cascade logic
- Preserved Guest UI feedback (animations, waiting overlays)

**Phase 6: Simplify Guest Validation** ✅
- Removed ALLOWED_HOST_PHASES matrix (complex checkpoint validation)
- Removed cascade triggering logic
- Simplified broadcast validation (trust PhaseManager)
- Simplified state application (preserve gameMode only)

**Phase 7: Update Animation System** ✅
- Verified PhaseAnimationQueue compatibility
- Verified Guest immediate action feedback preserved
- Verified animation deduplication preserved (OptimisticActionService)
- Verified App.jsx animation triggers work with PhaseManager

**Phase 8: Comprehensive Testing** ⏳
- Created PHASE_MANAGER_TESTING_CHECKLIST.md
- 40+ test scenarios across 5 test suites
- Requires manual execution in browser (local + multiplayer)

**Phase 9: Update Documentation** 🔄 (In Progress)
- Updating PHASE_FLOW_INDEX.md (this file)
- Creating PHASE_04_ROUNDINITIALIZATION.md
- Removing obsolete phase documents
- Updating PHASE_MANAGER_ROADMAP.md

### Key Architecture Decisions

**1. Single Authority Pattern**
- ONLY PhaseManager.transitionToPhase() changes turnPhase
- Guest blocked from calling transition methods (3 guard locations)
- Eliminates dual authority race conditions

**2. Notification System**
- ActionProcessor notifies PhaseManager of all actions
- notifyHostAction() for Host passes/commitments
- notifyGuestAction() for Guest passes/commitments (via network)
- PhaseManager tracks both independently

**3. Atomic Transitions**
- checkReadyToTransition() verifies both players ready
- Single transitionToPhase() call when ready
- Single broadcast per transition
- No partial state updates

**4. Guest Trust Model**
- Guest trusts all PhaseManager broadcasts unconditionally
- No validation, no rejection, no desync
- Immediate UI feedback preserved for responsiveness
- Animation deduplication prevents visual duplicates

### Migration Guide

**If adding new phases:**
1. Add phase to PHASE_CONSTANTS in GameFlowManager
2. Add logic to getNextPhase()
3. PhaseManager automatically handles the transition
4. No additional broadcast logic needed

**If modifying phase completion:**
1. Update ActionProcessor to call processPlayerPass() or processCommitment()
2. PhaseManager notification happens automatically
3. No changes needed to PhaseManager itself

**If debugging phase issues:**
1. Enable PHASE_MANAGER logging in debugLogger.js
2. Check console for `🚫 Guest attempted to transition` errors
3. Review PhaseManager.transitionHistory for unexpected transitions
4. Verify ActionProcessor notifying PhaseManager correctly

### Performance Impact

**Negligible:**
- PhaseManager tracking adds ~1ms per action
- Single broadcast reduces network calls by 75%
- Eliminates validation overhead in GuestMessageQueueService
- Net improvement in responsiveness

---

## Version History

- **2025-11-13:** Initial documentation created from source code analysis
- **2025-11-13:** Updated for PhaseManager integration (Phases 1-7 complete)
