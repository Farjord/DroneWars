// ========================================
// P2P MANAGER (Trystero)
// ========================================
// Handles WebRTC peer-to-peer connections using Trystero
// Manages room creation, joining, and command synchronization

import { joinRoom } from 'trystero/firebase';
import { debugLog, timingLog, getTimestamp } from '../utils/debugLogger.js';
import { TRIGGER_FIRED } from '../config/animationTypes.js';

class P2PManager {
  constructor() {
    this.room = null;
    this.roomCode = null;
    this.isHost = false;
    this.isConnected = false;
    this.listeners = new Set();
    this.hostGameServer = null;

    // Trystero action handlers
    this.actions = {
      stateUpdate: null,
      remoteAction: null,
      ping: null,
      phaseCompleted: null,
      syncRequest: null,  // For resync requests (guest → host)
      actionAck: null,    // For action acknowledgements (host → guest)
      gameStarted: null   // For game start signal (host → guest)
    };

    // Track connected peers
    this.peers = new Set();
    this.currentPeerId = null; // The other peer's ID

    // Broadcast sequence counter for message ordering
    this.broadcastSequence = 0;

    // Firebase configuration
    this.firebaseConfig = {
      appId: import.meta.env.VITE_FIREBASE_DATABASE_URL
    };
  }

  /**
   * Subscribe to P2P events
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  emit(type, data = {}) {
    this.listeners.forEach(listener => {
      try {
        listener({ type, data });
      } catch (error) {
        debugLog('MP_JOIN_TRACE', 'Error in P2P listener', { error: true, message: error.message });
      }
    });
  }

  /**
   * Generate a 6-digit room code
   */
  generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Setup action handlers for Trystero room
   */
  setupActionHandlers() {
    if (!this.room) return;

    // STATE_UPDATE action (host → guest)
    const [sendStateUpdate, receiveStateUpdate] = this.room.makeAction('STATE_UPDATE');
    this.actions.stateUpdate = { send: sendStateUpdate, receive: receiveStateUpdate };

    receiveStateUpdate((data, peerId) => {
      const receiveTime = Date.now();
      const networkLatency = receiveTime - data.timestamp;

      timingLog('[NETWORK] Client received', {
        phase: data.state?.turnPhase,
        animCount: (data.actionAnimations?.length || 0) + (data.systemAnimations?.length || 0),
        latency: `${networkLatency.toFixed(0)}ms`,
        isFullSync: data.isFullSync || false
      });

      debugLog('MP_SYNC_TRACE', '[3/10] Client received STATE_UPDATE', {
        sequenceId: data.sequenceId,
        animCount: (data.actionAnimations?.length || 0) + (data.systemAnimations?.length || 0),
        isFullSync: data.isFullSync || false
      });

      const triggerAnims = (data.actionAnimations || []).filter(a => a.animationName === TRIGGER_FIRED);
      if (triggerAnims.length > 0) {
        debugLog('TRIGGER_SYNC_TRACE', '[3/7] CLIENT: Trigger received from network', {
          utc: new Date().toISOString(),
          triggerSyncId: triggerAnims[0]?.payload?.triggerSyncId,
          triggerCount: triggerAnims.length,
          networkLatencyMs: networkLatency,
          sequenceId: data.sequenceId,
        });
      }

      this.emit('state_update_received', {
        state: data.state,
        actionAnimations: data.actionAnimations || [],
        systemAnimations: data.systemAnimations || [],
        sequenceId: data.sequenceId,
        isFullSync: data.isFullSync || false
      });
    });

    // GUEST_ACTION action (guest → host)
    const [sendGuestAction, receiveGuestAction] = this.room.makeAction('GUEST_ACTION');
    this.actions.remoteAction = { send: sendGuestAction, receive: receiveGuestAction };

    receiveGuestAction(async (data, peerId) => {
      debugLog('MP_SYNC_TRACE', '[8/10] Server received client action', { actionType: data.action?.type });
      if (this.hostGameServer) {
        await this.hostGameServer.handleRemoteAction(data.action);
      }
    });

    // PING/PONG actions
    const [sendPing, receivePing] = this.room.makeAction('PING');
    const [sendPong, receivePong] = this.room.makeAction('PONG');
    this.actions.ping = { send: sendPing, receive: receivePing, sendPong, receivePong };

    receivePing((data, peerId) => {
      sendPong({ timestamp: data.timestamp }, peerId);
    });

    receivePong((data, peerId) => {
      const latency = Date.now() - data.timestamp;
      this.emit('latency_update', { latency });
    });

    // PHASE_COMPLETED action (Trystero action name limited to 12 bytes)
    const [sendPhaseCompleted, receivePhaseCompleted] = this.room.makeAction('PHASE_DONE');
    this.actions.phaseCompleted = { send: sendPhaseCompleted, receive: receivePhaseCompleted };

    receivePhaseCompleted((data, peerId) => {
      this.emit('PHASE_COMPLETED', data);
    });

    // SYNC_REQ action (guest → host) for requesting full state resync
    const [sendSyncRequest, receiveSyncRequest] = this.room.makeAction('SYNC_REQ');
    this.actions.syncRequest = { send: sendSyncRequest, receive: receiveSyncRequest };

    receiveSyncRequest((data, peerId) => {
      debugLog('MP_SYNC_TRACE', 'Server received sync request', { resync: true });

      // Only host responds to sync requests
      if (this.isHost) {
        this.emit('sync_requested', { peerId, requestId: data.requestId });
      }
    });

    // ACTION_ACK action (host → guest) for acknowledging guest action results
    const [sendActionAck, receiveActionAck] = this.room.makeAction('ACT_ACK');
    this.actions.actionAck = { send: sendActionAck, receive: receiveActionAck };

    receiveActionAck((data, peerId) => {
      debugLog('MP_SYNC_TRACE', '[6/10] Client received action ack', {
        actionType: data.actionType,
        success: data.success
      });
      this.emit('action_ack_received', data);
    });

    // GAME_START action (host → guest) signals guest to transition to in-game
    const [sendGameStarted, receiveGameStarted] = this.room.makeAction('GAME_START');
    this.actions.gameStarted = { send: sendGameStarted, receive: receiveGameStarted };

    receiveGameStarted((data, peerId) => {
      debugLog('MP_GAME_TRACE', 'Client received game_started signal');
      this.emit('game_started', data);
    });
  }

  /**
   * Host a new game room
   */
  async hostGame() {
    try {
      const startTime = Date.now();

      this.isHost = true;
      this.roomCode = this.generateRoomCode();

      debugLog('MP_JOIN_TRACE', '[2/7] P2PManager.hostGame entry', { role: 'host', roomCode: this.roomCode });

      // Join room using Trystero (creates it if doesn't exist)
      this.room = joinRoom(this.firebaseConfig, this.roomCode);

      debugLog('MP_JOIN_TRACE', '[3/7] Trystero room created', { role: 'host', elapsedMs: Date.now() - startTime });

      // Setup action handlers
      this.setupActionHandlers();

      // Setup peer join/leave handlers
      this.room.onPeerJoin(peerId => {
        debugLog('MP_JOIN_TRACE', '[4/7] Peer detected', { role: 'host', remotePeerId: peerId, elapsedMs: Date.now() - startTime });

        this.peers.add(peerId);
        this.currentPeerId = peerId;
        this.isConnected = true;

        this.emit('connected', {
          isHost: this.isHost,
          roomCode: this.roomCode
        });
      });

      this.room.onPeerLeave(peerId => {
        debugLog('MP_JOIN_TRACE', '[7/7] Peer left', { role: 'host', peerId });
        this.peers.delete(peerId);
        if (peerId === this.currentPeerId) {
          this.currentPeerId = null;
          this.isConnected = false;
          this.emit('disconnected', {});
        }
      });

      // Emit success events
      this.emit('multiplayer_mode_change', { mode: 'host', isHost: true });
      this.emit('room_created', { roomCode: this.roomCode });

      debugLog('MP_JOIN_TRACE', '[5/7] Server events emitted', { role: 'host', roomCode: this.roomCode });

      return this.roomCode;

    } catch (error) {
      debugLog('MP_JOIN_TRACE', 'hostGame failed', { error: true, message: error.message });
      this.emit('connection_error', { error: error.message });
      throw error;
    }
  }

  /**
   * Join an existing game room
   */
  async joinGame(roomCode) {
    try {
      const startTime = Date.now();

      this.isHost = false;
      this.roomCode = roomCode;

      debugLog('MP_JOIN_TRACE', '[2/7] P2PManager.joinGame entry', { role: 'guest', roomCode });

      // Join room using Trystero
      this.room = joinRoom(this.firebaseConfig, roomCode);

      debugLog('MP_JOIN_TRACE', '[3/7] Trystero room joined', { role: 'guest', elapsedMs: Date.now() - startTime });

      // Setup action handlers
      this.setupActionHandlers();

      return new Promise((resolve, reject) => {
        // Setup peer join/leave handlers
        this.room.onPeerJoin(peerId => {
          debugLog('MP_JOIN_TRACE', '[4/7] Peer detected', { role: 'guest', hostPeerId: peerId, elapsedMs: Date.now() - startTime });

          this.peers.add(peerId);
          this.currentPeerId = peerId;
          this.isConnected = true;

          this.emit('multiplayer_mode_change', { mode: 'guest', isHost: false });
          this.emit('joined_room', { roomCode });
          this.emit('connected', {
            isHost: this.isHost,
            roomCode: this.roomCode
          });

          debugLog('MP_JOIN_TRACE', '[5/7] Client events emitted', { role: 'guest', roomCode });

          resolve();
        });

        this.room.onPeerLeave(peerId => {
          debugLog('MP_JOIN_TRACE', '[7/7] Peer left', { role: 'guest', peerId });
          this.peers.delete(peerId);
          if (peerId === this.currentPeerId) {
            this.currentPeerId = null;
            this.isConnected = false;
            this.emit('disconnected', {});
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            debugLog('MP_JOIN_TRACE', '[4/7] Client timeout', { timeout: true, elapsedMs: Date.now() - startTime });
            // Clean up zombie room to prevent leaked action handlers on retry
            if (this.room) {
              this.room.leave();
              this.room = null;
            }
            reject(new Error('Failed to join room - timeout'));
          }
        }, 30000);
      });

    } catch (error) {
      debugLog('MP_JOIN_TRACE', 'joinGame failed', { error: true, message: error.message });
      this.emit('connection_error', { error: error.message });
      throw error;
    }
  }

  /**
   * Guard: check that a peer connection exists, log and return false if not
   * @param {string} context - Description for the log message
   * @returns {boolean} True if connected, false otherwise
   */
  _requireConnection(context) {
    if (!this.isConnected || !this.currentPeerId) {
      debugLog('MP_SYNC_TRACE', `Guard: ${context} — no connection`, { guard: true });
      return false;
    }
    return true;
  }

  /**
   * Send data to peer (generic method)
   */
  sendData(data) {
    if (!this._requireConnection('Attempted to send data')) return;

    try {
      // Route to appropriate action based on data type
      if (data.type === 'PING') {
        this.actions.ping.send(data, this.currentPeerId);
      } else if (data.type === 'PONG') {
        this.actions.ping.sendPong(data, this.currentPeerId);
      } else if (data.type === 'PHASE_COMPLETED') {
        this.actions.phaseCompleted.send(data.data, this.currentPeerId);
      } else {
        debugLog('MP_SYNC_TRACE', 'Unknown data type for sendData', { guard: true, type: data.type });
      }
    } catch (error) {
      debugLog('MP_SYNC_TRACE', 'Failed to send data', { error: true, message: error.message });
      this.emit('send_error', { error: error.message });
    }
  }

  /**
   * Broadcast game state to peer (host → guest)
   * @param {Object} state - Complete game state to broadcast
   * @param {Array} actionAnimations - Player action animations to send to guest (optional)
   * @param {Array} systemAnimations - System animations to send to guest (optional)
   */
  broadcastState(state, actionAnimations = [], systemAnimations = []) {
    if (!this.isHost) {
      debugLog('MP_SYNC_TRACE', 'Guard: only host can broadcast state', { guard: true });
      return;
    }

    if (!this._requireConnection('Cannot broadcast state')) return;

    try {
      // Increment sequence for each broadcast
      this.broadcastSequence++;

      const networkSendTime = Date.now();
      const stateData = {
        sequenceId: this.broadcastSequence,
        state: state,
        actionAnimations: actionAnimations,
        systemAnimations: systemAnimations,
        timestamp: networkSendTime
      };

      timingLog('[NETWORK] Server sending', {
        phase: state.turnPhase,
        animCount: actionAnimations.length + systemAnimations.length
      });

      this.actions.stateUpdate.send(stateData, this.currentPeerId);

      debugLog('MP_SYNC_TRACE', '[2/10] Server sent state update', {
        sequenceId: this.broadcastSequence,
        animCount: actionAnimations.length + systemAnimations.length
      });

      const triggerAnims = actionAnimations.filter(a => a.animationName === TRIGGER_FIRED);
      if (triggerAnims.length > 0) {
        debugLog('TRIGGER_SYNC_TRACE', '[2/7] SERVER: Trigger sent over network', {
          utc: new Date().toISOString(),
          triggerSyncId: triggerAnims[0]?.payload?.triggerSyncId,
          sequenceId: this.broadcastSequence,
          networkSendTimestamp: networkSendTime,
        });
      }
    } catch (error) {
      debugLog('MP_SYNC_TRACE', 'broadcastState failed', { error: true, message: error.message });
      this.emit('send_error', { error: error.message });
    }
  }

  /**
   * Send action to host (guest → host)
   * @param {string} actionType - Type of action
   * @param {Object} payload - Action payload
   */
  sendActionToHost(actionType, payload) {
    if (this.isHost) {
      debugLog('MP_SYNC_TRACE', 'Guard: host should not send actions to itself', { guard: true });
      return;
    }

    if (!this._requireConnection('Cannot send action')) return;

    try {
      const actionData = {
        action: { type: actionType, payload },
        timestamp: Date.now()
      };

      this.actions.remoteAction.send(actionData, this.currentPeerId);
      debugLog('MP_SYNC_TRACE', '[7/10] Client sent action to server', { actionType });
    } catch (error) {
      debugLog('MP_SYNC_TRACE', 'sendActionToHost failed', { error: true, actionType, message: error.message });
      this.emit('send_error', { error: error.message });
    }
  }

  /**
   * Request full state sync from host (guest only)
   * Called when guest detects too many out-of-order messages
   */
  requestFullSync() {
    if (this.isHost) {
      debugLog('MP_SYNC_TRACE', 'Guard: host should not request sync from itself', { guard: true });
      return;
    }

    if (!this._requireConnection('Cannot request sync')) return;

    try {
      const requestData = {
        requestId: Date.now(),
        reason: 'out_of_order_messages'
      };

      this.actions.syncRequest.send(requestData, this.currentPeerId);
      debugLog('MP_SYNC_TRACE', 'Client requesting full sync', { resync: true, requesting: true });
    } catch (error) {
      debugLog('MP_SYNC_TRACE', 'requestFullSync failed', { error: true, message: error.message });
      this.emit('send_error', { error: error.message });
    }
  }

  /**
   * Send action acknowledgement to guest (host → guest)
   * @param {Object} ackData - { actionType, success, error?, authoritativeState? }
   */
  sendActionAck(ackData) {
    if (!this.isHost) {
      debugLog('MP_SYNC_TRACE', 'Guard: only host can send action acks', { guard: true });
      return;
    }

    if (!this._requireConnection('Cannot send action ack')) return;

    try {
      this.actions.actionAck.send(ackData, this.currentPeerId);
      debugLog('MP_SYNC_TRACE', '[10/10] Server sent action ack', {
        actionType: ackData.actionType,
        success: ackData.success
      });
    } catch (error) {
      debugLog('MP_SYNC_TRACE', 'sendActionAck failed', { error: true, message: error.message });
    }
  }

  /**
   * Signal guest that the game has started (host → guest)
   */
  sendGameStarted() {
    if (!this.isHost) {
      debugLog('MP_GAME_TRACE', 'Guard: only host can send game_started', { guard: true });
      return;
    }

    if (!this._requireConnection('Cannot send game_started')) return;

    try {
      this.actions.gameStarted.send({ timestamp: Date.now() }, this.currentPeerId);
      debugLog('MP_GAME_TRACE', 'Server sent game_started to client');
    } catch (error) {
      debugLog('MP_GAME_TRACE', 'sendGameStarted failed', { error: true, message: error.message });
    }
  }

  /**
   * Send full sync response to guest (host only)
   * @param {Object} state - Complete game state
   * @param {number} sequenceId - Current sequence number
   */
  sendFullSyncResponse(state, sequenceId) {
    if (!this.isHost) {
      debugLog('MP_SYNC_TRACE', 'Guard: only host can send sync response', { guard: true });
      return;
    }

    if (!this._requireConnection('Cannot send sync response')) return;

    try {
      // Update sequence to match what we're sending
      this.broadcastSequence = sequenceId !== undefined ? sequenceId : this.broadcastSequence;

      const stateData = {
        sequenceId: this.broadcastSequence,
        state: state,
        actionAnimations: [],
        systemAnimations: [],
        timestamp: Date.now(),
        isFullSync: true  // Flag to indicate this is a resync response
      };

      this.actions.stateUpdate.send(stateData, this.currentPeerId);
      debugLog('MP_SYNC_TRACE', 'Server sent full sync response', { resync: true, sequenceId: this.broadcastSequence });
    } catch (error) {
      debugLog('MP_SYNC_TRACE', 'sendFullSyncResponse failed', { error: true, message: error.message });
      this.emit('send_error', { error: error.message });
    }
  }

  /**
   * Send ping to measure latency
   */
  ping() {
    if (this.isConnected && this.currentPeerId) {
      this.sendData({
        type: 'PING',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Disconnect from peer
   */
  disconnect() {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }

    // Clear actions
    this.actions = {
      stateUpdate: null,
      remoteAction: null,
      ping: null,
      phaseCompleted: null,
      syncRequest: null,
      actionAck: null,
      gameStarted: null
    };

    this.peers.clear();
    this.currentPeerId = null;
    this.isConnected = false;
    this.isHost = false;
    this.roomCode = null;

    // Reset to local mode
    this.emit('multiplayer_mode_change', { mode: 'local', isHost: false });
    this.emit('disconnected', {});
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isHost: this.isHost,
      roomCode: this.roomCode,
      peerId: this.currentPeerId,
      peerCount: this.peers.size,
    };
  }

  /**
   * Check if we're ready for multiplayer
   */
  isReady() {
    return this.isConnected && this.room && this.currentPeerId;
  }
}

// Create singleton instance
const p2pManager = new P2PManager();

export default p2pManager;
