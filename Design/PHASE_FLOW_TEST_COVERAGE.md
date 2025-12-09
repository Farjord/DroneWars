# Phase Flow Test Coverage Matrix

**Purpose:** Comprehensive documentation of all possible game flows to ensure systematic test coverage.

**Goal:** Identify and test every logical path through the phase system to eliminate desync bugs.

---

## Table of Contents

1. [Game Modes & Entry Points](#1-game-modes--entry-points)
2. [Phase Classification](#2-phase-classification)
3. [PRE_GAME_PHASES Flow](#3-pre_game_phases-flow)
4. [ROUND_PHASES Flow](#4-round_phases-flow)
5. [Conditional Phase Logic](#5-conditional-phase-logic)
6. [Test Scenarios Per Phase](#6-test-scenarios-per-phase)
7. [Round Boundary Tests](#7-round-boundary-tests)
8. [Quick Deploy Variations](#8-quick-deploy-variations)
9. [Test Implementation Checklist](#9-test-implementation-checklist)

---

## 1. Game Modes & Entry Points

### 1.1 Game Mode Values

| Mode | `gameMode` | Player 1 | Player 2 | State Authority |
|------|------------|----------|----------|-----------------|
| Single Player | `local` | Human | AI | Local |
| Multiplayer Host | `host` | Human | Human (remote) | Host |
| Multiplayer Guest | `guest` | Human (remote) | Human | Host (via broadcast) |

### 1.2 Entry Points

```
MenuScreen
├── "Single Player" → LobbyScreen → GameScreen (gameMode: 'local')
├── "Multiplayer" → LobbyScreen → GameScreen (gameMode: 'host' or 'guest')
└── "Into The Eremos" → EremosEntryScreen → TacticalMapScreen → GameScreen (extraction mode)
```

### 1.3 Mode-Specific Behaviors

| Behavior | Local | Host | Guest |
|----------|-------|------|-------|
| Runs game logic | Yes | Yes | No (receives) |
| Runs AI decisions | Yes | No | No |
| Can transition phases | Yes | Yes | No (blocked) |
| Broadcasts state | No | Yes | No |
| Receives broadcasts | No | No | Yes |
| Optimistic execution | N/A | N/A | Yes (auto phases) |

### 1.4 CRITICAL: P2 Type Distinction (AI vs Guest)

**This is the key distinction that affects test design:**

| Mode | P2 Type | P2 Processing Mechanism |
|------|---------|-------------------------|
| Single Player (`local`) | **AI** | Synchronous auto-commit, self-triggering via state subscription |
| Multiplayer (`host`) | **Guest (remote human)** | Async via network, host calls notifyGuestAction on receipt |
| Multiplayer (`guest`) | **Host (remote human)** | Receives broadcasts, does NOT call PhaseManager methods |

### 1.5 Processing Differences: AI vs Guest

| Aspect | LOCAL (AI as P2) | MULTIPLAYER (Guest as P2) |
|--------|------------------|---------------------------|
| `notifyGuestAction()` timing | Called **IMMEDIATELY** when P1 commits/passes | Called when guest action arrives via **NETWORK** |
| Simultaneous phase completion | AI auto-commits **INLINE** (synchronous) | Guest commits async, arrives via P2P |
| Sequential phase turns | AI self-triggers via `checkForAITurn()` | Guest waits for broadcast, human input |
| Network involved | **NO** | **YES** |
| Who calls PhaseManager? | ActionProcessor (for both P1 and AI) | Host's ActionProcessor only |
| P2 commit processing | `handleAICommitment()` runs inline | `processGuestAction()` on network receipt |

### 1.6 Code Path References

**AI Auto-Completion (ActionProcessor.js):**
- Lines 3155-3162: `notifyGuestAction()` called for AI in local mode
- Lines 3189-3215: `handleAICommitment()` for inline AI execution
- Lines 2764-2771: `notifyGuestAction()` for AI pass

**AI Self-Triggering (AIPhaseProcessor.js):**
- Lines 68-70: State subscription for turn detection
- Lines 886-919: `checkForAITurn()` logic
- Lines 925-1022: `executeTurn()` execution

**Multiplayer Network Delivery (ActionProcessor.js):**
- Lines 2353-2379: `processGuestAction()` for network-received actions
- Lines 3151-3154: `notifyGuestAction()` only on network receipt

---

## 2. Phase Classification

### 2.1 By Type

| Type | Phases | Completion Requirement |
|------|--------|------------------------|
| **Simultaneous** | deckSelection, droneSelection, placement, mandatoryDiscard, optionalDiscard, allocateShields, mandatoryDroneRemoval | Both players commit |
| **Sequential** | deployment, action | Both players pass |
| **Automatic** | roundInitialization | System processes (no player input) |

### 2.2 By Game Stage

**PRE_GAME_PHASES:**
```javascript
['deckSelection', 'droneSelection', 'placement', 'roundInitialization']
```

**ROUND_PHASES:**
```javascript
['mandatoryDiscard', 'optionalDiscard', 'roundInitialization', 'allocateShields',
 'mandatoryDroneRemoval', 'deployment', 'action']
```

### 2.3 Milestone Phases (Guest Validation Points)

Guest stops at these phases to validate against host:
- droneSelection
- placement
- mandatoryDiscard
- optionalDiscard
- allocateShields
- mandatoryDroneRemoval
- deployment

---

## 3. PRE_GAME_PHASES Flow

### 3.1 Phase Sequence

```
┌─────────────────┐
│  deckSelection  │ ← Simultaneous: Both select 40-card deck + 10 drones
└────────┬────────┘
         ↓ (both commit)
┌─────────────────┐
│ droneSelection  │ ← Simultaneous: Both select 5 drones from their 10
└────────┬────────┘
         ↓ (both commit)
┌─────────────────┐
│   placement     │ ← Simultaneous: Both arrange 3 ship sections
└────────┬────────┘
         ↓ (both commit)
┌─────────────────────────┐
│  roundInitialization    │ ← Automatic: Determine first player, draw cards, etc.
└────────┬────────────────┘
         ↓ (immediate)
    [Enter ROUND_PHASES]
```

### 3.2 Test Scenarios - deckSelection

| ID | Scenario | Local | Host | Guest | Notes |
|----|----------|-------|------|-------|-------|
| DS-1 | Both commit simultaneously | ○ | ○ | ○ | Race condition potential |
| DS-2 | P1 commits first, then P2 | ○ | ○ | ○ | Standard flow |
| DS-3 | P2 commits first, then P1 | ○ | ○ | ○ | Reverse order |
| DS-4 | Invalid deck (wrong size) | ○ | ○ | ○ | Validation check |

### 3.3 Test Scenarios - droneSelection

| ID | Scenario | Local | Host | Guest | Notes |
|----|----------|-------|------|-------|-------|
| DR-1 | Both commit simultaneously | ○ | ○ | ○ | Race condition potential |
| DR-2 | P1 commits first, then P2 | ○ | ○ | ○ | Standard flow |
| DR-3 | P2 commits first, then P1 | ○ | ○ | ○ | Reverse order |
| DR-4 | Invalid selection (wrong count) | ○ | ○ | ○ | Validation check |

### 3.4 Test Scenarios - placement

| ID | Scenario | Local | Host | Guest | Notes |
|----|----------|-------|------|-------|-------|
| PL-1 | Both commit simultaneously | ○ | ○ | ○ | Race condition potential |
| PL-2 | P1 commits first, then P2 | ○ | ○ | ○ | Standard flow |
| PL-3 | P2 commits first, then P1 | ○ | ○ | ○ | Reverse order |
| PL-4 | Special: Host broadcasts immediately after | ○ | ○ | ○ | Timing verification |

### 3.5 Test Scenarios - roundInitialization (Automatic)

| ID | Scenario | Local | Host | Guest | Notes |
|----|----------|-------|------|-------|-------|
| RI-1 | First player determined (Round 1) | ○ | ○ | ○ | Random selection |
| RI-2 | Energy reset for all drones | ○ | ○ | ○ | State verification |
| RI-3 | Cards drawn to hand limit | ○ | ○ | ○ | Draw logic |
| RI-4 | Guest optimistic execution | - | - | ○ | Guest runs locally |

---

## 4. ROUND_PHASES Flow

### 4.1 Round 1 Phase Sequence

```
┌──────────────────────┐
│  mandatoryDiscard*   │ ← Simultaneous: IF hand > handLimit
└────────┬─────────────┘
         ↓ (both commit OR skip)
┌──────────────────────┐
│  optionalDiscard     │ ← SKIPPED in Round 1
└────────┬─────────────┘
         ↓ (skip)
┌────────────────────────┐
│  roundInitialization   │ ← SKIPPED in Round 1 (already ran in PRE_GAME)
└────────┬───────────────┘
         ↓ (skip)
┌──────────────────────┐
│  allocateShields     │ ← SKIPPED in Round 1 (no shields yet)
└────────┬─────────────┘
         ↓ (skip)
┌────────────────────────┐
│ mandatoryDroneRemoval* │ ← Simultaneous: IF drones > cpuLimit
└────────┬───────────────┘
         ↓ (both commit OR skip)
┌──────────────────────┐
│    deployment**      │ ← Sequential: Deploy drones, both pass
└────────┬─────────────┘    ** SKIPPED if Quick Deploy active
         ↓ (both pass)
┌──────────────────────┐
│      action          │ ← Sequential: Take actions, both pass
└────────┬─────────────┘
         ↓ (both pass)
   [Round 1 Complete → Round 2]
```

### 4.2 Round 2+ Phase Sequence

```
┌──────────────────────┐
│  mandatoryDiscard*   │ ← Simultaneous: IF hand > handLimit
└────────┬─────────────┘
         ↓ (both commit OR skip)
┌──────────────────────┐
│  optionalDiscard*    │ ← Simultaneous: IF any player has cards
└────────┬─────────────┘
         ↓ (both commit OR skip)
┌────────────────────────┐
│  roundInitialization   │ ← Automatic: Now runs (was skipped in R1)
└────────┬───────────────┘
         ↓ (immediate)
┌──────────────────────┐
│  allocateShields*    │ ← Simultaneous: IF shieldsToAllocate > 0
└────────┬─────────────┘
         ↓ (both commit OR skip)
┌────────────────────────┐
│ mandatoryDroneRemoval* │ ← Simultaneous: IF drones > cpuLimit
└────────┬───────────────┘
         ↓ (both commit OR skip)
┌──────────────────────┐
│     deployment       │ ← Sequential: Deploy drones, both pass
└────────┬─────────────┘
         ↓ (both pass)
┌──────────────────────┐
│       action         │ ← Sequential: Take actions, both pass
└────────┬─────────────┘
         ↓ (both pass)
   [Round N Complete → Round N+1]
```

---

## 5. Conditional Phase Logic

### 5.1 Condition Checks

| Phase | Condition | Method | Asymmetric Possible |
|-------|-----------|--------|---------------------|
| mandatoryDiscard | ANY player: `hand.length > handLimit` | `anyPlayerExceedsHandLimit()` | YES |
| optionalDiscard | Round 2+ AND ANY player: `hand.length > 0` | `anyPlayerHasCards()` | YES |
| allocateShields | ANY player: `shieldsToAllocate > 0` | `anyPlayerHasShieldsToAllocate()` | YES |
| mandatoryDroneRemoval | ANY player: `drones > cpuLimit` | `anyPlayerExceedsDroneLimit()` | YES |
| deployment | NOT (Round 1 + `pendingQuickDeploy`) | Special check | NO |

### 5.2 Asymmetric Scenarios

When only ONE player needs action, the other auto-commits:

**mandatoryDiscard:**
- P1 has 8 cards (limit 6) → must discard 2
- P2 has 5 cards (limit 6) → auto-commits

**optionalDiscard:**
- P1 has 4 cards → can optionally discard
- P2 has 0 cards → auto-commits

**allocateShields:**
- P1 has 3 shields → must allocate all 3
- P2 has 0 shields → auto-commits

**mandatoryDroneRemoval:**
- P1 has 6 drones (limit 4) → must remove 2
- P2 has 3 drones (limit 4) → auto-commits

---

## 6. Test Scenarios Per Phase

### 6.0 Asymmetric Scenarios - CRITICAL TEST COVERAGE

**Mandatory phases (mandatoryDiscard, mandatoryDroneRemoval, allocateShields) have asymmetric requirements:**
- One player may need action while other auto-approves
- Must test ALL combinations in BOTH Local (AI) and Multiplayer (Host/Guest) modes

---

### 6.1 mandatoryDiscard

#### LOCAL MODE (Human P1 vs AI P2):

| ID | Scenario | Who Acts | Who Auto-Approves | Verify |
|----|----------|----------|-------------------|--------|
| MD-L1 | Both need action | Human + AI | - | AI auto-commits inline after Human |
| MD-L2 | Only Human (P1) needs | Human | AI | AI auto-approves, phase completes |
| MD-L3 | Only AI (P2) needs | AI | Human | Human auto-approves, AI acts, phase completes |
| MD-L4 | Neither needs | - | Both | Phase skipped correctly |

#### MULTIPLAYER HOST (Human P1 vs Human Guest P2):

| ID | Scenario | Who Acts | Who Auto-Approves | Verify |
|----|----------|----------|-------------------|--------|
| MD-H1 | Both need - Host first | Host → Guest | - | Host broadcasts, waits for Guest via network |
| MD-H2 | Both need - Guest first | Guest → Host | - | Guest action arrives via network first |
| MD-H3 | Only Host (P1) needs | Host | Guest | Guest auto-approves |
| MD-H4 | Only Guest (P2) needs | Guest | Host | Host auto-approves, Guest acts via network |
| MD-H5 | Neither needs | - | Both | Phase skipped, broadcast sent |

#### MULTIPLAYER GUEST (local view):

| ID | Scenario | Verify |
|----|----------|--------|
| MD-G1 | Guest receives host broadcast | State applied correctly |
| MD-G2 | Guest needs action | Guest commits → sent to host, NOT local PhaseManager |
| MD-G3 | Guest auto-approves | Guest receives broadcast showing auto-approval |

### 6.2 optionalDiscard

#### LOCAL MODE (Human P1 vs AI P2):

| ID | Scenario | Who Acts | Who Auto-Approves | Verify |
|----|----------|----------|-------------------|--------|
| OD-L1 | Round 1 | - | - | Phase skipped in Round 1 |
| OD-L2 | Round 2+, both have cards | Human + AI | - | AI auto-commits inline |
| OD-L3 | Round 2+, only Human has cards | Human | AI | AI auto-approves |
| OD-L4 | Round 2+, only AI has cards | AI | Human | Human auto-approves, AI acts |
| OD-L5 | Round 2+, neither has cards | - | Both | Phase skipped |

#### MULTIPLAYER HOST (Human P1 vs Human Guest P2):

| ID | Scenario | Who Acts | Who Auto-Approves | Verify |
|----|----------|----------|-------------------|--------|
| OD-H1 | Round 1 | - | - | Phase skipped, broadcast sent |
| OD-H2 | Round 2+, both have - Host first | Host → Guest | - | Network delivery |
| OD-H3 | Round 2+, both have - Guest first | Guest → Host | - | Network delivery |
| OD-H4 | Round 2+, only Host has cards | Host | Guest | Guest auto-approves |
| OD-H5 | Round 2+, only Guest has cards | Guest | Host | Host auto-approves |
| OD-H6 | Round 2+, neither has cards | - | Both | Phase skipped |

#### MULTIPLAYER GUEST (local view):

| ID | Scenario | Verify |
|----|----------|--------|
| OD-G1 | Round 1 skip | Guest receives broadcast confirming skip |
| OD-G2 | Guest receives host broadcast | State applied correctly |
| OD-G3 | Guest needs action | Guest commits → sent to host, NOT local PhaseManager |
| OD-G4 | Guest auto-approves | Guest receives broadcast showing auto-approval |

### 6.3 allocateShields

#### LOCAL MODE (Human P1 vs AI P2):

| ID | Scenario | Who Acts | Who Auto-Approves | Verify |
|----|----------|----------|-------------------|--------|
| AS-L1 | Round 1 | - | - | Phase skipped in Round 1 |
| AS-L2 | Round 2+, both have shields | Human + AI | - | AI auto-commits inline |
| AS-L3 | Round 2+, only Human has shields | Human | AI | AI auto-approves |
| AS-L4 | Round 2+, only AI has shields | AI | Human | Human auto-approves, AI acts |
| AS-L5 | Round 2+, neither has shields | - | Both | Phase skipped |

#### MULTIPLAYER HOST (Human P1 vs Human Guest P2):

| ID | Scenario | Who Acts | Who Auto-Approves | Verify |
|----|----------|----------|-------------------|--------|
| AS-H1 | Round 1 | - | - | Phase skipped, broadcast sent |
| AS-H2 | Round 2+, both have - Host first | Host → Guest | - | Network delivery |
| AS-H3 | Round 2+, both have - Guest first | Guest → Host | - | Network delivery |
| AS-H4 | Round 2+, only Host has shields | Host | Guest | Guest auto-approves |
| AS-H5 | Round 2+, only Guest has shields | Guest | Host | Host auto-approves |
| AS-H6 | Round 2+, neither has shields | - | Both | Phase skipped |

#### MULTIPLAYER GUEST (local view):

| ID | Scenario | Verify |
|----|----------|--------|
| AS-G1 | Round 1 skip | Guest receives broadcast confirming skip |
| AS-G2 | Guest receives host broadcast | State applied correctly |
| AS-G3 | Guest needs action | Guest commits → sent to host, NOT local PhaseManager |
| AS-G4 | Guest auto-approves | Guest receives broadcast showing auto-approval |

### 6.4 mandatoryDroneRemoval

#### LOCAL MODE (Human P1 vs AI P2):

| ID | Scenario | Who Acts | Who Auto-Approves | Verify |
|----|----------|----------|-------------------|--------|
| MR-L1 | Both exceed limit | Human + AI | - | AI auto-commits inline after Human |
| MR-L2 | Only Human (P1) exceeds | Human | AI | AI auto-approves |
| MR-L3 | Only AI (P2) exceeds | AI | Human | Human auto-approves, AI acts |
| MR-L4 | Neither exceeds | - | Both | Phase skipped |

#### MULTIPLAYER HOST (Human P1 vs Human Guest P2):

| ID | Scenario | Who Acts | Who Auto-Approves | Verify |
|----|----------|----------|-------------------|--------|
| MR-H1 | Both exceed - Host first | Host → Guest | - | Network delivery |
| MR-H2 | Both exceed - Guest first | Guest → Host | - | Network delivery |
| MR-H3 | Only Host (P1) exceeds | Host | Guest | Guest auto-approves |
| MR-H4 | Only Guest (P2) exceeds | Guest | Host | Host auto-approves |
| MR-H5 | Neither exceeds | - | Both | Phase skipped, broadcast sent |

#### MULTIPLAYER GUEST (local view):

| ID | Scenario | Verify |
|----|----------|--------|
| MR-G1 | Guest receives host broadcast | State applied correctly |
| MR-G2 | Guest needs action | Guest commits → sent to host, NOT local PhaseManager |
| MR-G3 | Guest auto-approves | Guest receives broadcast showing auto-approval |
| MR-G4 | Phase skipped | Guest receives broadcast confirming skip |

### 6.5 deployment (Sequential)

#### LOCAL MODE (Human P1 vs AI P2):

| ID | Scenario | Verify |
|----|----------|--------|
| DP-L1 | Human passes first | AI gets turn via `checkForAITurn()`, then passes |
| DP-L2 | AI passes first | AI self-triggers, passes, human gets turn |
| DP-L3 | Human deploys, then both pass | Standard deployment flow |
| DP-L4 | AI deploys multiple drones | AI executes multiple deploys via `executeTurn()` |
| DP-L5 | Turn alternation | currentPlayer toggles correctly |
| DP-L6 | Quick Deploy skips phase | Round 1 only, `isPhaseRequired` returns false |

#### MULTIPLAYER HOST (Human P1 vs Human Guest P2):

| ID | Scenario | Verify |
|----|----------|--------|
| DP-H1 | Host passes first | Broadcast sent, guest can act |
| DP-H2 | Guest passes first | Guest action arrives via network |
| DP-H3 | Host deploys, then both pass | Standard deployment flow |
| DP-H4 | Guest deploys | Guest action via network, host updates state |
| DP-H5 | Turn alternation | currentPlayer broadcast correct |
| DP-H6 | firstPasser tracking | Correct player recorded for round-end |

#### MULTIPLAYER GUEST (local view):

| ID | Scenario | Verify |
|----|----------|--------|
| DP-G1 | Receives turn notification | currentPlayer broadcast received |
| DP-G2 | Guest passes | Action sent to host, NOT local PhaseManager |
| DP-G3 | Guest deploys | Action sent to host |
| DP-G4 | Guest cannot transition phase | PhaseManager blocks guest |
| DP-G5 | Receives phase completion | State sync from host |

### 6.6 action (Sequential)

#### LOCAL MODE (Human P1 vs AI P2):

| ID | Scenario | Verify |
|----|----------|--------|
| AC-L1 | Human passes first | firstPasser = P1, AI gets turn |
| AC-L2 | AI passes first | AI self-triggers via `checkForAITurn()`, firstPasser = P2 |
| AC-L3 | Human multiple actions | goAgain cards work correctly |
| AC-L4 | AI multiple actions | AI uses `executeTurn()` for action sequence |
| AC-L5 | Human passes, AI continues | AI keeps acting until it passes |
| AC-L6 | Round completion | firstPasser preserved for next round |

#### MULTIPLAYER HOST (Human P1 vs Human Guest P2):

| ID | Scenario | Verify |
|----|----------|--------|
| AC-H1 | Host passes first | firstPasser = P1, broadcast sent |
| AC-H2 | Guest passes first | Guest action via network, firstPasser = P2 |
| AC-H3 | Host multiple actions | Turn continues after goAgain |
| AC-H4 | Guest multiple actions | Actions via network, turn continues |
| AC-H5 | Host passes, guest continues | Guest can keep acting |
| AC-H6 | Round completion | firstPasser broadcast to guest |
| AC-H7 | Next round first player | Second passer goes first |

#### MULTIPLAYER GUEST (local view):

| ID | Scenario | Verify |
|----|----------|--------|
| AC-G1 | Receives turn notification | currentPlayer = guest from broadcast |
| AC-G2 | Guest passes | Action sent to host |
| AC-G3 | Guest multiple actions | Each action sent to host |
| AC-G4 | Receives round completion | Round transition from host |
| AC-G5 | Guest cannot transition phase | PhaseManager blocks guest |

---

## 7. Round Boundary Tests

### 7.1 Round 1 → Round 2 Transition

| ID | Test | Verification |
|----|------|--------------|
| RB-1 | optionalDiscard becomes available | Was skipped R1, runs R2 |
| RB-2 | allocateShields becomes available | Was skipped R1, runs R2 |
| RB-3 | roundInitialization runs in ROUND_PHASES | Was skipped via PRE_GAME |
| RB-4 | roundNumber increments | 1 → 2 |
| RB-5 | firstPasserOfPreviousRound stored | From action phase |
| RB-6 | First player determined correctly | Second passer from R1 |

### 7.2 Round N → Round N+1 Transition

| ID | Test | Verification |
|----|------|--------------|
| RB-7 | Round counter increments | N → N+1 |
| RB-8 | Pass state reset | Both players: passed = false |
| RB-9 | Commitments reset | Previous phase commitments cleared |
| RB-10 | Turn order correct | Based on previous firstPasser |

---

## 8. Quick Deploy Variations

### 8.1 Quick Deploy Flow

```
Normal Round 1:
  placement → roundInitialization → ... → deployment → action

Quick Deploy Round 1:
  placement → roundInitialization → ... → [deployment SKIPPED] → action
                                              ↓
                                      executeQuickDeploy() runs
                                      (drones deployed silently)
```

### 8.2 Quick Deploy Test Scenarios

| ID | Scenario | Local | Notes |
|----|----------|-------|-------|
| QD-1 | Quick Deploy executes | ○ | Drones placed correctly |
| QD-2 | Deployment phase skipped | ○ | isPhaseRequired returns false |
| QD-3 | AI responds to Quick Deploy | ○ | AI deployment triggered |
| QD-4 | Action phase starts correctly | ○ | After silent deployment |
| QD-5 | Round 2 deployment normal | ○ | Quick Deploy only Round 1 |

---

## 9. Test Implementation Checklist

### 9.1 PRE_GAME_PHASES Tests

- [ ] DS-1 through DS-4 (deckSelection)
- [ ] DR-1 through DR-4 (droneSelection)
- [ ] PL-1 through PL-4 (placement)
- [ ] RI-1 through RI-4 (roundInitialization)

### 9.2 ROUND_PHASES Tests - Simultaneous (mandatoryDiscard)

#### Local Mode (AI as P2)
- [ ] MD-L1: Both need action
- [ ] MD-L2: Only Human (P1) needs
- [ ] MD-L3: Only AI (P2) needs
- [ ] MD-L4: Neither needs (phase skipped)

#### Multiplayer Host (Guest as P2)
- [ ] MD-H1: Both need - Host first
- [ ] MD-H2: Both need - Guest first
- [ ] MD-H3: Only Host (P1) needs
- [ ] MD-H4: Only Guest (P2) needs
- [ ] MD-H5: Neither needs

#### Multiplayer Guest
- [ ] MD-G1: Receives host broadcast
- [ ] MD-G2: Guest needs action
- [ ] MD-G3: Guest auto-approves

### 9.3 ROUND_PHASES Tests - Simultaneous (optionalDiscard)

#### Local Mode (AI as P2)
- [ ] OD-L1: Round 1 skip
- [ ] OD-L2: Round 2+, both have cards
- [ ] OD-L3: Round 2+, only Human has cards
- [ ] OD-L4: Round 2+, only AI has cards
- [ ] OD-L5: Round 2+, neither has cards

#### Multiplayer Host (Guest as P2)
- [ ] OD-H1: Round 1 skip
- [ ] OD-H2: Round 2+, both have - Host first
- [ ] OD-H3: Round 2+, both have - Guest first
- [ ] OD-H4: Round 2+, only Host has cards
- [ ] OD-H5: Round 2+, only Guest has cards
- [ ] OD-H6: Round 2+, neither has cards

#### Multiplayer Guest
- [ ] OD-G1: Round 1 skip
- [ ] OD-G2: Guest receives host broadcast
- [ ] OD-G3: Guest needs action
- [ ] OD-G4: Guest auto-approves

### 9.4 ROUND_PHASES Tests - Simultaneous (allocateShields)

#### Local Mode (AI as P2)
- [ ] AS-L1: Round 1 skip
- [ ] AS-L2: Round 2+, both have shields
- [ ] AS-L3: Round 2+, only Human has shields
- [ ] AS-L4: Round 2+, only AI has shields
- [ ] AS-L5: Round 2+, neither has shields

#### Multiplayer Host (Guest as P2)
- [ ] AS-H1: Round 1 skip
- [ ] AS-H2: Round 2+, both have - Host first
- [ ] AS-H3: Round 2+, both have - Guest first
- [ ] AS-H4: Round 2+, only Host has shields
- [ ] AS-H5: Round 2+, only Guest has shields
- [ ] AS-H6: Round 2+, neither has shields

#### Multiplayer Guest
- [ ] AS-G1: Round 1 skip
- [ ] AS-G2: Guest receives host broadcast
- [ ] AS-G3: Guest needs action
- [ ] AS-G4: Guest auto-approves

### 9.5 ROUND_PHASES Tests - Simultaneous (mandatoryDroneRemoval)

#### Local Mode (AI as P2)
- [ ] MR-L1: Both exceed limit
- [ ] MR-L2: Only Human (P1) exceeds
- [ ] MR-L3: Only AI (P2) exceeds
- [ ] MR-L4: Neither exceeds

#### Multiplayer Host (Guest as P2)
- [ ] MR-H1: Both exceed - Host first
- [ ] MR-H2: Both exceed - Guest first
- [ ] MR-H3: Only Host (P1) exceeds
- [ ] MR-H4: Only Guest (P2) exceeds
- [ ] MR-H5: Neither exceeds

#### Multiplayer Guest
- [ ] MR-G1: Receives host broadcast
- [ ] MR-G2: Guest needs action
- [ ] MR-G3: Guest auto-approves
- [ ] MR-G4: Phase skipped

### 9.6 ROUND_PHASES Tests - Sequential (deployment)

#### Local Mode (AI as P2)
- [ ] DP-L1: Human passes first
- [ ] DP-L2: AI passes first
- [ ] DP-L3: Human deploys, both pass
- [ ] DP-L4: AI deploys multiple drones
- [ ] DP-L5: Turn alternation
- [ ] DP-L6: Quick Deploy skips phase

#### Multiplayer Host (Guest as P2)
- [ ] DP-H1: Host passes first
- [ ] DP-H2: Guest passes first
- [ ] DP-H3: Host deploys, both pass
- [ ] DP-H4: Guest deploys
- [ ] DP-H5: Turn alternation
- [ ] DP-H6: firstPasser tracking

#### Multiplayer Guest
- [ ] DP-G1: Receives turn notification
- [ ] DP-G2: Guest passes
- [ ] DP-G3: Guest deploys
- [ ] DP-G4: Guest cannot transition phase
- [ ] DP-G5: Receives phase completion

### 9.7 ROUND_PHASES Tests - Sequential (action)

#### Local Mode (AI as P2)
- [ ] AC-L1: Human passes first
- [ ] AC-L2: AI passes first
- [ ] AC-L3: Human multiple actions
- [ ] AC-L4: AI multiple actions
- [ ] AC-L5: Human passes, AI continues
- [ ] AC-L6: Round completion

#### Multiplayer Host (Guest as P2)
- [ ] AC-H1: Host passes first
- [ ] AC-H2: Guest passes first
- [ ] AC-H3: Host multiple actions
- [ ] AC-H4: Guest multiple actions
- [ ] AC-H5: Host passes, guest continues
- [ ] AC-H6: Round completion
- [ ] AC-H7: Next round first player

#### Multiplayer Guest
- [ ] AC-G1: Receives turn notification
- [ ] AC-G2: Guest passes
- [ ] AC-G3: Guest multiple actions
- [ ] AC-G4: Receives round completion
- [ ] AC-G5: Guest cannot transition phase

### 9.8 Round Boundary Tests

- [ ] RB-1 through RB-10

### 9.9 Quick Deploy Tests

- [ ] QD-1 through QD-5

---

## 10. Test Count Summary

### Detailed Breakdown by Mode

| Phase | Local (AI) | Host (Guest) | Guest View | Total |
|-------|------------|--------------|------------|-------|
| deckSelection | 4 | 4 | 4 | 12 |
| droneSelection | 4 | 4 | 4 | 12 |
| placement | 4 | 4 | 4 | 12 |
| roundInitialization | 4 | 4 | 4 | 12 |
| mandatoryDiscard | 4 | 5 | 3 | 12 |
| optionalDiscard | 5 | 6 | 4 | 15 |
| allocateShields | 5 | 6 | 4 | 15 |
| mandatoryDroneRemoval | 4 | 5 | 4 | 13 |
| deployment | 6 | 6 | 5 | 17 |
| action | 6 | 7 | 5 | 18 |
| Round Boundary | 10 | - | - | 10 |
| Quick Deploy | 5 | - | - | 5 |
| **TOTAL** | **57** | **51** | **37** | **153** |

### Summary by Category

| Category | Tests |
|----------|-------|
| PRE_GAME_PHASES | 48 |
| ROUND_PHASES (Simultaneous) | 55 |
| ROUND_PHASES (Sequential) | 35 |
| Round Boundary | 10 |
| Quick Deploy | 5 |
| **TOTAL** | **153** |

### Priority Tests (Asymmetric Scenarios)

These are the highest-priority tests as they cover cases where desync bugs are most likely:

| ID | Phase | Scenario | Mode |
|----|-------|----------|------|
| MD-L3 | mandatoryDiscard | Only AI (P2) needs action | Local |
| MD-H4 | mandatoryDiscard | Only Guest (P2) needs action | Host |
| OD-L4 | optionalDiscard | Only AI has cards | Local |
| OD-H5 | optionalDiscard | Only Guest has cards | Host |
| AS-L4 | allocateShields | Only AI has shields | Local |
| AS-H5 | allocateShields | Only Guest has shields | Host |
| MR-L3 | mandatoryDroneRemoval | Only AI exceeds limit | Local |
| MR-H4 | mandatoryDroneRemoval | Only Guest exceeds limit | Host |

Note: Asymmetric scenarios where P2 needs action but P1 auto-approves are highest risk for desync.

---

## Document History

- Created: Phase flow test coverage documentation
- Source: GameFlowManager.js, PhaseManager.js, Design/Phase Management/
