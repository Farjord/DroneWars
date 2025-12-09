# Phase Manager Architecture - Design Principles

**Date:** 2025-11-13
**Status:** Design Phase
**Author:** System Architecture Review

---

## Executive Summary

The current phase management system suffers from critical synchronization issues between Host and Guest in multiplayer games, causing players to end up in different phases. This document outlines the design principles for a new **Phase Manager** architecture that solves these issues by establishing a single authoritative source for phase transitions.

---

## Problem Statement

### Symptoms

In multiplayer games, Host and Guest frequently desynchronize:
- Guest shows "action" phase while Host shows "deployment" phase
- Players stuck on "Waiting for opponent..." even when both ready
- Phase complete animations play at different times
- Turn/round counters out of sync
- Energy and resource values diverge

### Impact

- **Game Breaking** - Players cannot progress through phases
- **Poor UX** - Confusing state mismatches visible to players
- **Difficult to Debug** - Race conditions are intermittent and timing-dependent
- **Loss of Trust** - Players unsure if game state is correct

---

## Root Cause Analysis

### The Fundamental Problem: Dual Authority

The current architecture has **two entities** trying to manage phase transitions:

1. **Host's GameFlowManager** - Processes phases and broadcasts to Guest
2. **Guest's GameFlowManager** - Processes phases optimistically

Both maintain separate `gameState.turnPhase` and both call `transitionToPhase()`. This creates race conditions where:
- Guest transitions before receiving Host's broadcast
- Host broadcasts stale state that overwrites Guest's optimistic state
- Both process automatic phases independently with different timing

### The 7 Critical Race Conditions

#### Race #1: Guest Optimistic Both-Pass Processing
**Location:** GameFlowManager.js lines 255-263

**Problem:** When Guest passes and detects both players passed, Guest calls `onSequentialPhaseComplete()` and transitions phases without waiting for Host confirmation.

**Result:** Guest advances to 'action' phase while Host still in 'deployment' phase.

#### Race #2: Missing Guest Guard in onSequentialPhaseComplete
**Location:** GameFlowManager.js line 772

**Problem:** `onSequentialPhaseComplete()` has no guard preventing Guest from calling it. This allows Guest to self-authorize phase transitions.

**Result:** Guest violates authority model and transitions independently.

#### Race #3: Commitment Broadcast Timing
**Location:** ActionProcessor.js lines 2893-2900

**Problem:** Host broadcasts state immediately after storing a commitment, before checking if both players committed. Guest receives broadcast showing `bothComplete=true` and cascades before Host is ready.

**Result:** Guest and Host both cascade through automatic phases independently, creating timing-based desync.

#### Race #4: Cascade Desynchronization
**Location:** GameFlowManager.js lines 467-541, GuestMessageQueueService.js lines 704-752

**Problem:** After placement completes, Guest receives broadcast and starts optimistic cascade (gameInitializing → determineFirstPlayer → energyReset → draw). Host also cascades at its own pace. No synchronization between them.

**Result:** Both arrive at 'deployment' phase but intermediate state histories differ, causing validation failures.

#### Race #5: PassInfo State Validation Mismatch
**Location:** GuestMessageQueueService.js lines 556-574

**Problem:** Guest validates Host broadcasts using local stale `passInfo`. Host resets `passInfo` during phase transitions, but Guest checks against old local value.

**Result:** Guest incorrectly rejects valid phase transition broadcasts.

#### Race #6: setState Race Condition
**Location:** GameStateManager.js lines 408-442

**Problem:** ActionProcessor and GameFlowManager can both update `gameState` simultaneously. Guest can receive interleaved state updates from Host.

**Result:** Order-dependent bugs where state updates conflict.

#### Race #7: Missing Broadcast After Guest Actions
**Location:** ActionProcessor.js line 223

**Problem:** When Host processes Guest's network action (commitment, pass), Host updates state but doesn't broadcast the updated state back to Guest.

**Result:** Guest stuck showing "Waiting for opponent..." even though both players ready.

---

## Design Principles

### Principle #1: Single Source of Truth

**Statement:** Only ONE entity can transition phases.

**Implementation:**
- Create **Phase Manager** as the sole authority for phase transitions
- Phase Manager lives on Host (no central server available)
- All phase transition requests route through Phase Manager
- Phase Manager is the only code that calls `transitionToPhase()`

**Benefits:**
- Eliminates dual authority problem
- No race conditions from competing transitions
- Clear ownership model

### Principle #2: Separation of Concerns

**Statement:** Separate **authoritative game progression** from **optimistic UI feedback**.

**Implementation:**
- **Phase Manager** - Authoritative phase state (turnPhase, passInfo, commitments)
- **GameState** - Actual game data (cards, drones, energy, etc.)
- **LocalUIState** - Optimistic UI state (animations, waiting overlays)

**Benefits:**
- Phase progression cannot be corrupted by UI optimism
- Clear boundaries between systems
- Easier to reason about each component

### Principle #3: Host Authority, Guest Reactivity

**Statement:** Host is authoritative, Guest reacts to Host broadcasts.

**Implementation:**
- Host: Action → Notify Phase Manager → Phase Manager decides → Broadcast
- Guest: Action → Show UI feedback → Send to Host → Wait for broadcast → Update
- Guest never self-authorizes phase transitions

**Benefits:**
- Consistent with P2P model (Host is pseudo-server)
- Guest UI remains responsive (immediate feedback)
- Host ensures correctness before broadcasting

### Principle #4: Explicit State Tracking

**Statement:** Phase Manager tracks both players' states explicitly.

**Implementation:**
- Phase Manager maintains `hostLocalState` (Host's passes/commits)
- Phase Manager maintains `guestLocalState` (Guest's passes/commits received via network)
- Phase Manager checks: "Are both players ready?" before transitioning

**Benefits:**
- No implicit "both passed" detection across two separate systems
- Phase Manager has complete visibility
- Eliminates timing-based race conditions

### Principle #5: Atomic Phase Transitions

**Statement:** Phase transitions are atomic operations that cannot be interrupted.

**Implementation:**
- Phase Manager locks during transition
- No partial transitions (either fully transitioned or not at all)
- Broadcast happens after transition completes atomically

**Benefits:**
- Guest never receives incomplete/intermediate state
- No window for race conditions during transition
- Clear before/after states

### Principle #6: Simplify Automatic Phases

**Statement:** Minimize complex cascades through multiple automatic phases.

**Implementation:**
- Flatten 4 automatic phases (gameInitializing, determineFirstPlayer, energyReset, draw) into single `roundInitialization` phase
- One transition, one broadcast, one reconciliation point

**Benefits:**
- Eliminates cascade timing issues
- Faster (no delays between micro-phases)
- Simpler to implement and debug
- Fewer opportunities for desync

### Principle #7: Optimistic UI, Authoritative Progression

**Statement:** Guest gets immediate UI feedback, but waits for Phase Manager for actual progression.

**Implementation:**
- Guest passes → Immediately show "YOU PASSED" animation
- Guest sends pass to Host → (network latency)
- Phase Manager sees both passed → Transitions
- Phase Manager broadcasts → Guest receives → Show "PHASE COMPLETE"

**Trade-off:**
- Small delay between action and phase transition (network round-trip)
- Acceptable for correctness and synchronization

---

## Architecture Overview

### Current Architecture (Problematic)

```
┌─────────────────┐                    ┌─────────────────┐
│  Host           │                    │  Guest          │
│  ┌───────────┐  │                    │  ┌───────────┐  │
│  │ GameFlow  │  │                    │  │ GameFlow  │  │
│  │ Manager   │  │                    │  │ Manager   │  │
│  │           │  │◄──── Broadcast ────┤  │           │  │
│  │ ├transitions│                    │  │ ├transitions│
│  │ ├checks    │  │                    │  │ ├checks    │  │
│  │ └broadcasts│  │                    │  │ └optimistic│  │
│  └───────────┘  │                    │  └───────────┘  │
│        │        │                    │        │        │
│        ▼        │                    │        ▼        │
│  ┌───────────┐  │                    │  ┌───────────┐  │
│  │GameState  │  │                    │  │GameState  │  │
│  │turnPhase  │  │                    │  │turnPhase  │  │
│  └───────────┘  │                    │  └───────────┘  │
└─────────────────┘                    └─────────────────┘
       │                                      │
       └──────── CONFLICT: Both update ──────┘
```

**Problem:** Two independent systems manage same state

### New Architecture (Phase Manager)

```
                    ┌───────────────────────────────┐
                    │  Phase Manager (on Host)      │
                    │  ┌─────────────────────────┐  │
                    │  │ hostLocalState          │  │
                    │  │  - passInfo             │  │
                    │  │  - commitments          │  │
                    │  ├─────────────────────────┤  │
                    │  │ guestLocalState         │  │
                    │  │  - passInfo             │  │
                    │  │  - commitments          │  │
                    │  ├─────────────────────────┤  │
                    │  │ AUTHORITATIVE:          │  │
                    │  │  - turnPhase            │  │
                    │  │  - roundNumber          │  │
                    │  │  - turn                 │  │
                    │  │  - currentPlayer        │  │
                    │  └─────────────────────────┘  │
                    └───────┬───────────────────┬───┘
                            │                   │
                  Broadcast │                   │ Notify
                            │                   │
        ┌───────────────────▼──┐           ┌───▼────────────────────┐
        │  Guest               │           │  Host                  │
        │  ┌─────────────────┐ │           │  ┌─────────────────┐  │
        │  │ LocalUIState    │ │           │  │ GameFlowManager │  │
        │  │  - animations   │ │           │  │  - processing   │  │
        │  │  - waiting      │ │           │  │  - validation   │  │
        │  └─────────────────┘ │           │  └─────────────────┘  │
        │  ┌─────────────────┐ │           │  ┌─────────────────┐  │
        │  │ GameState       │ │           │  │ GameState       │  │
        │  │  - cards/drones │ │           │  │  - cards/drones │  │
        │  │  - energy       │ │           │  │  - energy       │  │
        │  └─────────────────┘ │           │  └─────────────────┘  │
        └──────────────────────┘           └────────────────────────┘
                    │                                   │
                    └──── Send Actions ────────────────►
```

**Solution:** Single Phase Manager controls phase transitions

---

## Flow Examples

### Example 1: Both Players Pass in Deployment

#### Current (Buggy):
```
T1: Guest passes
T2: Guest updates local gameState.passInfo.player2Passed = true
T3: Guest checks: both passed? YES (sees Host passed earlier)
T4: Guest transitions to 'action' phase locally
T5: Host hasn't received Guest's pass yet
T6: Host receives Guest's pass
T7: Host checks: both passed? YES
T8: Host transitions to 'action' phase
T9: Host broadcasts 'action' phase
T10: Guest receives broadcast
T11: DESYNC: Guest already in 'action', Host just caught up
     Different turn counters, passInfo states
```

#### New (Phase Manager):
```
T1: Guest passes
T2: Guest updates LocalUIState: "YOU PASSED" animation
T3: Guest sends pass to Host
T4: Phase Manager receives Guest pass
T5: Phase Manager updates guestLocalState.passInfo.player2Passed = true
T6: Phase Manager checks: hostLocalState.passed && guestLocalState.passed?
T7: Phase Manager: YES, both ready!
T8: Phase Manager transitions: turnPhase = 'action'
T9: Phase Manager resets passInfo
T10: Phase Manager broadcasts: turnPhase='action', passInfo=reset
T11: Guest receives broadcast
T12: Guest updates local gameState.turnPhase = 'action'
T13: Guest shows "DEPLOYMENT COMPLETE" animation
T14: SYNCHRONIZED: Both at 'action' phase with identical state
```

### Example 2: Guest Completes Simultaneous Phase First

#### Current (Buggy):
```
T1: Guest completes shield allocation
T2: Guest updates commitments.allocateShields.player2.completed = true
T3: Guest checks: both complete? NO
T4: Guest shows "Waiting for opponent..."
T5: Host completes shield allocation
T6: Host updates commitments, checks: both complete? YES
T7: Host broadcasts state (both complete)
T8: Guest receives broadcast showing both complete
T9: Guest triggers optimistic cascade (if milestone phase)
T10: Host also cascades
T11: DESYNC: Both cascading independently
```

#### New (Phase Manager):
```
T1: Guest completes shield allocation
T2: Guest shows "Waiting for opponent..." immediately
T3: Guest sends commitment to Host
T4: Phase Manager receives Guest commitment
T5: Phase Manager updates guestLocalState.allocateShields.completed = true
T6: Phase Manager checks: both complete? NO (Host hasn't committed)
T7: Host completes shield allocation
T8: Phase Manager updates hostLocalState.allocateShields.completed = true
T9: Phase Manager checks: both complete? YES
T10: Phase Manager transitions to next phase
T11: Phase Manager broadcasts phase update
T12: Guest receives broadcast
T13: Guest updates to new phase
T14: SYNCHRONIZED: One transition, one broadcast, clean sync
```

---

## Benefits

### Correctness
✅ **Eliminates race conditions** - Single transition authority
✅ **Guaranteed synchronization** - Both players receive same authoritative state
✅ **No state conflicts** - Phase Manager has complete visibility

### Simplicity
✅ **Clearer code** - One path for phase transitions
✅ **Easier debugging** - Centralized transition logic
✅ **Fewer phases** - 4 automatic phases → 1 roundInitialization

### Maintainability
✅ **Single responsibility** - Phase Manager owns phase transitions
✅ **Testable** - Can unit test Phase Manager in isolation
✅ **Extensible** - Easy to add new phases or rules

### User Experience
✅ **Still responsive** - Guest gets immediate UI feedback
✅ **More reliable** - Players don't desync
✅ **Predictable** - Consistent behavior across games

---

## Trade-offs

### Small UI Delay
⚠️ **Guest sees phase transition slightly delayed** (network round-trip)
- Acceptable: Typically 50-200ms depending on connection
- Mitigated: Guest still gets immediate feedback for their own actions
- Worth it: Correctness > responsiveness in this case

### Refactoring Cost
⚠️ **Significant code changes required**
- Must update GameFlowManager, ActionProcessor, GuestMessageQueueService
- Must remove optimistic transition code
- Must flatten automatic phases

### Increased Complexity (Initial)
⚠️ **New Phase Manager adds another component**
- However: Ultimately simpler than current dual-authority model
- Clear separation of concerns
- Worth the investment

---

## Success Criteria

The new architecture succeeds if:

1. ✅ Host and Guest never desync (same phase, same round, same turn)
2. ✅ Players never stuck on "Waiting for opponent..." incorrectly
3. ✅ Phase transitions happen deterministically
4. ✅ Guest UI feels responsive (immediate feedback for actions)
5. ✅ Code is easier to understand and debug
6. ✅ New phases can be added without introducing race conditions

---

## Implementation Approach

See **PHASE_MANAGER_ROADMAP.md** for detailed implementation plan.

**Guiding Philosophy:**
- Build Phase Manager first (foundation)
- Migrate one phase type at a time (automatic → simultaneous → sequential)
- Test thoroughly at each step
- Update documentation as we go

---

## Related Documents

- **PHASE_MANAGER_ROADMAP.md** - Implementation plan and task breakdown
- **Design/Phase Management/PHASE_FLOW_INDEX.md** - Current phase system documentation
- **Design/Phase Management/ROADMAP.md** - Phase documentation project status

---

## Revision History

- **2025-11-13** - Initial design principles document created
