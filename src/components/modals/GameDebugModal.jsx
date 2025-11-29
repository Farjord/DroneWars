// ========================================
// GAME DEBUG MODAL COMPONENT
// ========================================
// Modal for debugging game state - shows raw state and calculated stats

import React, { useState } from 'react';
import { Terminal, Copy } from 'lucide-react';
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
    <div style={{ marginBottom: '24px', paddingLeft: colorClass ? '16px' : '0', borderLeft: colorClass ? `4px solid ${colorClass}` : 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--modal-text-primary)', margin: 0 }}>{title}</h3>
        <button
          onClick={() => copyToClipboard(obj, title)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            background: 'var(--modal-surface)',
            border: '1px solid var(--modal-border)',
            borderRadius: '4px',
            padding: '4px 8px',
            color: 'var(--modal-text-secondary)',
            cursor: 'pointer'
          }}
        >
          <Copy size={12} />
          Copy
        </button>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--modal-border)', overflow: 'auto', maxHeight: '300px' }}>
        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--modal-surface)' }}>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Property</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Value</th>
              <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(obj).map(([key, value], index) => (
              <tr key={key} style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '8px', borderBottom: '1px solid var(--modal-border)', fontFamily: 'monospace', color: '#facc15' }}>{key}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid var(--modal-border)', fontFamily: 'monospace', color: 'var(--modal-text-secondary)' }}>{formatValue(value)}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid var(--modal-border)', color: 'var(--modal-text-secondary)', opacity: 0.7 }}>{typeof value === 'object' && value !== null ? (Array.isArray(value) ? 'array' : 'object') : typeof value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRawStateTab = () => {
    const coreGameInfo = {
      gameSeed: gameState.gameSeed,
      appState: gameState.appState,
      gameMode: gameState.gameMode,
      gameActive: gameState.gameActive,
      turnPhase: gameState.turnPhase,
      currentPlayer: gameState.currentPlayer,
      roundNumber: gameState.roundNumber,
      turn: gameState.turn,
      firstPlayerOfRound: gameState.firstPlayerOfRound
    };

    return (
      <div style={{ padding: '16px' }}>
        {renderObjectTable(coreGameInfo, 'Core Game Info')}
        {renderObjectTable(gameState.player1, 'Player 1 State', '#22d3ee')}
        {renderObjectTable(gameState.player2, 'Player 2 State', '#ef4444')}
        {renderObjectTable({ placedSections: gameState.placedSections }, 'Player 1 Placed Sections', '#22d3ee')}
        {renderObjectTable({ opponentPlacedSections: gameState.opponentPlacedSections }, 'Player 2 Placed Sections', '#ef4444')}
        {gameState.passInfo && renderObjectTable(gameState.passInfo, 'Pass Information')}
      </div>
    );
  };

  const renderCalculatedStatsTab = () => {
    if (!gameDataService) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: '#f87171' }}>
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
        <div style={{ padding: '16px' }}>
          {renderObjectTable(player1ShipStats, 'Player 1 Effective Ship Stats', '#22d3ee')}
          {renderObjectTable(player2ShipStats, 'Player 2 Effective Ship Stats', '#ef4444')}
          {renderObjectTable(player1DroneStats, 'Player 1 Effective Drone Stats', '#22d3ee')}
          {renderObjectTable(player2DroneStats, 'Player 2 Effective Drone Stats', '#ef4444')}
          {renderObjectTable(cacheStats, 'GameDataService Cache Statistics')}
        </div>
      );
    } catch (error) {
      return (
        <div style={{ padding: '16px', textAlign: 'center', color: '#f87171' }}>
          Error loading calculated stats: {error.message}
        </div>
      );
    }
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div
        className="dw-modal-content dw-modal--xxl dw-modal--action"
        style={{ maxWidth: '1200px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <Terminal size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Game Debug View</h2>
            <p className="dw-modal-header-subtitle">Raw state and calculated stats</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--modal-border)', padding: '0 16px' }}>
          <button
            onClick={() => setActiveTab('raw')}
            style={{
              padding: '12px 24px',
              fontWeight: '500',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'raw' ? '2px solid var(--modal-theme)' : '2px solid transparent',
              color: activeTab === 'raw' ? 'var(--modal-theme)' : 'var(--modal-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Raw State
          </button>
          <button
            onClick={() => setActiveTab('calculated')}
            style={{
              padding: '12px 24px',
              fontWeight: '500',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'calculated' ? '2px solid var(--modal-theme)' : '2px solid transparent',
              color: activeTab === 'calculated' ? 'var(--modal-theme)' : 'var(--modal-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Calculated Stats
          </button>
        </div>

        {/* Tab Content */}
        <div className="dw-modal-body" style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          {activeTab === 'raw' ? renderRawStateTab() : renderCalculatedStatsTab()}
        </div>

        {/* Actions */}
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameDebugModal;