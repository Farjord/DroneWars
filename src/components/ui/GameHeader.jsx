// ========================================
// GAME HEADER COMPONENT
// ========================================
// Header section showing player resources, game phase, and controls
// Extracted from App.jsx for better component organization

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Power, Files, Cpu, ShieldCheck, ChevronsUp, AlertTriangle } from 'lucide-react';
import { debugLog } from '../../utils/debugLogger.js';
import HullIntegrityBadge from './HullIntegrityBadge.jsx';
import KPIChangePopup from '../animations/KPIChangePopup.jsx';
import PhaseStatusText from './gameheader/PhaseStatusText.jsx';
import ActionPhaseButtons from './gameheader/ActionPhaseButtons.jsx';
import InitPhaseButtons from './gameheader/InitPhaseButtons.jsx';
import SettingsDropdown from './gameheader/SettingsDropdown.jsx';

/**
 * Hook to track the previous value of a state/prop
 * @param {any} value - The value to track
 * @returns {any} - The previous value
 */
const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};

/**
 * Resource Badge Component - Information panel styled resource display
 * Matches the dw-stat-box aesthetic with angular corner accent
 */
const ResourceBadge = React.forwardRef(({ icon: Icon, value, max, iconColor, isPlayer }, ref) => {
  // Theme colors - cyan for player, red for opponent
  const borderColor = isPlayer ? 'rgba(6, 182, 212, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  const accentColor = isPlayer ? 'rgba(6, 182, 212, 0.5)' : 'rgba(239, 68, 68, 0.5)';
  const glowColor = isPlayer ? 'rgba(6, 182, 212, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <div
      ref={ref}
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
});

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
  // Secondary targeting mode props
  secondaryTargetingState,
  handleCancelSecondaryTargeting,
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
  const dropdownRef = useRef(null);

  // KPI Change Popup refs and state
  const playerEnergyRef = useRef(null);
  const playerMomentumRef = useRef(null);
  const playerDeploymentRef = useRef(null);
  const playerThreatRef = useRef(null);
  const opponentEnergyRef = useRef(null);
  const opponentMomentumRef = useRef(null);
  const opponentDeploymentRef = useRef(null);
  const opponentHandRef = useRef(null);

  const [activePopups, setActivePopups] = useState([]);

  // Track previous KPI values for change detection
  const prevPlayerEnergy = usePrevious(localPlayerState?.energy);
  const prevPlayerMomentum = usePrevious(localPlayerState?.momentum);
  const playerDeploymentValue = roundNumber === 1 ? localPlayerState?.initialDeploymentBudget : localPlayerState?.deploymentBudget;
  const prevPlayerDeployment = usePrevious(playerDeploymentValue);
  const prevThreat = usePrevious(currentRunState?.detection);
  const prevOpponentEnergy = usePrevious(opponentPlayerState?.energy);
  const prevOpponentMomentum = usePrevious(opponentPlayerState?.momentum);
  const opponentDeploymentValue = roundNumber === 1 ? opponentPlayerState?.initialDeploymentBudget : opponentPlayerState?.deploymentBudget;
  const prevOpponentDeployment = usePrevious(opponentDeploymentValue);
  const prevOpponentHand = usePrevious(opponentPlayerState?.hand?.length);

  // Helper to trigger a KPI change popup
  const triggerPopup = useCallback((type, delta, ref) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || delta === 0) return;

    const popup = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      delta,
      position: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      type
    };
    setActivePopups(prev => [...prev, popup]);
  }, []);

  // Detect player energy changes
  useEffect(() => {
    if (prevPlayerEnergy !== undefined && localPlayerState?.energy !== prevPlayerEnergy) {
      triggerPopup('energy', localPlayerState.energy - prevPlayerEnergy, playerEnergyRef);
    }
  }, [localPlayerState?.energy, prevPlayerEnergy, triggerPopup]);

  // Detect player momentum changes
  useEffect(() => {
    if (prevPlayerMomentum !== undefined && localPlayerState?.momentum !== prevPlayerMomentum) {
      triggerPopup('momentum', localPlayerState.momentum - prevPlayerMomentum, playerMomentumRef);
    }
  }, [localPlayerState?.momentum, prevPlayerMomentum, triggerPopup]);

  // Detect opponent energy changes
  useEffect(() => {
    if (prevOpponentEnergy !== undefined && opponentPlayerState?.energy !== prevOpponentEnergy) {
      triggerPopup('energy', opponentPlayerState.energy - prevOpponentEnergy, opponentEnergyRef);
    }
  }, [opponentPlayerState?.energy, prevOpponentEnergy, triggerPopup]);

  // Detect opponent momentum changes
  useEffect(() => {
    if (prevOpponentMomentum !== undefined && opponentPlayerState?.momentum !== prevOpponentMomentum) {
      triggerPopup('momentum', opponentPlayerState.momentum - prevOpponentMomentum, opponentMomentumRef);
    }
  }, [opponentPlayerState?.momentum, prevOpponentMomentum, triggerPopup]);

  // Detect opponent hand count changes
  useEffect(() => {
    if (prevOpponentHand !== undefined && opponentPlayerState?.hand?.length !== prevOpponentHand) {
      triggerPopup('hand', opponentPlayerState.hand.length - prevOpponentHand, opponentHandRef);
    }
  }, [opponentPlayerState?.hand?.length, prevOpponentHand, triggerPopup]);

  // Detect player deployment budget changes
  useEffect(() => {
    if (prevPlayerDeployment !== undefined && playerDeploymentValue !== prevPlayerDeployment) {
      triggerPopup('deployment', playerDeploymentValue - prevPlayerDeployment, playerDeploymentRef);
    }
  }, [playerDeploymentValue, prevPlayerDeployment, triggerPopup]);

  // Detect opponent deployment budget changes
  useEffect(() => {
    if (prevOpponentDeployment !== undefined && opponentDeploymentValue !== prevOpponentDeployment) {
      triggerPopup('deployment', opponentDeploymentValue - prevOpponentDeployment, opponentDeploymentRef);
    }
  }, [opponentDeploymentValue, prevOpponentDeployment, triggerPopup]);

  // Detect player threat/detection changes (Extraction mode only)
  useEffect(() => {
    if (prevThreat !== undefined && currentRunState?.detection !== prevThreat) {
      triggerPopup('threat', currentRunState.detection - prevThreat, playerThreatRef);
    }
  }, [currentRunState?.detection, prevThreat, triggerPopup]);

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
              ref={opponentDeploymentRef}
              icon={Power}
              value={roundNumber === 1 ? opponentPlayerState.initialDeploymentBudget : opponentPlayerState.deploymentBudget}
              iconColor="text-purple-400"
              isPlayer={false}
            />
          )}
          <ResourceBadge
            ref={opponentEnergyRef}
            icon={Power}
            value={opponentPlayerState.energy}
            max={opponentPlayerEffectiveStats.totals.maxEnergy}
            iconColor="text-yellow-300"
            isPlayer={false}
          />
          <ResourceBadge
            ref={opponentMomentumRef}
            icon={ChevronsUp}
            value={opponentPlayerState.momentum || 0}
            iconColor="text-blue-400"
            isPlayer={false}
          />
          <div
            onClick={() => AI_HAND_DEBUG_MODE && setTimeout(() => setShowAiHandModal(true), 100)}
            className={AI_HAND_DEBUG_MODE ? 'cursor-pointer' : ''}
          >
            <ResourceBadge
              ref={opponentHandRef}
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
        <PhaseStatusText
          turnPhase={turnPhase}
          shieldsToAllocate={shieldsToAllocate}
          pendingShieldsRemaining={pendingShieldsRemaining}
          reallocationPhase={reallocationPhase}
          shieldsToRemove={shieldsToRemove}
          shieldsToAdd={shieldsToAdd}
          mandatoryAction={mandatoryAction}
          excessCards={excessCards}
          excessDrones={excessDrones}
          optionalDiscardCount={optionalDiscardCount}
          localPlayerEffectiveStats={localPlayerEffectiveStats}
          multiSelectState={multiSelectState}
          interceptionModeActive={interceptionModeActive}
          secondaryTargetingState={secondaryTargetingState}
          additionalCostState={additionalCostState}
        />

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

            <ActionPhaseButtons
              isMyTurn={isMyTurn}
              mandatoryAction={mandatoryAction}
              multiSelectState={multiSelectState}
              secondaryTargetingState={secondaryTargetingState}
              additionalCostState={additionalCostState}
              reallocationPhase={reallocationPhase}
              passInfo={passInfo}
              getLocalPlayerId={getLocalPlayerId}
              handlePlayerPass={handlePlayerPass}
              handleCancelReallocation={handleCancelReallocation}
              handleResetReallocation={handleResetReallocation}
              handleContinueToAddPhase={handleContinueToAddPhase}
              handleConfirmReallocation={handleConfirmReallocation}
              handleCancelMultiMove={handleCancelMultiMove}
              handleConfirmMultiMoveDrones={handleConfirmMultiMoveDrones}
              interceptionModeActive={interceptionModeActive}
              handleShowInterceptionDialog={handleShowInterceptionDialog}
              handleResetInterception={handleResetInterception}
              handleConfirmInterception={handleConfirmInterception}
              handleCancelSecondaryTargeting={handleCancelSecondaryTargeting}
              handleCancelAdditionalCost={handleCancelAdditionalCost}
            />
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

              <InitPhaseButtons
                turnPhase={turnPhase}
                excessCards={excessCards}
                excessDrones={excessDrones}
                handleResetShields={handleResetShields}
                handleConfirmShields={handleConfirmShields}
                handleRoundStartDraw={handleRoundStartDraw}
                handleMandatoryDiscardContinue={handleMandatoryDiscardContinue}
                handleMandatoryDroneRemovalContinue={handleMandatoryDroneRemovalContinue}
              />
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
              ref={playerDeploymentRef}
              icon={Power}
              value={roundNumber === 1 ? localPlayerState.initialDeploymentBudget : localPlayerState.deploymentBudget}
              iconColor="text-purple-400"
              isPlayer={true}
            />
          )}
          <ResourceBadge
            ref={playerEnergyRef}
            icon={Power}
            value={localPlayerState.energy}
            max={localPlayerEffectiveStats.totals.maxEnergy}
            iconColor="text-yellow-300"
            isPlayer={true}
          />
          <ResourceBadge
            ref={playerMomentumRef}
            icon={ChevronsUp}
            value={localPlayerState.momentum || 0}
            iconColor="text-blue-400"
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
              ref={playerThreatRef}
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
          <SettingsDropdown
            showSettingsDropdown={showSettingsDropdown}
            setShowSettingsDropdown={setShowSettingsDropdown}
            dropdownRef={dropdownRef}
            selectedBackground={selectedBackground}
            onBackgroundChange={onBackgroundChange}
            onShowDebugModal={onShowDebugModal}
            onShowAddCardModal={onShowAddCardModal}
            onForceWin={onForceWin}
            onShowGlossary={onShowGlossary}
            onShowAIStrategy={onShowAIStrategy}
            handleExitGame={handleExitGame}
          />
        </div>
      </div>

      {/* KPI Change Popups */}
      {activePopups.map(popup => (
        <KPIChangePopup
          key={popup.id}
          delta={popup.delta}
          position={popup.position}
          type={popup.type}
          onComplete={() => setActivePopups(prev => prev.filter(p => p.id !== popup.id))}
        />
      ))}
    </header>
  );
}

export default GameHeader;
