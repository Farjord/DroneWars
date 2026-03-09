# Plan: Fix Guest State Disconnect (GSM vs CSS)

## Context

Diagnostic logging revealed the root cause of the guest's empty board. The guest's UI perspective methods (`getLocalPlayerState()`, `getLocalPlacedSections()`, etc.) delegate to `GameStateManager` which reads from its own stale internal state — NOT from `ClientStateStore._appliedState` which has the host-authoritative data.

**Evidence from logs:**
- `[3/5] Guest startGame complete` shows `localPlayerId: 'player1'` — guest's GSM thinks it's player1
- `STATE_CHECKPOINT` shows `gsmPlayer1Deck: 60` but CSS state from host has different data
- `GameClient._onResponse` correctly sets `localPlayerId: 'player2'` in CSS state
- After `applyUpdate()`, CSS has correct host state, but GSM methods bypass it entirely

**Root cause chain:**
1. `useGameState()` returns `gameState` from CSS (correct), but convenience methods delegate to GSM (wrong for guest)
2. GSM.state is never updated with host broadcasts — `applyHostState()` exists but is never called
3. GSM defaults `localPlayerId: 'player1'` — corrected by `setGameServer()` but only after first render

## Fix: Make useGameState Perspective Methods Read from CSS State

**File: `src/hooks/useGameState.js`** (primary change — ~10 method rewrites)

Instead of delegating to GSM for perspective-dependent reads, compute directly from `gameState` (which comes from CSS):

### Methods to change:

```js
// BEFORE: reads from GSM (stale for guest)
const getLocalPlayerId = useCallback(() => {
  return gameStateManager.getLocalPlayerId();
}, [gameState.localPlayerId]);

// AFTER: reads from gameState (CSS-backed, correct for all modes)
const getLocalPlayerId = useCallback(() => {
  return gameState.localPlayerId || 'player1';
}, [gameState.localPlayerId]);
```

| Method | Before (GSM) | After (gameState) |
|-|-|-|
| `getLocalPlayerId` | `gameStateManager.getLocalPlayerId()` | `gameState.localPlayerId \|\| 'player1'` |
| `getOpponentPlayerId` | `gameStateManager.getOpponentPlayerId()` | Derive from `gameState.localPlayerId` |
| `isMyTurn` | `gameStateManager.isMyTurn()` | `gameState.currentPlayer === localId` |
| `isMultiplayer` | `gameStateManager.isMultiplayer()` | `gameState.gameMode !== 'local'` |
| `getLocalPlayerState` | `gameStateManager.getLocalPlayerState()` | `gameState[localId]` |
| `getOpponentPlayerState` | `gameStateManager.getOpponentPlayerState()` | `gameState[opponentId]` |
| `isLocalPlayer` | `gameStateManager.isLocalPlayer(playerId)` | `playerId === localId` |
| `getLocalPlacedSections` | `gameStateManager.getLocalPlacedSections()` | Flip `placedSections`/`opponentPlacedSections` based on `localPlayerId` |
| `getOpponentPlacedSections` | `gameStateManager.getOpponentPlacedSections()` | Same flip logic, opposite direction |

**Why this is safe for local/host mode:** When `CSS._appliedState` is null (local/host), `CSS.getState()` falls through to `GSM.getState()`, so `gameState` === `GSM.getState()` — identical results.

### Secondary fix: Set localPlayerId in startGame for guest

**File: `src/managers/GameStateManager.js`** — in `startGame()`, set `localPlayerId: 'player2'` when `gameMode === 'guest'`. One-liner, prevents wrong identity during startup window before `setGameServer()` runs.

## Files Changed

| File | Change |
|-|-|
| `src/hooks/useGameState.js` | Rewrite 9 perspective methods to read from `gameState` instead of GSM |
| `src/managers/GameStateManager.js` | Set `localPlayerId: 'player2'` in `startGame()` for guest mode |

## NOT changing

- `ActionProcessor.js:229` (`getLocalPlacedSections`) — server-side code, runs on host where GSM IS authoritative
- `GameDebugModal.jsx:22` — debug-only, low priority
- `ClientStateStore` — working correctly, no changes needed
- `StateRedactor` — working correctly (preserves viewer's own data)

## Verification

1. `npx vitest run` — 0 test failures
2. Start multiplayer game as host + guest
3. Verify guest console shows `localPlayerId: 'player2'` in `[3/5]` log
4. Verify guest sees ship placement slots during placement phase
5. Verify guest sees their own deck/hand during gameplay
6. Verify `p2DeckCount` in expanded console objects (was truncated in initial logs — Chrome `...`)
