// ========================================
// GAME DEBUG MODAL COMPONENT
// ========================================
// Modal for debugging game state - shows raw state and calculated stats

import React, { useState } from 'react';
import { X, Copy } from 'lucide-react';
import { debugLog } from '../../utils/debugLogger.js';

/**
 * GameDebugModal - Two-tab debug view for game state
 * Tab 1: Raw State from GameStateManager
 * Tab 2: Calculated Stats from GameDataService
 */
const GameDebugModal = ({ show, onClose, gameStateManager, gameDataService }) => {
  const [activeTab, setActiveTab] = useState('raw');

  if (!show || !gameStateManager) return null;

  const gameState = gameStateManager.getState();
  const localPlayerId = gameStateManager.getLocalPlayerId();
  const opponentPlayerId = localPlayerId === 'player1' ? 'player2' : 'player1';

  const copyToClipboard = (data, label) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      .then(() => debugLog('STATE_SYNC', `${label} copied to clipboard`))
      .catch(err => console.error('Failed to copy:', err));
  };

  const formatValue = (value) => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      return `[${value.length} items]`;
    }
    if (typeof value === 'object') {
      if (Object.keys(value).length === 0) return '{}';
      return `{${Object.keys(value).length} properties}`;
    }
    return String(value);
  };

  const renderObjectTable = (obj, title, colorClass = '') => (
    <div className={`mb-6 ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <button
          onClick={() => copyToClipboard(obj, title)}
          className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
        >
          <Copy size={12} />
          Copy
        </button>
      </div>
      <div className="bg-gray-900 rounded border overflow-auto max-h-96">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800">
              <th className="text-left p-2 border-b">Property</th>
              <th className="text-left p-2 border-b">Value</th>
              <th className="text-left p-2 border-b">Type</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(obj).map(([key, value], index) => (
              <tr key={key} className={index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                <td className="p-2 border-b font-mono text-yellow-300">{key}</td>
                <td className="p-2 border-b font-mono text-gray-300">{formatValue(value)}</td>
                <td className="p-2 border-b text-gray-500">{typeof value === 'object' && value !== null ? (Array.isArray(value) ? 'array' : 'object') : typeof value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRawStateTab = () => {
    const coreGameInfo = {
      appState: gameState.appState,
      gameMode: gameState.gameMode,
      gameActive: gameState.gameActive,
      turnPhase: gameState.turnPhase,
      currentPlayer: gameState.currentPlayer,
      turn: gameState.turn,
      firstPlayerOfRound: gameState.firstPlayerOfRound
    };

    return (
      <div className="p-4 space-y-6">
        {renderObjectTable(coreGameInfo, 'Core Game Info')}
        {renderObjectTable(gameState.player1, 'Player 1 State', 'border-l-4 border-cyan-500 pl-4')}
        {renderObjectTable(gameState.player2, 'Player 2 State', 'border-l-4 border-pink-500 pl-4')}
        {renderObjectTable({ placedSections: gameState.placedSections }, 'Player 1 Placed Sections', 'border-l-4 border-cyan-500 pl-4')}
        {renderObjectTable({ opponentPlacedSections: gameState.opponentPlacedSections }, 'Player 2 Placed Sections', 'border-l-4 border-pink-500 pl-4')}
        {gameState.passInfo && renderObjectTable(gameState.passInfo, 'Pass Information')}
      </div>
    );
  };

  const renderCalculatedStatsTab = () => {
    if (!gameDataService) {
      return (
        <div className="p-4 text-center text-red-400">
          GameDataService not available
        </div>
      );
    }

    try {
      // Get effective ship stats for both players
      const player1ShipStats = gameDataService.getEffectiveShipStats(gameState.player1, gameState.placedSections);
      const player2ShipStats = gameDataService.getEffectiveShipStats(gameState.player2, gameState.opponentPlacedSections);

      // Get effective drone stats for all drones on board
      const player1DroneStats = {};
      const player2DroneStats = {};

      ['lane1', 'lane2', 'lane3'].forEach(lane => {
        player1DroneStats[lane] = gameState.player1.dronesOnBoard[lane].map(drone => ({
          drone: drone.name,
          effectiveStats: gameDataService.getEffectiveStats(drone, lane)
        }));
        player2DroneStats[lane] = gameState.player2.dronesOnBoard[lane].map(drone => ({
          drone: drone.name,
          effectiveStats: gameDataService.getEffectiveStats(drone, lane)
        }));
      });

      // Get cache statistics if available
      const cacheStats = gameDataService.cache ? {
        totalCalls: gameDataService.cache.stats?.totalCalls || 'N/A',
        cacheHits: gameDataService.cache.stats?.cacheHits || 'N/A',
        cacheMisses: gameDataService.cache.stats?.cacheMisses || 'N/A',
        hitRate: gameDataService.cache.stats ? `${((gameDataService.cache.stats.cacheHits / gameDataService.cache.stats.totalCalls) * 100).toFixed(1)}%` : 'N/A'
      } : { note: 'Cache statistics not available' };

      return (
        <div className="p-4 space-y-6">
          {renderObjectTable(player1ShipStats, 'Player 1 Effective Ship Stats', 'border-l-4 border-cyan-500 pl-4')}
          {renderObjectTable(player2ShipStats, 'Player 2 Effective Ship Stats', 'border-l-4 border-pink-500 pl-4')}
          {renderObjectTable(player1DroneStats, 'Player 1 Effective Drone Stats', 'border-l-4 border-cyan-500 pl-4')}
          {renderObjectTable(player2DroneStats, 'Player 2 Effective Drone Stats', 'border-l-4 border-pink-500 pl-4')}
          {renderObjectTable(cacheStats, 'GameDataService Cache Statistics')}
        </div>
      );
    } catch (error) {
      return (
        <div className="p-4 text-center text-red-400">
          Error loading calculated stats: {error.message}
        </div>
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '90vw', maxHeight: '90vh', width: '1200px' }}>
        <button onClick={onClose} className="modal-close">
          <X size={24} />
        </button>

        <h2 className="modal-title">Game Debug View</h2>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'raw'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Raw State
          </button>
          <button
            onClick={() => setActiveTab('calculated')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'calculated'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-800'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Calculated Stats
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {activeTab === 'raw' ? renderRawStateTab() : renderCalculatedStatsTab()}
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameDebugModal;