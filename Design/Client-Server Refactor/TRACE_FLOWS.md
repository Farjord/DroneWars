# Trace Flow Documentation

Debug trace systems for verifying end-to-end flows in the client-server architecture.
All traces use `debugLogger.js` categories — enable/disable in `DEBUG_CONFIG.categories`.

**Architecture Note:** SERVER traces fire in GameEngine/ActionProcessor/GameFlowManager (authority-side). CLIENT traces fire in GameClient/AnimationManager/PhaseAnimationQueue (presentation-side). Transport (LocalTransport vs P2PTransport) is the only difference between single-player and multiplayer.

---

## INIT_TRACE (8 steps) — Game Initialization

Verifies the full initialization path from module load through React mount to first render.

| Step | Location | What it proves |
|-|-|-|
| [1/8] | clientStateStore.singleton.js | ClientStateStore singleton created (module-level) |
| [2/8] | AppRouter.jsx (useRef init) | PhaseAnimationQueue + GameFlowManager created |
| [3/8] | useGameState.js (useEffect) | useGameState subscribed to ClientStateStore |
| [4/8] | AppRouter.jsx (useEffect) | GameFlowManager.initialize() called |
| [5/8] | App.jsx | GameServerFactory.create() |
| [6/8] | App.jsx | GameClient wired to managers |
| [7/8] | App.jsx (render) | Initial render with state from ClientStateStore |
| [8/8] | useAnimationSetup.js | AnimationManager created + wired |

**Enable:** `INIT_TRACE: true`
**Expected:** Steps [1/8] through [8/8] in order on game start.

---

## DEPLOY_TRACE (10 steps) — Drone Deployment

Verifies the full deployment path from UI click through game logic to state application.
**Gated:** Steps [2]-[5] and [8]-[9] only fire when `type === 'deployment'` to avoid noise from other action types.

| Step | Location | What it proves |
|-|-|-|
| [1/10] | DeploymentPanel UI | User clicked deploy |
| [2/10] | GameClient.submitAction | Action routed to transport (deployment only) |
| [3/10] | LocalTransport.sendAction | Transport forwarding to engine (LocalTransport only) |
| [4/10] | GameEngine.processAction | Engine received action (deployment only) |
| [5/10] | GameStateManager.processAction | GSM dispatching to ActionProcessor (deployment only) |
| [6/10] | ActionProcessor.processAction | Strategy dispatch |
| [7/10] | DeploymentProcessor | Game logic executed |
| [7b/10] | GameStateManager.processAction | Deployment state committed confirmation |
| [8/10] | GameEngine.processAction | Response prepared with animations (deployment only) |
| [9/10] | LocalTransport callback | Response flowing back to client (LocalTransport only) |
| [10/10] | GameClient._applyState | Final state applied to UI store |

**Note:** Steps [3/10] and [9/10] are LocalTransport-specific. For guest player actions, the transport leg uses MP_SYNC_TRACE ([8/11] through [10/11]).

**Enable:** `DEPLOY_TRACE: true`
**Expected:** Steps [1/10] through [10/10] in order on drone deploy (single-player/host).

---

## ANIM_TRACE (7 steps + bypass) — Animation Pipeline

Verifies the animation pipeline from game logic events through to execution.

| Step | Location | What it proves |
|-|-|-|
| [1/7] | ActionProcessor.mapAnimationEvents | Raw events from game logic: count + types |
| [1b/7] | ActionProcessor.executeAndCaptureAnimations | Bypass path entry (GO_AGAIN, CARD_REVEAL, etc.) |
| [2/7] | ActionProcessor.captureAnimationsForBroadcast | What gets stored for response/broadcast |
| [3/7] | ActionProcessor._executeAnimationPhase | Animation phase entry: teleport prep, broadcast |
| [4/7] | AnimationManager.executeWithStateUpdate | Pre/post/independent breakdown + source |
| [5/7] | AnimationManager (after applyPendingStateUpdate) | State committed mid-animation |
| [6/7] | AnimationManager (end of executeWithStateUpdate) | Execution complete with duration |
| [7a/7] | GameClient._onResponse | Client received engine response: animation count, phase |
| [7/7] | GameClient._onResponse | Client animation dispatch: count, names, willPlay |

Steps [1-3] are server-side (collect animations during processing). Steps [4-6] are server-side (play during ActionProcessor execution). Steps [7a]+[7] are client entry (play via GameClient._onResponse).

**Enable:** `ANIM_TRACE: true`

### Step [1b/7] — Bypass Path

Some animations skip the full `_executeAnimationPhase` pipeline and go through `executeAndCaptureAnimations` directly. These include:
- `GO_AGAIN_NOTIFICATION` — played after goAgain card plays
- `CARD_REVEAL` — played after SearchAndDraw completion

Step [1b/7] logs: `{ count, isSystem, names }` to track these bypass animations.

### Expected Output by Action Type

**Player deploy drone:**
- Steps [1/7] through [6/7] fire during ActionProcessor._executeAnimationPhase
- Steps [7a/7] and [7/7] fire in GameClient._onResponse

**AI deploy drone:**
- Steps [1/7] through [6/7] only (no GameClient path for AI actions processed server-side)

**Card play with goAgain:**
- Steps [1/7] through [6/7] for the card effect animations
- Step [1b/7] for the GO_AGAIN_NOTIFICATION bypass
- Steps [7a/7] and [7/7] on response

### Deduplication Notes

- **STATE_SNAPSHOT filtering:** `captureAnimationsForBroadcast` filters out STATE_SNAPSHOT events (step [2/7] shows filteredOut count)
- **No action animation dedup:** There is no deduplication of action animations between the processing path and the response path

---

## CARD_PLAY_TRACE (11 steps) — Card Play Pipeline

End-to-end trace from UI card selection through chain processing to resolution.
Steps [1]-[1.5] are UI-side (React hooks), steps [2]-[10] span client and server.

| Step | Location | What it proves |
|-|-|-|
| [1]-[1.5] | useEffectChain, useCardSelection | UI chain selection flow (effect-by-effect target picking) |
| [2] | useResolvers | Card play dispatched to game server |
| [3] | ActionProcessor.processCardPlay | Action entered processor |
| [4] | CardActionStrategy.processCardPlay | Target resolved from targetId |
| [5] | CardActionStrategy._processChainCardPlay | Entering chain engine (EffectChainProcessor) |
| [5b] | CardActionStrategy._processChainCardPlay | Animation path chosen: `actionSteps` or `flat` |
| [6] | EffectChainProcessor.processEffectChain | Chain started, costs paid |
| [7] | EffectChainProcessor (per-effect) | Individual effect processing |
| [8] | EffectChainProcessor / CardActionStrategy | Chain finalized / SearchAndDraw finalized |
| [9] | CardActionStrategy._processChainCardPlay | Post-chain: shouldEndTurn, animationCount |
| [10] | useResolvers / DroneActionStrategy | Resolution (UI-side + AI-side duplicate) |

**Enable:** `CARD_PLAY_TRACE: true`

### Step [5b] — Animation Path Selection

After the chain engine returns its result, CardActionStrategy chooses between two animation paths:
- **actionSteps path:** Card has structured trigger steps (movement cards with ON_MOVE triggers). Logs `cardOnlyAnimCount` and `actionStepCount`.
- **flat path:** Standard animation array with optional STATE_SNAPSHOT/TRIGGER_CHAIN_PAUSE markers. Logs `animCount` and `hasStateSnapshot`.

### Notes

- Step [2] also fires in DroneActionStrategy:430 for AI card plays
- Step [10] fires both in useResolvers:252 (human) and DroneActionStrategy:439 (AI)
- In local mode (LocalTransport is synchronous), all steps fire in sequence

---

## AI_TURN_TRACE — AI Decision Pipeline

Step-by-step trace of AI turn detection, evaluation, decision-making, and execution.
Uses `[AI-NN]` format. Steps [AI-03] through [AI-07] are **polymorphic** — same step number fires with different meaning per phase (deployment/action/discard). The `data` payload identifies the phase.

| Step | Location | What it proves |
|-|-|-|
| [AI-01] | AIPhaseProcessor:224 | AI turn detected: phase, currentPlayer, round |
| [AI-02] | AIPhaseProcessor:272 / AISequentialTurnStrategy | Turn executing with resource summary |
| [AI-03] | AISequentialTurnStrategy (per phase) | Phase-specific evaluation (resource counts, pool sizes) |
| [AI-04] | actionDecision:353 / deploymentDecision:288 | Decision pool / scored results |
| [AI-04b] | AISequentialTurnStrategy:72,75 | Decision dispatched to ActionProcessor (pass or deploy) |
| [AI-04c] | AISequentialTurnStrategy:76 | Dispatching action to queue |
| [AI-05] | actionDecision:463 / deploymentDecision:291-302 | Decision details with scores |
| [AI-06] | actionDecision:490 / AISequentialTurnStrategy:89 | Adjustments applied / Result |
| [AI-07] | actionDecision:510-532 / AISequentialTurnStrategy:101 | Final decision: type, target, score / Turn complete |
| [AI-08] | DroneActionStrategy:394 | Dispatching to action processor: type + subtype |
| [AI-09] | AIPhaseProcessor:285,292,310 | Action result: success, needsInterception |
| [AI-10] | AIPhaseProcessor:300 | Turn complete: continues or turnOver |
| [AI-INT-1] | AIPhaseProcessor:329 | Interception decision started |
| [AI-INT-2] | AIPhaseProcessor:341 | Interception decision result |

**Enable:** `AI_TURN_TRACE: true`

### Polymorphic Steps

Steps [AI-03] through [AI-07] fire different data depending on phase:
- **Deployment:** pool sizes, deployment budget, scored drone options
- **Action:** available actions (attack/move/ability/card), scored action options
- **Discard:** hand evaluation, discard candidates

---

## ROUND_TRACE (7 steps) — Round Initialization

Traces the atomic round initialization sequence in RoundInitializationProcessor.

| Step | Location | What it proves |
|-|-|-|
| [1/7] | RoundInitializationProcessor.process() entry | Round init started: roundNumber (current, already incremented by GFM), isRoundLoop |
| [2/7] | After firstPlayerDetermination | First player determined |
| [3/7] | After energyReset queueAction | Energy/budget/shields reset for both players |
| [4/7] | After roundStartTriggers | ON_ROUND_START abilities processed |
| [5/7] | After momentum section | Momentum awarded (recipient + newValue) or skipped |
| [6/7] | After rebuildProgress | Drone rebuild progress processed |
| [7/7] | After card draw | Round init complete: hand sizes |

**Enable:** `ROUND_TRACE: true`
**Expected:** Steps [1/7] through [7/7] fire at the start of every round.

### Momentum Variants (Step 5)

- `{ awarded: true, recipient, newValue }` — one player controls more lanes
- `{ awarded: false }` — tied lane control (round 2+)
- `{ skipped: true }` — round 1 (no momentum award)

---

## PHASE_TRACE (8 steps) — Phase Lifecycle

Traces phase transitions, turn decisions, and phase landing throughout the game.

| Step | Location | What it proves |
|-|-|-|
| [1/8] | GFM.handleActionCompletion | Action completed: type, phase, shouldEndTurn (suppressed for aiAction/turnTransition) |
| [2/8] | GFM.handleActionCompletion (turn decision) | Decision: `turnTransition` (shouldEndTurn=true) or `goAgain` (shouldEndTurn=false). Does NOT fire for non-action completions (e.g., turnTransition, consumption) where shouldEndTurn is undefined. |
| [3/8] | GFM.onSequentialPhaseComplete | Sequential phase ended: phase, reason, nextPhase |
| [4/8] | GFM.onSimultaneousPhaseComplete | Simultaneous phase ended: applying commitments |
| [5/8] | GFM.transitionToPhase | Phase transition executing: from → to, mode |
| [6/8] | GFM.processRoundInitialization (entry) | Round initialization starting |
| [7/8] | GFM.processRoundInitialization (exit) | Round initialization complete: roundNumber, nextPhase |
| [8/8] | GFM.transitionToPhase / initiateSequentialPhase (end) | Phase landed: phase, from (fires after setState completes) |

**Enable:** `PHASE_TRACE: true`

### Expected Scenarios

**Turn transition (player action ends turn):**
- [1/8] → [2/8] `turnTransition` → (next player acts)

**GoAgain card play:**
- [1/8] → [2/8] `goAgain` → (same player continues)

**Both players pass → phase complete:**
- [3/8] `both_passed` → [5/8] transitionToPhase → [8/8] phase landed

**Simultaneous phase (deckSelection → droneSelection):**
- [4/8] → [5/8] → [8/8] `sim→sim`

**Round boundary (action → roundInit → deployment):**
- [3/8] → [6/8] → [7/8] → [5/8] → [8/8] `seq→seq`

---

## COMMIT_TRACE (6 steps) — Simultaneous Phase Commitments

Traces the commitment lifecycle for simultaneous phases (deckSelection, droneSelection, placement, allocateShields, etc.).

| Step | Location | What it proves |
|-|-|-|
| [1/6] | CommitmentStrategy.processCommitment | Commitment received: phase, playerId, dataKeys |
| [2/6] | CommitmentStrategy (before PhaseManager notify) | Commitment stored: p1/p2 status, bothComplete |
| [3/6] | CommitmentStrategy (before AI auto-commit) | AI auto-commit starting: phase, willTriggerPhaseCompletion |
| [4/6] | CommitmentStrategy.applyPhaseCommitments | Applying commitments: phase, updateKeys |
| [5/6] | GFM.onSimultaneousPhaseComplete | Commitments applied: stateUpdatesApplied count |
| [6/6] | GFM (after next phase determined) | Transition: from → to, transitionType |

**Enable:** `COMMIT_TRACE: true`

### Single-player vs Multiplayer

In single-player mode, step [3/6] fires after [2/6] but BEFORE the AI auto-commit executes. `bothComplete` will be `true` after the AI commit completes.

In multiplayer, step [3/6] does not fire. Steps [1/6] and [2/6] fire independently for each player. `bothComplete` becomes `true` when the second player commits.

---

## STATE_CHECKPOINT — Master Game State Snapshots

Captures a structured game state snapshot at key moments for debugging state drift.

| Tag | Location | When |
|-|-|-|
| `[ROUND_START]` | RoundInitializationProcessor.process() end | After all round init substeps |
| `[DEPLOY_END]` | GFM.onSequentialPhaseComplete (deployment→action) | Both players passed deployment |
| `[ACTION_END]` | GFM.onSequentialPhaseComplete (action→new round) | Both players passed action |
| `[GAME_OVER]` | ActionProcessor.checkWinCondition | Winner determined |

**Enable:** `STATE_CHECKPOINT: true`

### Snapshot Shape

```js
{
  round: N, phase: '...', currentPlayer: '...',
  p1: { drones: N, hand: N, energy: N, momentum: N, deck: N },
  p2: { drones: N, hand: N, energy: N, momentum: N, deck: N },
}
```

`[GAME_OVER]` also includes `winner` field.

### Usage

Compare `[ROUND_START]` snapshots across rounds to verify resource resets.
Compare `[DEPLOY_END]` to `[ACTION_END]` to see what changed during the action phase.
`[GAME_OVER]` captures final board state for post-mortem analysis.

---

## MP_JOIN_TRACE (7 steps) — Connection Lifecycle

Traces the full multiplayer connection path from UI click through to peer connected/disconnected.

| Step | Location | What it proves |
|-|-|-|
| [1/7] | MultiplayerLobby.jsx (handleHostGame/handleJoinGame) | User clicked Host/Join button |
| [2/7] | P2PManager.hostGame/joinGame entry | P2PManager received request |
| [3/7] | P2PManager (after joinRoom) | Trystero room created/joined |
| [4/7] | P2PManager.onPeerJoin | Peer detected, connection established |
| [5/7] | P2PManager (events emitted) | Mode change + room events emitted |
| [6/7] | MultiplayerLobby (event handler) | UI updated to waiting/connected |
| [7/7] | P2PManager.onPeerLeave | Peer left or disconnect called |

**Enable:** `MP_JOIN_TRACE: true`
**Expected:** Steps [1/7] through [6/7] in order when hosting or joining a game. [7/7] fires on disconnect.

### Error Paths

Errors log with the category but no step number, and include `{ error: true, message }`:
- `hostGame failed` — Trystero room creation error
- `joinGame failed` — room join or timeout error
- `[4/7] Guest timeout` — includes `{ timeout: true, elapsedMs }` when 30s timeout fires

### Guard Warnings

- `Error in P2P listener` — exception in a subscribed listener callback

---

## MP_SYNC_TRACE (11 steps) — State Broadcast Cycle

Traces the server→client state broadcast and client→server action sending cycle.

| Step | Location | What it proves |
|-|-|-|
| [1/11] | HostGameServer.processAction | Server processed action, will broadcast (removed — too noisy) |
| [2/11] | BroadcastService.broadcastIfNeeded | Broadcast decision: stateSource, trigger, animCount |
| [3/11] | P2PManager.broadcastState | Serialized + sent via Trystero (sequenceId) |
| [4/11] | P2PManager.receiveStateUpdate | Client received STATE_UPDATE |
| [5/11] | P2PTransport (MessageQueue.enqueue) | Message enqueued for ordered processing (MESSAGE_QUEUE category) |
| [6/11] | GameStateManager.syncFromServer | Client applying server state (fieldCount, phase) |
| [7/11] | GameClient._onActionAck | Client received ack (success/rejection) |
| [8/11] | P2PManager.sendActionToHost | Client sent action to server |
| [9/11] | P2PManager.receiveGuestAction | Server received remote action |
| [10/11] | HostGameServer.handleGuestAction | Server processing remote action |
| [11/11] | P2PManager.sendActionAck | Server sent ack to client |

**Enable:** `MP_SYNC_TRACE: true`

### Server → Client Flow (state broadcast)

```
[2/11] BroadcastService decision → [3/11] P2PManager sends → [4/11] Client receives → [6/11] Client applies
```

### Client → Server Flow (remote action)

```
[8/11] Client sends action → [9/11] Server receives → [10/11] Server processes → [11/11] Server sends ack → [7/11] Client receives ack
```

### Resync Variant

Resync messages log with `{ resync: true }` and no step number:
- `Guest requesting full sync` — P2PManager.requestFullSync
- `P2PTransport requesting full sync` — P2PTransport._onResyncNeeded
- `P2PTransport resync response received` — P2PTransport._onResyncResponse
- `Host received sync request` — P2PManager.receiveSyncRequest
- `Host sent full sync response` — P2PManager.sendFullSyncResponse

### Guard Warnings

Guard messages log with `{ guard: true }` and no step number:
- `only host can broadcast state`
- `host should not send actions to itself`
- `only host can send action acks` / `sync response`
- `Guard: ... — no connection` — _requireConnection failed

---

## MP_GAME_TRACE (5 steps) — Game Start

Traces the "Start Game" flow from button click through to initial state sync.

| Step | Location | What it proves |
|-|-|-|
| [1/5] | MultiplayerLobby.handleStartGame | Host clicked "Start Game" |
| [2/5] | LobbyScreen.handleMultiplayerGameStart | Mode determined, startGame called |
| [3/5] | LobbyScreen (useEffect) | P2P integration wired to GSM |
| [4/5] | LobbyScreen (initial broadcast) | Host broadcasted initial state |
| [5/5] | useMultiplayerSync (sync_requested handler) | Full sync request/response |

**Enable:** `MP_GAME_TRACE: true`
**Expected:** Steps [1/5] through [4/5] fire in order on host when starting a multiplayer game. [5/5] fires on demand when guest requests resync.

---

## MESSAGE_QUEUE — Message Ordering

Structured logging in MessageQueue.js (6 calls). Tracks duplicate detection, out-of-order buffering, message processing, and resync triggers.

**Enable:** `MESSAGE_QUEUE: true`
**Note:** Already existed in MessageQueue.js but was missing from debugLogger config. Now registered.

---

## TRIGGER_SYNC_TRACE (8 steps) — Trigger Animation Sync

Traces the trigger animation pipeline from server capture through network transit to client playback.
Used to diagnose client-side trigger animation delays in multiplayer.

**Gated:** Only fires when `TRIGGER_FIRED` animations are present in the payload.
**Correlation:** All steps share a `triggerSyncId` (stamped in step [1/8]) for cross-device log matching.
All steps include `utc: new Date().toISOString()` for absolute timestamp comparison.

| Step | Role | Location | What it measures |
|-|-|-|-|
| [1/8] | SERVER | ActionProcessor.captureAnimationsForBroadcast / executeAndCaptureAnimations | Trigger captured into broadcast buffer (fires in both main and bypass paths) |
| [2/8] | SERVER | BroadcastService.broadcastIfNeeded | Trigger included in broadcast payload |
| [3/8] | SERVER | P2PManager.broadcastState | Network send (UTC + sequenceId) |
| [4/8] | CLIENT | P2PManager.receiveStateUpdate | Network receive + latency measurement |
| [5/8] | CLIENT | MessageQueue.processQueue | Message dequeued (queue wait time) |
| [6/8] | CLIENT | P2PTransport._processMessage | Dispatching to GameClient |
| [7/8] | CLIENT | GameClient._onResponse | Animations collected, about to execute |
| [8/8] | — | AnimationManager.executeWithStateUpdate / executeAnimations | Animation execution begins (role via getAnimationSource(): always 'SERVER') |

### Delay Diagnosis via Intervals

| Interval | Reveals |
|-|-|
| [1]->[2] | BroadcastService overhead (~0ms expected) |
| [2]->[3] | State redaction + P2P prep (~0ms expected) |
| [3]->[4] | Network latency (WebRTC transit) |
| [4]->[5] | MessageQueue wait (blocked by prior message?) |
| [5]->[6] | Queue->transport overhead (~0ms expected) |
| [6]->[7] | Transport->client overhead (~0ms expected) |
| SERVER[8] vs CLIENT[8] | Total end-to-end sync gap |

### Resolved: Callback Now Properly Awaited

`P2PTransport._processMessage` now calls `await this._responseCallback(...)`, ensuring `GameClient._onResponse` (which awaits `AnimationManager.executeWithStateUpdate`) completes before the MessageQueue dequeues the next message. This prevents state regression when a second broadcast arrives during animation playback.

### Expected Console Output

**Server console (host browser):** Steps [1/8], [2/8], [3/8], [8/8]
**Client console (guest browser):** Steps [4/8], [5/8], [6/8], [7/8], [8/8]

**Enable:** `TRIGGER_SYNC_TRACE: true`

---

## ROUND_TRANSITION_TRACE (20 steps) — Round Boundary Flow

Traces the complete round transition: action phase end → round initialization → phase cascade → announcement playback.
Every step includes `utc: new Date().toISOString()` and `role: 'SERVER'|'CLIENT'` for cross-window latency diagnosis.

**Gating:** Server steps gated by `_isRoundTransition` flag (set at RT-01 when bothPassed in action phase, cleared at RT-13). Client steps gated by queue containing `roundAnnouncement`. PhaseAnimationQueue steps gated by `_inRoundTransitionPlayback` flag.

### Server Flow (RT-01 through RT-13)

| Step | Location | What it proves |
|-|-|-|
| [RT-01] | GFM.handleActionCompletion | Both players passed detected, round transition starting |
| [RT-02] | GFM.onSequentialPhaseComplete | Action phase ending, entering round-end sequence |
| [RT-03] | GFM.onSequentialPhaseComplete | actionComplete pseudo-phase announcement queued |
| [RT-04] | GFM.startNewRound entry | Round transition function entered, captures previous round data |
| [RT-05] | GFM.startNewRound | Round number incremented and committed (newRound, turn=1) |
| [RT-06] | GFM.startNewRound | roundAnnouncement pseudo-phase queued |
| [RT-07] | GFM.startNewRound | First required phase of new round determined |
| [RT-08] | GFM.transitionToPhase | Each phase transition during cascade (from→to, isAutomatic) |
| [RT-08b] | PhaseTransitionStrategy.processPhaseTransition | Announcement queued for each cascade phase |
| [RT-09] | GFM.processRoundInitialization entry | Round initialization processor starting |
| [RT-10] | GFM.processRoundInitialization | Round init complete, state broadcast to client |
| [RT-11] | BroadcastService.broadcastIfNeeded | Network broadcast of round-transition state (trigger, animCount) |
| [RT-12] | GFM.transitionToPhase (phase landed) | Final non-automatic phase landed (e.g., deployment) |
| [RT-13] | GFM.transitionToPhase (_tryStartPlayback) | Animation playback triggered, server flow complete |

### Client Flow (RT-GC, RT-17 through RT-20)

| Step | Location | What it proves |
|-|-|-|
| [RT-GC] | GameClient._handleAnnouncementAnimation | Client received phase/pass announcement from server |
| [RT-17] | PhaseAnimationQueue.startPlayback | Playback started for round-transition announcements |
| [RT-18] | PhaseAnimationQueue.playNext | Individual announcement playing (phaseName, phaseText) |
| [RT-19] | PhaseAnimationQueue.playNext (after duration) | Individual announcement displayed (1800ms complete) |
| [RT-20] | PhaseAnimationQueue.playNext (queue empty) | All announcements played — round transition UI complete |

**Enable:** `ROUND_TRANSITION_TRACE: true`

### Expected Console Output

**Server window (host/single-player):**
```
[RT-01] → [RT-02] → [RT-03] → [RT-04] → [RT-05] → [RT-06] → [RT-07]
→ [RT-08] (×N per phase) → [RT-08b] (×N) → [RT-09] → [RT-10] → [RT-11]
→ [RT-08] (more phases) → [RT-12] → [RT-13]
→ [RT-17] → [RT-18]/[RT-19] (per announcement) → [RT-20]
```

**Client window (guest browser):**
```
[RT-GC] (per announcement received)
→ [RT-17] → [RT-18]/[RT-19] (per announcement) → [RT-20]
```

### Delay Diagnosis via UTC Intervals

| Interval | Reveals |
|-|-|
| SERVER [RT-01]→[RT-05] | Round increment overhead |
| SERVER [RT-05]→[RT-10] | Round initialization duration |
| SERVER [RT-10]→[RT-11] | Broadcast prep time |
| SERVER [RT-11]→CLIENT [RT-GC] | Network latency (WebRTC) |
| [RT-17]→[RT-20] | Total announcement playback (N × 1800ms) |
| SERVER [RT-20] vs CLIENT [RT-20] | Server/client playback sync gap |

---

## Known Behaviors

### Listener Count Growth

ANIM_TRACE [4/7] reports `listenerCount` from GameStateManager. This count grows during gameplay (e.g., 6→20 during deployment phase) because each deployed drone adds state subscriptions. This is expected behavior, not a leak. The count should stabilize after deployment and decrease if drones are destroyed.
