// ========================================
// GAME HEADER COMPONENT
// ========================================
// Header section showing player resources, game phase, and controls
// Phase E reskin: 3-column grid, translucent blur, trapezoid phase banner,
// SVG polyline borders, faction accent washes.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Power, Files, Cpu, ChevronsUp, AlertTriangle } from 'lucide-react';
import KPIChangePopup from '../animations/KPIChangePopup.jsx';
import PhaseStatusText from './gameheader/PhaseStatusText.jsx';
import ActionPhaseButtons from './gameheader/ActionPhaseButtons.jsx';
import InitPhaseButtons from './gameheader/InitPhaseButtons.jsx';
import SettingsDropdown from './gameheader/SettingsDropdown.jsx';
import ResourceBadge from './gameheader/ResourceBadge.jsx';
import HeaderPanel from './gameheader/HeaderPanel.jsx';
import ShipHexPortrait from './gameheader/ShipHexPortrait.jsx';
import HealthBar from './gameheader/HealthBar.jsx';
import GameHeaderLayers from './GameHeaderLayers.jsx';
import { FACTION_COLORS } from './ShipSectionLayers.jsx';
import { getShipPortraitImage } from '../../logic/cards/shipSectionImageResolver.js';
import { getContextualText } from '../../logic/phase/phaseDisplayUtils.js';

const playerPri = FACTION_COLORS.player.primary;

const OPPONENT_PANEL_COLORS = {
  primary: FACTION_COLORS.opponent.primary,
  glow: 'rgba(200, 50, 50, 0.35)',
  border: 'rgba(200, 50, 50, 0.5)',
  borderStrong: 'rgba(200, 50, 50, 0.65)',
  filledSeg: 'linear-gradient(180deg, #cc2222 0%, #881111 100%)',
  filledGlow: '0 0 2px rgba(204, 34, 34, 0.3)',
  emptySeg: 'rgba(40, 20, 20, 0.4)',
  emptyBorder: 'rgba(100, 40, 40, 0.1)',
};

const PLAYER_PANEL_COLORS = {
  primary: FACTION_COLORS.player.primary,
  glow: 'rgba(50, 170, 200, 0.35)',
  border: 'rgba(50, 170, 200, 0.5)',
  borderStrong: 'rgba(50, 170, 200, 0.65)',
  filledSeg: 'linear-gradient(180deg, #22aacc 0%, #116688 100%)',
  filledGlow: '0 0 2px rgba(34, 170, 204, 0.3)',
  emptySeg: 'rgba(20, 30, 40, 0.4)',
  emptyBorder: 'rgba(40, 80, 100, 0.1)',
};

/** CSS color + glow mapping for Tier 2 contextual text */
const CONTEXT_COLORS = {
  cyan:    { color: playerPri, shadow: `0 0 0.7vw ${playerPri}77, 0 0 1.5vw ${playerPri}33` },
  orange:  { color: '#f97316', shadow: '0 0 0.7vw rgba(249,115,22,0.47), 0 0 1.5vw rgba(249,115,22,0.2)' },
  green:   { color: '#22c55e', shadow: '0 0 0.7vw rgba(34,197,94,0.47), 0 0 1.5vw rgba(34,197,94,0.2)' },
  yellow:  { color: '#eab308', shadow: '0 0 0.7vw rgba(234,179,8,0.47), 0 0 1.5vw rgba(234,179,8,0.2)' },
  red:     { color: '#ef4444', shadow: '0 0 0.7vw rgba(239,68,68,0.47), 0 0 1.5vw rgba(239,68,68,0.2)' },
  'cyan-dimmed': { color: `${playerPri}99`, shadow: `0 0 0.5vw ${playerPri}33` },
};

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
 * GameHeader - Top header displaying player resources and game state
 * Phase E: 3-column CSS grid with decorative layers and trapezoid phase banner
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
  AI_HAND_DEBUG_MODE,
  setShowAiHandModal,
  onShowDebugModal,
  onShowOpponentDrones,
  onShowGlossary,
  onShowGameManual,
  onShowAIStrategy,
  onShowAddCardModal,
  onForceWin,
  testMode,
  selectedBackground,
  onBackgroundChange,
  onOpenLog,
  onOpenLogModal,
  // Interception mode props
  interceptionModeActive,
  selectedInterceptor,
  handleShowInterceptionDialog,
  handleResetInterception,
  handleConfirmInterception,
  // Effect chain props
  effectChainState,
  handleConfirmChainMultiSelect,
  handleConfirmChainTarget,
  handleCancelEffectChain,
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
  const playerHandRef = useRef(null);

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
  // Redacted state sends handCount instead of full hand array
  const opponentHandCount = opponentPlayerState?.handCount ?? opponentPlayerState?.hand?.length ?? 0;
  const prevOpponentHand = usePrevious(opponentHandCount);
  const playerHandCount = localPlayerState?.hand?.length ?? 0;
  const prevPlayerHand = usePrevious(playerHandCount);

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
    if (prevOpponentHand !== undefined && opponentHandCount !== prevOpponentHand) {
      triggerPopup('hand', opponentHandCount - prevOpponentHand, opponentHandRef);
    }
  }, [opponentHandCount, prevOpponentHand, triggerPopup]);

  // Detect player hand count changes
  useEffect(() => {
    if (prevPlayerHand !== undefined && playerHandCount !== prevPlayerHand) {
      triggerPopup('hand', playerHandCount - prevPlayerHand, playerHandRef);
    }
  }, [playerHandCount, prevPlayerHand, triggerPopup]);

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

  // Determine contextual text + color for Tier 2 (first match wins)
  const contextual = getContextualText({
    effectChainState,
    interceptionModeActive,
    turnPhase,
    pendingShieldsRemaining,
    shieldsToAllocate,
    reallocationPhase,
    shieldsToRemove,
    shieldsToAdd,
    mandatoryAction,
    excessCards,
    excessDrones,
    optionalDiscardCount,
    discardLimit: localPlayerEffectiveStats?.totals?.discardLimit ?? 0,
    isMyTurn: isMyTurn(),
    isMultiplayer: isMultiplayer(),
    remainingDroneSlots: localPlayerEffectiveStats.totals.cpuLimit - totalLocalPlayerDrones,
  });
  const contextStyle = CONTEXT_COLORS[contextual.color];

  // Ship images for hex portraits
  const playerShipImage = getShipPortraitImage(localPlayerState?.shipId, true);
  const opponentShipImage = getShipPortraitImage(opponentPlayerState?.shipId, false);

  // Active turn and passed status for hex portrait visual effects
  const isDeployOrAction = turnPhase === 'deployment' || turnPhase === 'action';
  const playerIsActiveTurn = isDeployOrAction && isMyTurn();
  const opponentIsActiveTurn = isDeployOrAction && !isMyTurn();
  const opponentHasPassed = isDeployOrAction && passInfo[`${getOpponentPlayerId()}Passed`];
  const playerHasPassed = isDeployOrAction && passInfo[`${getLocalPlayerId()}Passed`];

  return (
    <header style={{
      width: '100%', height: '100%',
      position: 'relative', zIndex: 20,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '1%',
      padding: '0 1.2%',
      alignItems: 'center',
    }}>
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

      {/* ─── Decorative Layers ─── */}
      <GameHeaderLayers />

      {/* ═══ COLUMN 1: Opponent Panel ═══ */}
      <div style={{ padding: '0 1%', height: '100%', position: 'relative', zIndex: 3 }}>
        <HeaderPanel
          side="opponent"
          label="OPPONENT"
          factionColors={OPPONENT_PANEL_COLORS}
          hexPortrait={
            <ShipHexPortrait
              side="opponent"
              shipImageUrl={opponentShipImage}
              factionColors={OPPONENT_PANEL_COLORS}
              isActiveTurn={opponentIsActiveTurn}
              hasPassed={opponentHasPassed}
            />
          }
        >
          {/* KPI Row */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 3%' }}>
            <div style={{ display: 'flex', gap: 'clamp(2px, 0.3vw, 4px)', alignItems: 'center', flexWrap: 'wrap' }}>
              <ResourceBadge
                ref={opponentDeploymentRef}
                icon={Power}
                value={roundNumber === 1 ? opponentPlayerState.initialDeploymentBudget : opponentPlayerState.deploymentBudget}
                max={opponentPlayerEffectiveStats.totals.deploymentBudget}
                iconColor="text-purple-400"
                isPlayer={false}
                compact
              />
              <ResourceBadge
                ref={opponentEnergyRef}
                icon={Power}
                value={opponentPlayerState.energy}
                max={opponentPlayerEffectiveStats.totals.maxEnergy}
                iconColor="text-yellow-300"
                isPlayer={false}
                compact
              />
              <ResourceBadge
                ref={opponentMomentumRef}
                icon={ChevronsUp}
                value={opponentPlayerState.momentum || 0}
                max={5}
                iconColor="text-blue-400"
                isPlayer={false}
                compact
              />
              <div
                onClick={() => AI_HAND_DEBUG_MODE && setTimeout(() => setShowAiHandModal(true), 100)}
                className={AI_HAND_DEBUG_MODE ? 'cursor-pointer' : ''}
              >
                <ResourceBadge
                  ref={opponentHandRef}
                  icon={Files}
                  value={opponentHandCount}
                  max={opponentPlayerEffectiveStats.totals.handLimit}
                  iconColor="text-cyan-300"
                  isPlayer={false}
                  compact
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
                  compact
                />
              </div>
            </div>
          </div>
          {/* Health Strip */}
          {opponentHullIntegrity && (
            <HealthBar
              current={opponentHullIntegrity.remainingToWin}
              max={opponentHullIntegrity.damageThreshold}
              side="opponent"
              factionColors={OPPONENT_PANEL_COLORS}
            />
          )}
        </HeaderPanel>
      </div>

      {/* ═══ COLUMN 2: Trapezoid Phase Banner ═══ */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '0.8% 0', position: 'relative', zIndex: 3,
      }}>
        {/* ─── Tier 1: Phase name ─── */}
        <div style={{
          width: '100%',
          clipPath: 'polygon(0% 0%, 100% 0%, 93% 100%, 7% 100%)',
          background: 'linear-gradient(180deg, rgba(12,30,48,0.6), rgba(0, 0, 0, 0.6))',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          padding: '1.5% 2%', textAlign: 'center', position: 'relative',
          border: `0.06vw solid ${playerPri}22`,
        }}>
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: '3%', right: '3%', height: '0.1vw',
            background: `linear-gradient(90deg, transparent, ${playerPri}44, ${playerPri}66, ${playerPri}44, transparent)`,
            pointerEvents: 'none',
          }} />
          {/* Bottom accent line */}
          <div style={{
            position: 'absolute', bottom: 0, left: '8%', right: '8%', height: '0.06vw',
            background: `linear-gradient(90deg, transparent, ${playerPri}22, transparent)`,
            pointerEvents: 'none',
          }} />
          {/* Sheen overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03), transparent 50%, rgba(255,255,255,0.01))',
            pointerEvents: 'none',
          }} />
          {/* Glass specular highlight */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 58%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          {/* Phase status content */}
          <PhaseStatusText turnPhase={turnPhase} />
        </div>

        {/* ─── Tier 2: Turn context ─── */}
        <div style={{
          width: '75%',
          clipPath: 'polygon(0% 0%, 100% 0%, 93% 100%, 7% 100%)',
          background: 'linear-gradient(180deg, rgba(8,20,32,0.4), rgba(0, 0, 0, 0.4))',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          padding: '0.8% 2%', textAlign: 'center', marginTop: '-1px', position: 'relative',
          border: `0.05vw solid ${playerPri}15`,
        }}>
          {/* Bottom accent line */}
          <div style={{
            position: 'absolute', bottom: 0, left: '6%', right: '6%', height: '0.05vw',
            background: `linear-gradient(90deg, transparent, ${playerPri}20, transparent)`,
            pointerEvents: 'none',
          }} />
          {/* Glass specular highlight */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.04) 42%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 58%, transparent 65%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            color: contextStyle.color,
            fontWeight: 700,
            fontSize: 'clamp(0.55rem, 0.95vw, 0.95rem)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textShadow: contextStyle.shadow,
          }}>
            {contextual.text}
          </div>
        </div>

        {/* ─── Gap ─── */}
        <div style={{ height: '0.6vh' }} />

        {/* ─── Tier 3: Action buttons ─── */}
        <div style={{ position: 'relative', zIndex: 4, display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
          {(turnPhase === 'deployment' || turnPhase === 'action' || reallocationPhase) ? (
            <ActionPhaseButtons
              isMyTurn={isMyTurn}
              mandatoryAction={mandatoryAction}
              reallocationPhase={reallocationPhase}
              passInfo={passInfo}
              getLocalPlayerId={getLocalPlayerId}
              handlePlayerPass={handlePlayerPass}
              handleCancelReallocation={handleCancelReallocation}
              handleResetReallocation={handleResetReallocation}
              handleContinueToAddPhase={handleContinueToAddPhase}
              handleConfirmReallocation={handleConfirmReallocation}
              interceptionModeActive={interceptionModeActive}
              handleShowInterceptionDialog={handleShowInterceptionDialog}
              handleResetInterception={handleResetInterception}
              handleConfirmInterception={handleConfirmInterception}
              effectChainState={effectChainState}
              handleConfirmChainMultiSelect={handleConfirmChainMultiSelect}
              handleConfirmChainTarget={handleConfirmChainTarget}
              handleCancelEffectChain={handleCancelEffectChain}
            />
          ) : (
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
          )}
        </div>
      </div>

      {/* ═══ COLUMN 3: Player Panel ═══ */}
      <div style={{ padding: '0 1%', height: '100%', position: 'relative', zIndex: 3 }}>
        <HeaderPanel
          side="player"
          label="PLAYER"
          factionColors={PLAYER_PANEL_COLORS}
          hexPortrait={
            <ShipHexPortrait
              side="player"
              shipImageUrl={playerShipImage}
              isClickable
              onClick={() => setShowSettingsDropdown(prev => !prev)}
              factionColors={PLAYER_PANEL_COLORS}
              isActiveTurn={playerIsActiveTurn}
              hasPassed={playerHasPassed}
            >
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
                onShowGameManual={onShowGameManual}
                onShowAIStrategy={onShowAIStrategy}
                onOpenLog={onOpenLog}
                onOpenLogModal={onOpenLogModal}
                handleExitGame={handleExitGame}
                hideButton
              />
            </ShipHexPortrait>
          }
        >
          {/* KPI Row */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 3%' }}>
            <div style={{ display: 'flex', gap: 'clamp(2px, 0.3vw, 4px)', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <ResourceBadge
                ref={playerDeploymentRef}
                icon={Power}
                value={roundNumber === 1 ? localPlayerState.initialDeploymentBudget : localPlayerState.deploymentBudget}
                max={localPlayerEffectiveStats.totals.deploymentBudget}
                iconColor="text-purple-400"
                isPlayer={true}
                compact
              />
              <ResourceBadge
                ref={playerEnergyRef}
                icon={Power}
                value={localPlayerState.energy}
                max={localPlayerEffectiveStats.totals.maxEnergy}
                iconColor="text-yellow-300"
                isPlayer={true}
                compact
              />
              <ResourceBadge
                ref={playerMomentumRef}
                icon={ChevronsUp}
                value={localPlayerState.momentum || 0}
                max={5}
                iconColor="text-blue-400"
                isPlayer={true}
                compact
              />
              <ResourceBadge
                ref={playerHandRef}
                icon={Files}
                value={playerHandCount}
                max={localPlayerEffectiveStats.totals.handLimit}
                iconColor="text-cyan-300"
                isPlayer={true}
                compact
              />
              <ResourceBadge
                icon={Cpu}
                value={totalLocalPlayerDrones}
                max={localPlayerEffectiveStats.totals.cpuLimit}
                iconColor="text-cyan-400"
                isPlayer={true}
                compact
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
            </div>
          </div>
          {/* Health Strip */}
          {localPlayerHullIntegrity && (
            <HealthBar
              current={localPlayerHullIntegrity.remainingToWin}
              max={localPlayerHullIntegrity.damageThreshold}
              side="player"
              factionColors={PLAYER_PANEL_COLORS}
            />
          )}
        </HeaderPanel>
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
