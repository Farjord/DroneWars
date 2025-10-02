// ========================================
// GAME HEADER COMPONENT
// ========================================
// Header section showing player resources, game phase, and controls
// Extracted from App.jsx for better component organization

import React, { useState, useRef, useEffect } from 'react';
import { Bolt, Hand, Rocket, Cpu, ShieldCheck, RotateCcw, Settings, ChevronDown } from 'lucide-react';
import { getPhaseDisplayName } from '../../utils/gameUtils.js';

/**
 * GameHeader - Top header displaying player resources and game state
 * @param {Object} props - Component props
 * @param {Object} props.localPlayerState - Local player state data
 * @param {Object} props.opponentPlayerState - Opponent player state data
 * @param {Object} props.localPlayerEffectiveStats - Local player effective stats
 * @param {Object} props.opponentPlayerEffectiveStats - Opponent player effective stats
 * @param {string} props.turnPhase - Current turn phase
 * @param {number} props.turn - Current turn number
 * @param {Object} props.passInfo - Pass information for both players
 * @param {string} props.firstPlayerOfRound - ID of first player this round
 * @param {number} props.shieldsToAllocate - Shields available for allocation
 * @param {number} props.shieldsToRemove - Shields to remove in reallocation
 * @param {number} props.shieldsToAdd - Shields to add in reallocation
 * @param {string} props.reallocationPhase - Current reallocation phase
 * @param {number} props.totalLocalPlayerDrones - Total drones for local player
 * @param {number} props.totalOpponentPlayerDrones - Total drones for opponent
 * @param {Function} props.getLocalPlayerId - Get local player ID
 * @param {Function} props.getOpponentPlayerId - Get opponent player ID
 * @param {Function} props.isMyTurn - Check if it's local player's turn
 * @param {string} props.currentPlayer - Current player ID
 * @param {Function} props.isMultiplayer - Check if game is multiplayer
 * @param {Function} props.handlePlayerPass - Handle player pass action
 * @param {Function} props.handleReset - Handle game reset
 * @param {boolean} props.mandatoryAction - Whether there's a mandatory action
 * @param {Object} props.multiSelectState - Multi-select state
 * @param {boolean} props.AI_HAND_DEBUG_MODE - Debug mode for AI hand
 * @param {Function} props.setShowAiHandModal - Set AI hand modal visibility
 * @param {Function} props.onShowDebugModal - Callback to show debug modal
 */
function GameHeader({
  localPlayerState,
  opponentPlayerState,
  localPlayerEffectiveStats,
  opponentPlayerEffectiveStats,
  turnPhase,
  turn,
  passInfo,
  firstPlayerOfRound,
  shieldsToAllocate,
  shieldsToRemove,
  shieldsToAdd,
  reallocationPhase,
  totalLocalPlayerDrones,
  totalOpponentPlayerDrones,
  getLocalPlayerId,
  getOpponentPlayerId,
  isMyTurn,
  currentPlayer,
  isMultiplayer,
  handlePlayerPass,
  handleReset,
  mandatoryAction,
  multiSelectState,
  AI_HAND_DEBUG_MODE,
  setShowAiHandModal,
  onShowDebugModal
}) {
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <header className="w-full flex justify-between items-center mb-2 flex-shrink-0 px-5 pt-8">
      {/* Opponent Resources */}
      <div className="flex flex-col items-start gap-2">
        <h2 className="text-lg font-bold text-pink-300 flex items-center">
          Opponent Resources
          {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === getOpponentPlayerId() &&
            <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
          {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo[`${getOpponentPlayerId()}Passed`] &&
            <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
        </h2>
        <div className="flex items-center gap-4">
          <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${
            opponentPlayerState.energy > opponentPlayerEffectiveStats.totals.maxEnergy ? 'text-red-400' : ''
          }`}>
            <Bolt className="text-yellow-300 mr-2" />
            <span className="font-bold text-lg">{opponentPlayerState.energy} / {opponentPlayerEffectiveStats.totals.maxEnergy}</span>
          </div>
          <div
            onClick={() => AI_HAND_DEBUG_MODE && setTimeout(() => setShowAiHandModal(true), 100)}
            className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${
              AI_HAND_DEBUG_MODE ? 'cursor-pointer hover:bg-gray-800' : ''
            } ${opponentPlayerState.hand.length > opponentPlayerEffectiveStats.totals.handLimit ? 'text-red-400' : ''}`}
          >
            <Hand className="text-gray-400 mr-2" />
            <span className="font-bold text-lg">{opponentPlayerState.hand.length} / {opponentPlayerEffectiveStats.totals.handLimit}</span>
          </div>
          {turnPhase === 'deployment' && (
            <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50">
              <Rocket className="text-purple-400 mr-2" />
              <span className="font-bold text-lg">{turn === 1 ? opponentPlayerState.initialDeploymentBudget : opponentPlayerState.deploymentBudget}</span>
            </div>
          )}
          <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-pink-500/50 ${
            totalOpponentPlayerDrones > opponentPlayerEffectiveStats.totals.cpuLimit ? 'text-red-400' : ''
          }`}>
            <Cpu className="text-cyan-400 mr-2" />
            <span className="font-bold text-lg">{totalOpponentPlayerDrones} / {opponentPlayerEffectiveStats.totals.cpuLimit}</span>
          </div>
        </div>
      </div>

      {/* Center Phase and Turn Indicator */}
      <div className="text-center flex flex-col items-center gap-2">
        {/* Phase Display */}
        <h2 className="text-2xl font-bold text-gray-300 tracking-widest font-exo">{getPhaseDisplayName(turnPhase)}</h2>

        {/* Turn Indicator - Only show during deployment/action phases */}
        {(turnPhase === 'deployment' || turnPhase === 'action') && (
          <div className="flex items-center gap-3">
            {isMyTurn() ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-3xl font-orbitron font-black uppercase tracking-widest"
                  style={{
                    background: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 136, 255, 0.3)',
                    filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.4))'
                  }}
                >
                  Your Turn
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className="text-3xl font-orbitron font-black uppercase tracking-widest phase-announcement-shine"
                  style={{
                    background: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 136, 255, 0.3)',
                    filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.4))'
                  }}
                >
                  {isMultiplayer() ? "Opponent's Turn" : "AI Thinking"}
                </span>
              </div>
            )}

            {/* Pass Button */}
            {isMyTurn() && !mandatoryAction && !multiSelectState && (
              <button
                onClick={handlePlayerPass}
                disabled={passInfo[`${getLocalPlayerId()}Passed`]}
                className={`btn-clipped text-white font-bold py-1 px-6 transition-colors duration-200 ${
                  passInfo[`${getLocalPlayerId()}Passed`] ? 'bg-gray-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                Pass
              </button>
            )}
          </div>
        )}
      </div>

      {/* Player Resources */}
      <div className="flex flex-col items-end gap-2">
        <h2 className="text-lg font-bold text-cyan-300 flex items-center">
          Your Resources
          {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === getLocalPlayerId() &&
            <span className="text-base font-semibold text-yellow-300 ml-2">(First Player)</span>}
          {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo[`${getLocalPlayerId()}Passed`] &&
            <span className="text-base font-semibold text-red-400 ml-2">(Passed)</span>}
        </h2>
        <div className="flex items-center gap-6">
          <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${
            localPlayerState.energy > localPlayerEffectiveStats.totals.maxEnergy ? 'text-red-400' : ''
          }`}>
            <Bolt className="text-yellow-300 mr-2" />
            <span className="font-bold text-lg">{localPlayerState.energy} / {localPlayerEffectiveStats.totals.maxEnergy}</span>
          </div>
          {turnPhase === 'deployment' && (
            <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50">
              <Rocket className="text-purple-400 mr-2" />
              <span className="font-bold text-lg">{turn === 1 ? localPlayerState.initialDeploymentBudget : localPlayerState.deploymentBudget}</span>
            </div>
          )}
          <div className={`flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50 ${
            totalLocalPlayerDrones > localPlayerEffectiveStats.totals.cpuLimit ? 'text-red-400' : ''
          }`}>
            <Cpu className="text-cyan-400 mr-2" />
            <span className="font-bold text-lg">{totalLocalPlayerDrones} / {localPlayerEffectiveStats.totals.cpuLimit}</span>
          </div>
          {turnPhase === 'allocateShields' && (
            <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-cyan-500/50">
              <ShieldCheck className="text-cyan-300 mr-2" />
              <span className="font-bold text-lg">{shieldsToAllocate}</span>
            </div>
          )}
          {reallocationPhase === 'removing' && (
            <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-orange-500/50">
              <ShieldCheck className="text-orange-300 mr-2" />
              <span className="font-bold text-lg">{shieldsToRemove}</span>
            </div>
          )}
          {reallocationPhase === 'adding' && (
            <div className="flex items-center bg-gray-900/80 rounded-full px-4 py-2 shadow-lg border border-green-500/50">
              <ShieldCheck className="text-green-300 mr-2" />
              <span className="font-bold text-lg">{shieldsToAdd}</span>
            </div>
          )}
          <button
            onClick={handleReset}
            className="bg-pink-700 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-colors duration-200"
            aria-label="Reset Game"
          >
            <RotateCcw />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className="bg-slate-700 text-white p-3 rounded-full shadow-lg hover:bg-slate-600 transition-colors duration-200 flex items-center"
              aria-label="Settings"
            >
              <Settings />
              <ChevronDown size={16} className="ml-1" />
            </button>

            {showSettingsDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                <button
                  onClick={() => {
                    onShowDebugModal && onShowDebugModal();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors rounded-lg flex items-center gap-2"
                >
                  <Settings size={16} />
                  Debug View
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default GameHeader;