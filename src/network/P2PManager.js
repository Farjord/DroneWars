// ========================================
// P2P MANAGER
// ========================================
// Handles WebRTC peer-to-peer connections using PeerJS
// Manages room creation, joining, and command synchronization

import Peer from 'peerjs';

class P2PManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.roomCode = null;
    this.isHost = false;
    this.isConnected = false;
    this.listeners = new Set();
    this.actionProcessor = null;
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
   * Host a new game room
   */
  async hostGame() {
    try {
      this.isHost = true;
      this.roomCode = this.generateRoomCode();

      // Create peer with room code as ID
      this.peer = new Peer(this.roomCode, {
        debug: 2, // Enable debug logging
      });

      return new Promise((resolve, reject) => {
        this.peer.on('open', (id) => {
          console.log('Host peer opened with ID:', id);
          this.emit('multiplayer_mode_change', { mode: 'host', isHost: true });
          this.emit('room_created', { roomCode: this.roomCode });
          resolve(this.roomCode);
        });

        this.peer.on('connection', (conn) => {
          console.log('Guest connected:', conn.peer);
          this.connection = conn;
          this.setupConnection();
        });

        this.peer.on('error', (error) => {
          console.error('Peer error:', error);
          this.emit('connection_error', { error: error.message });
          reject(error);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!this.peer || !this.peer.open) {
            reject(new Error('Failed to create room - timeout'));
          }
        }, 30000);
      });
    } catch (error) {
      console.error('Failed to host game:', error);
      throw error;
    }
  }

  /**
   * Join an existing game room
   */
  async joinGame(roomCode) {
    try {
      this.isHost = false;
      this.roomCode = roomCode;

      // Create peer with random ID
      this.peer = new Peer({
        debug: 2, // Enable debug logging
      });

      return new Promise((resolve, reject) => {
        this.peer.on('open', (id) => {
          console.log('Guest peer opened with ID:', id);

          // Connect to host
          this.connection = this.peer.connect(roomCode);
          this.setupConnection();

          this.connection.on('open', () => {
            console.log('Connected to host');
            this.emit('multiplayer_mode_change', { mode: 'guest', isHost: false });
            this.emit('joined_room', { roomCode });
            resolve();
          });

          this.connection.on('error', (error) => {
            console.error('Connection error:', error);
            this.emit('connection_error', { error: error.message });
            reject(error);
          });
        });

        this.peer.on('error', (error) => {
          console.error('Peer error:', error);
          this.emit('connection_error', { error: error.message });
          reject(error);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Failed to join room - timeout'));
          }
        }, 30000);
      });
    } catch (error) {
      console.error('Failed to join game:', error);
      throw error;
    }
  }

  /**
   * Setup connection event handlers
   */
  setupConnection() {
    if (!this.connection) return;

    this.connection.on('open', () => {
      this.isConnected = true;
      this.emit('connected', {
        isHost: this.isHost,
        roomCode: this.roomCode
      });
      console.log('P2P connection established');
    });

    this.connection.on('data', (data) => {
      this.handleReceivedData(data);
    });

    this.connection.on('close', () => {
      this.isConnected = false;
      this.emit('disconnected', {});
      console.log('P2P connection closed');
    });

    this.connection.on('error', (error) => {
      console.error('Connection error:', error);
      this.emit('connection_error', { error: error.message });
    });
  }

  /**
   * Handle received data from peer
   */
  async handleReceivedData(data) {
    try {
      console.log('Received P2P data:', data);

      switch (data.type) {
        case 'STATE_UPDATE':
          // Host sending full state update to guest
          // Emit to GameStateManager for direct application
          console.log('[P2P GUEST] Received state update with animations:', {
            hasAnimations: data.animations && data.animations.length > 0,
            animationCount: data.animations?.length || 0
          });
          this.emit('state_update_received', {
            state: data.state,
            animations: data.animations || []
          });
          break;

        case 'GUEST_ACTION':
          // Guest sending action request to host
          // Route through ActionProcessor for processing
          if (this.actionProcessor) {
            await this.actionProcessor.processGuestAction(data.action);
          } else {
            console.error('ActionProcessor not set - cannot process guest action');
          }
          break;

        case 'ACTION':
          // Legacy action sync (backwards compatibility)
          // Route actions through ActionProcessor
          if (this.actionProcessor) {
            await this.actionProcessor.processNetworkAction(data);
          } else {
            console.error('ActionProcessor not set - cannot process network action');
          }
          break;

        case 'PING':
          // Respond to ping
          this.sendData({ type: 'PONG', timestamp: data.timestamp });
          break;

        case 'PONG':
          // Handle ping response
          const latency = Date.now() - data.timestamp;
          this.emit('latency_update', { latency });
          break;

        case 'PHASE_COMPLETED':
          // Handle phase completion messages (UI-level synchronization)
          this.emit('PHASE_COMPLETED', data.data);
          break;

        default:
          console.warn('Unknown P2P data type received:', data.type);
      }
    } catch (error) {
      console.error('Error handling received P2P data:', error);
    }
  }

  /**
   * Send data to peer
   */
  sendData(data) {
    if (this.connection && this.isConnected) {
      try {
        this.connection.send(data);
      } catch (error) {
        console.error('Failed to send data:', error);
        this.emit('send_error', { error: error.message });
      }
    } else {
      console.warn('Attempted to send data but no connection available');
    }
  }

  /**
   * Broadcast game state to peer (host → guest)
   * @param {Object} state - Complete game state to broadcast
   * @param {Array} animations - Animation events to send to guest (optional)
   */
  broadcastState(state, animations = []) {
    if (!this.isHost) {
      console.warn('Only host can broadcast state');
      return;
    }

    if (this.connection && this.isConnected) {
      try {
        this.connection.send({
          type: 'STATE_UPDATE',
          state: state,
          animations: animations,
          timestamp: Date.now()
        });
        console.log('[P2P HOST] Broadcasted state update to guest', {
          hasAnimations: animations.length > 0,
          animationCount: animations.length
        });
      } catch (error) {
        console.error('Failed to broadcast state:', error);
        this.emit('send_error', { error: error.message });
      }
    } else {
      console.warn('Cannot broadcast state - no connection available');
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

    if (this.connection && this.isConnected) {
      try {
        this.connection.send({
          type: 'GUEST_ACTION',
          action: { type: actionType, payload },
          timestamp: Date.now()
        });
        console.log('[P2P GUEST] Sent action to host:', actionType);
      } catch (error) {
        console.error('Failed to send action to host:', error);
        this.emit('send_error', { error: error.message });
      }
    } else {
      console.warn('Cannot send action - no connection to host');
    }
  }


  /**
   * Sync game state with peer (deprecated - use ActionProcessor for state changes)
   */
  syncGameState(state = null) {
    console.warn('syncGameState is deprecated - use ActionProcessor for state changes');

    if (state) {
      // Log received state sync but don't apply directly
      console.log('Received state sync (not applied):', state);
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
    if (this.isConnected) {
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
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

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
      peerId: this.peer?.id,
      connectionId: this.connection?.peer,
    };
  }

  /**
   * Check if we're ready for multiplayer
   */
  isReady() {
    return this.isConnected && this.connection && this.peer;
  }
}

// Create singleton instance
const p2pManager = new P2PManager();

export default p2pManager;