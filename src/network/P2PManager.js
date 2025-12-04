// ========================================
// P2P MANAGER (Trystero)
// ========================================
// Handles WebRTC peer-to-peer connections using Trystero
// Manages room creation, joining, and command synchronization

import { joinRoom } from 'trystero/firebase';
import { debugLog, timingLog, getTimestamp } from '../utils/debugLogger.js';

class P2PManager {
  constructor() {
    this.room = null;
    this.roomCode = null;
    this.isHost = false;
    this.isConnected = false;
    this.listeners = new Set();
    this.actionProcessor = null;

    // Trystero action handlers
    this.actions = {
      stateUpdate: null,
      guestAction: null,
      ping: null,
      phaseCompleted: null,
      syncRequest: null  // For resync requests (guest → host)
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
   * Set ActionProcessor for handling received actions
   * @param {Object} actionProcessor - ActionProcessor instance
   */
  setActionProcessor(actionProcessor) {
    this.actionProcessor = actionProcessor;
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
        console.error('Error in P2P listener:', error);
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
      const receiveTime = Date.now();  // Use Date.now() for cross-window synchronization
      const networkLatency = receiveTime - data.timestamp;

      timingLog('[NETWORK] Guest received', {
        phase: data.state?.turnPhase,
        animCount: (data.actionAnimations?.length || 0) + (data.systemAnimations?.length || 0),
        latency: `${networkLatency.toFixed(0)}ms`,  // Use toFixed(0) since Date.now() returns integers
        isFullSync: data.isFullSync || false
      });

      debugLog('MULTIPLAYER', '[P2P GUEST] Received state update with animations:', {
        hasActionAnimations: data.actionAnimations && data.actionAnimations.length > 0,
        hasSystemAnimations: data.systemAnimations && data.systemAnimations.length > 0,
        actionAnimationCount: data.actionAnimations?.length || 0,
        systemAnimationCount: data.systemAnimations?.length || 0,
        sequenceId: data.sequenceId,
        isFullSync: data.isFullSync || false,
        fromPeer: peerId
      });

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
    this.actions.guestAction = { send: sendGuestAction, receive: receiveGuestAction };

    receiveGuestAction(async (data, peerId) => {
      debugLog('MULTIPLAYER', '[P2P HOST] Received guest action:', data.action);
      if (this.actionProcessor) {
        await this.actionProcessor.processGuestAction(data.action);
      } else {
        console.error('ActionProcessor not set - cannot process guest action');
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
      debugLog('MULTIPLAYER', '[P2P HOST] Received sync request from guest');

      // Only host responds to sync requests
      if (this.isHost) {
        this.emit('sync_requested', { peerId, requestId: data.requestId });
      }
    });
  }

  /**
   * Host a new game room
   */
  async hostGame() {
    try {
      const startTime = Date.now();

      debugLog('P2P_CONNECTION', '🔍 Checking browser WebRTC support', {
        RTCPeerConnection: !!window.RTCPeerConnection,
        RTCDataChannel: !!window.RTCDataChannel,
        navigator_onLine: navigator.onLine
      });

      this.isHost = true;
      this.roomCode = this.generateRoomCode();

      debugLog('P2P_CONNECTION', '🎲 Generated room code:', this.roomCode);
      debugLog('P2P_CONNECTION', '🔧 Creating Trystero room with Firebase strategy...', {
        roomCode: this.roomCode,
        firebaseUrl: this.firebaseConfig.appId
      });

      // Join room using Trystero (creates it if doesn't exist)
      this.room = joinRoom(this.firebaseConfig, this.roomCode);

      debugLog('P2P_CONNECTION', '✅ Room created successfully', {
        roomCode: this.roomCode,
        elapsedMs: Date.now() - startTime
      });

      // Setup action handlers
      this.setupActionHandlers();

      // Setup peer join/leave handlers
      this.room.onPeerJoin(peerId => {
        const elapsedMs = Date.now() - startTime;
        debugLog('P2P_CONNECTION', '🤝 Guest connected', {
          guestPeerId: peerId,
          elapsedMs
        });
        debugLog('MULTIPLAYER', 'Guest connected:', peerId);

        this.peers.add(peerId);
        this.currentPeerId = peerId;
        this.isConnected = true;

        this.emit('connected', {
          isHost: this.isHost,
          roomCode: this.roomCode
        });
      });

      this.room.onPeerLeave(peerId => {
        debugLog('P2P_CONNECTION', '🚪 Peer disconnected:', peerId);
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

      return this.roomCode;

    } catch (error) {
      debugLog('P2P_CONNECTION', '❌ Exception caught in hostGame()', {
        error: error,
        errorMessage: error?.message,
        errorStack: error?.stack
      });
      console.error('Failed to host game:', error);
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

      debugLog('P2P_CONNECTION', '🔍 Attempting to join room', {
        roomCode,
        RTCPeerConnection: !!window.RTCPeerConnection,
        navigator_onLine: navigator.onLine
      });

      this.isHost = false;
      this.roomCode = roomCode;

      debugLog('P2P_CONNECTION', '🔧 Joining Trystero room as guest...');

      // Join room using Trystero
      this.room = joinRoom(this.firebaseConfig, roomCode);

      debugLog('P2P_CONNECTION', '✅ Room joined successfully', {
        roomCode,
        elapsedMs: Date.now() - startTime
      });

      // Setup action handlers
      this.setupActionHandlers();

      return new Promise((resolve, reject) => {
        // Setup peer join/leave handlers
        this.room.onPeerJoin(peerId => {
          const elapsedMs = Date.now() - startTime;
          debugLog('P2P_CONNECTION', '✅ Connected to host!', {
            hostPeerId: peerId,
            elapsedMs,
            roomCode
          });
          debugLog('MULTIPLAYER', 'Connected to host:', peerId);

          this.peers.add(peerId);
          this.currentPeerId = peerId;
          this.isConnected = true;

          this.emit('multiplayer_mode_change', { mode: 'guest', isHost: false });
          this.emit('joined_room', { roomCode });
          this.emit('connected', {
            isHost: this.isHost,
            roomCode: this.roomCode
          });

          resolve();
        });

        this.room.onPeerLeave(peerId => {
          debugLog('P2P_CONNECTION', '🚪 Peer disconnected:', peerId);
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
            const elapsedMs = Date.now() - startTime;
            debugLog('P2P_CONNECTION', '⏰ Guest timeout reached (30s)', {
              elapsedMs,
              isConnected: this.isConnected
            });
            reject(new Error('Failed to join room - timeout'));
          }
        }, 30000);
      });

    } catch (error) {
      debugLog('P2P_CONNECTION', '❌ Exception caught in joinGame()', {
        error: error,
        errorMessage: error?.message
      });
      console.error('Failed to join game:', error);
      this.emit('connection_error', { error: error.message });
      throw error;
    }
  }

  /**
   * Send data to peer (generic method)
   */
  sendData(data) {
    if (!this.isConnected || !this.currentPeerId) {
      console.warn('Attempted to send data but no connection available');
      return;
    }

    try {
      // Route to appropriate action based on data type
      if (data.type === 'PING') {
        this.actions.ping.send(data, this.currentPeerId);
      } else if (data.type === 'PONG') {
        this.actions.ping.sendPong(data, this.currentPeerId);
      } else if (data.type === 'PHASE_COMPLETED') {
        this.actions.phaseCompleted.send(data.data, this.currentPeerId);
      } else {
        console.warn('Unknown data type for sendData:', data.type);
      }
    } catch (error) {
      console.error('Failed to send data:', error);
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
      console.warn('Only host can broadcast state');
      return;
    }

    if (!this.isConnected || !this.currentPeerId) {
      console.warn('Cannot broadcast state - no connection available');
      return;
    }

    try {
      debugLog('MULTIPLAYER', '[P2P HOST] Broadcasting state - checking player2 hand:', {
        player2HandSize: state.player2?.hand?.length || 0,
        sampleCard: state.player2?.hand?.[0] || null,
        sampleInstanceId: state.player2?.hand?.[0]?.instanceId
      });

      // Increment sequence for each broadcast
      this.broadcastSequence++;

      const networkSendTime = Date.now();  // Use Date.now() for cross-window synchronization
      const stateData = {
        sequenceId: this.broadcastSequence,  // For message ordering on guest side
        state: state,
        actionAnimations: actionAnimations,
        systemAnimations: systemAnimations,
        timestamp: networkSendTime  // Synchronized timestamp for accurate latency calculation
      };

      timingLog('[NETWORK] Host sending', {
        phase: state.turnPhase,
        animCount: actionAnimations.length + systemAnimations.length
      });

      this.actions.stateUpdate.send(stateData, this.currentPeerId);

      debugLog('MULTIPLAYER', '[P2P HOST] Broadcasted state update to guest', {
        hasAnimations: (actionAnimations.length + systemAnimations.length) > 0,
        actionAnimationCount: actionAnimations.length,
        systemAnimationCount: systemAnimations.length
      });
    } catch (error) {
      console.error('Failed to broadcast state:', error);
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
      console.warn('Host should not send actions to itself');
      return;
    }

    if (!this.isConnected || !this.currentPeerId) {
      console.warn('Cannot send action - no connection to host');
      return;
    }

    try {
      const actionData = {
        action: { type: actionType, payload },
        timestamp: Date.now()
      };

      this.actions.guestAction.send(actionData, this.currentPeerId);
      debugLog('MULTIPLAYER', '[P2P GUEST] Sent action to host:', actionType);
    } catch (error) {
      console.error('Failed to send action to host:', error);
      this.emit('send_error', { error: error.message });
    }
  }

  /**
   * Request full state sync from host (guest only)
   * Called when guest detects too many out-of-order messages
   */
  requestFullSync() {
    if (this.isHost) {
      console.warn('Host should not request sync from itself');
      return;
    }

    if (!this.isConnected || !this.currentPeerId) {
      console.warn('Cannot request sync - no connection to host');
      return;
    }

    try {
      const requestData = {
        requestId: Date.now(),
        reason: 'out_of_order_messages'
      };

      this.actions.syncRequest.send(requestData, this.currentPeerId);
      debugLog('MULTIPLAYER', '[P2P GUEST] Requested full state sync from host');
    } catch (error) {
      console.error('Failed to request sync:', error);
      this.emit('send_error', { error: error.message });
    }
  }

  /**
   * Send full sync response to guest (host only)
   * @param {Object} state - Complete game state
   * @param {number} sequenceId - Current sequence number
   */
  sendFullSyncResponse(state, sequenceId) {
    if (!this.isHost) {
      console.warn('Only host can send sync response');
      return;
    }

    if (!this.isConnected || !this.currentPeerId) {
      console.warn('Cannot send sync response - no connection available');
      return;
    }

    try {
      // Update sequence to match what we're sending
      this.broadcastSequence = sequenceId || this.broadcastSequence;

      const stateData = {
        sequenceId: this.broadcastSequence,
        state: state,
        actionAnimations: [],
        systemAnimations: [],
        timestamp: Date.now(),
        isFullSync: true  // Flag to indicate this is a resync response
      };

      this.actions.stateUpdate.send(stateData, this.currentPeerId);
      debugLog('MULTIPLAYER', '[P2P HOST] Sent full sync response to guest', {
        sequenceId: this.broadcastSequence
      });
    } catch (error) {
      console.error('Failed to send sync response:', error);
      this.emit('send_error', { error: error.message });
    }
  }

  /**
   * Sync game state with peer (deprecated - use ActionProcessor for state changes)
   */
  syncGameState(state = null) {
    console.warn('syncGameState is deprecated - use ActionProcessor for state changes');

    if (state) {
      // Log received state sync but don't apply directly
      debugLog('MULTIPLAYER', 'Received state sync (not applied):', state);
      this.emit('state_sync_received', { state });
    } else {
      // Send current state for initial sync only - emit event to get state
      this.emit('state_sync_requested', {});
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
      guestAction: null,
      ping: null,
      phaseCompleted: null,
      syncRequest: null
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
