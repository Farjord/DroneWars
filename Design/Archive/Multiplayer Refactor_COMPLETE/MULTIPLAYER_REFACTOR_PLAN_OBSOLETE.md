# Unified Multiplayer Architecture Migration

## Context

The game currently has 4 processing modes (`local`, `host`, `guest`, `singlePlayer`) with 99+ branching sites scattered across 25 files. The guest has its own 1,463-line reconciliation pipeline (GuestMessageQueueService + GuestSyncManager + OptimisticActionService). This creates a large testing surface where multiplayer bugs only appear when testing as guest.

**`singlePlayer` mode is already unified**: `EremosEntryScreen.jsx:83,103` sets `gameMode: 'singlePlayer'` at campaign entry, but `SinglePlayerCombatInitializer.js:189` transitions to `gameMode: 'local'` before any combat begins. There are zero `gameMode === 'singlePlayer'` checks in the codebase — all combat flows through `local`. After this migration, campaign combat goes through LocalGameServer identically to quick-play. The `singlePlayer` value is only a pre-combat profile/campaign state that has no branching impact on game logic.

The user's goals:
    **"If single player works, multiplayer works."** One processing path for all modes. Reduced testing overhead.
    **Guest still processes in as close to real time as possible** With our new archetecture, both players mjst process optimistically, with the centralised game state reconsiling, and if needed overwriting. 

Additionally, the current system broadcasts the opponent's full hand, deck, and discard pile to the guest — a cheating vulnerability where anyone with browser DevTools can see the opponent's cards.

## Deliverable

**Step 0**: Create permanent design document at `Design/UNIFIED_MULTIPLAYER_ARCHITECTURE.md` containing the full architecture specification and phased migration plan below. This document lives in the repo permanently.

## Architecture Overview

Every game client becomes a "viewer" that submits actions to a **GameServer** and renders the result. The GameServer can be local (in-process) or remote:

```
Single Player:    UI → LocalGameServer → process locally → state + animations → render
Host:             UI → LocalGameServer → process locally → state + animations → render + broadcast
Guest:            UI → RemoteGameServer → send via P2P → receive state + animations → render
Future Firebase:  UI → RemoteGameServer → send via Cloud Function → receive state + animations → render
```

One client-side code path. The server location is a configuration detail injected at initialization.

### GameServer Interface

```javascript
class GameServer {
  submitAction(type, payload) → Promise<ActionResult>
  onStateUpdate(callback) → UnsubscribeFn    // server-pushed updates (remote only; no-op for local)
  getState() → GameState
  getPlayerView(playerId) → PlayerView       // redacted state for UI
  getLocalPlayerId() → string                // which player this client controls
  isPlayerAI(playerId) → boolean             // replaces gameMode-based AI detection
}
```

**Note on `isPlayerAI`**: `_getActionContext()` in ActionProcessor is a cached singleton (line 201: `if (this._actionContext) return this._actionContext`). Therefore `isAI` cannot be a static property on the context. Instead, `isPlayerAI(playerId)` is a function call that checks the player configuration, and the context provides it as `context.isPlayerAI(playerId)`. This handles both "is the actor AI?" (used by effect processors) and "is the defender AI?" (used by CombatActionStrategy:55 for interception decisions).

### Server Implementations

- **LocalGameServer**: Wraps ActionProcessor + GameStateManager. Processes in-process (0ms). For host mode, also owns BroadcastService to push state to guest.
- **RemoteGameServer**: Sends actions to host via P2PManager. Receives state updates. Handles optimistic processing + dedup internally.
- **Future CloudGameServer**: Same interface, sends to Firebase Cloud Function instead of P2P.

### Information Hiding (State Redaction)

GameServer's `getPlayerView()` returns redacted state:
- Own private state: hand contents, deck contents, discardPile contents
- Public state (both players): dronesOnBoard, energy, shields, shipSections
- Opponent: handCount, deckCount, discardCount only — never card contents
- `activeDronePool`: Review whether this reveals undeployed drone roster (strategic info). If so, redact to count only.

**Cross-player card effects**: If any card lets a player search/view/interact with the opponent's hand or deck (e.g., "discard from opponent's hand"), the server must handle selection server-side and only reveal the affected cards in the animation payload. The StateRedactor audit (Phase 8) must enumerate all such cross-player information flows.

### AI in the Unified Model

AI becomes a "player" connected to LocalGameServer via an AIPlayerAdapter, not a special gameMode. The adapter subscribes to phase transitions and submits AI actions through `gameServer.submitAction()` — same path as human input. This eliminates the `gameMode === 'local' && actingPlayerId === 'player2'` pattern from the logic layer.

## Phased Migration Plan

### Phase 0: BroadcastService Extraction (Foundation)

**Goal**: Consolidate all 13 broadcast call sites into a single BroadcastService. No behavior change.

**Changes**:
- Create `src/services/BroadcastService.js` owning: the `if (gameMode === 'host' && p2pManager)` guard, animation capture, state priority logic, sequence counter
- All 13 broadcast sites become `broadcastService.broadcastIfNeeded(trigger)`
- Remove `broadcastStateToGuest()` from ActionProcessor
- Remove broadcast calls from GameFlowManager (7), CommitmentStrategy (1), MiscActionStrategy (1)

**Files**:
| Action | File |
|-|-|
| Create | `src/services/BroadcastService.js` |
| Create | `src/services/__tests__/BroadcastService.test.js` |
| Modify | `src/managers/ActionProcessor.js` — remove broadcastStateToGuest, pending animation tracking |
| Modify | `src/managers/GameFlowManager.js` — replace 7 broadcast calls |
| Modify | `src/logic/actions/CommitmentStrategy.js` — replace 1 broadcast call |
| Modify | `src/logic/actions/MiscActionStrategy.js` — replace 1 broadcast call |

**Verification**: Existing tests pass. Manual multiplayer: host actions propagate to guest.

---

### Phase 1: GameServer Interface + LocalGameServer

**Goal**: Create GameServer interface and LocalGameServer wrapper. Single player uses LocalGameServer. No host/guest changes.

**Changes**:
- Create `src/server/GameServer.js` (base class/interface)
- Create `src/server/LocalGameServer.js` wrapping ActionProcessor + GameStateManager
- Create `src/server/GameServerFactory.js` — creates correct server from gameMode
- Modify `useActionRouting` to use `gameServer.submitAction()` for local mode only (feature-gated)

**Files**:
| Action | File |
|-|-|
| Create | `src/server/GameServer.js` |
| Create | `src/server/LocalGameServer.js` |
| Create | `src/server/GameServerFactory.js` |
| Create | `src/server/__tests__/LocalGameServer.test.js` |
| Modify | `src/hooks/useActionRouting.js` — conditionally use gameServer (local only) |

**Verification**: All single-player tests pass. LocalGameServer unit tests.

**Depends on**: Phase 0

---

### Phase 2: Host Mode Through LocalGameServer

**Goal**: Host mode uses LocalGameServer (which calls BroadcastService after mutations). Eliminates host-specific branching from client layer.

**Changes**:
- LocalGameServer.submitAction() calls BroadcastService.broadcastIfNeeded() after every action
- GameServerFactory.create('host', { p2pManager }) configures with broadcast
- Host useActionRouting uses same gameServer.submitAction() as local
- Remove `gameMode === 'host'` checks from useActionRouting

**Files**:
| Action | File |
|-|-|
| Modify | `src/server/LocalGameServer.js` — add post-action broadcast hook |
| Modify | `src/server/GameServerFactory.js` — host config |
| Modify | `src/hooks/useActionRouting.js` — remove host/local branching |

**Verification**: Existing multiplayer host tests pass. Manual multiplayer test.

**Depends on**: Phase 1

---

### Phase 3: RemoteGameServer for Guest Mode

**Goal**: Guest uses RemoteGameServer. All three modes use the same `gameServer.submitAction()` call — useActionRouting becomes mode-agnostic.

**Changes**:
- Create `src/server/RemoteGameServer.js`: sends via P2PManager.sendActionToHost(), receives state via P2PManager events, applies state via GameStateManager
- Guest useActionRouting uses `gameServer.submitAction()` — same code as host/local
- RemoteGameServer initially delegates to GuestMessageQueueService for message handling

**GMQS coexistence during transition**: RemoteGameServer subscribes to P2PManager `state_update_received` events and forwards them to the existing GuestMessageQueueService.processStateUpdate(). This is a thin wrapper — RemoteGameServer owns the P2P subscription, GMQS still does the heavy lifting (dedup, state application, phase announcements). Phase 4 absorbs GMQS into RemoteGameServer. During Phase 3, the two coexist cleanly because RemoteGameServer is the subscriber and GMQS is a delegate.

**Error recovery**: When `submitAction()` fails (P2P timeout, host unreachable), RemoteGameServer rejects the promise and triggers the existing resync protocol (`triggerResync` from GMQS lines 349-373). The `submitAction()` contract: resolves on success, rejects on failure. The client handles rejected promises by showing an error state.

**Files**:
| Action | File |
|-|-|
| Create | `src/server/RemoteGameServer.js` |
| Create | `src/server/__tests__/RemoteGameServer.test.js` |
| Modify | `src/server/GameServerFactory.js` — guest config |
| Modify | `src/hooks/useActionRouting.js` — now fully mode-agnostic |

**Verification**: RemoteGameServer unit tests. Integration test: guest submits action → host processes → guest receives state. Manual multiplayer: guest actions work.

**Depends on**: Phase 2

---

### Phase 4: Absorb Guest Services into RemoteGameServer

**Goal**: Eliminate GuestMessageQueueService, GuestSyncManager, and OptimisticActionService as separate classes. Their logic moves into RemoteGameServer.

**Changes**:
- RemoteGameServer absorbs: message queue, optimistic tracking, state application, phase announcements, TELEPORT_IN handling, resync protocol
- Delete 3 guest service files (~1,463 lines)
- Remove ~15 guest sync facades from GameStateManager
- Migrate tests from deleted files to RemoteGameServer tests

**Files**:
| Action | File |
|-|-|
| Delete | `src/managers/GuestMessageQueueService.js` (981 lines) |
| Delete | `src/managers/GuestSyncManager.js` (~195 lines) |
| Delete | `src/managers/OptimisticActionService.js` (~287 lines) |
| Modify | `src/server/RemoteGameServer.js` — absorb logic |
| Modify | `src/managers/GameStateManager.js` — remove guest facades |

**Verification**: Migrated tests pass. Full multiplayer integration test.

**Depends on**: Phase 3

---

### Phase 5: Eliminate gameMode from GameFlowManager

**Goal**: GameFlowManager becomes a pure phase flow engine with no gameMode checks.

**Changes**:
- Remove ~19 gameMode comparisons from GameFlowManager
- Remove guest guards (`if (gameMode === 'guest') return` — unnecessary because RemoteGameServer doesn't activate GFM)
- Remove broadcast calls (handled by BroadcastService since Phase 0)
- Simplify PhaseManager: remove guest blocking

**Files**:
| Action | File |
|-|-|
| Modify | `src/managers/GameFlowManager.js` — remove 19 gameMode checks |
| Modify | `src/managers/PhaseManager.js` — remove guest blocking |

**Verification**: All GameFlowManager tests pass. Manual smoke test all modes.

**Depends on**: Phase 4

---

### Phase 6: Eliminate gameMode from Strategy Layer

**Goal**: Remove all gameMode checks from `src/logic/actions/` and `src/logic/effects/`. Replace `gameMode === 'local' && actingPlayerId === 'player2'` AI detection with `context.isPlayerAI(playerId)`.

**High-risk area — CommitmentStrategy**: Lines 134-168 have a complex three-way gameMode branch controlling PhaseManager notifications, broadcasting, and AI auto-commitment. This is the most bug-prone interaction point. Requires dedicated test coverage before modifying.

**Changes**:
- CommitmentStrategy: remove 5 gameMode checks, simplify PhaseManager notification, replace AI auto-commitment trigger
- DroneActionStrategy: remove 3 gameMode checks
- MiscActionStrategy: remove 2 gameMode checks
- CombatActionStrategy: remove 1 gameMode check. Note: this checks `isAI` for the **defender**, not the actor (line 55 checks if defending player is AI for interception auto-resolve). Use `context.isPlayerAI(defendingPlayerId)`.
- Effect processors (DrawThenDiscardProcessor, SearchAndDrawProcessor, MovementEffectProcessor, RecalculateAbilityProcessor): replace `gameMode === 'local' && actingPlayerId === 'player2'` with `context.isPlayerAI(actingPlayerId)`
- AbilityResolver: replace 2 hardcoded `gameMode: 'local'` values (lines 281, 323)
- PhaseRequirementChecker: remove gameMode read from state (line 73)
- PhaseManager: replace notifyHostAction/notifyGuestAction with notifyPlayerAction(playerId). Update constructor to accept mode-agnostic config instead of storing `this.gameMode` (line 38).

**Files**:
| Action | File |
|-|-|
| Modify | `src/logic/actions/CommitmentStrategy.js` |
| Modify | `src/logic/actions/DroneActionStrategy.js` |
| Modify | `src/logic/actions/MiscActionStrategy.js` |
| Modify | `src/logic/actions/CombatActionStrategy.js` |
| Modify | `src/logic/effects/cards/DrawThenDiscardProcessor.js` |
| Modify | `src/logic/effects/cards/SearchAndDrawProcessor.js` |
| Modify | `src/logic/effects/MovementEffectProcessor.js` |
| Modify | `src/logic/abilities/ship/RecalculateAbilityProcessor.js` |
| Modify | `src/logic/abilities/ship/AbilityResolver.js` |
| Modify | `src/logic/phase/PhaseRequirementChecker.js` |
| Modify | `src/managers/PhaseManager.js` — constructor + API change |
| Modify | `src/managers/ActionProcessor.js` — context provides isPlayerAI() |

**Verification**: All strategy and effect processor tests pass. Specific tests: AI auto-discard, AI auto-search, AI combat interception, AI auto-commitment.

**Depends on**: Phase 5

---

### Phase 7: Clean Up Client Layer

**Goal**: Remove remaining gameMode checks from React hooks and components.

**Changes**:
- `useGameState.js`: Simplify 7 gameMode-derived helpers (`isMyTurn`, `getLocalPlayerId`, `isMultiplayer`, `isHost`, `isGuest`, `getLocalPlacedSections`, `getOpponentPlacedSections`) — delegate to GameServer.getLocalPlayerId() instead of switching on gameMode
- useMultiplayerSync: simplify — waiting overlays driven by GameServer events
- useGameLifecycle: remove gameMode checks, replace AI initialization (line 117) with AIPlayerAdapter wiring
- GameStateManager: simplify identity methods, remove `isNetworkAction` bypass flag (line 447) — server validates all actions
- Screen components: LobbyScreen, ShipPlacementScreen, DeckSelectionScreen, DroneSelectionScreen, AddCardToHandModal (6 checks), WaitingOverlay, GameFooter, GameDebugModal
- Replace `render_complete` event pattern (used by DroneSelectionScreen:242, DeckSelectionScreen:320, ShipPlacementScreen:263) with RemoteGameServer callback-based render confirmation — eliminate the `50ms setTimeout` hack (GMQS line 455) rather than absorbing it

**Files**:
| Action | File |
|-|-|
| Modify | `src/hooks/useGameState.js` — simplify 7 identity helpers |
| Modify | `src/hooks/useMultiplayerSync.js` |
| Modify | `src/hooks/useGameLifecycle.js` |
| Modify | `src/managers/GameStateManager.js` |
| Modify | `src/managers/ActionProcessor.js` — remove isNetworkAction bypass |
| Modify | Screen/modal components (8+ files) |

**Verification**: Hook tests pass. Full end-to-end: single-player, host, guest.

**Depends on**: Phase 6

---

### Phase 8: State Redaction (Information Hiding)

**Goal**: Server sends each player only their own view. Guest no longer receives opponent's hand/deck/discard contents.

**Changes**:
- Create `src/server/StateRedactor.js` — takes full state + player ID, returns redacted view
- BroadcastService uses StateRedactor before sending to guest
- LocalGameServer.getPlayerView() uses StateRedactor for UI
- Verify no component accesses opponent's actual card contents

**Files**:
| Action | File |
|-|-|
| Create | `src/server/StateRedactor.js` |
| Create | `src/server/__tests__/StateRedactor.test.js` |
| Modify | `src/services/BroadcastService.js` — apply redaction before broadcast |
| Modify | `src/server/LocalGameServer.js` — getPlayerView uses redactor |

**Verification**: StateRedactor unit tests. Network traffic inspection: no opponent cards visible.

**Depends on**: Phase 4 (can run in parallel with Phases 5-7)

---

### Phase 9: Delete Dead Code and Finalize

**Goal**: Remove all replaced/unreachable code. Update documentation.

**Changes**:
- Delete `processNetworkAction()` from ActionProcessor (already dead)
- Delete `render_complete` event emission, `state_sync_requested` handler
- Delete orphaned JSDoc blocks
- Update `Design/MULTIPLAYER_ARCHITECTURE.md` → point to new architecture doc
- Update `Design/CODEBASE_AUDIT.md` — mark findings [FIXED]
- Update `Design/Technical Debt Refactor/FUTURE_IMPROVEMENTS.md` — resolve items #9, #50

**Depends on**: All previous phases

## Migration Metrics

| Metric | Before | After |
|-|-|-|
| gameMode comparisons | 86 | ~5 (factory + identity helpers) |
| broadcastStateToGuest calls | 13 | 0 (BroadcastService hook) |
| Guest-specific services | 3 files, 1,463 lines | 0 (absorbed into RemoteGameServer) |
| isHost/isGuest checks | 31 | ~3 (P2PManager + lobby UI) |
| Total multiplayer-specific code | ~2,000 lines across 25 files | ~400 lines in 4 server files |
| Net line reduction | — | ~1,000 lines |

## Phase Dependency Graph

```
Phase 0: BroadcastService Extraction
    ↓
Phase 1: GameServer Interface + LocalGameServer
    ↓
Phase 2: Host Mode Through LocalGameServer
    ↓
Phase 3: RemoteGameServer for Guest Mode
    ↓
Phase 4: Absorb Guest Services
   ↓ ↘
   ↓  Phase 8: State Redaction (independent)
   ↓
Phase 5: Eliminate gameMode from GFM
    ↓
Phase 6: Eliminate gameMode from Strategies
    ↓
Phase 7: Clean Up Client Layer
    ↓
Phase 9: Delete Dead Code and Finalize
```

## Key Design Decisions

1. **ActionProcessor stays**: Its queue, locks, and strategy dispatch are battle-tested. LocalGameServer wraps it.
2. **Optimistic processing preserved**: RemoteGameServer can optionally process locally before host confirms. Animations mask latency.
3. **No big bang**: Every phase produces a working game. Migration is additive (new files) then subtractive (old files deleted). Create a git tag checkpoint before each phase.
4. **Animation pipeline unchanged**: AnimationManager.executeWithStateUpdate() contract stays identical. RemoteGameServer must implement the stateProvider protocol: `applyPendingStateUpdate()`, `revealTeleportedDrones()`, `getAnimationSource()`.
5. **AI detection via function, not mode**: `context.isPlayerAI(playerId)` replaces `gameMode === 'local' && player2`. Works for both "is actor AI?" and "is defender AI?" patterns. Not cached in singleton context — it's a function call.
6. **Broadcast timing is critical**: In `_executeAnimationPhase()` (ActionProcessor:773), broadcast happens BETWEEN state calculation and animation playback. BroadcastService must fire at the same point — not as a post-`submitAction()` hook. LocalGameServer exposes a `broadcastHook` that ActionProcessor calls during `_executeAnimationPhase`, not after it returns.
7. **Guest action processing on host**: Currently `processGuestAction` (ActionProcessor:642) calls `queueAction` directly. In the new architecture, P2PManager calls `localGameServer.submitAction()` with the guest's action — same interface, same validation.

## Risk Analysis

| Risk | Mitigation |
|-|-|
| Guest stops receiving updates during migration | Phase 0 extracts broadcasts without changing behavior. Manual test after each phase. |
| Broadcast timing shifts (fires after animations instead of during) | Decision 6: BroadcastService fires via hook during `_executeAnimationPhase`, not post-submitAction. Test with timing assertion. |
| Animation timing regresses | AnimationManager contract unchanged. RemoteGameServer implements same stateProvider protocol. |
| AI behavior changes | Phase 6 changes detection method, not AI logic. Dedicated AI auto-resolve tests. |
| Phase flow breaks during GFM cleanup | Phase 5 only removes guards — flow logic stays. Existing tests verify all paths. |
| TELEPORT_IN protocol breaks | Moves from GMQS to RemoteGameServer but protocol is identical. |
| CommitmentStrategy regression | High-risk area (3-way gameMode branch + PhaseManager + broadcast + AI). Write dedicated tests before modifying. |
| Subtle multiplayer regression only found later | Git tag checkpoints before each phase. Rollback to tag if regression found. |
| Singleton context caches stale isAI | `isPlayerAI` is a function call, not a cached property. Test with alternating player actions. |
| Cross-player card effects break under redaction | Phase 8 audit enumerates all cross-player flows. Server handles selection for hidden cards. |

## Verification

### Per-Phase Checklist
After each phase:
1. `npx vitest run` — all tests pass (zero failures)
2. Manual single-player game — card play, combat, phase transitions, AI behavior all correct
3. Manual multiplayer game (after Phases 0, 2, 3, 4, 5) — host and guest experience correct
4. `git tag phase-N-complete` — checkpoint for rollback

### Phase-Specific Tests

| Phase | Required Test |
|-|-|
| 0 | BroadcastService fires at same timing point as original inline calls |
| 1 | LocalGameServer.submitAction() returns same result as direct ActionProcessor call |
| 3 | Integration: guest submits action → host processes → guest receives state + animations |
| 4 | Migrated GMQS tests: sequence tracking, OOO handling, resync, optimistic dedup, TELEPORT_IN |
| 6 | AI auto-resolve: DrawThenDiscard, SearchAndDraw, Movement, combat interception, commitment |
| 8 | Serialized redacted state contains zero opponent card names/effects/descriptions |
