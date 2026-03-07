# Unified Client-Server Architecture PRD

## 1. Overview

### Problem

The game has a "host/guest" asymmetry in multiplayer: the Host player's browser runs the GameEngine in-process and gets synchronous, instant state updates, while the Guest receives them asynchronously via P2P broadcast. This creates 13 documented asymmetries across the codebase and is the root cause of all timing/broadcast bugs that only affect one player.

Key asymmetries:
- **Animation playback**: Host plays animations server-side (ActionProcessor), Guest plays them client-side (GameClient)
- **Phase announcements**: Host uses PhaseAnimationQueue directly via ActionProcessor, Guest reconstructs them from state diffs
- **State delivery**: Host gets synchronous return values, Guest gets async P2P broadcasts
- **Pass notifications**: Host generates "YOU PASSED"/"OPPONENT PASSED" server-side, Guest must detect and generate them client-side
- **`isMultiplayer` branching**: GameClient has 6+ conditional branches that change behavior per mode

### Goal

Every client -- single-player, multiplayer host, multiplayer guest -- behaves identically. The only variable is where the server lives and how the transport connects to it. Zero `isMultiplayer` branching in client code.

### Industry Precedent

This is the standard model used by Hearthstone, MTG Arena, and Legends of Runeterra. The server processes actions and pushes state+animations to all clients as events. No client gets direct return values.

### Scope

- GameEngine event emission to registered clients
- LocalTransport conversion from sync return to async push
- Animation playback moved entirely to client (GameClient)
- Phase announcements as server-emitted animation events
- Elimination of all `isMultiplayer` branching in GameClient
- Deletion/simplification of asymmetric infrastructure (GuestCascadeRunner, etc.)
- PhaseAnimationQueue moved to client-only ownership

---

## 2. Architecture

```
SINGLE-PLAYER:                    MULTIPLAYER:

  [Browser]                        [Host Browser]        [Guest Browser]
  +-------------+                  +-------------+       +-------------+
  | GameClient  |                  | GameClient  |       | GameClient  |
  | (player1)   |                  | (player1)   |       | (player2)   |
  +------+------+                  +------+------+       +------+------+
         |                                |                      |
  LocalTransport                   LocalTransport          P2PTransport
    (async push)                     (async push)          (WebRTC push)
         |                                |                      |
  +------+------+                  +------+------+               |
  | GameEngine  |                  | GameEngine  +----- P2P -----+
  | (in-browser)|                  | (in-browser)|   (broadcast)
  +-------------+                  +-------------+
```

**Key change**: LocalTransport no longer calls `gameEngine.processAction()` and uses the return value. Instead, it sends the action and receives the response via a push callback from GameEngine's event bus -- identical to how P2PTransport works.

---

## 3. Client vs Server Responsibilities

| Concern | Owner | Details |
|-|-|-|
| Action processing | Server (GameEngine) | Validates actions, mutates state, collects animations |
| State mutation | Server (GameEngine) | Single source of truth |
| Animation playback | Client (GameClient) | Receives animation data from push, plays via AnimationManager |
| Phase announcements | Server (emitted as systemAnimations) | Client queues into PhaseAnimationQueue |
| Pass notifications | Server (emitted as systemAnimations) | Server emits player-neutral data, client personalizes ("YOU"/"OPPONENT") |
| State rendering | Client (GameClient) | Pushes state to ClientStateStore, React renders |
| State redaction | Server boundary | StateRedactor applied before state leaves server |

---

## 4. Data Flow

### All Modes (unified)
```
UI -> GameClient.submitAction() -> Transport.sendAction()
                                        |
                               [GameEngine processes action]
                                        |
                               GameEngine._emitToClients()
                                        |
                               Transport receives push callback
                                        |
                               GameClient._onResponse({ state, animations })
                                        |
                               GameClient plays animations, pushes state
```

The only difference between modes is the Transport implementation:
- **Single-player**: LocalTransport (in-process, zero latency)
- **P2P Host**: LocalTransport (in-process, GameEngine also broadcasts to P2P guests)
- **P2P Guest**: P2PTransport (WebRTC, receives broadcasts)
- **Firebase (future)**: FirebaseTransport (Cloud Functions, Firestore updates)

---

## 5. Success Criteria

1. **Zero `isMultiplayer` branching** in GameClient -- mode determined by Transport injection
2. **Identical animation playback** in all modes -- no double-animations, no missing animations
3. **Phase announcements server-emitted** -- no client-side reconstruction from state diffs
4. **All existing tests pass** -- no regressions
5. **GuestCascadeRunner deleted** -- guest no longer does optimistic phase processing
6. **PhaseAnimationQueue client-only** -- server never references it
7. **Single animation source** -- GameClient always returns 'SERVER' for getAnimationSource()

---

## 6. Key Risks

| Risk | Impact | Mitigation |
|-|-|-|
| Animation timing changes when moving playback from server to client | Host UX changes | GameClient._onResponse already handles this for guest mode -- proven code path |
| Server processes actions faster than client can animate | Action batching issues | Client already queues responses via MessageQueue. Animations play sequentially |
| AI opponent fires actions rapidly in single-player | Animation overlap | Same queuing mechanism handles this. Actually improves UX since AI actions won't block server |
| Phase 2+3 ordering dependency | Host broken between phases | Implement atomically as single change |
| Test files reference isAuthority/isMultiplayer extensively | Test update burden | Systematic test updates in Phase 6 |
