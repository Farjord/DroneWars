// ========================================
// GAME HEADER COMPONENT
// ========================================
// Header section showing player resources, game phase, and controls
// Extracted from App.jsx for better component organization

import React, { useState, useRef, useEffect } from 'react';
import { Bolt, Hand, Rocket, Cpu, ShieldCheck, RotateCcw, Settings, ChevronDown, BookOpen } from 'lucide-react';
import { getPhaseDisplayName } from '../../utils/gameUtils.js';
import DEV_CONFIG from '../../config/devConfig.js';

/**
 * Resource Badge Component - Angular styled resource display
 */
const ResourceBadge = ({ icon: Icon, value, max, iconColor, isPlayer }) => {
  const borderGradient = isPlayer 
    ? 'from-cyan-400/30 via-blue-400/30 to-blue-500/30' 
    : 'from-pink-400/30 via-pink-500/30 to-pink-600/30';
  
  const bgGradient = 'bg-gradient-to-br from-gray-900/95 to-gray-800/95';
  
  return (
    <div 
      className={`relative p-[1px] bg-gradient-to-br ${borderGradient}`}
      style={{ 
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)'
      }}
    >
      <div 
        className={`${bgGradient} px-3 py-1 flex items-center gap-2`}
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)' }}
      >
        <Icon size={18} className={iconColor} />
        <span className="font-bold text-base text-white whitespace-nowrap">
          {value}
          {max !== undefined && <span className="hidden xl:inline"> / {max}</span>}
        </span>
      </div>
    </div>
  );
};

/**
 * GameHeader - Top header displaying player resources and game state
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
  opponentShieldsToAllocate,
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
  handleExitGame,
  handleResetShields,
  handleConfirmShields,
  handleCancelReallocation,
  handleResetReallocation,
  handleContinueToAddPhase,
  handleConfirmReallocation,
  handleRoundStartDraw,
  optionalDiscardCount,
  mandatoryAction,
  multiSelectState,
  AI_HAND_DEBUG_MODE,
  setShowAiHandModal,
  onShowDebugModal,
  onShowOpponentDrones,
  onShowGlossary,
  testMode
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
    <header className="w-full flex justify-between items-start mb-2 flex-shrink-0 px-5 pt-2">
      {/* Test Mode Indicator */}
      {testMode && (
        <div
          className="body-font"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 165, 0, 0.2)',
            border: '2px solid #ff9800',
            borderRadius: '8px',
            color: '#ffb74d',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            zIndex: 1000,
            boxShadow: '0 0 20px rgba(255, 152, 0, 0.4)',
            backdropFilter: 'blur(4px)'
          }}
        >
          🧪 TESTING MODE
        </div>
      )}

      {/* Opponent Resources */}
      <div className="flex flex-col gap-1.5">
        <h2
          className="text-base font-bold uppercase tracking-wider flex items-center gap-2"
          style={{
            backgroundImage: 'linear-gradient(45deg, #ec4899, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Opponent
          {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === getOpponentPlayerId() && (
            <span className="text-base font-semibold text-yellow-300">(First Player)</span>
          )}
          {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo[`${getOpponentPlayerId()}Passed`] && (
            <span className="text-base font-semibold text-red-400">(Passed)</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <ResourceBadge 
            icon={Bolt} 
            value={opponentPlayerState.energy} 
            max={opponentPlayerEffectiveStats.totals.maxEnergy}
            iconColor="text-yellow-300"
            isPlayer={false}
          />
          <div
            onClick={() => AI_HAND_DEBUG_MODE && setTimeout(() => setShowAiHandModal(true), 100)}
            className={AI_HAND_DEBUG_MODE ? 'cursor-pointer' : ''}
          >
            <ResourceBadge 
              icon={Hand} 
              value={opponentPlayerState.hand.length} 
              max={opponentPlayerEffectiveStats.totals.handLimit}
              iconColor="text-gray-400"
              isPlayer={false}
            />
          </div>
          {turnPhase === 'deployment' && (
            <ResourceBadge 
              icon={Rocket} 
              value={turn === 1 ? opponentPlayerState.initialDeploymentBudget : opponentPlayerState.deploymentBudget}
              iconColor="text-purple-400"
              isPlayer={false}
            />
          )}
          <div
            onClick={() => setTimeout(() => onShowOpponentDrones(), 100)}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <ResourceBadge
              icon={Cpu}
              value={totalOpponentPlayerDrones}
              max={opponentPlayerEffectiveStats.totals.cpuLimit}
              iconColor="text-cyan-400"
              isPlayer={false}
            />
          </div>
        </div>
      </div>

      {/* Center Phase and Turn Indicator */}
      <div className="text-center flex flex-col items-center gap-2">
        {/* Phase Display */}
        <h2
          className="text-base font-bold uppercase tracking-widest"
          style={{
            backgroundImage: 'linear-gradient(45deg, #6b7280, #9ca3af)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          {getPhaseDisplayName(turnPhase)}
          {turnPhase === 'allocateShields' && (
            <span className="text-base font-semibold text-cyan-300 ml-2">
              ({shieldsToAllocate} shields to assign)
            </span>
          )}
          {reallocationPhase === 'removing' && (
            <span className="text-base font-semibold text-orange-300 ml-2">
              ({shieldsToRemove} shields to remove)
            </span>
          )}
          {reallocationPhase === 'adding' && (
            <span className="text-base font-semibold text-green-300 ml-2">
              ({shieldsToAdd} shields to add)
            </span>
          )}
          {turnPhase === 'mandatoryDiscard' && mandatoryAction?.type === 'discard' && (
            <span className="text-base font-semibold text-orange-300 ml-2">
              ({mandatoryAction.count} {mandatoryAction.count === 1 ? 'card' : 'cards'} to discard)
            </span>
          )}
          {turnPhase === 'optionalDiscard' && (
            <span className="text-base font-semibold text-yellow-300 ml-2">
              ({localPlayerEffectiveStats.totals.discardLimit - optionalDiscardCount} {(localPlayerEffectiveStats.totals.discardLimit - optionalDiscardCount) === 1 ? 'card' : 'cards'} to discard)
            </span>
          )}
        </h2>

        {/* Turn Indicator - Always show */}
        <div className="flex items-center gap-3">
          {(turnPhase === 'deployment' || turnPhase === 'action' || reallocationPhase) ? (
            <>
              {isMyTurn() ? (
                <div className="flex items-center gap-2">
                  <span
                    className="text-3xl font-orbitron font-black uppercase tracking-widest"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
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
                    className="text-3xl font-orbitron font-black uppercase tracking-widest phase-announcement-shine animate-pulse"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #ec4899, #f472b6, #ec4899)',
                      backgroundSize: '200% auto',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: '0 0 30px rgba(236, 72, 153, 0.5), 0 0 60px rgba(244, 114, 182, 0.3)',
                      filter: 'drop-shadow(0 0 20px rgba(236, 72, 153, 0.4))',
                      animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}
                  >
                    {isMultiplayer() ? "Opponent's Turn" : "AI Thinking"}
                  </span>
                </div>
              )}

            {/* Pass Button - Hide during reallocation */}
            {isMyTurn() && !mandatoryAction && !multiSelectState && !reallocationPhase && (
              <button
                onClick={handlePlayerPass}
                disabled={passInfo[`${getLocalPlayerId()}Passed`]}
                className="relative p-[1px] transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                  backgroundImage: passInfo[`${getLocalPlayerId()}Passed`]
                    ? 'linear-gradient(45deg, rgba(75, 85, 99, 0.6), rgba(107, 114, 128, 0.6))'
                    : 'linear-gradient(45deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))'
                }}
              >
                <div
                  className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                    color: passInfo[`${getLocalPlayerId()}Passed`] ? '#9ca3af' : '#fca5a5'
                  }}
                >
                  Pass
                </div>
              </button>
            )}

            {/* Shield Reallocation Controls - Removing Phase */}
            {reallocationPhase === 'removing' && (
              <>
                <button
                  onClick={handleCancelReallocation}
                  className="relative p-[1px] transition-all hover:scale-105"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                    backgroundImage: 'linear-gradient(45deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))'
                  }}
                >
                  <div
                    className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                      color: '#fca5a5'
                    }}
                  >
                    Cancel
                  </div>
                </button>

                <button
                  onClick={handleResetReallocation}
                  className="relative p-[1px] transition-all hover:scale-105"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                    backgroundImage: 'linear-gradient(45deg, rgba(234, 179, 8, 0.8), rgba(202, 138, 4, 0.8))'
                  }}
                >
                  <div
                    className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                      color: '#fde047'
                    }}
                  >
                    Reset
                  </div>
                </button>

                <button
                  onClick={handleContinueToAddPhase}
                  className="relative p-[1px] transition-all hover:scale-105"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                    backgroundImage: 'linear-gradient(45deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.8))'
                  }}
                >
                  <div
                    className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                      color: '#86efac'
                    }}
                  >
                    Continue
                  </div>
                </button>
              </>
            )}

            {/* Shield Reallocation Controls - Adding Phase */}
            {reallocationPhase === 'adding' && (
              <>
                <button
                  onClick={handleCancelReallocation}
                  className="relative p-[1px] transition-all hover:scale-105"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                    backgroundImage: 'linear-gradient(45deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8))'
                  }}
                >
                  <div
                    className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                      color: '#fca5a5'
                    }}
                  >
                    Cancel
                  </div>
                </button>

                <button
                  onClick={handleResetReallocation}
                  className="relative p-[1px] transition-all hover:scale-105"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                    backgroundImage: 'linear-gradient(45deg, rgba(234, 179, 8, 0.8), rgba(202, 138, 4, 0.8))'
                  }}
                >
                  <div
                    className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                      color: '#fde047'
                    }}
                  >
                    Reset
                  </div>
                </button>

                <button
                  onClick={handleConfirmReallocation}
                  className="relative p-[1px] transition-all hover:scale-105"
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                    backgroundImage: 'linear-gradient(45deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.8))'
                  }}
                >
                  <div
                    className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                      color: '#86efac'
                    }}
                  >
                    Confirm
                  </div>
                </button>
              </>
            )}
            </>
          ) : (
            // Initialising phase - show in "Your Turn" colors for both players
            <>
              <div className="flex items-center gap-2">
                <span
                  className="text-3xl font-orbitron font-black uppercase tracking-widest"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 0 30px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 136, 255, 0.3)',
                    filter: 'drop-shadow(0 0 20px rgba(0, 255, 136, 0.4))'
                  }}
                >
                  Initialising
                </span>
              </div>

              {/* Shield Allocation Controls - Show during allocateShields phase */}
              {turnPhase === 'allocateShields' && (
                <>
                  <button
                    onClick={handleResetShields}
                    className="relative p-[1px] transition-all hover:scale-105"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                      backgroundImage: 'linear-gradient(45deg, rgba(234, 179, 8, 0.8), rgba(202, 138, 4, 0.8))'
                    }}
                  >
                    <div
                      className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                        color: '#fde047'
                      }}
                    >
                      Reset
                    </div>
                  </button>

                  <button
                    onClick={handleConfirmShields}
                    className="relative p-[1px] transition-all hover:scale-105"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                      backgroundImage: 'linear-gradient(45deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.8))'
                    }}
                  >
                    <div
                      className="px-6 py-1.5 uppercase text-sm tracking-wider font-semibold bg-gray-900"
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)',
                        color: '#86efac'
                      }}
                    >
                      Confirm
                    </div>
                  </button>
                </>
              )}

              {/* Optional Discard Controls - Show during optionalDiscard phase */}
              {turnPhase === 'optionalDiscard' && (
                <button onClick={handleRoundStartDraw} className="btn-confirm">
                  Confirm
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Player Resources */}
      <div className="flex flex-col gap-1.5 items-end">
        <h2
          className="text-base font-bold uppercase tracking-wider flex items-center gap-2"
          style={{
            backgroundImage: 'linear-gradient(45deg, #00ff88, #0088ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          Your Resources
          {(turnPhase === 'deployment' || turnPhase === 'action') && firstPlayerOfRound === getLocalPlayerId() && (
            <span className="text-base font-semibold text-yellow-300">(First Player)</span>
          )}
          {(turnPhase === 'deployment' || turnPhase === 'action') && passInfo[`${getLocalPlayerId()}Passed`] && (
            <span className="text-base font-semibold text-red-400">(Passed)</span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <ResourceBadge 
            icon={Bolt} 
            value={localPlayerState.energy} 
            max={localPlayerEffectiveStats.totals.maxEnergy}
            iconColor="text-yellow-300"
            isPlayer={true}
          />
          {turnPhase === 'deployment' && (
            <ResourceBadge 
              icon={Rocket} 
              value={turn === 1 ? localPlayerState.initialDeploymentBudget : localPlayerState.deploymentBudget}
              iconColor="text-purple-400"
              isPlayer={true}
            />
          )}
          <ResourceBadge 
            icon={Cpu} 
            value={totalLocalPlayerDrones} 
            max={localPlayerEffectiveStats.totals.cpuLimit}
            iconColor="text-cyan-400"
            isPlayer={true}
          />
          {turnPhase === 'allocateShields' && (
            <ResourceBadge 
              icon={ShieldCheck} 
              value={shieldsToAllocate}
              iconColor="text-cyan-300"
              isPlayer={true}
            />
          )}
          {reallocationPhase === 'removing' && (
            <ResourceBadge 
              icon={ShieldCheck} 
              value={shieldsToRemove}
              iconColor="text-orange-300"
              isPlayer={true}
            />
          )}
          {reallocationPhase === 'adding' && (
            <ResourceBadge 
              icon={ShieldCheck} 
              value={shieldsToAdd}
              iconColor="text-green-300"
              isPlayer={true}
            />
          )}

          {/* Settings Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
              className="relative p-[2px] bg-gradient-to-br from-gray-500 to-gray-700"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)' }}
              aria-label="Settings"
            >
              <div 
                className="bg-slate-700 hover:bg-slate-600 p-1.5 transition-colors flex items-center gap-1"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)' }}
              >
                <Settings size={20} className="text-white" />
                <ChevronDown size={16} className="text-white" />
              </div>
            </button>

            {showSettingsDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
                {DEV_CONFIG.features.debugView && (
                  <button
                    onClick={() => {
                      onShowDebugModal && onShowDebugModal();
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
                  >
                    <Settings size={16} />
                    Debug View
                  </button>
                )}
                <button
                  onClick={() => {
                    onShowGlossary && onShowGlossary();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
                >
                  <BookOpen size={16} />
                  Mechanics Glossary
                </button>
                <button
                  onClick={() => {
                    handleExitGame();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors rounded-b-lg flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Exit
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