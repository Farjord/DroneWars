# Client-Server Refactor PRD

## 1. Overview

### Problem

The host IS the server. `LocalGameServer` wraps `GameEngine` directly in local/host mode, while `RemoteGameServer` uses a completely different code path for the guest. Two code paths means:

1. **Mode-specific bugs** — bugs that only appear in one mode (host vs guest) because they traverse different classes with different logic
2. **Firebase migration friction** — moving to Firebase requires refactoring the host's entire flow since `LocalGameServer` couples client concerns (animation playback, state rendering) with server concerns (action processing, state mutation)
3. **Doubled testing surface** — multiplayer testing must cover both `LocalGameServer` (host) and `RemoteGameServer` (guest) paths separately

### Goal

True Hearthstone/MTG Arena model — ALL players are clients. The server is a separate concern that can run in-process or remotely. The transport layer is the only variable. Moving to Firebase = new transport, zero client changes.

### Scope

- Transport abstraction (`Transport`, `LocalTransport`, `P2PTransport`)
- Unified `GameClient` replacing both `LocalGameServer` and `RemoteGameServer`
- `HostGameServer` orchestrator for P2P host mode
- `GameServerFactory` rewire to create Transport + GameClient per mode
- Deletion of `LocalGameServer`, `RemoteGameServer`, and associated dead code

---

## 2. Client vs Server Responsibilities

| Concern | Owner | Details |
|-|-|-|
| Action processing | Server (`GameEngine`) | Validates actions, mutates authoritative state, collects animations, returns `{ state, animations }` |
| State mutation | Server (`GameEngine`) | Single source of truth. All state changes happen here |
| Targeting | Client (`GameClient`) | Read-only computation against local state copy |
| Action pre-validation | Client (`GameClient`) | Lightweight checks before sending to server (energy cost, valid targets) |
| Animation playback | Client (`GameClient`) | Receives animation data from transport, plays via `AnimationManager` |
| State rendering | Client (`GameClient`) | Pushes state to `ClientStateStore`, React renders from there |
| State redaction | Transport/Server boundary | `StateRedactor` applied before state leaves the server |

---

## 3. Data Flow

### Single-player (local AI opponent)
```
UI -> GameClient -> LocalTransport -> GameEngine -> { state, animations }
                                                     |
                                          LocalTransport returns response
                                                     |
                                          GameClient plays animations, pushes state
```

### P2P Host
```
UI -> GameClient -> LocalTransport -> HostGameServer -> GameEngine -> { state, animations }
                                                         |
                                              HostGameServer broadcasts to guest via BroadcastService
                                                         |
                                              LocalTransport returns response to host's GameClient
```

### P2P Guest
```
UI -> GameClient -> P2PTransport -> (P2P network) -> Host's HostGameServer -> GameEngine
                                                                               |
                                                                    Response sent back via P2P
                                                                               |
                                                              P2PTransport delivers to GameClient
```

### Firebase (future)
```
UI -> GameClient -> FirebaseTransport -> Cloud Function -> GameEngine -> response via Firestore
```

The key insight: `GameClient` is identical in all four flows. Only the `Transport` implementation changes.

---

## 4. Animation Decoupling Justification

### Current State

`ActionProcessor.executeAndCaptureAnimations` already guards with `if (this.animationManager)` — animations are collected but not played when `animationManager` is null. This existing guard makes the decoupling safe.

### Server Mode

`ActionProcessor` runs without `animationManager` (set to null). It collects animation descriptors into the response payload but never plays them. No game logic depends on animation completion.

### Client Mode

`GameClient` receives animations from the transport response and plays them via its own `AnimationManager` instance. The `stateProvider` protocol (`applyPendingStateUpdate`, `revealTeleportedDrones`, `getAnimationSource`) is implemented directly on `GameClient`.

### Safety

No game logic depends on animation completion — animations are purely visual. The `TELEPORT_IN` flag handling (which modifies state temporarily during animation) is already handled correctly in `GameClient._onResponse`.

---

## 5. Key Risks

| Risk | Impact | Mitigation |
|-|-|-|
| Host animation timing changes | Host currently plays animations inline; new model plays them post-response | `GameClient._onResponse` already handles this correctly with `pendingHostState` pattern |
| BroadcastService call sites | ~8 sites in AP/GFM that call broadcast directly | `HostGameServer` centralizes broadcast after `processAction` — existing sites already consolidated via BroadcastService |
| MessageQueue complexity | Only needed for unreliable P2P transport (message ordering) | `P2PTransport` encapsulates `MessageQueue` internally; `GameClient` never sees it |
| AP inline animation removal | Removing `animationManager` from AP could break collection | Already guarded with `if (this.animationManager)` — safe to set null |
| Phase announcement logic duplication | Both `RemoteGameServer` and `GameClient` have identical `_queuePhaseAnnouncements` | `GameClient` absorbs this logic once; `RemoteGameServer` is deleted |

---

## 6. Success Criteria

1. **Single GameClient class** used by all modes (single-player, host, guest, future Firebase)
2. **Zero `gameMode` branching** in the client layer — mode is determined by which Transport is injected
3. **All existing tests pass** — no regressions in game behavior
4. **Firebase transport achievable** with zero client changes — only a new `Transport` subclass needed
5. **State redaction at server boundary** — no client ever receives opponent's private data
6. **Clean deletion** of `LocalGameServer.js` and `RemoteGameServer.js` with no remaining references
