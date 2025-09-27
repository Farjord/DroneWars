// ========================================
// GAME HEADER COMPONENT
// ========================================
// Header section showing player resources, game phase, and controls
// Extracted from App.jsx for better component organization

import React from 'react';
import { Bolt, Hand, Rocket, Cpu, ShieldCheck, RotateCcw, Settings } from 'lucide-react';
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
 * @param {Function} props.handlePlayerPass - Handle player pass action
 * @param {Function} props.handleReset - Handle game reset
 * @param {boolean} props.mandatoryAction - Whether there's a mandatory action
 * @param {Object} props.multiSelectState - Multi-select state
 * @param {boolean} props.AI_HAND_DEBUG_MODE - Debug mode for AI hand
 * @param {Function} props.setShowAiHandModal - Set AI hand modal visibility
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
  handlePlayerPass,
  handleReset,
  mandatoryAction,
  multiSelectState,
  AI_HAND_DEBUG_MODE,
  setShowAiHandModal
}) {
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

      {/* Center Title and Phase */}
      <div className="text-center flex flex-col items-center">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-xl font-orbitron"
            style={{ textShadow: '0 0 15px rgba(236, 72, 153, 0.5), 0 0 5px rgba(255, 255, 255, 0.5)' }}>
          Drone Wars
        </h1>
        <div className="flex items-center gap-4 mt-2">
          <h2 className="text-2xl font-bold text-gray-300 tracking-widest font-exo">{getPhaseDisplayName(turnPhase)}</h2>

          {/* Pass Button */}
          {(turnPhase === 'deployment' || turnPhase === 'action') && isMyTurn() && !mandatoryAction && !multiSelectState && (
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
          <button className="bg-slate-700 text-white p-3 rounded-full shadow-lg hover:bg-slate-600 transition-colors duration-200">
            <Settings />
          </button>
        </div>
      </div>
    </header>
  );
}

export default GameHeader;