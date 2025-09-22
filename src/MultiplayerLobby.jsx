// ========================================
// MULTIPLAYER LOBBY
// ========================================
// UI component for creating and joining multiplayer rooms
// Handles P2P connection setup and status display

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Copy, Check, Users, GamepadIcon, Loader2 } from 'lucide-react';
import p2pManager from './network/P2PManager.js';

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
      console.log('P2P Event:', event);

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
      console.log('Room created with code:', code);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl border-2 border-purple-500 p-8 shadow-2xl shadow-purple-500/20 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Users className="w-8 h-8 text-purple-400" />
            Multiplayer
          </h2>
          <div className="mb-4">
            {renderConnectionStatus()}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Mode-specific content */}
        {mode === 'menu' && (
          <div className="space-y-4">
            <button
              onClick={handleHostGame}
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <GamepadIcon className="w-5 h-5" />
              )}
              Host Game
            </button>

            <div className="text-center text-gray-400 text-sm">or</div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter 6-digit room code"
                value={inputRoomCode}
                onChange={(e) => setInputRoomCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                className="w-full bg-slate-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest"
                maxLength={6}
              />
              <button
                onClick={handleJoinGame}
                disabled={isLoading || inputRoomCode.length !== 6}
                className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
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
          <div className="text-center space-y-4">
            <div className="bg-slate-800 rounded-lg p-4">
              <p className="text-gray-300 mb-2">Share this room code:</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-mono text-white bg-slate-700 px-4 py-2 rounded">
                  {roomCode}
                </code>
                <button
                  onClick={handleCopyRoomCode}
                  className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded transition-colors"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-yellow-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Waiting for opponent to join...</span>
            </div>
          </div>
        )}

        {mode === 'connected' && (
          <div className="text-center space-y-4">
            <div className="bg-green-900/50 border border-green-500 rounded-lg p-4">
              <p className="text-green-300">
                ✅ Connected to opponent!
              </p>
              {roomCode && (
                <p className="text-gray-400 text-sm mt-1">
                  Room: {roomCode}
                </p>
              )}
            </div>
            <button
              onClick={handleStartGame}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Start Game
            </button>
          </div>
        )}

        {(mode === 'host' || mode === 'join') && isLoading && (
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-gray-300">
              {mode === 'host' ? 'Creating room...' : 'Joining room...'}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={handleBack}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {connectionStatus !== 'disconnected' ? 'Disconnect & Back' : 'Back'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerLobby;