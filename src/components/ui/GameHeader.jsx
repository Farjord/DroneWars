// ========================================
// GAME HEADER COMPONENT
// ========================================
// Header section showing player resources, game phase, and controls
// Extracted from App.jsx for better component organization

import React, { useState, useRef, useEffect } from 'react';
import { Power, Files, Cpu, ShieldCheck, RotateCcw, Settings, ChevronDown, BookOpen, Brain, Plus, Image, ChevronRight, Check, AlertTriangle, Zap } from 'lucide-react';
import { getPhaseDisplayName } from '../../utils/gameUtils.js';
import { debugLog } from '../../utils/debugLogger.js';
import DEV_CONFIG from '../../config/devConfig.js';
import { BACKGROUNDS } from '../../config/backgrounds.js';
import HullIntegrityBadge from './HullIntegrityBadge.jsx';

/**
 * Helper function to extract drone name from drone ID
 * @param {string} droneId - The drone ID (e.g., "player2_Talon_0006")
 * @returns {string} - The drone name (e.g., "Talon")
 */
const extractDroneNameFromId = (droneId) => {
  if (!droneId) return '';
  // ID format: "player2_Talon_0006" → extract "Talon"
  const parts = droneId.split('_');
  // Remove player prefix and sequence number, join remaining parts for multi-word names
  return parts.slice(1, -1).join('_');
};

/**
 * Resource Badge Component - Information panel styled resource display
 * Matches the dw-stat-box aesthetic with angular corner accent
 */
const ResourceBadge = ({ icon: Icon, value, max, iconColor, isPlayer }) => {
  // Theme colors - cyan for player, red for opponent
  const borderColor = isPlayer ? 'rgba(6, 182, 212, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const accentColor = isPlayer ? 'rgba(6, 182, 212, 0.5)' : 'rgba(239, 68, 68, 0.5)';
  const glowColor = isPlayer ? 'rgba(6, 182, 212, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div
      className="relative"
      style={{
        background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 28, 0.95) 100%)',
        border: `1px solid ${borderColor}`,
        borderRadius: '2px',
        boxShadow: `0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 ${glowColor}`,
        clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)'
      }}
    >
      {/* Angular corner accent */}
      <div
        className="absolute top-0 left-0 w-2 h-2 z-10 pointer-events-none"
        style={{
          borderTop: `1px solid ${accentColor}`,
          borderLeft: `1px solid ${accentColor}`
        }}
      />
      <div className="px-3 py-1 flex items-center gap-2">
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
  roundNumber,
  passInfo,
  firstPlayerOfRound,
  shieldsToAllocate,
  opponentShieldsToAllocate,
  pendingShieldAllocations,
  pendingShieldsRemaining,
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
  handleMandatoryDiscardContinue,
  handleMandatoryDroneRemovalContinue,
  optionalDiscardCount,
  mandatoryAction,
  excessCards,
  excessDrones,
  multiSelectState,
  AI_HAND_DEBUG_MODE,
  setShowAiHandModal,
  onShowDebugModal,
  onShowOpponentDrones,
  onShowGlossary,
  onShowAIStrategy,
  onShowAddCardModal,
  onForceWin,
  testMode,
  handleCancelMultiMove,
  handleConfirmMultiMoveDrones,
  selectedBackground,
  onBackgroundChange,
  // Interception mode props
  interceptionModeActive,
  selectedInterceptor,
  handleShowInterceptionDialog,
  handleResetInterception,
  handleConfirmInterception,
  // Single-move mode props
  singleMoveMode,
  handleCancelSingleMove,
  // Additional cost mode props
  additionalCostState,
  handleCancelAdditionalCost,
  // Extraction mode props
  currentRunState,
  isExtractionMode,
  // Hull integrity props for win condition display
  localPlayerHullIntegrity,
  opponentHullIntegrity
}) {
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showBackgroundSubmenu, setShowBackgroundSubmenu] = useState(false);
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
            backgroundImage: 'linear-gradient(45deg, #ef4444, #f87171)',
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
          {turnPhase === 'deployment' && (
            <ResourceBadge
              icon={Power}
              value={roundNumber === 1 ? opponentPlayerState.initialDeploymentBudget : opponentPlayerState.deploymentBudget}
              iconColor="text-purple-400"
              isPlayer={false}
            />
          )}
          <ResourceBadge
            icon={Power}
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
              icon={Files}
              value={opponentPlayerState.hand.length}
              max={opponentPlayerEffectiveStats.totals.handLimit}
              iconColor="text-cyan-300"
              isPlayer={false}
            />
          </div>
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
          {/* Hull Integrity - Win Condition Progress */}
          {opponentHullIntegrity && (
            <HullIntegrityBadge
              current={opponentHullIntegrity.remainingToWin}
              threshold={opponentHullIntegrity.damageThreshold}
              isPlayer={false}
            />
          )}
        </div>
      </div>

      {/* Center Phase and Turn Indicator */}
      <div className="text-center flex flex-col items-center gap-2">
        {/* Phase Display */}
        <h2
          className="text-base font-bold uppercase tracking-widest text-white"
          style={{
            WebkitTextStroke: '1px black'
          }}
        >
          {getPhaseDisplayName(turnPhase)}
          {turnPhase === 'allocateShields' && (
            <span className="text-base font-semibold text-cyan-300 ml-2">
              ({pendingShieldsRemaining !== null ? pendingShieldsRemaining : shieldsToAllocate} shields to assign)
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
          {(turnPhase === 'mandatoryDiscard' || mandatoryAction?.type === 'discard') && (mandatoryAction?.type === 'discard' || excessCards > 0) && (
            <span className="text-base font-semibold text-orange-300 ml-2">
              ({(mandatoryAction?.count || excessCards)} {(mandatoryAction?.count || excessCards) === 1 ? 'card' : 'cards'} to discard)
            </span>
          )}
          {turnPhase === 'mandatoryDroneRemoval' && (mandatoryAction?.type === 'destroy' || excessDrones > 0) && (
            <span className="text-base font-semibold text-orange-300 ml-2">
              ({(mandatoryAction?.count || excessDrones)} {(mandatoryAction?.count || excessDrones) === 1 ? 'drone' : 'drones'} to remove)
            </span>
          )}
          {turnPhase === 'optionalDiscard' && (
            <span className="text-base font-semibold text-yellow-300 ml-2">
              ({localPlayerEffectiveStats.totals.discardLimit - optionalDiscardCount} {(localPlayerEffectiveStats.totals.discardLimit - optionalDiscardCount) === 1 ? 'card' : 'cards'} to discard)
            </span>
          )}
          {/* MULTI_MOVE Status Text */}
          {multiSelectState?.phase === 'select_source_lane' && (
            <span className="text-base font-semibold text-cyan-300 ml-2">
              (Select source lane)
            </span>
          )}
          {multiSelectState?.phase === 'select_drone' && (
            <span className="text-base font-semibold text-cyan-300 ml-2">
              (Select drone to move)
            </span>
          )}
          {multiSelectState?.phase === 'select_drones' && (
            <span className="text-base font-semibold text-cyan-300 ml-2">
              ({multiSelectState.selectedDrones.length} / {multiSelectState.maxDrones} drones selected)
            </span>
          )}
          {multiSelectState?.phase === 'select_destination_lane' && (
            <span className="text-base font-semibold text-green-300 ml-2">
              (Select destination lane)
            </span>
          )}
          {/* Interception Mode Status Text */}
          {interceptionModeActive && (
            <span className="text-base font-semibold text-cyan-300 ml-2">
              (Intercepting - select interceptor)
            </span>
          )}
          {/* Single Move Mode Status Text */}
          {singleMoveMode && (
            <span className="text-base font-semibold text-cyan-300 ml-2">
              (Moving {extractDroneNameFromId(singleMoveMode.droneId)} - drag to adjacent lane)
            </span>
          )}
          {/* Additional Cost Mode Status Text */}
          {additionalCostState && (
            <span className="text-base font-semibold text-cyan-300 ml-2">
              {additionalCostState.phase === 'select_cost' && `(Select ${additionalCostState.card.additionalCost.description || 'cost'})`}
              {additionalCostState.phase === 'select_cost_movement_destination' && `(Moving ${extractDroneNameFromId(additionalCostState.costSelection.drone.id)} - select destination)`}
              {additionalCostState.phase === 'select_effect' && `(Select target for ${additionalCostState.card.name})`}
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
                    className="text-3xl font-orbitron font-black uppercase tracking-widest phase-announcement-shine"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #06b6d4, #22d3ee, #ffffff, #22d3ee, #06b6d4)',
                      backgroundSize: '300% auto',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      WebkitTextStroke: '1px black',
                      textShadow: '0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(34, 211, 238, 0.3)',
                      filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.4))'
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
                      backgroundImage: 'linear-gradient(45deg, #ef4444, #f87171, #ef4444)',
                      backgroundSize: '200% auto',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      WebkitTextStroke: '1px black',
                      textShadow: '0 0 30px rgba(239, 68, 68, 0.5), 0 0 60px rgba(248, 113, 113, 0.3)',
                      filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.4))',
                      animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}
                  >
                    {isMultiplayer() ? "Opponent's Turn" : "AI Thinking"}
                  </span>
                </div>
              )}

            {/* Pass Button - Hide during reallocation */}
            {isMyTurn() && !mandatoryAction && !multiSelectState && !singleMoveMode && !additionalCostState && !reallocationPhase && (
              <button
                onClick={handlePlayerPass}
                disabled={passInfo[`${getLocalPlayerId()}Passed`]}
                className="dw-btn dw-btn-danger dw-btn--sm"
              >
                Pass
              </button>
            )}

            {/* Shield Reallocation Controls - Removing Phase */}
            {reallocationPhase === 'removing' && (
              <>
                <button
                  onClick={handleCancelReallocation}
                  className="dw-btn dw-btn-danger dw-btn--sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleResetReallocation}
                  className="dw-btn dw-btn-warning dw-btn--sm"
                >
                  Reset
                </button>

                <button
                  onClick={handleContinueToAddPhase}
                  className="dw-btn dw-btn-confirm dw-btn--sm"
                >
                  Continue
                </button>
              </>
            )}

            {/* Shield Reallocation Controls - Adding Phase */}
            {reallocationPhase === 'adding' && (
              <>
                <button
                  onClick={handleCancelReallocation}
                  className="dw-btn dw-btn-danger dw-btn--sm"
                >
                  Cancel
                </button>

                <button
                  onClick={handleResetReallocation}
                  className="dw-btn dw-btn-warning dw-btn--sm"
                >
                  Reset
                </button>

                <button
                  onClick={handleConfirmReallocation}
                  className="dw-btn dw-btn-confirm dw-btn--sm"
                >
                  Confirm
                </button>
              </>
            )}

            {/* MULTI_MOVE Controls */}
            {multiSelectState && (
              <>
                {/* Cancel button - visible for ALL phases */}
                <button
                  onClick={handleCancelMultiMove}
                  className="dw-btn dw-btn-danger dw-btn--sm"
                >
                  Cancel
                </button>

                {/* Confirm button - only during select_drones phase */}
                {multiSelectState.phase === 'select_drones' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent click from bubbling to game area div
                      debugLog('BUTTON_CLICKS', '🖱️ CONFIRM DRONES button clicked', {
                        timestamp: performance.now(),
                        selectedDrones: multiSelectState.selectedDrones.length,
                        sourceLane: multiSelectState.sourceLane
                      });
                      handleConfirmMultiMoveDrones();
                      debugLog('BUTTON_CLICKS', '✅ handleConfirmMultiMoveDrones returned', {
                        timestamp: performance.now()
                      });
                    }}
                    disabled={multiSelectState.selectedDrones.length === 0}
                    className="dw-btn dw-btn-confirm dw-btn--sm"
                  >
                    Confirm Drones
                  </button>
                )}
              </>
            )}

            {/* Interception Mode Controls */}
            {interceptionModeActive && (
              <>
                <button
                  onClick={handleShowInterceptionDialog}
                  className="dw-btn dw-btn-confirm dw-btn--sm"
                >
                  Show Dialog
                </button>

                <button
                  onClick={handleResetInterception}
                  className="dw-btn dw-btn-warning dw-btn--sm"
                >
                  Reset
                </button>

                <button
                  onClick={handleConfirmInterception}
                  className="dw-btn dw-btn-confirm dw-btn--sm"
                >
                  Confirm
                </button>
              </>
            )}

            {/* Single Move Mode Controls */}
            {singleMoveMode && (
              <button
                onClick={handleCancelSingleMove}
                className="dw-btn dw-btn-danger dw-btn--sm"
              >
                Cancel
              </button>
            )}

            {/* Additional Cost Mode Controls */}
            {additionalCostState && !multiSelectState && (
              <button
                onClick={handleCancelAdditionalCost}
                className="dw-btn dw-btn-danger dw-btn--sm"
              >
                Cancel
              </button>
            )}
            </>
          ) : (
            // Initialising phase - show in cyan/white colors for both players
            <>
              <div className="flex items-center gap-2">
                <span
                  className="text-3xl font-orbitron font-black uppercase tracking-widest phase-announcement-shine"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #06b6d4, #22d3ee, #ffffff, #22d3ee, #06b6d4)',
                    backgroundSize: '300% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    WebkitTextStroke: '1px black',
                    textShadow: '0 0 30px rgba(6, 182, 212, 0.5), 0 0 60px rgba(34, 211, 238, 0.3)',
                    filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.4))'
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
                    className="dw-btn dw-btn-warning dw-btn--sm"
                  >
                    Reset
                  </button>

                  <button
                    onClick={handleConfirmShields}
                    className="dw-btn dw-btn-confirm dw-btn--sm"
                  >
                    Confirm
                  </button>
                </>
              )}

              {/* Optional Discard Controls - Show during optionalDiscard phase */}
              {turnPhase === 'optionalDiscard' && (
                <button
                  onClick={handleRoundStartDraw}
                  className="dw-btn dw-btn-confirm dw-btn--sm"
                >
                  Confirm
                </button>
              )}

              {/* Mandatory Discard Controls - Show during mandatoryDiscard phase */}
              {turnPhase === 'mandatoryDiscard' && (
                <button
                  onClick={handleMandatoryDiscardContinue}
                  disabled={excessCards > 0}
                  className="dw-btn dw-btn-confirm dw-btn--sm"
                >
                  Continue
                </button>
              )}

              {/* Mandatory Drone Removal Controls - Show during mandatoryDroneRemoval phase */}
              {turnPhase === 'mandatoryDroneRemoval' && (
                <button
                  onClick={handleMandatoryDroneRemovalContinue}
                  disabled={excessDrones > 0}
                  className="dw-btn dw-btn-confirm dw-btn--sm"
                >
                  Continue
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Player Resources */}
      <div className="flex flex-col gap-1.5 items-end">
        <h2
          className="text-base font-bold uppercase tracking-wider flex items-center gap-2 phase-announcement-shine"
          style={{
            backgroundImage: 'linear-gradient(45deg, #06b6d4, #22d3ee, #ffffff, #22d3ee, #06b6d4)',
            backgroundSize: '300% auto',
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
          {/* Hull Integrity - Win Condition Progress (far left for player) */}
          {localPlayerHullIntegrity && (
            <HullIntegrityBadge
              current={localPlayerHullIntegrity.remainingToWin}
              threshold={localPlayerHullIntegrity.damageThreshold}
              isPlayer={true}
            />
          )}
          {turnPhase === 'deployment' && (() => {
            debugLog('RESOURCE_RESET', '🎨 [GAMEHEADER] Deployment badge rendering', {
              roundNumber,
              isRound1: roundNumber === 1,
              localPlayerState_initialDeploymentBudget: localPlayerState?.initialDeploymentBudget,
              localPlayerState_deploymentBudget: localPlayerState?.deploymentBudget,
              calculatedValue: roundNumber === 1 ? localPlayerState?.initialDeploymentBudget : localPlayerState?.deploymentBudget
            });
            return null;
          })()}
          {turnPhase === 'deployment' && (
            <ResourceBadge
              icon={Power}
              value={roundNumber === 1 ? localPlayerState.initialDeploymentBudget : localPlayerState.deploymentBudget}
              iconColor="text-purple-400"
              isPlayer={true}
            />
          )}
          <ResourceBadge
            icon={Power}
            value={localPlayerState.energy}
            max={localPlayerEffectiveStats.totals.maxEnergy}
            iconColor="text-yellow-300"
            isPlayer={true}
          />
          <ResourceBadge
            icon={Cpu}
            value={totalLocalPlayerDrones}
            max={localPlayerEffectiveStats.totals.cpuLimit}
            iconColor="text-cyan-400"
            isPlayer={true}
          />
          {/* Threat KPI - Only show in Extraction mode */}
          {isExtractionMode && currentRunState && (
            <ResourceBadge
              icon={AlertTriangle}
              value={Math.round(currentRunState.detection || 0)}
              max={100}
              iconColor={
                currentRunState.detection >= 80 ? 'text-red-500' :
                currentRunState.detection >= 50 ? 'text-yellow-400' :
                'text-green-400'
              }
              isPlayer={true}
            />
          )}
          {turnPhase === 'allocateShields' && (
            <ResourceBadge
              icon={ShieldCheck}
              value={pendingShieldsRemaining !== null ? pendingShieldsRemaining : shieldsToAllocate}
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
              className="relative"
              style={{
                background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 28, 0.95) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '2px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(6, 182, 212, 0.1)',
                clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)'
              }}
              aria-label="Settings"
            >
              {/* Angular corner accent */}
              <div
                className="absolute top-0 left-0 w-2 h-2 z-10 pointer-events-none"
                style={{
                  borderTop: '1px solid rgba(6, 182, 212, 0.5)',
                  borderLeft: '1px solid rgba(6, 182, 212, 0.5)'
                }}
              />
              <div className="px-2 py-1.5 flex items-center gap-1">
                <Settings size={20} className="text-cyan-400" />
                <ChevronDown size={16} className="text-cyan-400" />
              </div>
            </button>

            {showSettingsDropdown && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl border border-gray-700 z-50"
                style={{ background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 15, 28, 0.98) 100%)' }}
              >
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

                {/* Background Submenu */}
                <div
                  className="relative"
                  onMouseEnter={() => setShowBackgroundSubmenu(true)}
                  onMouseLeave={() => setShowBackgroundSubmenu(false)}
                >
                  <button
                    className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center justify-between gap-2 border-b border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Image size={16} />
                      Background
                    </div>
                    <ChevronRight size={16} />
                  </button>

                  {showBackgroundSubmenu && (
                    <div
                      className="absolute right-full top-0 w-48 rounded-lg shadow-xl border border-gray-700 z-50"
                      style={{ background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 15, 28, 0.98) 100%)' }}
                    >
                      {BACKGROUNDS.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => {
                            onBackgroundChange && onBackgroundChange(bg.id);
                            setShowSettingsDropdown(false);
                            setShowBackgroundSubmenu(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center justify-between gap-2 ${
                            bg.id === BACKGROUNDS[BACKGROUNDS.length - 1].id ? 'rounded-b-lg' : 'border-b border-gray-700'
                          } ${
                            bg.id === BACKGROUNDS[0].id ? 'rounded-t-lg' : ''
                          }`}
                        >
                          <span>{bg.name}</span>
                          {selectedBackground === bg.id && <Check size={16} className="text-green-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {DEV_CONFIG.features.addCardToHand && (
                  <button
                    onClick={() => {
                      onShowAddCardModal && onShowAddCardModal();
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
                  >
                    <Plus size={16} />
                    Add Card to Hand
                  </button>
                )}
                {DEV_CONFIG.features.forceWin && (
                  <button
                    onClick={() => {
                      onForceWin && onForceWin();
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-yellow-400 hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
                  >
                    <Zap size={16} />
                    Force Win (DEV)
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
                    onShowAIStrategy && onShowAIStrategy();
                    setShowSettingsDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-white hover:bg-gray-700 transition-colors flex items-center gap-2 border-b border-gray-700"
                >
                  <Brain size={16} />
                  AI Strategy Guide
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