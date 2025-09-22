// ========================================
// P2P MANAGER
// ========================================
// Handles WebRTC peer-to-peer connections using PeerJS
// Manages room creation, joining, and command synchronization

import Peer from 'peerjs';
import gameStateManager from '../state/GameStateManager.js';
import commandManager from './CommandManager.js';

class P2PManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.roomCode = null;
    this.isHost = false;
    this.isConnected = false;
    this.listeners = new Set();

    // Set this as the network handler for command manager
    commandManager.setNetworkHandler(this);
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
          gameStateManager.setMultiplayerMode('host', true);
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
            gameStateManager.setMultiplayerMode('guest', false);
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
      console.log('Received data:', data);

      switch (data.type) {
        case 'COMMAND':
          // Execute received command without sending to network
          await commandManager.receiveCommand(data.command);
          break;

        case 'GAME_STATE_SYNC':
          // Sync game state (for initial connection)
          this.syncGameState(data.state);
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

        default:
          console.warn('Unknown data type received:', data.type);
      }
    } catch (error) {
      console.error('Error handling received data:', error);
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
   * Send command to peer (called by CommandManager)
   */
  sendCommand(command) {
    this.sendData({
      type: 'COMMAND',
      command: command,
      timestamp: Date.now(),
    });
  }

  /**
   * Sync game state with peer
   */
  syncGameState(state = null) {
    if (state) {
      // Receive state sync
      const currentState = gameStateManager.getState();
      const mergedState = { ...currentState, ...state };
      gameStateManager.setState(mergedState, 'STATE_SYNCED');
    } else {
      // Send state sync
      const currentState = gameStateManager.getState();
      this.sendData({
        type: 'GAME_STATE_SYNC',
        state: currentState,
        timestamp: Date.now(),
      });
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
    gameStateManager.setMultiplayerMode('local', false);

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