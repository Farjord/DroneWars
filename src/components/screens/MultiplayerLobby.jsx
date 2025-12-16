// ========================================
// MULTIPLAYER LOBBY
// ========================================
// UI component for creating and joining multiplayer rooms
// Handles P2P connection setup and status display

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Copy, Check, Users, GamepadIcon, Loader2 } from 'lucide-react';
import p2pManager from '../../network/P2PManager.js';
import { debugLog } from '../../utils/debugLogger.js';

const MultiplayerLobby = ({ onGameStart, onBack }) => {
  const [mode, setMode] = useState('menu'); // 'menu', 'host', 'join', 'waiting', 'connected'
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Subscribe to P2P events
    const unsubscribe = p2pManager.subscribe((event) => {
      debugLog('MULTIPLAYER', 'P2P Event:', event);

      switch (event.type) {
        case 'room_created':
          setRoomCode(event.data.roomCode);
          setMode('waiting');
          setConnectionStatus('waiting');
          setIsLoading(false);
          break;

        case 'joined_room':
          setRoomCode(event.data.roomCode);
          setMode('connected');
          setConnectionStatus('connected');
          setIsLoading(false);
          break;

        case 'connected':
          setMode('connected');
          setConnectionStatus('connected');
          setIsLoading(false);
          setError('');
          break;

        case 'disconnected':
          setConnectionStatus('disconnected');
          setMode('menu');
          setRoomCode('');
          setError('');
          break;

        case 'connection_error':
          setError(event.data.error);
          setIsLoading(false);
          setMode('menu');
          break;

        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  const handleHostGame = async () => {
    setIsLoading(true);
    setError('');
    setMode('host');

    try {
      const code = await p2pManager.hostGame();
      debugLog('MULTIPLAYER', 'Room created with code:', code);
    } catch (error) {
      console.error('Failed to host game:', error);
      setError(error.message);
      setIsLoading(false);
      setMode('menu');
    }
  };

  const handleJoinGame = async () => {
    if (inputRoomCode.length !== 6) {
      setError('Please enter a 6-digit room code');
      return;
    }

    setIsLoading(true);
    setError('');
    setMode('join');

    try {
      await p2pManager.joinGame(inputRoomCode);
    } catch (error) {
      console.error('Failed to join game:', error);
      setError(error.message);
      setIsLoading(false);
      setMode('menu');
    }
  };

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy room code:', error);
    }
  };

  const handleStartGame = () => {
    if (connectionStatus === 'connected') {
      onGameStart();
    }
  };

  const handleDisconnect = () => {
    p2pManager.disconnect();
    setMode('menu');
    setRoomCode('');
    setInputRoomCode('');
    setError('');
  };

  const handleBack = () => {
    if (connectionStatus !== 'disconnected') {
      handleDisconnect();
    }
    onBack();
  };

  const renderConnectionStatus = () => {
    switch (connectionStatus) {
      case 'waiting':
        return (
          <div className="flex items-center gap-2 text-yellow-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Waiting for opponent...</span>
          </div>
        );
      case 'connected':
        return (
          <div className="flex items-center gap-2 text-green-400">
            <Wifi className="w-4 h-4" />
            <span>Connected to opponent</span>
          </div>
        );
      case 'disconnected':
      default:
        return (
          <div className="flex items-center gap-2 text-gray-400">
            <WifiOff className="w-4 h-4" />
            <span>Not connected</span>
          </div>
        );
    }
  };

  // Debug logging
  debugLog('MULTIPLAYER', '🎮 MultiplayerLobby rendering - mode:', mode, 'connectionStatus:', connectionStatus);

  return (
    <div style={{
      maxWidth: '500px',
      width: '100%',
      margin: '0 auto'
    }}>
      <div className="bg-slate-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: '#a855f7',
          boxShadow: '0 20px 50px rgba(168, 85, 247, 0.2)'
        }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <Users className="w-8 h-8 text-purple-400" />
            Multiplayer Lobby
          </h3>
          <div style={{ marginBottom: '1rem' }}>
            {renderConnectionStatus()}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(127, 29, 29, 0.5)',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            padding: '0.75rem',
            marginBottom: '1rem'
          }}>
            <p style={{ color: '#fca5a5', fontSize: '0.875rem' }}>{error}</p>
          </div>
        )}

        {/* Mode-specific content */}
        {mode === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button
              onClick={handleHostGame}
              disabled={isLoading}
              className="dw-btn dw-btn-confirm"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <GamepadIcon className="w-5 h-5" />
              )}
              Host Game
            </button>

            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>or</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Enter 6-digit room code"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                style={{
                  width: '100%',
                  backgroundColor: '#1e293b',
                  border: '1px solid #4b5563',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  textAlign: 'center',
                  fontSize: '1.125rem',
                  letterSpacing: '0.1em'
                }}
                maxLength={6}
              />
              <button
                onClick={handleJoinGame}
                disabled={isLoading || inputRoomCode.length !== 6}
                className="dw-btn dw-btn-confirm"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Wifi className="w-5 h-5" />
                )}
                Join Game
              </button>
            </div>
          </div>
        )}

        {mode === 'waiting' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ backgroundColor: '#1e293b', borderRadius: '0.5rem', padding: '1rem' }}>
              <p style={{ color: '#d1d5db', marginBottom: '0.5rem' }}>Share this room code:</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <code style={{
                  fontSize: '1.5rem',
                  fontFamily: 'monospace',
                  color: '#ffffff',
                  backgroundColor: '#334155',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem'
                }}>
                  {roomCode}
                </code>
                <button
                  onClick={handleCopyRoomCode}
                  style={{
                    backgroundColor: '#9333ea',
                    color: '#ffffff',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#7c3aed'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#9333ea'}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#facc15' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Waiting for opponent to join...</span>
            </div>
          </div>
        )}

        {mode === 'connected' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              backgroundColor: 'rgba(20, 83, 45, 0.5)',
              border: '1px solid #22c55e',
              borderRadius: '0.5rem',
              padding: '1rem'
            }}>
              <p style={{ color: '#86efac' }}>
                ✅ Connected to opponent!
              </p>
              {roomCode && (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                  Room: {roomCode}
                </p>
              )}
            </div>
            {p2pManager.isHost ? (
              <button onClick={handleStartGame} className="dw-btn dw-btn-confirm" style={{ width: '100%' }}>
                Start Game
              </button>
            ) : (
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #60a5fa',
                borderRadius: '0.5rem',
                padding: '1rem',
                color: '#93c5fd'
              }}>
                <Loader2 className="w-5 h-5 animate-spin" style={{ margin: '0 auto 0.5rem auto', color: '#60a5fa' }} />
                <p>Waiting for host to start game...</p>
              </div>
            )}
          </div>
        )}

        {(mode === 'host' || mode === 'join') && isLoading && (
          <div style={{ textAlign: 'center' }}>
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" style={{ margin: '0 auto 1rem auto', color: '#c084fc' }} />
            <p style={{ color: '#d1d5db' }}>
              {mode === 'host' ? 'Creating room...' : 'Joining room...'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #374151' }}>
          <button onClick={handleBack} className="dw-btn dw-btn-cancel" style={{ width: '100%' }}>
            {connectionStatus !== 'disconnected' ? 'Disconnect & Back' : 'Back'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;